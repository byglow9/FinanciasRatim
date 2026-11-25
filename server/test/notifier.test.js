import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf } from '../../shared/core/cycle.js'
import { DEFAULT_CATEGORY_DEFS } from '../../shared/core/categories.js'
import { DEFAULT_PUSH_PREFS } from '../../shared/core/pushPrefs.js'
import { PUSH_PHRASES, buildPushPayload } from '../../shared/core/vintemPhrasesPush.js'
import { createNotifier, readMaxPerDay } from '../src/push/notifier.js'
import { createApp } from '../src/app.js'
import { createPushFeature } from '../src/push/index.js'
import { createFakeFirestore } from './_fake-firestore.js'

// Notificador com repo e sender falsos em memoria. O repo falso imita o contrato do repo.js:
// filtra por casal e pessoa, e claimEvent falha (false) quando o marcador ja existe.
const HID = 'casalA'
const NOW = new Date('2026-11-17T15:00:00Z') // 12:00 em Sao Paulo, ciclo 2026-11 (dia do salario 1)

const LIMIT_CENTS = 10000

function settingsFor({ tone = 'sem-filtro', faturaEnabled = true } = {}) {
  return {
    tone,
    categoryDefs: DEFAULT_CATEGORY_DEFS,
    personConfig: {
      salaryDay: 1,
      expectedIncomeCents: 500000,
      incomeOverrides: {},
      limits: { lazer: [{ from: '2026-01', cents: LIMIT_CENTS }] },
    },
    faturaEnabled,
    daysBeforeDueDate: 3,
  }
}

function spend(amountReais, over = {}) {
  return {
    id: `t-${Math.random().toString(36).slice(2, 8)}`,
    ownerId: HID,
    person: 'ele',
    type: 'saida',
    amount: amountReais,
    categoryId: 'lazer',
    category: 'Lazer',
    date: new Date('2026-11-16T15:00:00Z'),
    ...over,
  }
}

function makeRepo({ settings = settingsFor(), txs = [], silentIds = [], fids = {}, prefs = DEFAULT_PUSH_PREFS } = {}) {
  const events = new Map()
  const state = { settings, txs, silentIds, fids, prefs, claimCalls: 0 }
  const repo = {
    state,
    events,
    async readSettings() {
      return state.settings
    },
    async readCycleTransactions(hid, person, cycle) {
      return state.txs.filter((t) => t.ownerId === hid && t.person === person && t.date >= cycle.start && t.date <= cycle.end)
    },
    async readSilentAlertIds() {
      return [...state.silentIds]
    },
    async listEventIds(hid, person, cycleKey) {
      const prefix = `${hid}__limite__`
      return [...events.entries()]
        .filter(([, e]) => e.ownerId === hid && e.person === person && e.cycleKey === cycleKey && e.kind === 'limite')
        .map(([id]) => id.slice(prefix.length))
    },
    async readPrefs() {
      return state.prefs
    },
    async listFids(hid, person) {
      return [...(state.fids[`${hid}:${person}`] ?? [])]
    },
    async claimEvent(id, data) {
      state.claimCalls++
      if (events.has(id)) return false
      events.set(id, { ...data })
      return true
    },
    async updateEvent(id, patch) {
      events.set(id, { ...events.get(id), ...patch })
    },
    async deleteEvent(id) {
      events.delete(id)
    },
    async countSent(hid, person, dayKey) {
      return [...events.values()].filter(
        (e) => e.ownerId === hid && e.person === person && e.dayKey === dayKey && e.status === 'enviado'
      ).length
    },
    async listPending() {
      return [...events.entries()].filter(([, e]) => e.status === 'pendente').map(([id, e]) => ({ ...e, id }))
    },
    async transitionEvent(id, from, patch) {
      const cur = events.get(id)
      if (!cur || cur.status !== from) return false
      events.set(id, { ...cur, ...patch })
      return true
    },
  }
  return repo
}

