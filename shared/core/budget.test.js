import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isDayToDay,
  sortByUrgency,
  spendByCategory,
  incomeForCycle,
  billsForCycle,
  safeToSpend,
  perDayCents,
  restPct,
  RHYTHM_CUTS,
  rhythm,
  projectCycle,
  monthInOne,
  previewLaunch,
  buildBudgetView,
} from './budget.js'
import { cycleOf } from './cycle.js'
import { normalizePersonConfig, setCategoryLimit } from './limits.js'

const CYCLE_NOV = cycleOf(new Date('2026-11-17T15:00:00Z'), 1)
const DEFS = [
  { id: 'alimentacao', name: 'Alimentacao' },
  { id: 'lazer', name: 'Lazer' },
  { id: 'outros', name: 'Outros' },
  { id: 'velha', name: 'Velha', archived: true },
]

// Lancamento pequeno e legivel: dia de novembro de 2026 ao meio-dia em Sao Paulo.
const tx = (type, amount, extra = {}) => ({
  type,
  amount,
  date: new Date('2026-11-10T15:00:00Z'),
  ...extra,
})
const spendBase = (transactions, limits = { alimentacao: 40000 }, extra = {}) =>
  spendByCategory({
    transactions,
    categoryDefs: DEFS,
    limitsByCategory: limits,
    cycleKey: '2026-11',
    ...extra,
  })

test('isDayToDay: saida conta, entrada e transferencia nao', () => {
  assert.equal(isDayToDay({ type: 'saida' }), true)
  assert.equal(isDayToDay({ type: 'entrada' }), false)
  assert.equal(isDayToDay({ type: 'saida', transfer: true }), false)
  assert.equal(isDayToDay({ type: 'saida', transfer: false }), true)
})

test('spendByCategory: linha com limite, Gasto geral e o que fica fora', () => {
  const r = spendBase([
    tx('saida', 150, { categoryId: 'alimentacao' }),
    tx('saida', 100, { category: 'Alimentacao' }), // legado: so o texto
    tx('saida', 80, { categoryId: 'lazer' }),
    tx('saida', 20),
    tx('entrada', 500, { categoryId: 'alimentacao' }),
    tx('saida', 300, { categoryId: 'lazer', transfer: true }),
  ])
  assert.equal(r.rows.length, 1)
  const row = r.rows[0]
  assert.equal(row.categoryId, 'alimentacao')
  assert.equal(row.spentCents, 25000)
  assert.equal(row.limitCents, 40000)
  assert.equal(row.state, 'ok')
  assert.equal(row.pct, 62)
  assert.equal(row.remainingCents, 15000)
  assert.equal(row.excessCents, 0)
  assert.equal(row.txs.length, 2)
  assert.equal(r.generalCents, 10000)
  assert.deepEqual(r.generalByCategory, [
    { categoryId: 'lazer', cents: 8000 },
    { categoryId: null, cents: 2000 },
  ])
  assert.equal(r.totalCents, 35000)
})

test('spendByCategory: estados warn e over com excesso', () => {
  const warn = spendBase([tx('saida', 320, { categoryId: 'alimentacao' })]).rows[0]
  assert.equal(warn.state, 'warn')
  assert.equal(warn.pct, 80)
  const over = spendBase([tx('saida', 450, { categoryId: 'alimentacao' })]).rows[0]
  assert.equal(over.state, 'over')
  assert.equal(over.pct, 112)
  assert.equal(over.remainingCents, 0)
  assert.equal(over.excessCents, 5000)
})

test('spendByCategory: 0,10 + 0,20 em reais soma exatamente 30 centavos', () => {
  const r = spendBase([
    tx('saida', 0.1, { categoryId: 'alimentacao' }),
    tx('saida', 0.2, { categoryId: 'alimentacao' }),
  ])
  assert.equal(r.rows[0].spentCents, 30)
  assert.equal(r.totalCents, 30)
})

test('spendByCategory: categoria com limite e sem gasto vira linha com gasto 0', () => {
  const r = spendBase([], { alimentacao: 40000, lazer: 10000 })
  assert.deepEqual(
    r.rows.map((x) => [x.categoryId, x.spentCents, x.state, x.pct]),
    [
      ['alimentacao', 0, 'ok', 0],
      ['lazer', 0, 'ok', 0],
    ]
  )
  assert.equal(r.generalCents, 0)
  assert.deepEqual(r.generalByCategory, [])
})

