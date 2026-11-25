import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import {
  BIG_SNAPSHOT_READS,
  CURRENT_TTL_MS,
  FRESH_MIN_MS,
  PREVIOUS_TTL_MS,
  createSnapshotLoader,
} from '../src/ai/snapshot.js'
import { buildAiSummary, summaryToPromptText } from '../../shared/core/aiSummary.js'
import { findLeaks } from '../../shared/core/aiPrivacy.js'

// Banco falso que registra cada consulta. Suporta where (==, >=, <=), orderBy, select e get.
const HID = 'casalA'
const NOW = new Date('2026-11-17T15:00:00Z')
const ts = (iso) => Timestamp.fromDate(new Date(iso))
const ms = (v) => (typeof v?.toMillis === 'function' ? v.toMillis() : v instanceof Date ? v.getTime() : v)

function createDb(seed, { failOn = [] } = {}) {
  const queries = []
  const gets = []
  const data = new Map(Object.entries(seed).map(([name, docs]) => [name, docs.map((d) => ({ ...d }))]))

  function build(name, filters, order, fields) {
    return {
      where(field, op, value) {
        return build(name, [...filters, [field, op, value]], order, fields)
      },
      orderBy(field, dir) {
        return build(name, filters, [field, dir], fields)
      },
      select(...f) {
        return build(name, filters, order, f)
      },
      limit() {
        return build(name, filters, order, fields)
      },
      async get() {
        queries.push({ collection: name, filters, order, fields })
        if (failOn.includes(name)) throw new Error('falha simulada')
        let docs = (data.get(name) ?? []).filter(({ data: d }) =>
          filters.every(([field, op, value]) => {
            const v = ms(d[field])
            const w = ms(value)
            if (op === '==') return v === w
            if (op === '>=') return v >= w
            if (op === '<=') return v <= w
            throw new Error(`operador ${op}`)
          }),
        )
        if (order) docs = [...docs].sort((a, b) => ms(b.data[order[0]]) - ms(a.data[order[0]]))
        const out = docs.map(({ id, data: d }) => {
          const shown = fields ? Object.fromEntries(fields.map((f) => [f, d[f]])) : d
          return { id, data: () => ({ ...shown }) }
        })
        return { docs: out }
      },
    }
  }

  return {
    queries,
    gets,
    collection(name) {
      return {
        ...build(name, [], null, null),
        doc(id) {
          return {
            async get() {
              gets.push({ collection: name, id })
              if (failOn.includes(name)) throw new Error('falha simulada')
              const found = (data.get(name) ?? []).find((d) => d.id === id)
              return { exists: Boolean(found), data: () => (found ? { ...found.data } : undefined) }
            },
          }
        },
      }
    },
  }
}

const SETTINGS = {
  id: 'main',
  data: {
    ownerId: HID,
    categoryDefs: [
      { id: 'alimentacao', name: 'Alimentacao', kind: 'gasto' },
      { id: 'transporte', name: 'Transporte', kind: 'gasto' },
    ],
    personConfig: { ele: { salaryDay: 1, expectedIncomeCents: 500000 }, ela: { salaryDay: 1, expectedIncomeCents: 600000 } },
    tabNames: { area1: 'Nirigue', area2: 'Nirigua' },
    vintemTone: 'sem-filtro',
  },
}

function tx(id, who, over) {
  return {
    id,
    data: {
      ownerId: HID,
      person: who,
      type: 'saida',
      source: 'bank',
      amount: 40,
      category: 'Alimentacao',
      categoryId: 'alimentacao',
      description: 'IFOOD *RESTAURANTE',
      date: ts('2026-11-16T15:00:00Z'),
      createdAt: ts('2026-11-16T15:00:00Z'),
      ...over,
    },
  }
}

