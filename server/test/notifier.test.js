import { test, describe, beforeEach, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf } from '../../shared/core/cycle.js'
import { formatReais } from '../../shared/core/format.js'
import { composePush } from '../../shared/core/oincPush.js'
import { OINC_PUSH_LINES } from '../../shared/core/oincLinesPush.js'
import { DEFAULT_CATEGORY_DEFS } from '../../shared/core/categories.js'
import { DEFAULT_PUSH_PREFS } from '../../shared/core/pushPrefs.js'
import { PUSH_PHRASES } from '../../shared/core/vintemPhrasesPush.js'
import { createNotifier, readMaxPerDay } from '../src/push/notifier.js'
import { createOincState } from '../src/ai/state.js'
import { createApp } from '../src/app.js'
import { createPushFeature } from '../src/push/index.js'
import { createFakeFirestore } from './_fake-firestore.js'
import { createMemoryDb } from './_ai-memory-db.js'

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

function makeRepo({ settings = settingsFor(), txs = [], silentIds = [], fids = {}, prefs = DEFAULT_PUSH_PREFS, cards = [], cardSettings = [] } = {}) {
  const events = new Map()
  const state = { settings, txs, silentIds, fids, prefs, cards, cardSettings, claimCalls: 0 }
  const repo = {
    state,
    events,
    async readSettings() {
      return state.settings
    },
    async readCards(hid, person) {
      return state.cards.filter((c) => c.ownerId === hid && c.person === person)
    },
    async readCardSettings(hid) {
      return state.cardSettings.filter((c) => c.ownerId === hid)
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
    async eventExists(id) {
      return events.has(id)
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
    async countSent(hid, person, dayKey, kind) {
      return [...events.values()].filter(
        (e) =>
          e.ownerId === hid && e.person === person && e.dayKey === dayKey && e.status === 'enviado' && (!kind || e.kind === kind)
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

// Texto esperado de um aviso de limite do Ele (07.1-11): o mesmo composePush do servidor.
function limitBody(id, { tone = 'sem-filtro', threshold = 100, spent, remaining = 0, pct, loja = null }) {
  return composePush({
    scene: threshold === 100 ? 'push-limite-100' : 'push-limite-80',
    tone,
    slots: { categoria: 'Lazer', valor: formatReais(spent), restante: formatReais(remaining), pct, loja },
    gender: 'm',
    seed: id,
  }).body
}

const limitId = (repo, threshold = 100) => [...repo.events.keys()].find((k) => k.endsWith(`__lazer__${threshold}`))

// Frases de limite de hoje (suave e direto), com a categoria ja encaixada.
const legacyLimit = (threshold, tone) =>
  Object.values(PUSH_PHRASES[`push-limite-${threshold}`][tone]).map((p) => p.t.replaceAll('{categoria}', 'Lazer'))

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

  test('cruzar 100 por cento envia uma notificacao a pessoa certa, com a categoria e o gasto em reais', async () => {
    const out = await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(sender.calls.length, 1)
    assert.deepEqual(sender.calls[0].fids.sort(), ['fidEle-aparelho1', 'fidEle-aparelho2'])
    const { payload } = sender.calls[0]
    assert.deepEqual(Object.keys(payload).sort(), ['body', 'tag', 'title', 'url'])
    assert.equal(payload.title, 'OINC')
    assert.equal(payload.tag, `limite-lazer-${cycleOf(NOW, 1).key}`)
    assert.equal(payload.url, '/')
    // Voz do OINC com a categoria e o total gasto (D-22, D-27).
    assert.equal(payload.body, limitBody(limitId(repo), { spent: 12000, pct: '120%' }))
    assert.match(payload.body, /Lazer/)
    assert.ok(payload.body.includes(formatReais(12000)), 'sem o gasto em reais')
    assert.equal(out.sent, 2)
  })

  test('em suave e direto sai a frase de limite de hoje, no tom das configuracoes, sem valor nem loja', async () => {
    for (const tone of ['suave', 'direto']) {
      for (const [amount, threshold] of [[120, 100], [85, 80]]) {
        repo = makeRepo({
          settings: settingsFor({ tone }),
          txs: [spend(amount, { source: 'bank', description: 'IFOOD *PEDIDO' })],
          fids: FIDS,
        })
        sender = makeSender()
        await createNotifier({ repo, sender, now: () => NOW }).evaluateLimits({ hid: HID, person: 'ele' })
        const { body } = sender.calls[0].payload
        const spentCents = amount * 100
        assert.equal(
          body,
          limitBody(limitId(repo, threshold), {
            tone,
            threshold,
            spent: spentCents,
            remaining: Math.max(LIMIT_CENTS - spentCents, 0),
            pct: `${amount}%`,
            loja: 'iFood',
          })
        )
        assert.ok(legacyLimit(threshold, tone).includes(body), `fora do banco de hoje: ${body}`)
        assert.doesNotMatch(body, /R\$|iFood/)
      }
    }
  })

  test('a marca conhecida da ultima compra da categoria pode aparecer', async () => {
    repo.state.txs = [
      spend(100, { source: 'bank', description: 'PADARIA DO ZE', date: new Date('2026-11-10T15:00:00Z') }),
      spend(20, { source: 'bank', description: 'IFOOD *PEDIDO 123' }),
    ].reverse()
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    const { body } = sender.calls[0].payload
    assert.equal(body, limitBody(limitId(repo), { spent: 12000, pct: '120%', loja: 'iFood' }))
    assert.match(body, /iFood/)
    assert.doesNotMatch(body, /PEDIDO|PADARIA/i)
  })

  test('padaria local, lancamento manual e Pix: so a categoria, nunca a descricao nem o nome da pessoa', async () => {
    const olderBrand = spend(100, { source: 'bank', description: 'IFOOD *PEDIDO', date: new Date('2026-11-10T15:00:00Z') })
    const latest = [
      { source: 'bank', description: 'PADARIA DO ZE' },
      { source: 'manual', description: 'ifood com a Maria' },
      { source: 'bank', description: 'Pix enviado para Fulano de Tal' },
      { source: 'bank', description: 'PIX FULANO DE TAL 123.456.789-09 UBER' },
    ]
    for (const over of latest) {
      // A compra de marca e mais antiga: so a mais recente decide.
      repo = makeRepo({ txs: [spend(20, over), olderBrand], fids: FIDS })
      sender = makeSender()
      await createNotifier({ repo, sender, now: () => NOW }).evaluateLimits({ hid: HID, person: 'ele' })
      const { body } = sender.calls[0].payload
      assert.equal(body, limitBody(limitId(repo), { spent: 12000, pct: '120%' }), over.description)
      assert.match(body, /Lazer/)
      assert.doesNotMatch(body, /iFood|Uber|PADARIA|Fulano|Maria|Pix|123/i, over.description)
    }
  })

  test('o limiar menor sai silencioso e um segundo check nao repete nada', async () => {
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.deepEqual(statuses(repo), ['100:enviado', '80:silencioso'])
    const again = await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    assert.equal(sender.calls.length, 1)
    assert.equal(again.events, 0)
    assert.equal(repo.events.size, 2)
  })

  test('o marcador guarda ids e chaves, nunca o texto do aviso, valor nem loja', async () => {
    repo.state.txs = [spend(120, { source: 'bank', description: 'IFOOD *PEDIDO' })]
    await notifier.evaluateLimits({ hid: HID, person: 'ele' })
    for (const marker of repo.events.values()) {
      assert.deepEqual(
        Object.keys(marker).filter((k) => !['enviados', 'sentAt'].includes(k)).sort(),
        ['categoryIcon', 'categoryId', 'categoryLabel', 'createdAt', 'cycleKey', 'dayKey', 'kind', 'ownerId', 'person', 'status', 'tag', 'threshold', 'url'].sort()
      )
      assert.equal(marker.ownerId, HID)
      assert.equal(marker.person, 'ele')
    }
    const { body } = sender.calls[0].payload
    assert.ok(body.includes(formatReais(12000)) && body.includes('iFood'), 'o corpo leva valor e loja')
    for (const marker of repo.events.values()) {
      const json = JSON.stringify(marker)
      assert.ok(!json.includes(body))
      assert.doesNotMatch(json, /R\$|iFood|IFOOD|PEDIDO|12000|120%/)
    }
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
  test('padrao 20 quando ausente ou invalido', () => {
    assert.equal(readMaxPerDay({}), 20)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: 'abc' }), 20)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '0' }), 20)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '-3' }), 20)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '2.5' }), 20)
    assert.equal(readMaxPerDay({ PUSH_MAX_PER_DAY: '5' }), 5)
  })
})