test('sortByUrgency: passou, atencao, em dia; maior pct primeiro; empate por id', () => {
  const rows = [
    { categoryId: 'c', state: 'ok', pct: 10 },
    { categoryId: 'b', state: 'warn', pct: 85 },
    { categoryId: 'a', state: 'over', pct: 150 },
    { categoryId: 'e', state: 'ok', pct: 50 },
    { categoryId: 'd', state: 'ok', pct: 50 },
    { categoryId: 'f', state: 'warn', pct: 95 },
  ]
  assert.deepEqual(
    [...rows].sort(sortByUrgency).map((r) => r.categoryId),
    ['a', 'f', 'b', 'd', 'e', 'c']
  )
})

test('spendByCategory: linhas saem ordenadas por urgencia', () => {
  const r = spendBase(
    [
      tx('saida', 450, { categoryId: 'alimentacao' }),
      tx('saida', 90, { categoryId: 'lazer' }),
      tx('saida', 10, { categoryId: 'outros' }),
    ],
    { alimentacao: 40000, lazer: 10000, outros: 10000 }
  )
  assert.deepEqual(
    r.rows.map((x) => [x.categoryId, x.state]),
    [
      ['alimentacao', 'over'],
      ['lazer', 'warn'],
      ['outros', 'ok'],
    ]
  )
})

test('spendByCategory: lancamentos da linha por data decrescente', () => {
  const r = spendBase([
    tx('saida', 10, { categoryId: 'alimentacao', id: 'a', date: new Date('2026-11-02T15:00:00Z') }),
    tx('saida', 10, { categoryId: 'alimentacao', id: 'b', date: new Date('2026-11-09T15:00:00Z') }),
    tx('saida', 10, { categoryId: 'alimentacao', id: 'c', date: new Date('2026-11-05T15:00:00Z') }),
  ])
  assert.deepEqual(r.rows[0].txs.map((t) => t.id), ['b', 'c', 'a'])
})

test('spendByCategory: arquivada com limite so vira linha em ciclo passado', () => {
  const txs = [tx('saida', 60, { categoryId: 'velha' })]
  const limits = { velha: 10000 }
  const atual = spendBase(txs, limits)
  assert.equal(atual.rows.length, 0)
  assert.equal(atual.generalCents, 6000)
  assert.deepEqual(atual.generalByCategory, [{ categoryId: 'velha', cents: 6000 }])
  const passado = spendBase(txs, limits, { includeArchivedLimits: true })
  assert.equal(passado.rows.length, 1)
  assert.equal(passado.rows[0].limitCents, 10000)
  assert.equal(passado.rows[0].spentCents, 6000)
  assert.equal(passado.generalCents, 0)
})

test('spendByCategory: kind da categoria nao decide gasto (Investimentos saida conta)', () => {
  const defs = [{ id: 'investimentos', name: 'Investimentos', kind: 'receita' }]
  const r = spendByCategory({
    transactions: [tx('saida', 50, { categoryId: 'investimentos' })],
    categoryDefs: defs,
    limitsByCategory: {},
    cycleKey: '2026-11',
  })
  assert.equal(r.totalCents, 5000)
  assert.equal(r.generalCents, 5000)
})

test('spendByCategory: id de categoria com nome de propriedade de objeto nao pega limite herdado', () => {
  const r = spendBase([tx('saida', 10, { categoryId: 'constructor' })], { alimentacao: 40000 })
  assert.equal(r.rows.length, 1)
  assert.equal(r.rows[0].categoryId, 'alimentacao')
  assert.deepEqual(r.generalByCategory, [{ categoryId: 'constructor', cents: 1000 }])
})

test('incomeForCycle: sobreposicao do ciclo, base nos outros e efetiva = maior', () => {
  const config = { expectedIncomeCents: 500000, incomeOverrides: { '2026-11': 520000 } }
  const nov = incomeForCycle({ config, cycleKey: '2026-11', transactions: [tx('entrada', 4500)] })
  assert.equal(nov.expectedCents, 520000)
  assert.equal(nov.receivedCents, 450000)
  assert.equal(nov.effectiveCents, 520000)
  assert.equal(nov.hasIncome, true)
  const out = incomeForCycle({ config, cycleKey: '2026-10', transactions: [] })
  assert.equal(out.expectedCents, 500000)
  const acima = incomeForCycle({ config, cycleKey: '2026-11', transactions: [tx('entrada', 6000)] })
  assert.equal(acima.receivedCents, 600000)
  assert.equal(acima.effectiveCents, 600000)
})

