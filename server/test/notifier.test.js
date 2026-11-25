import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf } from '../../shared/core/cycle.js'
import { DEFAULT_CATEGORY_DEFS } from '../../shared/core/categories.js'
import { DEFAULT_PUSH_PREFS } from '../../shared/core/pushPrefs.js'
import { PUSH_PHRASES, buildPushPayload } from '../../shared/core/vintemPhrasesPush.js'
import { createNotifier, readMaxPerDay } from '../src/push/notifier.js'

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