// Silencio das 22:00 as 08:00 (hora de Sao Paulo).
const QUIET_PREFS = {
  types: { limite80: true, limite100: true, espontanea: true, conta: true, compromisso: true },
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
    assert.equal(sender.calls[0].payload.body, limitBody(held[0], { tone: 'suave', spent: 12000, pct: '120%' }))
    assert.ok(legacyLimit(100, 'suave').includes(sender.calls[0].payload.body))
    assert.equal(repo.events.get(held[0]).status, 'enviado')
    // O dia do marcador passa a ser o da entrega (base do teto diario).
    assert.equal(repo.events.get(held[0]).dayKey, '2026-11-18')

    // Uma segunda rodada, ou um novo check, nao repete.
    await notifier.deliverHeld()
    await check()
    assert.equal(sender.calls.length, 1)
  })

  test('o aviso retido e montado com os valores do momento da entrega', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    repo.state.txs.push(spend(30, { source: 'bank', description: 'UBER *TRIP', date: new Date('2026-11-18T03:00:00Z') }))
    clock.t = T_0805
    await notifier.deliverHeld()
    const { body } = sender.calls[0].payload
    assert.equal(body, limitBody(limitId(repo), { spent: 15000, pct: '150%', loja: 'Uber' }))
    assert.ok(body.includes(formatReais(15000)) && body.includes('Uber'))
  })

  test('retido cuja categoria voltou para baixo do limiar sai sem numero nenhum', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    repo.state.txs = [spend(50)]
    clock.t = T_0805
    await notifier.deliverHeld()
    assert.equal(sender.calls.length, 1)
    assert.doesNotMatch(sender.calls[0].payload.body, /\d|R\$/)
  })

  test('retido entregue no ciclo seguinte leva os valores do ciclo do aviso', async () => {
    repo.state.prefs = QUIET_PREFS
    repo.state.txs = [spend(120, { date: new Date('2026-11-30T15:00:00Z') })]
    clock.t = at('2026-12-01T02:30:00Z') // 30/11 23:30 em Sao Paulo
    await check()
    repo.state.txs.push(spend(7, { date: new Date('2026-12-01T05:00:00Z') }))
    clock.t = at('2026-12-01T11:05:00Z')
    await notifier.deliverHeld()
    const { body } = sender.calls[0].payload
    assert.equal(body, limitBody(limitId(repo), { spent: 12000, pct: '120%' }))
  })

  test('sem conseguir ler os lancamentos, o retido de limite fica pendente e o log leva so o codigo', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = T_2330
    await check()
    const read = repo.readCycleTransactions
    repo.readCycleTransactions = async () => {
      throw Object.assign(new Error('Internet da Maria'), { code: 'unavailable' })
    }
    const error = mock.method(console, 'error', () => {})
    try {
      clock.t = T_0805
      assert.equal((await notifier.deliverHeld()).sent, 0)
      assert.equal(sender.calls.length, 0)
      assert.deepEqual(statuses(repo), ['100:pendente', '80:silencioso'])
      const text = error.mock.calls.map((c) => c.arguments.join(' ')).join('\n')
      assert.match(text, /unavailable/)
      assert.doesNotMatch(text, /Internet|Maria/)
    } finally {
      error.mock.restore()
    }
    repo.readCycleTransactions = read
    assert.equal((await notifier.deliverHeld()).sent, 2)
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
    setup({ settings, txs: [spend(120), spend(120, { categoryId: 'alimentacao', category: 'Alimentacao' })], fids: FIDS }, { maxPerDay: 8 })
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
  let feature

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
    feature = createPushFeature({ db, messaging, now: () => new Date(clock.t), env: {} })
    feature.notifier.evaluateLimits = async (args) => {
      sentMessages.push({ check: args })
      return { events: 0, claimed: 0, sent: 0 }
    }
    // A leitura de vencimentos usa consultas que o Firestore falso nao tem: o relogio a prova.
    feature.notifier.evaluateDue = async () => ({ events: 0, claimed: 0, sent: 0 })
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

  test('o check avalia os vencimentos depois dos limites, sem mudar a resposta mesmo se falharem', async () => {
    const original = feature.notifier.evaluateDue
    const due = []
    feature.notifier.evaluateDue = async (args) => {
      due.push({ args, limitsBefore: checks().length })
      throw new Error('falha dos vencimentos')
    }
    try {
      const before = checks().length
      const res = await post('tok-a-ele', { fid: 'fidAparelho00001' })
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { ok: true })
      // Sem excludeFid: o vencimento nao aparece como aviso dentro da tela.
      assert.deepEqual(due, [{ args: { hid: 'casalA', person: 'ele' }, limitsBefore: before + 1 }])
    } finally {
      feature.notifier.evaluateDue = original
    }
  })

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