test('incomeForCycle: sem renda, so recebida e transferencia nao soma', () => {
  const vazio = incomeForCycle({ config: {}, cycleKey: '2026-11', transactions: [] })
  assert.deepEqual(vazio, { expectedCents: 0, receivedCents: 0, effectiveCents: 0, hasIncome: false })
  const soRecebida = incomeForCycle({
    config: { expectedIncomeCents: 0 },
    cycleKey: '2026-11',
    transactions: [tx('entrada', 300)],
  })
  assert.equal(soRecebida.hasIncome, true)
  assert.equal(soRecebida.effectiveCents, 30000)
  const transf = incomeForCycle({
    config: {},
    cycleKey: '2026-11',
    transactions: [tx('entrada', 300, { transfer: true }), tx('saida', 50)],
  })
  assert.equal(transf.receivedCents, 0)
  assert.equal(transf.hasIncome, false)
})

const CYCLE_5 = cycleOf(new Date('2026-11-17T15:00:00Z'), 5)
const ALUGUEL = { id: 'aluguel', name: 'Aluguel', dueDay: 10, amountCents: 120000 }
const INTERNET = { id: 'internet', name: 'Internet', dueDay: 2, amountCents: 10000 }

test('billsForCycle: pagamento do mes da ocorrencia, nao pagas antes das pagas', () => {
  assert.equal(CYCLE_5.key, '2026-11')
  const r = billsForCycle({
    bills: [ALUGUEL, INTERNET],
    payments: [{ billId: 'aluguel', month: 11, year: 2026, paidCents: 118000 }],
    cycle: CYCLE_5,
  })
  assert.equal(r.totalCents, 128000)
  assert.equal(r.paidCount, 1)
  assert.equal(r.totalCount, 2)
  assert.deepEqual(
    r.items.map((i) => [i.billId, i.occurrence, i.paid, i.costCents]),
    [
      ['internet', { year: 2026, month: 12, day: 2 }, false, 10000],
      ['aluguel', { year: 2026, month: 11, day: 10 }, true, 118000],
    ]
  )
})

test('billsForCycle: pagamento de outro mes nao conta; sem pagamentos soma o planejado', () => {
  const outro = billsForCycle({
    bills: [ALUGUEL, INTERNET],
    payments: [{ billId: 'aluguel', month: 12, year: 2026, paidCents: 118000 }],
    cycle: CYCLE_5,
  })
  assert.equal(outro.totalCents, 130000)
  assert.equal(outro.paidCount, 0)
  const nenhum = billsForCycle({ bills: [ALUGUEL, INTERNET], payments: [], cycle: CYCLE_5 })
  assert.equal(nenhum.totalCents, 130000)
})

test('billsForCycle: ciclo que cobre dois meses acha o pagamento de cada mes', () => {
  const cycle = cycleOf(new Date('2027-03-10T15:00:00Z'), 31)
  assert.equal(cycle.key, '2027-02')
  const bill = { id: 'x', name: 'Conta', dueDay: 30, amountCents: 5000 }
  const r = billsForCycle({
    bills: [bill],
    payments: [{ billId: 'x', month: 2, year: 2027, paidCents: 4900 }],
    cycle,
  })
  assert.equal(r.totalCount, 2)
  assert.deepEqual(
    r.items.map((i) => [i.occurrence, i.paid, i.costCents]),
    [
      [{ year: 2027, month: 3, day: 30 }, false, 5000],
      [{ year: 2027, month: 2, day: 28 }, true, 4900],
    ]
  )
  const ambos = billsForCycle({
    bills: [bill],
    payments: [
      { billId: 'x', month: 2, year: 2027, paidCents: 4900 },
      { billId: 'x', month: 3, year: 2027, paidCents: 5100 },
    ],
    cycle,
  })
  assert.equal(ambos.paidCount, 2)
  assert.equal(ambos.totalCents, 10000)
})

