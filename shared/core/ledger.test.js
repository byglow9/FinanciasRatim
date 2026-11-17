import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCents, fromCents, monthTotals, accumulatedBalance, weeklySpend } from './ledger.js'

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