// Fatura: fechamento dia 10 e vencimento dia 20. Os avisos saem em 18 (d2), 19 (d1) e 20/11 (d0).
const CARD = {
  id: 'cartao-ele',
  ownerId: HID,
  person: 'ele',
  name: 'Cartao Teste',
  billTotals: { '2026-11': 45067 },
  payments: [],
}
const CARD_CFG = { accountId: 'cartao-ele', ownerId: HID, closingDay: 10, dueDay: 20, nickname: 'Roxinho', paidMonths: [] }
const BILL_ID = 'casalA__ele__fatura__cartao-ele__2026-11-20__d2'

// Hora de parede de Sao Paulo (UTC-3) em um dia de novembro.
const nov = (day, hhmm) => at(`2026-11-${String(day).padStart(2, '0')}T${hhmm}:00-03:00`)

const expectedBody = (id, scene, slots, { tone = 'sem-filtro', gender = 'm' } = {}) =>
  composePush({ scene, tone, slots, gender, seed: id }).body

const MARKER_KEYS = ['createdAt', 'dayKey', 'daysLeft', 'dueKey', 'kind', 'ownerId', 'person', 'refId', 'status', 'tag', 'url']
const keysOf = (marker) => Object.keys(marker).filter((k) => !['enviados', 'sentAt'].includes(k)).sort()

describe('notificador de fatura', () => {
  let clock
  let repo
  let sender
  let notifier

  const setup = (opts = {}) => {
    clock = { t: nov(18, '10:00') }
    repo = makeRepo({ cards: [CARD], cardSettings: [CARD_CFG], fids: FIDS, ...opts })
    sender = makeSender()
    notifier = createNotifier({ repo, sender, now: () => new Date(clock.t) })
  }
  const bills = (person = 'ele', hid = HID) => notifier.evaluateDue({ hid, person })
  const billStatuses = () => [...repo.events.values()].map((e) => e.status)

  beforeEach(() => setup())

  test('fatura a 2 dias do vencimento gera um aviso unico, com o valor e sem o nome do cartao', async () => {
    const out = await bills()
    assert.deepEqual(out, { events: 1, claimed: 1, sent: 2 })
    assert.equal(sender.calls.length, 1)
    assert.deepEqual(sender.calls[0].fids.sort(), ['fidEle-aparelho1', 'fidEle-aparelho2'])
    const { payload } = sender.calls[0]
    assert.deepEqual(Object.keys(payload).sort(), ['body', 'tag', 'title', 'url'])
    assert.equal(payload.title, 'OINC')
    assert.equal(payload.tag, 'fatura-cartao-ele-2026-11-20')
    assert.equal(payload.url, '/cartoes')
    assert.equal(payload.body, expectedBody(BILL_ID, 'push-fatura-d2', { valor: formatReais(45067) }))
    assert.ok(payload.body.includes(formatReais(45067)), payload.body)
    assert.doesNotMatch(`${payload.title} ${payload.body}`, /Roxinho|Cartao Teste/)

    const marker = repo.events.get(BILL_ID)
    assert.deepEqual(keysOf(marker), MARKER_KEYS)
    assert.equal(marker.refId, 'cartao-ele')
    assert.equal(marker.dueKey, '2026-11-20')
    assert.equal(marker.daysLeft, 2)
    assert.equal(marker.status, 'enviado')
    assert.doesNotMatch(JSON.stringify(marker), /Roxinho|Cartao Teste|45067|450,67|R\$/)
  })

  test('sai um aviso em cada estagio (2, 1 e no dia), antes disso e depois do vencimento nada', async () => {
    clock.t = nov(17, '10:00')
    assert.equal((await bills()).events, 0)
    for (const day of [18, 19, 20, 21]) {
      clock.t = nov(day, '10:00')
      await bills()
      await bills()
    }
    assert.deepEqual(
      [...repo.events.keys()],
      [2, 1, 0].map((n) => `casalA__ele__fatura__cartao-ele__2026-11-20__d${n}`),
    )
    assert.equal(sender.calls.length, 3)
    assert.equal(sender.calls[2].payload.body, expectedBody([...repo.events.keys()][2], 'push-fatura-d0', { valor: formatReais(45067) }))
  })

  test('paga, marcada como paga, aberta, longe do vencimento ou sem as datas do dono nao gera', async () => {
    const cases = [
      { cards: [{ ...CARD, payments: [{ billMonth: '2026-11', cents: 45067 }] }] },
      { cardSettings: [{ ...CARD_CFG, paidMonths: ['2026-11'] }] },
      { cards: [{ ...CARD, billTotals: { '2026-12': 1000 } }] },
      { cardSettings: [{ ...CARD_CFG, dueDay: 28 }] },
      { cardSettings: [] },
      { cardSettings: [{ ...CARD_CFG, closingDay: null }] },
      { cards: [] },
    ]
    for (const opts of cases) {
      setup(opts)
      const out = await bills()
      assert.equal(out.events, 0, JSON.stringify(opts))
      assert.equal(sender.calls.length, 0)
      assert.equal(repo.events.size, 0)
    }
  })

  test('com o interruptor de vencimento desligado grava desligado e nao entrega depois', async () => {
    setup({ settings: settingsFor({ faturaEnabled: false }) })
    await bills()
    assert.deepEqual(billStatuses(), ['desligado'])
    await notifier.deliverHeld()
    repo.state.settings = settingsFor()
    await bills()
    assert.equal(sender.calls.length, 0)
  })

  test('cartao da outra pessoa ou de outro casal nao gera aviso', async () => {
    assert.equal((await bills('ela')).events, 0)
    assert.equal((await bills('ele', 'casalB')).events, 0)
    assert.equal(sender.calls.length, 0)
    // O cartao e da Ela: so o aparelho dela recebe.
    setup({ cards: [{ ...CARD, person: 'ela' }] })
    await bills('ele')
    await bills('ela')
    assert.deepEqual(sender.calls.map((c) => c.fids), [['fidEla-aparelho1']])
  })

  test('no silencio a fatura fica pendente e o deliverHeld entrega uma vez', async () => {
    repo.state.prefs = { ...QUIET_PREFS, quiet: { enabled: true, from: '09:30', to: '14:00' } }
    await bills()
    assert.deepEqual(billStatuses(), ['pendente'])
    assert.equal(sender.calls.length, 0)
    clock.t = nov(18, '14:05')
    await notifier.deliverHeld()
    await notifier.deliverHeld()
    await bills()
    assert.equal(sender.calls.length, 1)
    assert.equal(sender.calls[0].payload.body, expectedBody(BILL_ID, 'push-fatura-d2', { valor: formatReais(45067) }))
    assert.deepEqual(billStatuses(), ['enviado'])
  })

  test('falha transitoria apaga o marcador e a avaliacao seguinte reenvia', async () => {
    sender.result = { sent: 0, dead: 0, failed: 2 }
    await bills()
    assert.equal(repo.events.size, 0)
    sender.result = null
    await bills()
    assert.deepEqual(billStatuses(), ['enviado'])
  })

  test('entrada invalida nao faz nada', async () => {
    assert.equal((await bills('porquinho')).events, 0)
    assert.equal((await bills('ele', '')).events, 0)
    assert.equal(repo.events.size, 0)
  })
})