test('billsForCycle: conta com vencimento invalido e ignorada, sem quebrar', () => {
  const r = billsForCycle({
    bills: [{ id: 'z', name: 'Z', dueDay: 0, amountCents: 100 }, ALUGUEL],
    payments: [],
    cycle: CYCLE_5,
  })
  assert.equal(r.totalCount, 1)
})

test('safeToSpend e perDayCents', () => {
  assert.equal(safeToSpend({ incomeCents: 600000, fixedCents: 250000, spentCents: 123456 }), 226544)
  assert.equal(safeToSpend({ incomeCents: 100000, fixedCents: 60000, spentCents: 50000 }), -10000)
  assert.equal(perDayCents(226544, 18), 12585)
  assert.equal(perDayCents(0, 18), 0)
  assert.equal(perDayCents(-5, 18), 0)
  assert.equal(perDayCents(100, 0), 0)
})

test('restPct: 0 a 100 inteiro', () => {
  assert.equal(restPct({ safeCents: 380000, budgetCents: 480000 }), 79)
  assert.equal(restPct({ safeCents: -1, budgetCents: 480000 }), 0)
  assert.equal(restPct({ safeCents: 500000, budgetCents: 480000 }), 100)
  assert.equal(restPct({ safeCents: 100, budgetCents: 0 }), 0)
  assert.equal(restPct({ safeCents: 100, budgetCents: -50 }), 0)
})

// Composicao: renda 6000, conta de 1200 no dia 10 e gasto de 1000 no ciclo de novembro.
const buildScenario = (now = new Date('2026-11-17T15:00:00Z')) => {
  const config = setCategoryLimit(
    normalizePersonConfig({ expectedIncomeCents: 600000 }),
    'alimentacao',
    '2026-11',
    40000
  )
  return buildBudgetView({
    now,
    cycle: CYCLE_NOV,
    config,
    transactions: [
      tx('saida', 700, { categoryId: 'alimentacao' }),
      tx('saida', 300, { categoryId: 'lazer' }),
      // fora do ciclo: nao conta
      { type: 'saida', amount: 999, date: new Date('2026-10-20T15:00:00Z') },
    ],
    bills: [{ id: 'aluguel', name: 'Aluguel', dueDay: 10, amountCents: 120000 }],
    payments: [],
    categoryDefs: DEFS,
  })
}

test('buildBudgetView: ciclo atual com os numeros do plano', () => {
  const v = buildScenario()
  assert.equal(v.cycleKey, '2026-11')
  assert.equal(v.isPast, false)
  assert.equal(v.daysTotal, 30)
  assert.equal(v.daysElapsed, 17)
  assert.equal(v.daysLeft, 14)
  assert.equal(v.income.effectiveCents, 600000)
  assert.equal(v.bills.totalCents, 120000)
  assert.equal(v.spend.totalCents, 100000)
  assert.equal(v.safeCents, 380000)
  assert.equal(v.budgetCents, 480000)
  assert.equal(v.perDayCents, 27142)
  assert.equal(v.restPct, 79)
  assert.deepEqual(v.counts, { ok: 0, warn: 0, over: 1, total: 1 })
})

test('buildBudgetView: ciclo que acabou nao tem por dia nem dias restantes', () => {
  const v = buildScenario(new Date('2026-12-02T15:00:00Z'))
  assert.equal(v.isPast, true)
  assert.equal(v.daysLeft, 0)
  assert.equal(v.perDayCents, 0)
  assert.equal(v.safeCents, 380000)
})

test('buildBudgetView: Pode gastar desconta tambem o Gasto geral', () => {
  const v = buildScenario()
  assert.equal(v.spend.generalCents, 30000)
  assert.equal(v.safeCents, v.income.effectiveCents - v.bills.totalCents - v.spend.totalCents)
})

test('buildBudgetView: o resultado nao depende do fuso do host (JSON estavel)', () => {
  // test:core:tz roda este arquivo em UTC e Asia/Tokyo; o valor abaixo e fixo.
  const v = buildScenario()
  assert.equal(
    JSON.stringify([v.cycleKey, v.daysElapsed, v.daysLeft, v.safeCents, v.perDayCents, v.restPct]),
    '["2026-11",17,14,380000,27142,79]'
  )
})