function fullSeed() {
  return {
    settings: [SETTINGS],
    transactions: [
      // Ciclo atual de Ele (novembro) e anterior (outubro), mais as da Ela e de outro casal.
      tx('t1', 'ele', { amount: 90, date: ts('2026-11-16T15:00:00Z'), createdAt: ts('2026-11-16T15:00:00Z') }),
      tx('t2', 'ele', {
        amount: 30,
        category: 'Transporte',
        categoryId: 'transporte',
        description: 'UBER *TRIP',
        date: ts('2026-11-10T15:00:00Z'),
        createdAt: ts('2026-11-17T12:00:00Z'),
      }),
      tx('p1', 'ele', { amount: 50, date: ts('2026-10-05T15:00:00Z'), createdAt: ts('2026-10-05T15:00:00Z') }),
      tx('e1', 'ela', { amount: 777, description: 'RAPPI', date: ts('2026-11-12T15:00:00Z') }),
      tx('o1', 'ele', { ownerId: 'casalB', amount: 555, date: ts('2026-11-12T15:00:00Z') }),
    ],
    fixedExpenses: [
      { id: 'f1', data: { ownerId: HID, person: 'ele', name: 'Aluguel', amount: 1200, dueDay: 5, isActive: true } },
      { id: 'f2', data: { ownerId: HID, person: 'conjunto', name: 'Internet', amount: 100, dueDay: 8, isActive: true } },
      { id: 'f3', data: { ownerId: HID, person: 'ela', name: 'Academia', amount: 90, dueDay: 9, isActive: true } },
      { id: 'f4', data: { ownerId: HID, person: 'ele', name: 'Antiga', amount: 10, dueDay: 9, isActive: false } },
    ],
    fixedExpensePayments: [
      { id: 'pay1', data: { ownerId: HID, fixedExpenseId: 'f1', month: 11, year: 2026, paidAmount: 1200 } },
      { id: 'pay2', data: { ownerId: HID, fixedExpenseId: 'f3', month: 11, year: 2026, paidAmount: 90 } },
    ],
    goals: [
      { id: 'g1', data: { ownerId: HID, person: 'ele', name: 'Viagem', targetAmount: 3000, currentAmount: 750 } },
      { id: 'g2', data: { ownerId: HID, person: 'ela', name: 'Carro', targetAmount: 9000, currentAmount: 100 } },
    ],
    savings: [
      { id: 's1', data: { ownerId: HID, person: 'ele', type: 'deposito', amount: 500, description: 'Do Carlos' } },
      { id: 's2', data: { ownerId: HID, person: 'ela', type: 'deposito', amount: 300, description: 'Da Maria' } },
      { id: 's3', data: { ownerId: HID, person: 'ela', type: 'saque', amount: 100, description: 'Farmacia' } },
    ],
    cards: [
      { id: 'c1', data: { ownerId: HID, person: 'ele', name: 'Cartao Azul', billTotals: { '2026-11': 123456, '2026-12': 999 } } },
      { id: 'c2', data: { ownerId: HID, person: 'ela', name: 'Cartao Rosa', billTotals: { '2026-11': 777700 } } },
      { id: 'c3', data: { ownerId: HID, person: 'ele', name: 'Sem Dias', billTotals: { '2026-11': 5000 } } },
    ],
    cardSettings: [
      { id: 'c1', data: { ownerId: HID, closingDay: 25, dueDay: 5, nickname: '' } },
      { id: 'c2', data: { ownerId: HID, closingDay: 20, dueDay: 28, nickname: '' } },
    ],
    vintemInsights: [
      { id: 'i1', data: { ownerId: HID, person: 'ele', cycleKey: '2026-11', type: 'delivery-heavy', severity: 3, subjectKind: 'merchant-group', subjectKey: 'delivery', metrics: { count: 4, totalCents: 20000 } } },
      { id: 'i2', data: { ownerId: HID, person: 'ele', cycleKey: '2026-11', type: 'spend-spike', severity: 1, subjectKind: 'category', subjectKey: 'transporte', metrics: {} } },
      { id: 'i3', data: { ownerId: HID, person: 'ela', cycleKey: '2026-11', type: 'delivery-heavy', severity: 3, subjectKind: 'merchant-group', subjectKey: 'delivery', metrics: {} } },
    ],
  }
}

function setup(seed = fullSeed(), opts = {}) {
  const clock = { t: NOW.getTime() }
  const logs = []
  const db = createDb(seed, opts)
  const loader = createSnapshotLoader({ db, now: () => new Date(clock.t), log: { warn: (l) => logs.push(l) } })
  return { clock, logs, db, loader }
}

const txQueries = (db) => db.queries.filter((q) => q.collection === 'transactions')
const windowStart = (q) => ms(q.filters.find(([f, op]) => f === 'date' && op === '>=')[2])

