import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toCents,
  fromCents,
  monthTotals,
  accumulatedBalance,
  weeklySpend,
  weeklySpendForCycle,
  isOnCardTx,
} from './ledger.js'
import { cycleOf } from './cycle.js'

const tx = (type, amount, iso) => ({ type, amount, date: new Date(iso) })

test('toCents e fromCents arredondam para centavos inteiros', () => {
  assert.equal(toCents(0.1), 10)
  assert.equal(toCents(19.99), 1999)
  assert.ok(Number.isInteger(toCents(1.005)))
  assert.equal(fromCents(1999), 19.99)
})

test('monthTotals soma em centavos: 0.1 + 0.2 entra como 0.3 exato', () => {
  const r = monthTotals([
    tx('entrada', 0.1, '2026-11-02T15:00:00Z'),
    tx('entrada', 0.2, '2026-11-03T15:00:00Z'),
    tx('saida', 0.05, '2026-11-04T15:00:00Z'),
  ])
  assert.equal(r.entradas, 0.3)
  assert.equal(r.saidas, 0.05)
  assert.equal(r.saldo, 0.25)
})

test('monthTotals de lista vazia e zero', () => {
  assert.deepEqual(monthTotals([]), { entradas: 0, saidas: 0, saldo: 0 })
})

test('accumulatedBalance inclui meses anteriores e respeita o limite inclusive', () => {
  const list = [
    tx('entrada', 1000, '2026-09-10T15:00:00Z'),
    tx('saida', 300.1, '2026-10-05T15:00:00Z'),
    tx('entrada', 50.2, '2026-11-09T15:00:00Z'),
    tx('saida', 20, '2026-11-20T15:00:00Z'),
  ]
  assert.equal(accumulatedBalance(list, new Date('2026-11-09T15:00:00Z')), 750.1)
  assert.equal(accumulatedBalance(list, new Date('2026-11-09T14:59:59Z')), 699.9)
  assert.equal(accumulatedBalance(list, new Date('2026-12-31T00:00:00Z')), 730.1)
})

// Formula antiga (OverviewDashboard): daysRemaining+1, ceil(/7), saldo/semanas.
const novTxs = [tx('entrada', 3000, '2026-11-02T15:00:00Z'), tx('saida', 1000, '2026-11-05T15:00:00Z')]
const month = (m) => ({ year: 2026, month: m })

test('weeklySpend em novembro com now 09/11 12h SP', () => {
  const r = weeklySpend({ transactions: novTxs, now: new Date('2026-11-09T15:00:00Z'), month: month(11) })
  assert.equal(r.daysRemaining, 22)
  assert.equal(r.weeksRemaining, 4)
  assert.equal(r.saldoMensal, 2000)
  assert.equal(r.maxWeeklySpend, 2000 / 4)
})

test('weeklySpend: mes passado, mes futuro e fronteira em Sao Paulo', () => {
  const now = new Date('2026-11-09T15:00:00Z')
  const past = weeklySpend({ transactions: [], now, month: month(10) })
  assert.deepEqual([past.daysRemaining, past.weeksRemaining], [1, 1])
  const future = weeklySpend({ transactions: [], now, month: month(12) })
  assert.deepEqual([future.daysRemaining, future.weeksRemaining], [31, 5])
  // 2026-11-01T02:30Z ainda e 31/10 em Sao Paulo: novembro conta como futuro
  const edge = weeklySpend({ transactions: [], now: new Date('2026-11-01T02:30:00Z'), month: month(11) })
  assert.equal(edge.daysRemaining, 30)
})

test('weeklySpend arredonda o limite semanal ao centavo e ignora lancamentos de outro mes', () => {
  const list = [
    tx('entrada', 100, '2026-11-02T15:00:00Z'),
    tx('entrada', 9999, '2026-10-02T15:00:00Z'),
  ]
  const r = weeklySpend({ transactions: list, now: new Date('2026-11-09T15:00:00Z'), month: month(11) })
  assert.equal(r.saldoMensal, 100)
  assert.equal(r.maxWeeklySpend, 25)
  const odd = weeklySpend({
    transactions: [tx('entrada', 100, '2026-11-02T15:00:00Z')],
    now: new Date('2026-11-17T15:00:00Z'),
    month: month(11),
  })
  // 14 dias -> 2 semanas -> 50; 3 semanas daria 33.33
  assert.equal(odd.weeksRemaining, 2)
  const three = weeklySpend({
    transactions: [tx('entrada', 100, '2026-11-02T15:00:00Z')],
    now: new Date('2026-11-10T15:00:00Z'),
    month: month(11),
  })
  assert.equal(three.weeksRemaining, 3)
  assert.equal(three.maxWeeklySpend, 33.33)
})

// weeklySpendForCycle: mesma semantica de weeklySpend, mas sobre cycle.start a cycle.end.
// Dia de salario 15: ciclo 15/01/2026 a 14/02/2026 (31 dias) em Sao Paulo.
const janCycle = cycleOf(new Date('2026-01-20T15:00:00Z'), 15)