test('buildBudgetView: dado ausente nao quebra', () => {
  const v = buildBudgetView({
    now: new Date('2026-11-17T15:00:00Z'),
    cycle: CYCLE_NOV,
    config: null,
    transactions: [],
    bills: [],
    payments: [],
    categoryDefs: [],
  })
  assert.equal(v.safeCents, 0)
  assert.equal(v.income.hasIncome, false)
  assert.equal(v.perDayCents, 0)
  assert.equal(v.restPct, 0)
})

// Ritmo: renda 3000, contas 1000 (orcamento 2000), 30 dias e 15 decorridos: esperado ate hoje 1000.
const ritmo = (spentCents, extra = {}) =>
  rhythm({
    incomeCents: 300000,
    fixedCents: 100000,
    spentCents,
    daysElapsed: 15,
    daysTotal: 30,
    ...extra,
  })

test('RHYTHM_CUTS: 75, 100 e 115 por cento', () => {
  assert.deepEqual({ ...RHYTHM_CUTS }, { folgado: 75, noRitmo: 100, atencao: 115 })
})

test('rhythm: fronteiras exatas dos cortes', () => {
  const tabela = [
    [0, 0],
    [70000, 0],
    [75000, 0], // fronteira inclusiva
    [75001, 1],
    [100000, 1],
    [100001, 2],
    [115000, 2],
    [115001, 3],
    [200000, 3], // safe zero: ainda nao estourou
    [200001, 4], // safe negativo
  ]
  for (const [gasto, nivel] of tabela) {
    assert.equal(ritmo(gasto), nivel, `gasto ${gasto}`)
  }
})

test('rhythm: sem folga no orcamento', () => {
  const base = { daysElapsed: 15, daysTotal: 30 }
  assert.equal(rhythm({ incomeCents: 100000, fixedCents: 100000, spentCents: 0, ...base }), 2)
  assert.equal(rhythm({ incomeCents: 100000, fixedCents: 150000, spentCents: 0, ...base }), 4)
})

test('rhythm: primeiro e ultimo dia sem divisao por zero', () => {
  const alto = rhythm({
    incomeCents: 300000,
    fixedCents: 100000,
    spentCents: 100000,
    daysElapsed: 1,
    daysTotal: 30,
  })
  assert.equal(alto, 3)
  const ultimo = rhythm({
    incomeCents: 300000,
    fixedCents: 100000,
    spentCents: 200000,
    daysElapsed: 30,
    daysTotal: 30,
  })
  assert.equal(ultimo, 1)
  // dias decorridos e total invalidos viram 1
  const zero = rhythm({
    incomeCents: 300000,
    fixedCents: 100000,
    spentCents: 0,
    daysElapsed: 0,
    daysTotal: 0,
  })
  assert.equal(zero, 0)
})

test('rhythm: cortes customizados mudam o nivel', () => {
  const cuts = { folgado: 50, noRitmo: 100, atencao: 150 }
  assert.equal(ritmo(75000), 0)
  assert.equal(ritmo(75000, { cuts }), 1) // 75% esperado: acima de 50
  assert.equal(ritmo(120000), 3)
  assert.equal(ritmo(120000, { cuts }), 2) // 120%: ate 150
  assert.equal(ritmo(150001, { cuts }), 3)
})

test('rhythm: valores no teto nao perdem precisao', () => {
  const max = 99_999_999
  const base = { incomeCents: max, fixedCents: 0, spentCents: max, daysTotal: 31 }
  assert.equal(rhythm({ ...base, daysElapsed: 31 }), 1) // gasto igual ao orcamento no ultimo dia
  assert.equal(rhythm({ ...base, daysElapsed: 30 }), 2) // 31/30 = 103%
  assert.equal(rhythm({ ...base, daysElapsed: 27 }), 2) // 3100 <= 27 * 115 = 3105
  assert.equal(rhythm({ ...base, daysElapsed: 26 }), 3) // 3100 > 26 * 115 = 2990
})