describe('snapshot: ciclo anterior e cache (tracer)', () => {
  test('a carga le o ciclo atual e o anterior e entrega a comparacao ao resumo', async () => {
    const { loader, db } = setup()
    const r = await loader.load({ hid: HID, person: 'ele' })
    assert.equal(txQueries(db).length, 2)
    const starts = txQueries(db).map(windowStart).sort((a, b) => a - b)
    assert.ok(starts[0] < starts[1], 'uma janela anterior e uma atual')
    assert.equal(r.input.prevTransactions.length, 1)
    assert.equal(r.input.prevTransactions[0].id, 'p1')
    assert.deepEqual(r.input.transactions.map((t) => t.id).sort(), ['t1', 't2'])

    const summary = buildAiSummary(r.input)
    const comp = summary.comparacao.find((c) => c.categoria === 'Alimentacao')
    assert.ok(comp, 'comparacao por categoria presente')
    assert.equal(comp.anterior, 'R$\u00a050')
    assert.equal(comp.variacao, '+80%')
  })

  test('a segunda carga em seguida nao consulta nada e conta zero leituras', async () => {
    const { loader, db } = setup()
    const first = await loader.load({ hid: HID, person: 'ele' })
    assert.ok(first.reads > 0)
    const before = db.queries.length + db.gets.length
    const second = await loader.load({ hid: HID, person: 'ele' })
    assert.equal(db.queries.length + db.gets.length, before)
    assert.equal(second.reads, 0)
    assert.equal(second.tone, first.tone)
  })

  test('fresh antes de 15 segundos usa o cache; depois de 15 segundos rele so o ciclo atual', async () => {
    const { loader, db, clock } = setup()
    await loader.load({ hid: HID, person: 'ele' })
    const base = txQueries(db).length

    clock.t += FRESH_MIN_MS - 1000
    await loader.load({ hid: HID, person: 'ele', fresh: true })
    assert.equal(txQueries(db).length, base, 'dentro dos 15 s usa o cache')

    clock.t += 2000
    await loader.load({ hid: HID, person: 'ele', fresh: true })
    const added = txQueries(db).slice(base)
    assert.equal(added.length, 1, 'rele so o ciclo atual')
    const prevStart = Math.min(...txQueries(db).slice(0, base).map(windowStart))
    assert.ok(windowStart(added[0]) > prevStart)
  })

  test('sem fresh o ciclo atual so e relido depois de 10 minutos e o anterior depois de 12 horas', async () => {
    const { loader, db, clock } = setup()
    await loader.load({ hid: HID, person: 'ele' })
    assert.equal(txQueries(db).length, 2)

    clock.t += CURRENT_TTL_MS - 1000
    await loader.load({ hid: HID, person: 'ele' })
    assert.equal(txQueries(db).length, 2)

    clock.t += 2000
    await loader.load({ hid: HID, person: 'ele' })
    assert.equal(txQueries(db).length, 3, 'so o atual')

    clock.t += PREVIOUS_TTL_MS - CURRENT_TTL_MS
    await loader.load({ hid: HID, person: 'ele' })
    assert.equal(txQueries(db).length, 5, 'atual e anterior')
  })

  test('cargas simultaneas da mesma pessoa dividem a mesma leitura', async () => {
    const { loader, db } = setup()
    const [a, b] = await Promise.all([
      loader.load({ hid: HID, person: 'ele' }),
      loader.load({ hid: HID, person: 'ele' }),
    ])
    assert.equal(txQueries(db).length, 2)
    assert.equal(a.reads > 0 && b.reads === 0, true)
  })

  test('cache separado por casal e por pessoa', async () => {
    const { loader, db } = setup()
    await loader.load({ hid: HID, person: 'ele' })
    await loader.load({ hid: HID, person: 'ela' })
    assert.equal(txQueries(db).length, 4)
  })

  test('toda consulta de lancamentos leva ownerId e person do token', async () => {
    const { loader, db } = setup()
    await loader.load({ hid: HID, person: 'ela' })
    for (const q of txQueries(db)) {
      assert.deepEqual(q.filters.slice(0, 2), [
        ['ownerId', '==', HID],
        ['person', '==', 'ela'],
      ])
    }
    assert.ok(!txQueries(db).some((q) => q.filters.some(([, , v]) => v === 'ele')))
  })

  test('carga acima de 800 leituras avisa so a contagem', async () => {
    const seed = fullSeed()
    for (let i = 0; i < BIG_SNAPSHOT_READS + 5; i += 1) seed.transactions.push(tx(`x${i}`, 'ele', { amount: 1, description: 'SEGREDO-NA-DESCRICAO' }))
    const { loader, logs } = setup(seed)
    const r = await loader.load({ hid: HID, person: 'ele' })
    assert.ok(r.reads > BIG_SNAPSHOT_READS)
    assert.equal(logs.length, 1)
    assert.match(logs[0], /snapshot grande: \d+ leituras/)
    assert.ok(!logs[0].includes('SEGREDO'))
  })

  test('hid ou pessoa invalidos lancam erro', async () => {
    const { loader } = setup()
    await assert.rejects(loader.load({ hid: '', person: 'ele' }))
    await assert.rejects(loader.load({ hid: HID, person: 'conjunto' }))
  })
})