test('weeklySpendForCycle com now no meio do ciclo conta hoje ate endParts, inclusive', () => {
  const list = [
    tx('entrada', 3000, '2026-01-16T15:00:00Z'),
    tx('saida', 1000, '2026-01-18T15:00:00Z'),
  ]
  // 20/01 ate 14/02 = 25 dias de diferenca + 1 = 26; teto(26/7) = 4 semanas
  const r = weeklySpendForCycle({ transactions: list, cycle: janCycle, now: new Date('2026-01-20T15:00:00Z') })
  assert.equal(r.daysRemaining, 26)
  assert.equal(r.weeksRemaining, 4)
  assert.equal(r.saldoCiclo, 2000)
  assert.equal(r.maxWeeklySpend, 500)
})

test('weeklySpendForCycle: now antes do inicio usa o inicio e depois do fim usa o fim', () => {
  const before = weeklySpendForCycle({ transactions: [], cycle: janCycle, now: new Date('2026-01-10T15:00:00Z') })
  assert.deepEqual([before.daysRemaining, before.weeksRemaining], [31, 5])
  const after = weeklySpendForCycle({ transactions: [], cycle: janCycle, now: new Date('2026-03-01T15:00:00Z') })
  assert.deepEqual([after.daysRemaining, after.weeksRemaining], [1, 1])
  // 1 ms depois do fim ainda e "depois": referencia no fim, 1 dia
  const justAfter = weeklySpendForCycle({
    transactions: [],
    cycle: janCycle,
    now: new Date(janCycle.end.getTime() + 1),
  })
  assert.equal(justAfter.daysRemaining, 1)
  // no instante exato do inicio: ciclo inteiro
  const atStart = weeklySpendForCycle({ transactions: [], cycle: janCycle, now: janCycle.start })
  assert.equal(atStart.daysRemaining, 31)
})

test('weeklySpendForCycle usa o dia de Sao Paulo na fronteira da meia-noite', () => {
  // 2026-01-20T02:30Z ainda e 19/01 em Sao Paulo: 27 dias ate 14/02, nao 26
  const r = weeklySpendForCycle({ transactions: [], cycle: janCycle, now: new Date('2026-01-20T02:30:00Z') })
  assert.equal(r.daysRemaining, 27)
  assert.equal(r.weeksRemaining, 4)
})

test('weeklySpendForCycle soma so a janela do ciclo, nas pontas inclusive, em centavos', () => {
  const list = [
    tx('entrada', 0.1, '2026-01-15T03:00:00.000Z'), // start
    tx('entrada', 0.2, '2026-02-15T02:59:59.999Z'), // end
    tx('entrada', 9999, '2026-01-15T02:59:59.999Z'), // 1 ms antes: fora
    tx('entrada', 9999, '2026-02-15T03:00:00.000Z'), // 1 ms depois: fora
  ]
  const r = weeklySpendForCycle({ transactions: list, cycle: janCycle, now: new Date('2026-01-20T15:00:00Z') })
  assert.equal(r.saldoCiclo, 0.3)
})

test('weeklySpendForCycle arredonda o limite semanal ao centavo', () => {
  // 14 dias restantes -> 2 semanas; 100 / 2 = 50
  const odd = weeklySpendForCycle({
    transactions: [tx('entrada', 100, '2026-01-16T15:00:00Z')],
    cycle: janCycle,
    now: new Date('2026-02-01T15:00:00Z'),
  })
  assert.equal(odd.weeksRemaining, 2)
  assert.equal(odd.maxWeeklySpend, 50)
  // 22 dias -> 4 semanas... use 15 dias -> 3 semanas: 100 / 3 = 33.33
  const three = weeklySpendForCycle({
    transactions: [tx('entrada', 100, '2026-01-16T15:00:00Z')],
    cycle: janCycle,
    now: new Date('2026-01-31T15:00:00Z'),
  })
  assert.equal(three.daysRemaining, 15)
  assert.equal(three.weeksRemaining, 3)
  assert.equal(three.maxWeeklySpend, 33.33)
})

test('weeklySpendForCycle com dia de salario 1 coincide com weeklySpend do mes-calendario', () => {
  const now = new Date('2026-11-09T15:00:00Z')
  const list = [...novTxs, tx('entrada', 9999, '2026-10-02T15:00:00Z')]
  const legacy = weeklySpend({ transactions: list, now, month: month(11) })
  const cyc = weeklySpendForCycle({ transactions: list, cycle: cycleOf(now, 1), now })
  assert.equal(cyc.daysRemaining, legacy.daysRemaining)
  assert.equal(cyc.weeksRemaining, legacy.weeksRemaining)
  assert.equal(cyc.saldoCiclo, legacy.saldoMensal)
  assert.equal(cyc.maxWeeklySpend, legacy.maxWeeklySpend)
})