const viewWith = (extra = {}, config = { expectedIncomeCents: 600000 }, now) =>
  buildBudgetView({
    now: now ?? new Date('2026-11-17T15:00:00Z'),
    cycle: CYCLE_NOV,
    config,
    transactions: [tx('saida', 1000, { categoryId: 'lazer' })],
    bills: [{ id: 'aluguel', name: 'Aluguel', dueDay: 10, amountCents: 120000 }],
    payments: [],
    categoryDefs: DEFS,
    ...extra,
  })

test('buildBudgetView: ritmo entra quando ha renda, ciclo em andamento e dado em dia', () => {
  const v = viewWith()
  // orcamento 4800, esperado ate hoje 4800*17/30 = 2720; gasto 1000 e 36%: Folgado
  assert.equal(v.rhythmLevel, 0)
  assert.equal(v.verdictSuppressed, false)
})

test('buildBudgetView: suppressVerdict zera o nivel e mantem os numeros', () => {
  const livre = viewWith()
  const sup = viewWith({ suppressVerdict: true })
  assert.equal(sup.rhythmLevel, null)
  assert.equal(sup.verdictSuppressed, true)
  assert.equal(sup.safeCents, livre.safeCents)
  assert.equal(sup.perDayCents, livre.perDayCents)
  assert.equal(sup.restPct, livre.restPct)
})

test('buildBudgetView: sem renda ou em ciclo passado o nivel e nulo', () => {
  const semRenda = viewWith({}, {})
  assert.equal(semRenda.income.hasIncome, false)
  assert.equal(semRenda.rhythmLevel, null)
  const passado = viewWith({}, { expectedIncomeCents: 600000 }, new Date('2026-12-02T15:00:00Z'))
  assert.equal(passado.isPast, true)
  assert.equal(passado.rhythmLevel, null)
})

test('buildBudgetView: Pode gastar negativo da nivel Estourou', () => {
  const v = buildBudgetView({
    now: new Date('2026-11-17T15:00:00Z'),
    cycle: CYCLE_NOV,
    config: { expectedIncomeCents: 100000 },
    transactions: [tx('saida', 1500, { categoryId: 'lazer' })],
    bills: [],
    payments: [],
    categoryDefs: DEFS,
  })
  assert.equal(v.safeCents, -50000)
  assert.equal(v.rhythmLevel, 4)
  assert.equal(v.perDayCents, 0)
})

test('projectCycle: media diaria arredondada', () => {
  assert.equal(projectCycle({ spentCents: 90000, daysElapsed: 10, daysTotal: 30 }), 270000)
  assert.equal(projectCycle({ spentCents: 90000, daysElapsed: 30, daysTotal: 30 }), 90000)
  assert.equal(projectCycle({ spentCents: 100, daysElapsed: 3, daysTotal: 31 }), 1033)
  assert.equal(projectCycle({ spentCents: 500, daysElapsed: 0, daysTotal: 30 }), 15000)
  assert.equal(projectCycle({ spentCents: 0, daysElapsed: 10, daysTotal: 30 }), 0)
})

const INCOME_M = { expectedCents: 500000, receivedCents: 450000, effectiveCents: 500000, hasIncome: true }
const BILLS_M = { totalCents: 200000, paidCount: 2, totalCount: 3, items: [] }
const miu = (extra = {}) =>
  monthInOne({
    income: INCOME_M,
    bills: BILLS_M,
    spentCents: 90000,
    daysElapsed: 10,
    daysTotal: 30,
    isPast: false,
    ...extra,
  })

test('monthInOne: ciclo atual projeta a Sobra', () => {
  assert.deepEqual(miu(), {
    entra: { expectedCents: 500000, receivedCents: 450000, effectiveCents: 500000 },
    fixos: { totalCents: 200000, paidCount: 2, totalCount: 3 },
    diaADia: { spentCents: 90000 },
    sobra: { cents: 30000, projected: true },
  })
})

test('monthInOne: ciclo passado usa o gasto real', () => {
  assert.deepEqual(miu({ isPast: true }).sobra, { cents: 210000, projected: false })
})

test('monthInOne: Sobra negativa mantem o sinal e sem renda nao quebra', () => {
  // projeta 600000: 500000 - 200000 - 600000
  assert.equal(miu({ spentCents: 200000 }).sobra.cents, -300000)
  const semRenda = miu({
    income: { expectedCents: 0, receivedCents: 0, effectiveCents: 0, hasIncome: false },
    bills: { totalCents: 0, paidCount: 0, totalCount: 0, items: [] },
    spentCents: 0,
  })
  assert.equal(semRenda.entra.expectedCents, 0)
  assert.equal(semRenda.sobra.cents, 0)
})

