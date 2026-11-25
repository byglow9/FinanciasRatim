import { test, describe, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CATEGORY_DEFS } from '../../shared/core/categories.js'
import { DEFAULT_PUSH_PREFS } from '../../shared/core/pushPrefs.js'
import { readPushConfig } from '../src/push/config.js'
import { createNotifier } from '../src/push/notifier.js'
import { createTick } from '../src/push/tick.js'

// 17/11 as 12:00 em Sao Paulo.
const NOW = Date.parse('2026-11-17T15:00:00Z')
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

const reg = (fid, ownerId, person, ageDays = 0) => ({ fid, ownerId, person, updatedAt: new Date(NOW - ageDays * DAY) })

function makeRegistry(list) {
  const state = { list: [...list], deleted: [] }
  return {
    state,
    async listRegistrations() {
      return state.list.map((r) => ({ ...r }))
    },
    async deleteRegistration(fid) {
      state.deleted.push(fid)
      state.list = state.list.filter((r) => r.fid !== fid)
    },
  }
}

function makeNotifier() {
  const calls = []
  const notifier = {
    calls,
    failFor: null,
    async evaluateSpontaneous({ hid, person }) {
      calls.push(`espontaneo:${hid}:${person}`)
      if (notifier.failFor === `${hid}:${person}`) throw Object.assign(new Error('Fulano 123'), { code: 'unavailable' })
      return { sent: 0 }
    },
    async evaluateBills({ hid, person }) {
      calls.push(`fatura:${hid}:${person}`)
      if (notifier.failFor === `${hid}:${person}`) throw new Error('falha')
      return { sent: 0 }
    },
    async deliverHeld() {
      calls.push('retidos')
      return { sent: 0 }
    },
  }
  return notifier
}

const REGS = [
  reg('fidEle-aparelho1', 'casalA', 'ele'),
  reg('fidEle-aparelho2', 'casalA', 'ele'),
  reg('fidEla-aparelho1', 'casalA', 'ela'),
  reg('fidB-ele-aparelho', 'casalB', 'ele'),
]

describe('readPushConfig', () => {
  const DEFAULTS = {
    maxPerDay: 8,
    spontPerDay: 1,
    spontWindow: { from: '11:00', to: '20:00' },
    tickMinutes: 15,
    billCheckMinutes: 60,
    pruneDays: 30,
  }

  test('ausente, vazio ou invalido vale o padrao, sem lancar', () => {
    assert.deepEqual(readPushConfig({}), DEFAULTS)
    assert.deepEqual(readPushConfig(), DEFAULTS)
    for (const bad of ['', '  ', 'abc', '-1', '2.5', '999999']) {
      const env = {
        PUSH_MAX_PER_DAY: bad,
        PUSH_SPONT_PER_DAY: bad,
        PUSH_SPONT_WINDOW: bad,
        PUSH_TICK_MINUTES: bad,
        PUSH_BILL_CHECK_MINUTES: bad,
        PUSH_PRUNE_DAYS: bad,
      }
      assert.deepEqual(readPushConfig(env), DEFAULTS, JSON.stringify(bad))
    }
    assert.equal(readPushConfig({ PUSH_SPONT_PER_DAY: '3' }).spontPerDay, 1)
    assert.equal(readPushConfig({ PUSH_PRUNE_DAYS: '0' }).pruneDays, 30)
  })

  test('valores validos valem, inclusive zero para o espontaneo e para o relogio', () => {
    const config = readPushConfig({
      PUSH_MAX_PER_DAY: '3',
      PUSH_SPONT_PER_DAY: '0',
      PUSH_SPONT_WINDOW: '09:30-18:00',
      PUSH_TICK_MINUTES: '0',
      PUSH_BILL_CHECK_MINUTES: '120',
      PUSH_PRUNE_DAYS: '45',
    })
    assert.deepEqual(config, {
      maxPerDay: 3,
      spontPerDay: 0,
      spontWindow: { from: '09:30', to: '18:00' },
      tickMinutes: 0,
      billCheckMinutes: 120,
      pruneDays: 45,
    })
  })
})