function makeSender() {
  const calls = []
  const sender = {
    calls,
    result: null,
    async sendToFids(fids, payload) {
      calls.push({ fids: [...fids], payload })
      return sender.result ?? { sent: fids.length, dead: 0, failed: 0 }
    },
  }
  return sender
}

function statuses(repo) {
  return [...repo.events.values()].map((e) => `${e.threshold}:${e.status}`).sort()
}

describe('notificador de limites: tracer', () => {
  let repo
  let sender
  let notifier
  const FIDS = { 'casalA:ele': ['fidEle-aparelho1', 'fidEle-aparelho2'], 'casalA:ela': ['fidEla-aparelho1'], 'casalB:ele': ['fidB-ele-aparelho'] }

  beforeEach(() => {
    repo = makeRepo({ txs: [spend(120)], fids: FIDS })
    sender = makeSender()
    notifier = createNotifier({ repo, sender, now: () => NOW })
  })

  test('cruzar 100 por cento envia uma notificacao a pessoa certa, com texto do banco de push', async () => {
    const out = await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(sender.calls.length, 1)
    assert.deepEqual(sender.calls[0].fids.sort(), ['fidEle-aparelho1', 'fidEle-aparelho2'])
    const { payload } = sender.calls[0]
    assert.deepEqual(Object.keys(payload).sort(), ['body', 'tag', 'title', 'url'])
    assert.equal(payload.title, 'OINC')
    assert.equal(payload.tag, `limite-lazer-${cycleOf(NOW, 1).key}`)
    assert.equal(payload.url, '/')
    // Sem digito, sem moeda: so o nome da categoria pode aparecer (D-05, D-19).
    assert.doesNotMatch(payload.body, /\d|R\$/)
    const candidates = Object.values(PUSH_PHRASES['push-limite-100']['sem-filtro']).map((p) => p.t.replaceAll('{categoria}', 'Lazer'))
    assert.ok(candidates.includes(payload.body), 'texto fora do banco de push')
    assert.equal(out.sent, 2)
  })

  test('o texto e o do banco de push escolhido pelo id do evento, no tom das configuracoes', async () => {
    repo.state.settings = settingsFor({ tone: 'suave' })
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    const [id] = [...repo.events.keys()].filter((k) => k.endsWith('__100'))
    const expected = buildPushPayload({ situation: 'push-limite-100', tone: 'suave', categoryName: 'Lazer', seed: id })
    assert.equal(sender.calls[0].payload.body, expected.body)
  })

  test('o limiar menor sai silencioso e um segundo check nao repete nada', async () => {
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.deepEqual(statuses(repo), ['100:enviado', '80:silencioso'])
    const again = await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(sender.calls.length, 1)
    assert.equal(again.events, 0)
    assert.equal(repo.events.size, 2)
  })

  test('o marcador guarda ids e chaves, nunca o texto do aviso nem valor', async () => {
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    for (const marker of repo.events.values()) {
      assert.deepEqual(
        Object.keys(marker).filter((k) => !['enviados', 'sentAt'].includes(k)).sort(),
        ['categoryId', 'categoryLabel', 'createdAt', 'cycleKey', 'dayKey', 'kind', 'ownerId', 'person', 'status', 'tag', 'threshold', 'url'].sort()
      )
      assert.equal(marker.ownerId, HID)
      assert.equal(marker.person, 'ele')
    }
    assert.equal(sender.calls[0].payload.body.length > 0, true)
    assert.ok(![...repo.events.values()].some((m) => JSON.stringify(m).includes(sender.calls[0].payload.body)))
  })

  test('so a pessoa do gasto recebe: a outra pessoa e outro casal nao recebem nada', async () => {
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    const all = sender.calls.flatMap((c) => c.fids)
    assert.ok(!all.includes('fidEla-aparelho1'))
    assert.ok(!all.includes('fidB-ele-aparelho'))
    // A Ela nao tem gasto: o check dela nao cria marcador nem envia.
    const ela = await notifier.evaluateLimits({ hid: HID, person: 'ela' })
    assert.equal(ela.events, 0)
    assert.equal(sender.calls.length, 1)
    // O gasto do Ele em outro casal tambem nao dispara aviso neste.
    const other = await notifier.evaluateLimits({ hid: 'casalB', person: 'ele' })
    assert.equal(other.sent, 0)
  })

  test('gasto abaixo de 80 por cento nao cria evento', async () => {
    repo.state.txs = [spend(50)]
    const out = await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(out.events, 0)
    assert.equal(sender.calls.length, 0)
  })

  test('chegar a 80 sem passar de 100 envia o aviso de 80', async () => {
    repo.state.txs = [spend(85)]
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(sender.calls.length, 1)
    assert.deepEqual(statuses(repo), ['80:enviado'])
    // Passar depois para 100 envia mais um aviso (o de 80 ja esta marcado).
    repo.state.txs = [spend(85), spend(30)]
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(sender.calls.length, 2)
    assert.deepEqual(statuses(repo), ['100:enviado', '80:enviado'])
  })

  test('um aviso silencioso ja registrado pelo app impede o envio do limiar', async () => {
    // Troca do dia do salario: o app regravou os marcadores silenciosos do ciclo na chave nova.
    const key = cycleOf(NOW, 1).key
    repo.state.silentIds = [`ele__${key}__lazer__80`, `ele__${key}__lazer__100`]
    const out = await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(out.events, 0)
    assert.equal(sender.calls.length, 0)
    assert.equal(repo.events.size, 0)
  })

  test('entrada invalida (casal vazio ou pessoa fora de ele e ela) nao faz nada', async () => {
    assert.equal((await notifier.evaluateLimits({ hid: '', person: 'ele' })).events, 0)
    assert.equal((await notifier.evaluateLimits({ hid: HID, person: 'porquinho' })).events, 0)
    assert.equal(sender.calls.length, 0)
  })
})