test('weeklySpendForCycle atravessa a virada do ano (ciclo 15/12 a 14/01)', () => {
  const dec = cycleOf(new Date('2025-12-20T15:00:00Z'), 15)
  // 31/12 ate 14/01 = 14 dias + 1 = 15 -> 3 semanas
  const r = weeklySpendForCycle({
    transactions: [tx('entrada', 300, '2025-12-16T15:00:00Z'), tx('saida', 30, '2026-01-02T15:00:00Z')],
    cycle: dec,
    now: new Date('2025-12-31T15:00:00Z'),
  })
  assert.equal(r.daysRemaining, 15)
  assert.equal(r.weeksRemaining, 3)
  assert.equal(r.saldoCiclo, 270)
  assert.equal(r.maxWeeklySpend, 90)
})

// Semantica de caixa do cartao (Fase 6: CARD-03, CARD-04, CARD-06, D-12)
const cardTx = (type, amount, iso, cardKind, extra = {}) => ({ type, amount, date: new Date(iso), cardKind, ...extra })

test('isOnCardTx so vale para cardKind purchase ou refund', () => {
  assert.equal(isOnCardTx({ cardKind: 'purchase' }), true)
  assert.equal(isOnCardTx({ cardKind: 'refund' }), true)
  assert.equal(isOnCardTx({ cardKind: 'payment' }), false)
  assert.equal(isOnCardTx({}), false)
  assert.equal(isOnCardTx(null), false)
})

test('monthTotals ignora compra do cartao e conta o pagamento da fatura que saiu da conta', () => {
  const r = monthTotals([
    tx('entrada', 1000, '2026-11-02T15:00:00Z'),
    tx('saida', 200, '2026-11-03T15:00:00Z'),
    cardTx('saida', 500, '2026-11-04T15:00:00Z', 'purchase'),
    cardTx('saida', 181.41, '2026-11-05T15:00:00Z', 'payment', { transfer: true }),
  ])
  assert.equal(r.entradas, 1000)
  assert.equal(r.saidas, 381.41)
  assert.equal(r.saldo, 618.59)
})

test('monthTotals ignora o estorno do cartao (entrada)', () => {
  const r = monthTotals([
    tx('entrada', 1000, '2026-11-02T15:00:00Z'),
    cardTx('entrada', 50, '2026-11-04T15:00:00Z', 'refund', { transfer: true }),
  ])
  assert.deepEqual(r, { entradas: 1000, saidas: 0, saldo: 1000 })
})

test('accumulatedBalance aplica a regra de caixa: compra fora, pagamento dentro', () => {
  const list = [
    tx('entrada', 1000, '2026-10-02T15:00:00Z'),
    cardTx('saida', 300, '2026-10-10T15:00:00Z', 'purchase'),
    cardTx('entrada', 20, '2026-10-11T15:00:00Z', 'refund', { transfer: true }),
    cardTx('saida', 280, '2026-11-07T15:00:00Z', 'payment', { transfer: true }),
  ]
  assert.equal(accumulatedBalance(list, new Date('2026-10-31T15:00:00Z')), 1000)
  assert.equal(accumulatedBalance(list, new Date('2026-11-30T15:00:00Z')), 720)
})

test('weeklySpend e weeklySpendForCycle contam a compra do cartao e ignoram transferencia', () => {
  const now = new Date('2026-11-09T15:00:00Z')
  const list = [
    tx('entrada', 3000, '2026-11-02T15:00:00Z'),
    cardTx('saida', 400, '2026-11-05T15:00:00Z', 'purchase'),
    cardTx('saida', 400, '2026-11-08T15:00:00Z', 'payment', { transfer: true }),
    cardTx('entrada', 30, '2026-11-08T16:00:00Z', 'refund', { transfer: true }),
  ]
  const w = weeklySpend({ transactions: list, now, month: month(11) })
  assert.equal(w.saldoMensal, 2600)
  assert.equal(w.maxWeeklySpend, 650)
  const c = weeklySpendForCycle({ transactions: list, cycle: cycleOf(now, 1), now })
  assert.equal(c.saldoCiclo, 2600)
  assert.equal(c.maxWeeklySpend, 650)
})

test('lancamentos sem cardKind e sem transfer seguem como antes', () => {
  const list = [tx('entrada', 100, '2026-11-02T15:00:00Z'), tx('saida', 30, '2026-11-03T15:00:00Z')]
  assert.deepEqual(monthTotals(list), { entradas: 100, saidas: 30, saldo: 70 })
  assert.equal(accumulatedBalance(list, new Date('2026-12-01T00:00:00Z')), 70)
})

test('compra lancada a mao no cartao (D-12) e tratada como qualquer compra do cartao', () => {
  const manual = cardTx('saida', 90, '2026-11-04T15:00:00Z', 'purchase', { cardId: 'acc-1' })
  assert.equal(manual.source, undefined)
  assert.equal(manual.bankImportId, undefined)
  const r = monthTotals([tx('entrada', 500, '2026-11-02T15:00:00Z'), manual])
  assert.deepEqual(r, { entradas: 500, saidas: 0, saldo: 500 })
  assert.equal(accumulatedBalance([manual], new Date('2026-12-01T00:00:00Z')), 0)
  const now = new Date('2026-11-09T15:00:00Z')
  const w = weeklySpend({ transactions: [tx('entrada', 500, '2026-11-02T15:00:00Z'), manual], now, month: month(11) })
  assert.equal(w.saldoMensal, 410)
})