// Leitura falsa de contas, pagamentos e compromissos: filtra so o casal, para provar que a pessoa
// e filtrada tambem no estagio.
function makeDue(data = {}) {
  const state = { bills: [], payments: [], events: [], fail: null, calls: [], ...data }
  const load = async ({ hid, person }) => {
    state.calls.push({ hid, person })
    if (state.fail) throw state.fail
    const own = (list) => list.filter((x) => x.ownerId === hid).map((x) => ({ ...x }))
    return { bills: own(state.bills), payments: own(state.payments), events: own(state.events) }
  }
  return { state, load }
}

const bill = (id, person, over = {}) => ({
  id,
  ownerId: HID,
  person,
  name: 'Internet da Maria',
  dueDay: 20,
  amountCents: 12990,
  ...over,
})
const paid = (billId) => ({ ownerId: HID, billId, month: 11, year: 2026, paidCents: 12990 })
const appointment = (id, person, over = {}) => ({
  id,
  ownerId: HID,
  person,
  title: 'Dentista com o Pedro',
  date: new Date('2026-11-20T15:00:00Z'),
  time: '14:30',
  ...over,
})
const billMarker = (n, ref = 'luz', person = 'ele') => `casalA__${person}__conta__${ref}__2026-11-20__d${n}`

describe('notificador de contas e compromissos', () => {
  let clock
  let repo
  let sender
  let due
  let notifier

  const build = (config = {}) =>
    createNotifier({ repo, sender, now: () => new Date(clock.t), config, loadDue: due.load })
  const setup = (data = { bills: [bill('luz', 'ele')] }, opts = {}, config = {}) => {
    clock = { t: nov(18, '10:00') }
    repo = makeRepo({ fids: FIDS, ...opts })
    repo.readCycleTransactions = async () => assert.fail('o aviso de vencimento nunca le lancamentos')
    sender = makeSender()
    due = makeDue(data)
    notifier = build(config)
  }
  const run = (person = 'ele') => notifier.evaluateDue({ hid: HID, person })
  const statusOf = () => [...repo.events.values()].map((e) => e.status)

  beforeEach(() => setup())

  test('a conta gera um aviso em D-2, outro em D-1 e outro no dia, uma vez cada', async () => {
    for (const day of [17, 18, 19, 20, 21]) {
      clock.t = nov(day, '10:00')
      await run()
      await run()
    }
    assert.deepEqual([...repo.events.keys()], [billMarker(2), billMarker(1), billMarker(0)])
    assert.equal(sender.calls.length, 3)
    assert.deepEqual(sender.calls.map((c) => c.payload.url), ['/contas-fixas', '/contas-fixas', '/contas-fixas'])
    assert.equal(new Set(sender.calls.map((c) => c.payload.tag)).size, 1)
    for (const [i, id] of [billMarker(2), billMarker(1), billMarker(0)].entries()) {
      const slots = { conta: 'Internet da Maria', valor: formatReais(12990) }
      assert.equal(sender.calls[i].payload.body, expectedBody(id, `push-conta-d${2 - i}`, slots))
    }
  })

  test('paga antes do dia nao gera o aviso do dia', async () => {
    await run()
    clock.t = nov(19, '10:00')
    due.state.payments = [paid('luz')]
    await run()
    clock.t = nov(20, '10:00')
    await run()
    assert.deepEqual([...repo.events.keys()], [billMarker(2)])
    assert.equal(sender.calls.length, 1)
  })

  test('antes de PUSH_DUE_HOUR nada sai, nem marcador', async () => {
    clock.t = nov(18, '08:59')
    assert.deepEqual(await run(), { events: 0, claimed: 0, sent: 0 })
    assert.equal(repo.events.size, 0)
    assert.equal(due.state.calls.length, 0, 'antes da hora nem le')
    clock.t = nov(18, '09:00')
    assert.equal((await run()).sent, 2)

    setup(undefined, {}, { dueHour: 14 })
    clock.t = nov(18, '13:59')
    assert.equal((await run()).sent, 0)
    clock.t = nov(18, '14:00')
    assert.equal((await run()).sent, 2)
  })

  test('reinicio do servidor nao duplica', async () => {
    await run()
    notifier = build()
    assert.deepEqual(await run(), { events: 1, claimed: 0, sent: 0 })
    assert.equal(sender.calls.length, 1)
  })

  test('o marcador tem so referencias: nem nome, nem valor, nem titulo, nem texto', async () => {
    setup({ bills: [bill('luz', 'ele')], events: [appointment('consulta', 'ele')] })
    await run()
    assert.equal(repo.events.size, 2)
    for (const marker of repo.events.values()) {
      assert.deepEqual(keysOf(marker), MARKER_KEYS)
      assert.doesNotMatch(JSON.stringify(marker), /Internet|Maria|Dentista|Pedro|12990|129,90|R\$|14:30/)
      for (const call of sender.calls) assert.ok(!JSON.stringify(marker).includes(call.payload.body))
    }
  })

  test('o corpo traz o nome da conta como escrito e o valor, com o CPF do nome mascarado', async () => {
    setup({ bills: [bill('luz', 'ele', { name: 'Pensao Joao Silva 123.456.789-09' })] })
    await run()
    const { body } = sender.calls[0].payload
    assert.ok(body.includes('Pensao Joao Silva ***'), body)
    assert.ok(body.includes(formatReais(12990)), body)
    assert.ok(!body.includes('123.456'), body)
  })

  test('o texto sai no tom das configuracoes', async () => {
    repo.state.settings = settingsFor({ tone: 'direto' })
    await run()
    const slots = { conta: 'Internet da Maria', valor: formatReais(12990) }
    assert.equal(sender.calls[0].payload.body, expectedBody(billMarker(2), 'push-conta-d2', slots, { tone: 'direto' }))
  })

  test('compromisso avisa 2 e 1 dia antes, nunca no dia, com o titulo como escrito', async () => {
    setup({ events: [appointment('consulta', 'ele')] })
    for (const day of [18, 19, 20]) {
      clock.t = nov(day, '10:00')
      await run()
    }
    const ids = [2, 1].map((n) => `casalA__ele__compromisso__consulta__2026-11-20__d${n}`)
    assert.deepEqual([...repo.events.keys()], ids)
    assert.equal(sender.calls.length, 2)
    assert.equal(sender.calls[0].payload.url, '/calendario')
    const slots = { titulo: 'Dentista com o Pedro', hora: '14:30' }
    assert.equal(sender.calls[0].payload.body, expectedBody(ids[0], 'push-compromisso-d2', slots))
    assert.equal(sender.calls[1].payload.body, expectedBody(ids[1], 'push-compromisso-d1', slots))
  })

  test('renomear o compromisso nao gera aviso novo (o id e o do documento)', async () => {
    setup({ events: [appointment('consulta', 'ele')] })
    await run()
    due.state.events = [appointment('consulta', 'ele', { title: 'Outro nome' })]
    assert.equal((await run()).claimed, 0)
    assert.equal(sender.calls.length, 1)
  })

  test('cada pessoa recebe so o proprio e o do casal, nos dois sentidos', async () => {
    setup({
      bills: [bill('so-ele', 'ele'), bill('so-ela', 'ela'), bill('casal', 'conjunto')],
      events: [appointment('ev-ele', 'ele'), appointment('ev-ela', 'ela'), appointment('ev-casal', 'conjunto')],
    })
    await run('ele')
    await run('ela')
    const refs = (person) => [...repo.events.values()].filter((e) => e.person === person).map((e) => e.refId).sort()
    assert.deepEqual(refs('ele'), ['casal', 'ev-casal', 'ev-ele', 'so-ele'])
    assert.deepEqual(refs('ela'), ['casal', 'ev-casal', 'ev-ela', 'so-ela'])
    const eleCalls = sender.calls.filter((c) => c.fids.includes('fidEle-aparelho1'))
    const elaCalls = sender.calls.filter((c) => c.fids.includes('fidEla-aparelho1'))
    assert.equal(eleCalls.length, 4)
    assert.equal(elaCalls.length, 4)
    assert.equal(sender.calls.length, 8)
    for (const c of sender.calls) assert.ok(!(c.fids.includes('fidEle-aparelho1') && c.fids.includes('fidEla-aparelho1')))
    // Outro casal nao ve nada.
    assert.equal((await notifier.evaluateDue({ hid: 'casalB', person: 'ele' })).events, 0)
  })

  test('varias contas no mesmo dia saem uma a uma', async () => {
    setup({ bills: [bill('luz', 'ele'), bill('agua', 'ele', { name: 'Agua' })] })
    await run()
    assert.equal(sender.calls.length, 2)
    assert.equal(new Set(sender.calls.map((c) => c.payload.tag)).size, 2)
  })

  test('tipo desligado grava desligado; o interruptor da fatura nao desliga a conta', async () => {
    repo.state.prefs = { ...DEFAULT_PUSH_PREFS, types: { ...DEFAULT_PUSH_PREFS.types, conta: false } }
    await run()
    assert.deepEqual(statusOf(), ['desligado'])
    assert.equal(sender.calls.length, 0)

    setup({ events: [appointment('consulta', 'ele')] })
    repo.state.prefs = { ...DEFAULT_PUSH_PREFS, types: { ...DEFAULT_PUSH_PREFS.types, compromisso: false } }
    await run()
    assert.deepEqual(statusOf(), ['desligado'])

    setup(undefined, { settings: settingsFor({ faturaEnabled: false }) })
    await run()
    assert.deepEqual(statusOf(), ['enviado'])
  })

  const holding = (from, to) => ({ ...QUIET_PREFS, quiet: { enabled: true, from, to } })

  test('retido no silencio sai no mesmo dia com os dados relidos', async () => {
    repo.state.prefs = holding('09:30', '14:00')
    await run()
    assert.deepEqual(statusOf(), ['pendente'])
    due.state.bills = [bill('luz', 'ele', { name: 'Luz nova', amountCents: 5000 })]
    clock.t = nov(18, '14:05')
    assert.equal((await notifier.deliverHeld()).sent, 2)
    assert.equal(
      sender.calls[0].payload.body,
      expectedBody(billMarker(2), 'push-conta-d2', { conta: 'Luz nova', valor: formatReais(5000) }),
    )
    assert.deepEqual(statusOf(), ['enviado'])
  })

  test('retido e pago vira expirado e nao envia', async () => {
    repo.state.prefs = holding('09:30', '14:00')
    await run()
    due.state.payments = [paid('luz')]
    clock.t = nov(18, '14:05')
    const out = await notifier.deliverHeld()
    assert.equal(out.expired, 1)
    assert.equal(out.sent, 0)
    assert.equal(sender.calls.length, 0)
    assert.deepEqual(statusOf(), ['expirado'])
  })

  test('retido com o dia passado vira expirado, e o estagio do dia novo sai normalmente', async () => {
    repo.state.prefs = QUIET_PREFS
    clock.t = nov(18, '23:30')
    await run()
    clock.t = nov(19, '08:05')
    assert.equal((await notifier.deliverHeld()).expired, 1)
    assert.equal(sender.calls.length, 0)
    clock.t = nov(19, '09:00')
    await run()
    assert.equal(repo.events.get(billMarker(2)).status, 'expirado')
    assert.equal(repo.events.get(billMarker(1)).status, 'enviado')
    assert.equal(sender.calls.length, 1)
  })

  test('aviso de fatura antigo, retido antes da troca de formato, vira expirado', async () => {
    repo.events.set('casalA__fatura__cartao-ele__2026-11', {
      ownerId: HID, person: 'ele', kind: 'fatura', cardId: 'cartao-ele', billMonth: '2026-11', tag: 'fatura-cartao-ele', url: '/cartoes', status: 'pendente',
    })
    assert.equal((await notifier.deliverHeld()).expired, 1)
    assert.equal(sender.calls.length, 0)
  })

  test('com 3 aleatorias ja enviadas, as fixas continuam saindo ate o teto proprio', async () => {
    setup(
      { bills: [bill('a', 'ele'), bill('b', 'ele'), bill('c', 'ele')] },
      {},
      { maxPerDay: 2 },
    )
    for (let i = 0; i < 3; i++) {
      repo.events.set(`aleatoria-${i}`, { ownerId: HID, person: 'ele', kind: 'espontanea', status: 'enviado', dayKey: '2026-11-18' })
    }
    await run()
    assert.equal(sender.calls.length, 2)
    const own = [...repo.events.values()].filter((e) => e.kind === 'conta').map((e) => e.status)
    assert.deepEqual(own, ['enviado', 'enviado', 'teto'])
  })

  test('as fixas nao gastam o limite das aleatorias', async () => {
    setup(undefined, {}, { maxPerDay: 1, spontWindow: { from: '09:00', to: '10:00' } })
    await run()
    assert.equal(sender.calls.length, 1)
    clock.t = nov(18, '09:59')
    assert.equal((await notifier.evaluateSpontaneous({ hid: HID, person: 'ele' })).sent, 2)
  })

  test('sem a leitura injetada avisa so as faturas e deixa o retido de conta pendente', async () => {
    setup(undefined, { cards: [CARD], cardSettings: [CARD_CFG] })
    notifier = createNotifier({ repo, sender, now: () => new Date(clock.t) })
    await run()
    assert.deepEqual([...repo.events.values()].map((e) => e.kind), ['fatura'])

    repo.events.set(billMarker(2), { ownerId: HID, person: 'ele', kind: 'conta', refId: 'luz', daysLeft: 2, tag: 't', url: '/', status: 'pendente' })
    const out = await notifier.deliverHeld()
    assert.equal(out.expired, 0)
    assert.equal(repo.events.get(billMarker(2)).status, 'pendente')
  })

  test('falha na leitura de contas nao derruba a fatura, nao expira o retido e o log leva so o codigo', async () => {
    setup(undefined, { cards: [CARD], cardSettings: [CARD_CFG] })
    repo.state.prefs = holding('09:30', '14:00')
    await run()
    assert.equal(repo.events.size, 2)

    const error = mock.method(console, 'error', () => {})
    try {
      due.state.fail = Object.assign(new Error('Internet da Maria'), { code: 'unavailable' })
      clock.t = nov(18, '14:05')
      const out = await notifier.deliverHeld()
      assert.equal(out.expired, 0)
      assert.equal(repo.events.get(billMarker(2)).status, 'pendente')
      assert.equal(repo.events.get(BILL_ID).status, 'enviado')
      clock.t = nov(19, '10:00')
      repo.state.prefs = DEFAULT_PUSH_PREFS
      await run()
      assert.equal(repo.events.get('casalA__ele__fatura__cartao-ele__2026-11-20__d1').status, 'enviado')
      const text = error.mock.calls.map((c) => c.arguments.join(' ')).join('\n')
      assert.match(text, /unavailable/)
      assert.doesNotMatch(text, /Internet|Maria/)
    } finally {
      error.mock.restore()
    }
  })
})