describe('relogio do notificador', () => {
  let clock
  let repo
  let notifier
  let tick

  const setup = (regs = REGS) => {
    clock = { t: NOW }
    repo = makeRegistry(regs)
    notifier = makeNotifier()
    tick = createTick({ repo, notifier, now: () => new Date(clock.t) })
  }

  beforeEach(() => setup())

  test('avalia cada par casal e pessoa uma vez e entrega os retidos uma vez por rodada', async () => {
    const out = await tick.runOnce()
    assert.equal(out.pairs, 3)
    assert.deepEqual(notifier.calls, [
      'espontaneo:casalA:ele',
      'fatura:casalA:ele',
      'espontaneo:casalA:ela',
      'fatura:casalA:ela',
      'espontaneo:casalB:ele',
      'fatura:casalB:ele',
      'retidos',
    ])
  })

  test('a fatura e reavaliada no maximo de hora em hora e o espontaneo a cada rodada', async () => {
    const count = (prefix) => notifier.calls.filter((c) => c.startsWith(prefix)).length
    for (let i = 0; i < 4; i++) {
      await tick.runOnce()
      clock.t += 15 * MINUTE
    }
    assert.equal(count('fatura:casalA:ele'), 1)
    assert.equal(count('espontaneo:casalA:ele'), 4)
    assert.equal(count('retidos'), 4)
    await tick.runOnce()
    assert.equal(count('fatura:casalA:ele'), 2)
  })

  test('inscricao sem dono ou com pessoa invalida e ignorada, e sem aparelho ainda entrega retidos', async () => {
    setup([reg('fid-sem-dono-0001', undefined, 'ele'), reg('fid-porquinho-001', 'casalA', 'porquinho')])
    const out = await tick.runOnce()
    assert.equal(out.pairs, 0)
    assert.deepEqual(notifier.calls, ['retidos'])
  })

  test('uma rodada em andamento faz a seguinte ser pulada', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    notifier.deliverHeld = async () => {
      notifier.calls.push('retidos')
      await gate
      return { sent: 0 }
    }
    const first = tick.runOnce()
    const second = await tick.runOnce()
    assert.equal(second.skipped, true)
    release()
    assert.equal((await first).skipped, false)
    assert.equal(notifier.calls.filter((c) => c === 'retidos').length, 1)
    assert.equal((await tick.runOnce()).skipped, false)
  })

  test('o erro de um par nao derruba os outros e o log leva so o codigo', async () => {
    const error = mock.method(console, 'error', () => {})
    const log = mock.method(console, 'log', () => {})
    try {
      notifier.failFor = 'casalA:ele'
      const out = await tick.runOnce()
      assert.equal(out.errors, 2)
      assert.ok(notifier.calls.includes('fatura:casalB:ele'))
      assert.ok(notifier.calls.includes('retidos'))
      const text = [...error.mock.calls, ...log.mock.calls].map((c) => c.arguments.join(' ')).join('\n')
      assert.match(text, /unavailable/)
      assert.doesNotMatch(text, /Fulano|casalA|fid/)
    } finally {
      error.mock.restore()
      log.mock.restore()
    }
  })

  test('falha ao listar ou ao entregar nunca lanca e a rodada seguinte funciona', async () => {
    const error = mock.method(console, 'error', () => {})
    const log = mock.method(console, 'log', () => {})
    try {
      const real = repo.listRegistrations
      repo.listRegistrations = async () => {
        throw new Error('fora do ar')
      }
      notifier.deliverHeld = async () => {
        throw new Error('fora do ar')
      }
      const out = await tick.runOnce()
      assert.equal(out.errors, 2)
      repo.listRegistrations = real
      assert.equal((await tick.runOnce()).pairs, 3)
    } finally {
      error.mock.restore()
      log.mock.restore()
    }
  })

  test('a poda remove so as inscricoes sem renovacao ha mais de 30 dias, uma vez por dia', async () => {
    const log = mock.method(console, 'log', () => {})
    try {
      setup([
        reg('fid-novo-0000001', 'casalA', 'ele', 0),
        reg('fid-no-limite-01', 'casalA', 'ele', 30),
        reg('fid-velho-000001', 'casalA', 'ela', 31),
        { fid: 'fid-sem-data-001', ownerId: 'casalA', person: 'ela', updatedAt: null },
      ])
      assert.equal((await tick.runOnce()).pruned, 1)
      assert.deepEqual(repo.state.deleted, ['fid-velho-000001'])

      // No mesmo dia nao poda de novo; no dia seguinte, o que venceu sai.
      clock.t += 60 * MINUTE
      assert.equal((await tick.runOnce()).pruned, 0)
      clock.t += DAY
      assert.equal((await tick.runOnce()).pruned, 1)
      assert.deepEqual(repo.state.deleted, ['fid-velho-000001', 'fid-no-limite-01'])
    } finally {
      log.mock.restore()
    }
  })
})