describe('snapshot: fontes do resumo', () => {
  let ctx
  beforeEach(() => {
    ctx = setup()
  })

  test('contas fixas so da pessoa (a conjunta e a da outra ficam fora) e pagamentos dessas contas', async () => {
    const r = await ctx.loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(r.input.bills, [{ id: 'f1', name: 'Aluguel', dueDay: 5, amountCents: 120000 }])
    assert.deepEqual(r.input.payments, [{ billId: 'f1', month: 11, year: 2026, paidCents: 120000 }])
    const q = ctx.db.queries.find((x) => x.collection === 'fixedExpenses')
    assert.deepEqual(q.filters, [
      ['ownerId', '==', HID],
      ['person', '==', 'ele'],
      ['isActive', '==', true],
    ])
    const summary = buildAiSummary(r.input)
    assert.equal(summary.fixas.pagas, 1)
  })

  test('metas e cartoes so da pessoa do token, com ownerId e person na consulta', async () => {
    const r = await ctx.loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(r.input.goals, [{ name: 'Viagem', targetCents: 300000, currentCents: 75000, person: 'ele' }])
    for (const name of ['goals', 'cards', 'vintemInsights']) {
      const q = ctx.db.queries.find((x) => x.collection === name)
      assert.deepEqual(q.filters.slice(0, 2), [['ownerId', '==', HID], ['person', '==', 'ele']], name)
    }
    // O cartao e a configuracao da Ela nunca foram pedidos.
    assert.ok(!ctx.db.gets.some((g) => g.collection === 'cardSettings' && g.id === 'c2'))
    assert.ok(!JSON.stringify(r.input).includes('Rosa'))
    assert.ok(!JSON.stringify(r.input).includes('Carro'))
  })

  test('Porquinho entrega so o saldo do casal, sem pessoa nem descricao', async () => {
    const r = await ctx.loader.load({ hid: HID, person: 'ele' })
    assert.equal(r.input.porquinhoCents, 70000)
    const q = ctx.db.queries.find((x) => x.collection === 'savings')
    assert.deepEqual(q.filters, [['ownerId', '==', HID]])
    assert.deepEqual(q.fields, ['type', 'amount'])
    const json = JSON.stringify(r.input)
    assert.ok(!json.includes('Carlos') && !json.includes('Maria') && !json.includes('Farmacia'))
    assert.ok(!ctx.db.queries.some((x) => x.collection === 'goalContributions'))
    const summary = buildAiSummary(r.input)
    assert.equal(summary.porquinho, 'R$\u00a0700')
  })

  test('fatura aberta pelo mes aberto e fechamento do dono; sem dias do dono nao ha fatura', async () => {
    // 17/11 com fechamento no dia 25: a fatura aberta e a de novembro.
    const r = await ctx.loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(r.input.cards, [{ name: 'Cartao Azul', openBillCents: 123456, dueDay: 5, person: 'ele' }])
    const summary = buildAiSummary(r.input)
    assert.equal(summary.fatura[0].vence, 5)
    // Depois do fechamento (dia 26) a aberta e a de dezembro, que e menor.
    ctx.clock.t = new Date('2026-11-26T15:00:00Z').getTime() + CURRENT_TTL_MS
    const later = await ctx.loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(later.input.cards.map((c) => c.openBillCents), [999])
  })

  test('configuracao de cartao de outro casal e ignorada', async () => {
    const seed = fullSeed()
    seed.cardSettings[0].data.ownerId = 'casalB'
    const { loader } = setup(seed)
    const r = await loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(r.input.cards, [])
  })

  test('so insights fortes da pessoa e do ciclo, e o ultimo lancamento pelo maior createdAt', async () => {
    const r = await ctx.loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(r.input.insights.map((i) => i.id), ['i1'])
    // t2 e mais antigo pela data, mas foi criado depois.
    assert.equal(r.input.latestTx.id, 't2')
    const summary = buildAiSummary(r.input)
    assert.equal(summary.padroes[0].tipo, 'muito delivery')
    assert.equal(summary.ultimoLancamento.loja, 'Uber')
  })

  test('fontes vazias entregam listas vazias e o resumo ainda monta', async () => {
    const { loader } = setup({ settings: [SETTINGS], transactions: [] })
    const r = await loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(r.input.bills, [])
    assert.deepEqual(r.input.goals, [])
    assert.deepEqual(r.input.cards, [])
    assert.deepEqual(r.input.insights, [])
    assert.equal(r.input.porquinhoCents, null)
    assert.equal(r.input.latestTx, undefined)
    assert.doesNotThrow(() => buildAiSummary(r.input))
  })

  test('documentos com campo faltando ou de tipo errado sao ignorados', async () => {
    const seed = fullSeed()
    seed.fixedExpenses.push({ id: 'fx', data: { ownerId: HID, person: 'ele', name: 42, amount: 'x', dueDay: 99, isActive: true } })
    seed.goals.push({ id: 'gx', data: { ownerId: HID, person: 'ele', name: 'Sem alvo', targetAmount: 'abc' } })
    seed.savings.push({ id: 'sx', data: { ownerId: HID, type: 'estorno', amount: 'x' } })
    seed.cards.push({ id: 'cx', data: { ownerId: HID, person: 'ele', billTotals: 'texto' } })
    seed.vintemInsights.push({ id: 'ix', data: { ownerId: HID, person: 'ele', cycleKey: '2026-11', severity: 'alta' } })
    const { loader } = setup(seed)
    const r = await loader.load({ hid: HID, person: 'ele' })
    assert.equal(r.input.bills.length, 1)
    assert.equal(r.input.goals.length, 1)
    assert.equal(r.input.porquinhoCents, 70000)
    assert.equal(r.input.insights.length, 1)
    assert.doesNotThrow(() => buildAiSummary(r.input))
  })

  for (const source of ['fixedExpenses', 'fixedExpensePayments', 'goals', 'savings', 'cards', 'vintemInsights']) {
    test(`falha da fonte ${source} nao derruba a carga nem as outras fontes`, async () => {
      const { loader, logs } = setup(fullSeed(), { failOn: [source] })
      const r = await loader.load({ hid: HID, person: 'ele' })
      assert.equal(r.input.transactions.length, 2)
      assert.equal(r.input.prevTransactions.length, 1)
      const empty = {
        fixedExpenses: () => r.input.bills.length === 0 && r.input.payments.length === 0,
        fixedExpensePayments: () => r.input.payments.length === 0 && r.input.bills.length === 1,
        goals: () => r.input.goals.length === 0 && r.input.bills.length === 1,
        savings: () => r.input.porquinhoCents === null && r.input.goals.length === 1,
        cards: () => r.input.cards.length === 0 && r.input.goals.length === 1,
        vintemInsights: () => r.input.insights.length === 0 && r.input.goals.length === 1,
      }
      assert.ok(empty[source](), source)
      assert.ok(logs.some((l) => l.includes('falhou')))
      assert.ok(logs.every((l) => !l.includes('falha simulada')))
      assert.doesNotThrow(() => buildAiSummary(r.input))
    })
  }

  test('fonte que falhou e relida logo, nao fica vazia pelo TTL inteiro', async () => {
    const seed = fullSeed()
    const flaky = { failOn: ['goals'] }
    const { loader, clock } = setup(seed, flaky)
    const first = await loader.load({ hid: HID, person: 'ele' })
    assert.deepEqual(first.input.goals, [])
    flaky.failOn.length = 0
    clock.t += FRESH_MIN_MS + 1000
    const second = await loader.load({ hid: HID, person: 'ele' })
    assert.equal(second.input.goals.length, 1)
  })

  test('falha dos lancamentos do ciclo atual sobe (a fala cai para o banco de frases)', async () => {
    const { loader } = setup(fullSeed(), { failOn: ['transactions'] })
    // O ciclo anterior falha em silencio; o atual e essencial e sobe.
    await assert.rejects(loader.load({ hid: HID, person: 'ele' }))
  })

  test('o resumo montado a partir da carga completa nao tem vazamento nem a outra pessoa', async () => {
    const r = await ctx.loader.load({ hid: HID, person: 'ele' })
    const text = summaryToPromptText(buildAiSummary(r.input))
    assert.deepEqual(findLeaks(text), [])
    for (const forbidden of ['Rappi', 'Carro', 'Rosa', 'Carlos', 'Maria', 'Internet', 'Academia']) {
      assert.ok(!text.includes(forbidden), forbidden)
    }
  })
})