describe('readMaxPerDay', () => {
  test('padrao 8 quando ausente ou invalido', () => {
    assert.equal(readMaxPerDay({}), 8)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: 'abc' }), 8)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '0' }), 8)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '-3' }), 8)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '2.5' }), 8)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '5' }), 5)
  })
})

// Silencio das 22:00 as 08:00 (hora de Sao Paulo).
const QUIET_PREFS = {
  types: { limite80: true, limite100: true, espontanea: true },
  quiet: { enabled: true, from: '22:00', to: '08:00' },
}
const at = (iso) => new Date(iso).getTime()
// 23:30 em Sao Paulo (02:30Z do dia seguinte), 22:30, 08:05 e 10:00.
const T_2330 = at('2026-11-18T02:30:00Z')
const T_2230 = at('2026-11-18T01:30:00Z')
const T_0805 = at('2026-11-18T11:05:00Z')
const T_1000 = at('2026-11-18T13:00:00Z')

const FIDS = { 'casalA:ele': ['fidEle-aparelho1', 'fidEle-aparelho2'], 'casalA:ela': ['fidEla-aparelho1'] }

describe('notificador de limites: silencio, tipos, teto e falhas', () => {
  let clock
  let repo
  let sender
  let notifier

  const setup = (opts = {}, config = {}) => {
    clock = { t: T_1000 }
    repo = makeRepo({ txs: [spend(120)], fids: FIDS, ...opts })
    sender = makeSender()
    notifier = createNotifier({ repo, sender, now: () => new Date(clock.t), config })
  }
  const check = (extra = {}) => notifier.evaluateLimits({ hid: HID, person: 'ele', ...extra })

  beforeEach(() => setup())

  test('tipo limite100 desligado grava o marcador desligado e nao envia', async () => {
    repo.state.prefs = { ...DEFAULT_PUSH_PREFS, types: { ...DEFAULT_PUSH_PREFS.types, limite100: false } }
    await check()
    assert.equal(sender.calls.length, 0)
    assert.deepEqual(statuses(repo), ['100:desligado', '80:silencioso'])
    // Desligado nao entrega depois: nem mesmo o deliverHeld.
    const held = await notifier.deliverHeld()
    assert.equal(held.sent, 0)
    assert.equal(sender.calls.length, 0)
  })

  test('no silencio o aviso fica pendente e chega depois dele, uma so vez, com o tom atual', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    assert.equal(sender.calls.length, 0)
    assert.deepEqual(statuses(repo), ['100:pendente', '80:silencioso'])
    // O marcador retido tem o que e preciso para montar o texto depois, e nenhum texto.
    const held = [...repo.events.entries()].find(([, e]) => e.status === 'pendente')
    assert.equal(held[1].categoryLabel, 'Lazer')
    assert.equal(held[1].threshold, 100)
    assert.ok(!('body' in held[1]) && !('text' in held[1]))

    // As 22:30 ainda e silencio: nada sai.
    clock.t = T_2230
    assert.equal((await notifier.deliverHeld()).sent, 0)
    assert.equal(sender.calls.length, 0)

    // O tom mudou durante a retencao: o texto sai no tom atual (montado so agora).
    repo.state.settings = settingsFor({ tone: 'suave' })
    clock.t = T_0805
    const out = await notifier.deliverHeld()
    assert.equal(out.sent, 2)
    assert.equal(sender.calls.length, 1)
    assert.equal(
      sender.calls[0].payload.body,
      buildPushPayload({ situation: 'push-limite-100', tone: 'suave', categoryName: 'Lazer', seed: held[0] }).body
    )
    assert.equal(repo.events.get(held[0]).status, 'enviado')
    // O dia do marcador passa a ser o da entrega (base do teto diario).
    assert.equal(repo.events.get(held[0]).dayKey, '2026-11-18')

    // Uma segunda rodada, ou um novo check, nao repete.
    await notifier.deliverHeld()
    await check()
    assert.equal(sender.calls.length, 1)
  })

  test('80 e 100 da mesma categoria retidos entregam so o de 100 e colapsam o outro', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    repo.state.txs = [spend(85)]
    await check()
    repo.state.txs = [spend(85), spend(30)]
    await check()
    assert.deepEqual(statuses(repo), ['100:pendente', '80:pendente'])

    clock.t = T_0805
    const out = await notifier.deliverHeld()
    assert.equal(out.collapsed, 1)
    assert.equal(sender.calls.length, 1)
    assert.deepEqual(statuses(repo), ['100:enviado', '80:colapsado'])
  })

  test('tipo desligado durante a retencao marca desligado e nao envia', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    repo.state.prefs = { ...QUIET_PREFS, types: { ...QUIET_PREFS.types, limite100: false } }
    clock.t = T_0805
    const out = await notifier.deliverHeld()
    assert.equal(out.off, 1)
    assert.equal(sender.calls.length, 0)
    assert.deepEqual(statuses(repo), ['100:desligado', '80:silencioso'])
  })

  test('a pessoa ainda no silencio nao bloqueia a entrega da outra', async () => {
    repo.state.txs = [spend(120), spend(120, { person: 'ela' })]
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    await notifier.evaluateLimits({ hid: HID, person: 'ela' })
    assert.equal(repo.events.size, 4)
    // As prefs do falso valem para as duas pessoas; so Ela sai do silencio (muda o silencio dela).
    const realRead = repo.readPrefs
    repo.readPrefs = async (hid, person) => (person === 'ela' ? DEFAULT_PUSH_PREFS : realRead(hid, person))
    clock.t = T_2230
    const out = await notifier.deliverHeld()
    assert.equal(out.sent, 1)
    assert.deepEqual(sender.calls[0].fids, ['fidEla-aparelho1'])
  })

  test('o teto diario e respeitado: o oitavo aviso sai e o nono vira teto', async () => {
    const settings = settingsFor()
    settings.personConfig.limits.alimentacao = [{ from: '2026-01', cents: LIMIT_CENTS }]
    const eight = () => [...repo.events.values()].filter((e) => e.status === 'enviado').length
    setup({ settings, txs: [spend(120), spend(120, { categoryId: 'alimentacao', category: 'Alimentacao' })], fids: FIDS })
    // Sete avisos ja enviados hoje a Ele.
    for (let i = 0; i < 7; i++) {
      repo.events.set(`antigo-${i}`, { ownerId: HID, person: 'ele', kind: 'limite', status: 'enviado', dayKey: '2026-11-18', cycleKey: 'x' })
    }
    await check()
    // Duas categorias passaram de 100: uma sai (a oitava) e a outra bate no teto.
    assert.equal(sender.calls.length, 1)
    assert.equal(eight(), 8)
    const own = [...repo.events.entries()].filter(([id]) => id.startsWith(`${HID}__limite__`) && id.endsWith('__100'))
    assert.deepEqual(own.map(([, e]) => e.status).sort(), ['enviado', 'teto'])
  })

  test('PUSH_MAX_PER_DAY vem da configuracao do notificador', async () => {
    setup({}, { maxPerDay: 1 })
    repo.events.set('antigo', { ownerId: HID, person: 'ele', kind: 'limite', status: 'enviado', dayKey: '2026-11-18', cycleKey: 'x' })
    await check()
    assert.equal(sender.calls.length, 0)
    assert.deepEqual(statuses(repo).filter((s) => s.startsWith('100')), ['100:teto'])
  })

  test('falha transitoria apaga o marcador e o check seguinte reenvia', async () => {
    sender.result = { sent: 0, dead: 0, failed: 2 }
    await check()
    assert.equal(sender.calls.length, 1)
    // O 100 foi apagado; o 80 silencioso continua.
    assert.deepEqual(statuses(repo), ['80:silencioso'])
    sender.result = null
    await check()
    assert.equal(sender.calls.length, 2)
    assert.deepEqual(statuses(repo), ['100:enviado', '80:silencioso'])
  })

  test('envio que lanca excecao tambem e transitorio', async () => {
    sender.sendToFids = async () => {
      throw new Error('rede')
    }
    await check()
    assert.deepEqual(statuses(repo), ['80:silencioso'])
  })

  test('FID morto nao apaga o marcador e nao tenta de novo', async () => {
    sender.result = { sent: 0, dead: 2, failed: 0 }
    await check()
    assert.deepEqual(statuses(repo), ['100:sem-aparelho', '80:silencioso'])
    sender.result = null
    await check()
    assert.equal(sender.calls.length, 1)
  })

  test('falha transitoria no envio de um retido volta o marcador a pendente', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    sender.result = { sent: 0, dead: 0, failed: 2 }
    clock.t = T_0805
    await notifier.deliverHeld()
    assert.deepEqual(statuses(repo), ['100:pendente', '80:silencioso'])
    sender.result = null
    await notifier.deliverHeld()
    assert.deepEqual(statuses(repo), ['100:enviado', '80:silencioso'])
  })

  test('excludeFid pula so o aparelho em uso', async () => {
    await check({ excludeFid: 'fidEle-aparelho1' })
    assert.deepEqual(sender.calls[0].fids, ['fidEle-aparelho2'])
  })

  test('so o aparelho em uso ou nenhum aparelho vira sem-aparelho, sem envio', async () => {
    setup({ fids: { 'casalA:ele': ['fidEle-aparelho1'] } })
    await check({ excludeFid: 'fidEle-aparelho1' })
    assert.equal(sender.calls.length, 0)
    const marker = [...repo.events.values()].find((e) => e.threshold === 100)
    assert.equal(marker.status, 'sem-aparelho')
    assert.equal(marker.motivo, 'aparelho-em-uso')

    setup({ fids: {} })
    await check()
    assert.equal(sender.calls.length, 0)
    assert.deepEqual(statuses(repo), ['100:sem-aparelho', '80:silencioso'])
  })

  test('excludeFid nao vale na entrega dos retidos', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check({ excludeFid: 'fidEle-aparelho1' })
    clock.t = T_0805
    await notifier.deliverHeld()
    assert.deepEqual(sender.calls[0].fids.sort(), ['fidEle-aparelho1', 'fidEle-aparelho2'])
  })

  test('dois executores disputando o mesmo retido: so um envia', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    clock.t = T_0805
    const [a, b] = await Promise.all([notifier.deliverHeld(), notifier.deliverHeld()])
    assert.equal(a.sent + b.sent, 2)
    assert.equal(sender.calls.length, 1)
  })
})