// Relogio com o notificador real sobre um repo falso: prova que o retido sai uma vez e que a rodada
// nunca le lancamentos.
describe('relogio com o notificador real', () => {
  const T_2330 = Date.parse('2026-11-18T02:30:00Z')
  const T_0805 = Date.parse('2026-11-18T11:05:00Z')
  const QUIET = { ...DEFAULT_PUSH_PREFS, quiet: { enabled: true, from: '22:00', to: '08:00' } }

  test('o aviso retido chega as 08:05 uma so vez, sem ler lancamentos', async () => {
    const clock = { t: T_2330 }
    const events = new Map([
      [
        'casalA__limite__ele__2026-11__lazer__100',
        {
          ownerId: 'casalA',
          person: 'ele',
          kind: 'limite',
          threshold: 100,
          categoryLabel: 'Lazer',
          cycleKey: '2026-11',
          tag: 'limite-lazer-2026-11',
          url: '/',
          dayKey: '2026-11-17',
          status: 'pendente',
        },
      ],
    ])
    const registry = makeRegistry([reg('fidEle-aparelho1', 'casalA', 'ele')])
    const repo = {
      ...registry,
      readCycleTransactions: async () => assert.fail('o relogio nao pode ler lancamentos'),
      readCards: async () => [],
      readPrefs: async () => QUIET,
      readSettings: async () => ({ tone: 'suave', categoryDefs: DEFAULT_CATEGORY_DEFS, faturaEnabled: true }),
      listFids: async () => ['fidEle-aparelho1'],
      claimEvent: async (id, data) => (events.has(id) ? false : (events.set(id, data), true)),
      updateEvent: async (id, patch) => events.set(id, { ...events.get(id), ...patch }),
      countSent: async () => 0,
      listPending: async () => [...events].filter(([, e]) => e.status === 'pendente').map(([id, e]) => ({ ...e, id })),
      transitionEvent: async (id, from, patch) => {
        if (events.get(id)?.status !== from) return false
        events.set(id, { ...events.get(id), ...patch })
        return true
      },
    }
    const sent = []
    const sender = {
      async sendToFids(fids, payload) {
        sent.push({ fids, payload })
        return { sent: fids.length, dead: 0, failed: 0 }
      },
    }
    const now = () => new Date(clock.t)
    const tick = createTick({ repo, notifier: createNotifier({ repo, sender, now }), now })
    const log = mock.method(console, 'log', () => {})
    try {
      assert.equal((await tick.runOnce()).sent, 0)
      clock.t = T_0805
      assert.equal((await tick.runOnce()).sent, 1)
      clock.t += 15 * MINUTE
      assert.equal((await tick.runOnce()).sent, 0)
    } finally {
      log.mock.restore()
    }
    assert.equal(sent.length, 1)
    assert.equal(sent[0].payload.tag, 'limite-lazer-2026-11')
  })
})