test('buildBudgetView: monthInOne coerente com o resto da composicao', () => {
  const passado = viewWith({}, { expectedIncomeCents: 600000 }, new Date('2026-12-02T15:00:00Z'))
  assert.equal(passado.monthInOne.sobra.projected, false)
  assert.equal(passado.monthInOne.sobra.cents, passado.safeCents)

  const atual = viewWith()
  assert.equal(atual.monthInOne.sobra.projected, true)
  assert.equal(atual.monthInOne.entra.effectiveCents, atual.income.effectiveCents)
  assert.equal(atual.monthInOne.fixos.totalCents, atual.bills.totalCents)
  assert.equal(atual.monthInOne.diaADia.spentCents, atual.spend.totalCents)
  // gasto 100000 em 17 de 30 dias: projeta 176471; sobra 600000 - 120000 - 176471
  assert.equal(
    atual.monthInOne.sobra.cents,
    600000 - 120000 - projectCycle({ spentCents: 100000, daysElapsed: 17, daysTotal: 30 })
  )
  assert.equal(atual.monthInOne.sobra.cents, 303529)
})

test('buildBudgetView: consistencia completa (Pode gastar, counts e Sobra do passado)', () => {
  const v = buildScenario(new Date('2026-12-02T15:00:00Z'))
  assert.equal(v.monthInOne.sobra.cents, v.safeCents)
  assert.equal(v.counts.total, v.spend.rows.length)
  assert.equal(v.counts.ok + v.counts.warn + v.counts.over, v.counts.total)
  assert.equal(v.safeCents, v.budgetCents - v.spend.totalCents)
})

const PREVIEW_VIEW = (received = 450000, safe = 380000) => ({
  safeCents: safe,
  income: {
    expectedCents: 600000,
    receivedCents: received,
    effectiveCents: Math.max(600000, received),
    hasIncome: true,
  },
})

test('previewLaunch: gasto subtrai e avisa quando fica negativo', () => {
  assert.deepEqual(previewLaunch(PREVIEW_VIEW(), 'gasto', 5000), {
    safeAfterCents: 375000,
    overspends: false,
    raisesSafe: false,
  })
  const estoura = previewLaunch(PREVIEW_VIEW(), 'gasto', 400000)
  assert.equal(estoura.safeAfterCents, -20000)
  assert.equal(estoura.overspends, true)
})

test('previewLaunch: receita so sobe o Pode gastar acima da renda esperada', () => {
  const abaixo = previewLaunch(PREVIEW_VIEW(450000), 'receita', 100000)
  assert.deepEqual(abaixo, { safeAfterCents: 380000, overspends: false, raisesSafe: false })
  // recebida iria a 650000, 50000 acima da esperada de 600000
  const acima = previewLaunch(PREVIEW_VIEW(550000, 380000), 'receita', 100000)
  assert.equal(acima.raisesSafe, true)
  assert.equal(acima.overspends, false)
  assert.equal(acima.safeAfterCents, 430000)
})

test('previewLaunch: Porquinho e valor zero nao mudam nada', () => {
  const sem = { safeAfterCents: 380000, overspends: false, raisesSafe: false }
  assert.deepEqual(previewLaunch(PREVIEW_VIEW(), 'porquinho', 123456), sem)
  assert.deepEqual(previewLaunch(PREVIEW_VIEW(), 'gasto', 0), sem)
  assert.deepEqual(previewLaunch(PREVIEW_VIEW(), 'receita', 0), sem)
  assert.deepEqual(previewLaunch(PREVIEW_VIEW(), 'gasto', Number.NaN), sem)
})

test('previewLaunch: com Pode gastar ja negativo, gasto positivo continua estourando', () => {
  const r = previewLaunch(PREVIEW_VIEW(450000, -1000), 'gasto', 500)
  assert.equal(r.safeAfterCents, -1500)
  assert.equal(r.overspends, true)
  const zero = previewLaunch(PREVIEW_VIEW(450000, -1000), 'gasto', 0)
  assert.equal(zero.overspends, false)
})