// Dia de Sao Paulo (UTC-3) em passos de 15 minutos, como o relogio.
const QUARTERS = Array.from({ length: 96 }, (_, i) => i * 15)
const spAt = (day, minute) => at(`2026-11-${String(day).padStart(2, '0')}T03:00:00Z`) + minute * 60_000

// Leitura falsa dos dados completos (a forma de snapshot.load), so do par pedido.
function makeSnapshot(clock, settings, data = {}) {
  const state = { txs: [], goals: [], calls: [], ...data }
  const load = async ({ hid, person }) => {
    state.calls.push(`${hid}:${person}`)
    const own = (list) => list.filter((x) => (x.ownerId ?? HID) === hid && x.person === person)
    const now = new Date(clock.t)
    const { salaryDay } = settings().personConfig
    return {
      input: {
        now,
        person,
        cycle: cycleOf(now, salaryDay),
        config: settings().personConfig,
        categoryDefs: settings().categoryDefs,
        transactions: own(state.txs),
        prevTransactions: [],
        bills: [],
        payments: [],
        goals: own(state.goals),
      },
      reads: state.txs.length,
    }
  }
  return { state, load }
}

const pushLine = (id) =>
  Object.values(OINC_PUSH_LINES)
    .flatMap((byTone) => Object.values(byTone))
    .flat()
    .find((line) => line.id === id)