// POST /api/limits/check pelo app Express, com o notificador real sobre o Firestore e o FCM falsos.
describe('POST /api/limits/check', () => {
  const ORIGIN = 'https://app.exemplo.test'
  const CLAIMS = {
    'tok-a-ele': { uid: 'u-a-ele', hid: 'casalA', person: 'ele' },
    'tok-a-ela': { uid: 'u-a-ela', hid: 'casalA', person: 'ela' },
    'tok-semhid': { uid: 'u-sem' },
  }
  const verifyToken = async (token) => {
    if (!CLAIMS[token]) throw new Error('token invalido')
    return CLAIMS[token]
  }
  let server
  let base
  let db
  let sentMessages
  let clock

  const post = (token, body, headers = {}) =>
    fetch(`${base}/api/limits/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  before(async () => {
    db = createFakeFirestore()
    sentMessages = []
    clock = { t: NOW.getTime() }
    const messaging = {
      async sendEach(messages) {
        sentMessages.push(...messages)
        return { responses: messages.map(() => ({ success: true })) }
      },
    }
    // O Firestore falso nao tem orderBy nem count: o repo real do emulador e provado em emu/push-events.
    const feature = createPushFeature({ db, messaging, now: () => new Date(clock.t), env: {} })
    feature.notifier.evaluateLimits = async (args) => {
      sentMessages.push({ check: args })
      return { events: 0, claimed: 0, sent: 0 }
    }
    const app = createApp({ verifyToken, db, pluggy: {}, sync: {}, origins: [ORIGIN], features: [feature] })
    await new Promise((resolve) => {
      server = app.listen(0, resolve)
    })
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  const checks = () => sentMessages.filter((m) => m.check).map((m) => m.check)

  test('sem token a rota responde 401', async () => {
    assert.equal((await post(null, {})).status, 401)
  })

  test('casal e pessoa vem so do token, o corpo nao muda nada, e o FID valido e repassado', async () => {
    const res = await post('tok-a-ele', { fid: 'fidAparelho00001', person: 'ela', hid: 'casalB' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
    assert.deepEqual(checks().at(-1), { hid: 'casalA', person: 'ele', excludeFid: 'fidAparelho00001' })
  })

  test('sem corpo ou sem FID o check roda sem excluir aparelho', async () => {
    const before = checks().length
    assert.equal((await post('tok-a-ela')).status, 200)
    assert.deepEqual(checks().at(-1), { hid: 'casalA', person: 'ela', excludeFid: undefined })
    assert.equal(checks().length, before + 1)
  })

  test('FID invalido responde 400 e nao roda o check', async () => {
    const before = checks().length
    for (const fid of ['curto', 'tem espaco aqui!!', 42, '../../x']) {
      assert.equal((await post('tok-a-ele', { fid })).status, 400)
    }
    assert.equal(checks().length, before)
  })

  test('token sem pessoa nao passa', async () => {
    const res = await post('tok-semhid', {})
    assert.ok(res.status === 401 || res.status === 403)
  })

  test('o limite de pedidos por minuto por uid responde 429 e libera depois da janela', async () => {
    // O uid u-a-ela ja fez 1 pedido acima; completa 10 e o 11o e recusado.
    for (let i = 0; i < 9; i++) assert.equal((await post('tok-a-ela', {})).status, 200)
    const blocked = await post('tok-a-ela', {})
    assert.equal(blocked.status, 429)
    assert.ok(Number(blocked.headers.get('retry-after')) >= 1)
    // Outro uid nao e afetado.
    assert.equal((await post('tok-a-ele', {})).status, 200)
    // Passada a janela, volta a aceitar.
    clock.t += 61_000
    assert.equal((await post('tok-a-ela', {})).status, 200)
  })
})