const sceneOfPhrase = (phraseId) => phraseId.replace(/-\d{3}$/, '')

const SPONT_KEYS = ['createdAt', 'dayKey', 'kind', 'ownerId', 'person', 'phraseId', 'slot', 'status', 'tag', 'url']
const BANDS = [1, 2, 3].map((slot) => ({ slot, from: 9 * 60 + (slot - 1) * 240, to: 9 * 60 + slot * 240 }))
// Um instante em que a vaga ja esta liberada: 15 minutos antes do fim da faixa.
const dueMinute = (slot) => BANDS[slot - 1].to - 15
const spontId = (day, slot, person = 'ele', hid = HID) =>
  `${hid}__${person}__espontanea__2026-11-${String(day).padStart(2, '0')}__${slot}`

describe('notificador: push espontaneo', () => {
  let clock
  let repo
  let sender
  let snapshot
  let memory
  let oincState
  let notifier

  const build = (config = {}) =>
    createNotifier({ repo, sender, now: () => new Date(clock.t), config, loadSnapshot: snapshot.load, oincState })

  const setup = (opts = {}, config = {}, data = {}) => {
    clock = { t: spAt(17, 0) }
    repo = makeRepo({ fids: FIDS, ...opts })
    repo.readCycleTransactions = async () => assert.fail('o espontaneo le os dados so pelo loadSnapshot')
    sender = makeSender()
    snapshot = makeSnapshot(clock, () => repo.state.settings, data)
    memory = createMemoryDb()
    oincState = createOincState({ db: memory, now: () => new Date(clock.t), log: { warn() {} } })
    notifier = build(config)
  }

  const spont = (person = 'ele', hid = HID) => notifier.evaluateSpontaneous({ hid, person })
  const atSlot = async (slot, { day = 17, person = 'ele', hid = HID } = {}) => {
    clock.t = spAt(day, dueMinute(slot))
    return spont(person, hid)
  }
  const recentOf = (person = 'ele', hid = HID) => memory.read('oincState', `${hid}__${person}`)?.pushRecent ?? []
  const lastBody = () => sender.calls.at(-1).payload.body

  // Roda o dia inteiro e devolve os minutos (hora de Sao Paulo) em que saiu um aviso.
  const runDay = async (day, person = 'ele') => {
    const out = []
    for (const minute of QUARTERS) {
      clock.t = spAt(day, minute)
      if ((await spont(person)).sent > 0) out.push(minute)
    }
    return out
  }
  const oneEachBand = (sent, label = '') => {
    assert.equal(sent.length, 3, `${label} ${sent}`)
    sent.forEach((minute, i) => assert.ok(minute >= BANDS[i].from && minute < BANDS[i].to, `${label} faixa ${i + 1}: ${minute}`))
  }

  beforeEach(() => setup())

  test('saem tres por dia, um por faixa, com id e tag por vaga e marcador so com ids', async () => {
    oneEachBand(await runDay(17))
    const ids = [1, 2, 3].map((slot) => spontId(17, slot))
    assert.deepEqual([...repo.events.keys()], ids)
    assert.deepEqual(sender.calls.map((c) => c.payload.tag), ['espontanea-1', 'espontanea-2', 'espontanea-3'])
    assert.deepEqual(sender.calls.map((c) => c.payload.url), ['/', '/', '/'])
    // sem compra: ritmo, depois do nada, depois ritmo de novo
    const phrases = ids.map((id) => repo.events.get(id).phraseId)
    assert.deepEqual(phrases.map(sceneOfPhrase), ['push-ritmo', 'push-nada', 'push-ritmo'])
    assert.equal(new Set(phrases).size, 3)
    assert.equal(sender.calls[1].payload.body, pushLine(phrases[1]).t)
    assert.match(sender.calls[0].payload.body, /R\$/)
    for (const [i, id] of ids.entries()) {
      const marker = repo.events.get(id)
      assert.deepEqual(keysOf(marker), SPONT_KEYS)
      assert.equal(marker.slot, i + 1)
      assert.equal(marker.status, 'enviado')
      assert.doesNotMatch(JSON.stringify(marker), /R\$/)
      assert.ok(!JSON.stringify(marker).includes(sender.calls[i].payload.body))
    }
    assert.deepEqual(recentOf(), phrases)
  })

  test('o horario muda de pessoa para pessoa e de dia para dia, sempre um por faixa', async () => {
    const times = { ele: [], ela: [] }
    for (let day = 1; day <= 14; day++) {
      for (const person of ['ele', 'ela']) {
        const sent = await runDay(day, person)
        oneEachBand(sent, `dia ${day} ${person}`)
        times[person].push(sent[0])
      }
    }
    assert.ok(new Set(times.ele).size >= 5, 'o horario quase nao varia entre os dias')
    assert.notDeepEqual(times.ele, times.ela)
  })

  test('a janela vem da configuracao', async () => {
    setup({}, { spontWindow: { from: '08:00', to: '09:00' } })
    for (let day = 1; day <= 7; day++) {
      const sent = await runDay(day)
      assert.equal(sent.length, 3)
      assert.ok(sent.every((m) => m >= 8 * 60 && m < 9 * 60), `${sent}`)
    }
  })

  test('a segunda rodada na mesma faixa nao le os dados de novo', async () => {
    assert.equal((await atSlot(1)).sent, 2)
    assert.equal(snapshot.state.calls.length, 1)
    let settingsReads = 0
    const readSettings = repo.readSettings
    repo.readSettings = async (...args) => (settingsReads++, readSettings(...args))
    assert.deepEqual(await spont(), { events: 0, claimed: 0, sent: 0 })
    assert.equal(snapshot.state.calls.length, 1)
    assert.equal(settingsReads, 0)
    assert.equal(sender.calls.length, 1)
  })

  test('antes do minuto sorteado e fora da janela nada e lido', async () => {
    const boom = async () => assert.fail('nao podia ler')
    repo.readPrefs = repo.listFids = repo.eventExists = repo.readSettings = boom
    for (const minute of [0, 8 * 60 + 59, 21 * 60, 23 * 60]) {
      clock.t = spAt(17, minute)
      assert.deepEqual(await spont(), { events: 0, claimed: 0, sent: 0 })
    }
    assert.equal(snapshot.state.calls.length, 0)
  })

  test('nunca sai no silencio e no silencio nao cria marcador', async () => {
    setup({ prefs: { ...DEFAULT_PUSH_PREFS, quiet: { enabled: true, from: '09:00', to: '21:00' } } })
    assert.deepEqual(await runDay(17), [])
    assert.equal(repo.events.size, 0)
    assert.equal(snapshot.state.calls.length, 0)

    // Silencio que acaba antes do fim da janela: so a vaga da faixa atual sai, as perdidas nao voltam.
    setup({ prefs: { ...DEFAULT_PUSH_PREFS, quiet: { enabled: true, from: '09:00', to: '19:30' } } })
    const sent = await runDay(17)
    assert.equal(sent.length, 1)
    assert.ok(sent[0] >= 19 * 60 + 30 && sent[0] < 21 * 60)
  })

  test('tipo desligado, parametro zero, sem aparelho ou entrada invalida nao criam marcador nem leem dados', async () => {
    const off = { ...DEFAULT_PUSH_PREFS, types: { ...DEFAULT_PUSH_PREFS.types, espontanea: false } }
    for (const [opts, config] of [[{ prefs: off }, {}], [{}, { spontPerDay: 0 }], [{ fids: {} }, {}]]) {
      setup(opts, config)
      repo.eventExists = repo.readSettings = async () => assert.fail('nao podia ler')
      assert.deepEqual(await runDay(17), [])
      assert.equal(repo.events.size, 0)
      assert.equal(snapshot.state.calls.length, 0)
    }
    setup()
    clock.t = spAt(17, dueMinute(3))
    assert.equal((await spont('porquinho')).events, 0)
    assert.equal((await spont('ele', '')).events, 0)
  })

  test('um notificador novo no mesmo dia (reinicio) nao repete', async () => {
    await runDay(17)
    notifier = build()
    assert.deepEqual(await runDay(17), [])
    assert.equal(sender.calls.length, 3)
  })

  test('um reinicio no fim do dia nao solta em rajada as vagas perdidas', async () => {
    clock.t = spAt(17, 20 * 60 + 55)
    for (let i = 0; i < 4; i++) await spont()
    assert.equal(sender.calls.length, 1)
    assert.deepEqual([...repo.events.keys()], [spontId(17, 3)])
  })

  test('compra de ontem sai dizendo ontem, com valor e marca, e nao e narrada duas vezes', async () => {
    setup({}, {}, { txs: [spend(40, { id: 'bank_pedido-1', source: 'bank', description: 'IFOOD *PEDIDO 987' })] })
    await atSlot(1)
    const body = lastBody()
    assert.match(body, /ontem/i)
    assert.match(body, /iFood/)
    assert.ok(body.includes(formatReais(4000)), body)
    assert.doesNotMatch(body, /PEDIDO|987/)
    const marker = repo.events.get(spontId(17, 1))
    assert.equal(marker.txId, 'bank_pedido-1')
    assert.equal(sceneOfPhrase(marker.phraseId), 'push-compra')
    assert.deepEqual(keysOf(marker), [...SPONT_KEYS, 'txId'].sort())
    assert.doesNotMatch(JSON.stringify(marker), /iFood|IFOOD|R\$|4000/)
    assert.deepEqual(recentOf(), [marker.phraseId, 'tx:bank_pedido-1'])

    await atSlot(2)
    const second = repo.events.get(spontId(17, 2))
    assert.equal(second.txId, undefined)
    assert.notEqual(sceneOfPhrase(second.phraseId), 'push-compra')
    assert.ok(!lastBody().includes(formatReais(4000)))
  })

  test('a compra de hoje vem antes da de ontem, uma por aviso; entrada e compra antiga ficam de fora', async () => {
    setup({}, {}, {
      txs: [
        spend(11, { id: 'antiga', date: new Date('2026-11-14T15:00:00Z') }),
        spend(22, { id: 'ontem' }),
        spend(33, { id: 'hoje', date: new Date('2026-11-17T11:00:00Z') }),
        spend(44, { id: 'entrada', type: 'entrada', date: new Date('2026-11-17T11:00:00Z') }),
        spend(55, { id: 'transferencia', transfer: true, date: new Date('2026-11-17T11:00:00Z') }),
      ],
    })
    for (const slot of [1, 2, 3]) await atSlot(slot)
    const txIds = [1, 2, 3].map((slot) => repo.events.get(spontId(17, slot)).txId)
    assert.deepEqual(txIds, ['hoje', 'ontem', undefined])
    assert.ok(sender.calls[0].payload.body.includes(formatReais(3300)))
    assert.match(sender.calls[1].payload.body, /ontem/i)
    // a mesma cena nao repete a fala
    assert.notEqual(repo.events.get(spontId(17, 1)).phraseId, repo.events.get(spontId(17, 2)).phraseId)
  })

  test('loja local, lancamento manual e Pix: so a categoria, nunca a descricao nem o nome da pessoa', async () => {
    const cases = [
      { source: 'bank', description: 'PADARIA DO ZE' },
      { source: 'manual', description: 'ifood com a Maria' },
      { source: 'bank', description: 'Pix enviado para Fulano de Tal' },
      { source: 'bank', description: 'PIX FULANO DE TAL 123.456.789-09 UBER' },
    ]
    for (const over of cases) {
      setup({}, {}, { txs: [spend(40, { id: 'compra-1', ...over })] })
      await atSlot(1)
      const body = lastBody()
      assert.match(body, /Lazer/, over.description)
      assert.match(body, /ontem/i, over.description)
      assert.doesNotMatch(body, /iFood|Uber|PADARIA|Fulano|Maria|Pix|123/i, over.description)
    }
  })

  test('marca conhecida aparece mesmo quando a cena da compra nao usa loja', async () => {
    setup({}, {}, { txs: [spend(40, { id: 'corrida', source: 'bank', description: 'UBER *TRIP' })] })
    await atSlot(1)
    assert.match(lastBody(), /Uber/)
  })

  test('compra de ontem sem loja nem categoria nao e narrada, porque a fala nao diria ontem', async () => {
    const bare = { categoryId: undefined, category: '' }
    setup({}, {}, { txs: [spend(40, { id: 'sem-nada', ...bare })] })
    await atSlot(1)
    assert.equal(repo.events.get(spontId(17, 1)).txId, undefined)

    // A de hoje pode: a fala sem quando nao afirma outro dia.
    setup({}, {}, { txs: [spend(40, { id: 'sem-nada', ...bare, date: new Date('2026-11-17T11:00:00Z') })] })
    await atSlot(1)
    assert.equal(repo.events.get(spontId(17, 1)).txId, 'sem-nada')
    assert.ok(lastBody().includes(formatReais(4000)))
  })

  test('sem compra, alterna ritmo, meta e do nada', async () => {
    setup({}, {}, { goals: [{ person: 'ele', name: 'Viagem', targetCents: 100000, currentCents: 25000 }] })
    for (const slot of [1, 2, 3]) await atSlot(slot)
    const phrases = [1, 2, 3].map((slot) => repo.events.get(spontId(17, slot)).phraseId)
    assert.deepEqual(phrases.map(sceneOfPhrase), ['push-ritmo', 'push-meta', 'push-nada'])
    assert.match(sender.calls[1].payload.body, /Viagem|meta/i)
    assert.ok(sender.calls[1].payload.body.includes(formatReais(75000)), sender.calls[1].payload.body)
  })

  test('sem renda configurada nem meta, fala do nada', async () => {
    const settings = settingsFor()
    settings.personConfig = { salaryDay: 1, expectedIncomeCents: 0, incomeOverrides: {}, limits: {} }
    setup({ settings })
    await atSlot(1)
    assert.equal(sceneOfPhrase(repo.events.get(spontId(17, 1)).phraseId), 'push-nada')
    assert.doesNotMatch(lastBody(), /R\$/)
  })

  test('cada par fala so do proprio gasto, no proprio aparelho', async () => {
    const bank = { source: 'bank' }
    setup({ fids: { ...FIDS, 'casalB:ele': ['fidB-ele-aparelho'] } }, {}, {
      txs: [
        spend(40, { ...bank, id: 'a-ele', description: 'IFOOD *PEDIDO' }),
        spend(25, { ...bank, id: 'a-ela', person: 'ela', description: 'UBER *TRIP' }),
        spend(99, { ...bank, id: 'b-ele', ownerId: 'casalB', description: 'NETFLIX.COM' }),
      ],
    })
    await atSlot(1, { person: 'ele' })
    await atSlot(1, { person: 'ela' })
    await atSlot(1, { hid: 'casalB' })
    assert.deepEqual(sender.calls.map((c) => c.fids), [FIDS['casalA:ele'], FIDS['casalA:ela'], ['fidB-ele-aparelho']])
    const [ele, ela, b] = sender.calls.map((c) => c.payload.body)
    assert.ok(ele.includes(formatReais(4000)) && !ele.includes(formatReais(2500)) && !ele.includes(formatReais(9900)), ele)
    assert.ok(ela.includes(formatReais(2500)) && !ela.includes(formatReais(4000)), ela)
    assert.ok(b.includes(formatReais(9900)) && !b.includes(formatReais(4000)), b)
    assert.deepEqual(recentOf('ela').filter((k) => k.startsWith('tx:')), ['tx:a-ela'])
  })

  test('em suave e direto sai o texto de aviso de hoje, sem repetir e sem ler os dados', async () => {
    for (const tone of ['suave', 'direto']) {
      setup({ settings: settingsFor({ tone }) }, {}, { txs: [spend(40, { source: 'bank', description: 'IFOOD' })] })
      for (const day of [17, 18]) for (const slot of [1, 2, 3]) await atSlot(slot, { day })
      const bank = PUSH_PHRASES['push-espontanea'][tone].map((p) => p.t)
      const bodies = sender.calls.map((c) => c.payload.body)
      assert.equal(bodies.length, 6)
      for (const body of bodies) assert.ok(bank.includes(body), body)
      // 6 falas no banco: as 6 saem antes de qualquer repeticao
      assert.equal(new Set(bodies).size, 6)
      assert.equal(snapshot.state.calls.length, 0)
      assert.equal(sender.calls[0].payload.body, composePush({ scene: 'push-nada', tone, seed: spontId(17, 1) }).body)
    }
  })

  test('fala reprovada no estado da pessoa nao sai', async () => {
    const first = composePush({ scene: 'push-nada', tone: 'suave', seed: spontId(17, 1) }).phraseId
    setup({ settings: settingsFor({ tone: 'suave' }) })
    await memory.collection('oincState').doc('casalA__ele').set({ ownerId: HID, person: 'ele', rejected: [first] })
    await atSlot(1)
    assert.notEqual(repo.events.get(spontId(17, 1)).phraseId, first)
  })

  test('envio que falha nao conta como narrado e a mesma faixa tenta de novo', async () => {
    setup({}, {}, { txs: [spend(40, { id: 'compra-1' })] })
    sender.result = { sent: 0, dead: 0, failed: 2 }
    await atSlot(1)
    assert.equal(repo.events.size, 0)
    assert.deepEqual(recentOf(), [])
    sender.result = null
    await spont()
    assert.equal(repo.events.get(spontId(17, 1)).txId, 'compra-1')
    assert.equal(recentOf().at(-1), 'tx:compra-1')
  })
})
