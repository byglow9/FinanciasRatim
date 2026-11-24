import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectCardPayments } from './cardPayments.js'

const ms = (iso) => new Date(iso).getTime()
const DAY = 86_400_000

test('credito no cartao igual ao total da fatura vira pagamento da fatura (source card)', () => {
  const r = detectCardPayments({
    billTotals: { '2026-12': 18141 },
    closingDay: 7,
    cardCredits: [{ id: 'c1', cents: 18141, dateMs: ms('2026-12-12T15:00:00Z') }],
    bankOutflows: [],
  })
  assert.deepEqual(r, [
    { id: 'c1', billMonth: '2026-12', cents: 18141, atMs: ms('2026-12-12T15:00:00Z'), source: 'card', linkedBankId: null },
  ])
})

test('a mesma operacao vista no cartao e na conta (ate 3 dias) conta uma vez com o debito ligado', () => {
  const r = detectCardPayments({
    billTotals: { '2026-12': 18141 },
    closingDay: 7,
    cardCredits: [{ id: 'c1', cents: 18141, dateMs: ms('2026-12-12T15:00:00Z') }],
    bankOutflows: [{ id: 'b1', cents: 18141, dateMs: ms('2026-12-14T15:00:00Z'), origin: 'text' }],
  })
  assert.equal(r.length, 1)
  assert.equal(r[0].source, 'card')
  assert.equal(r[0].id, 'c1')
  assert.equal(r[0].linkedBankId, 'b1')
  assert.equal(r[0].billMonth, '2026-12')
})

test('mesmo valor mas a mais de 3 dias de diferenca sao dois pagamentos', () => {
  const r = detectCardPayments({
    billTotals: { '2026-11': 5000, '2026-12': 5000 },
    closingDay: 7,
    cardCredits: [{ id: 'c1', cents: 5000, dateMs: ms('2026-12-12T15:00:00Z') }],
    bankOutflows: [{ id: 'b1', cents: 5000, dateMs: ms('2026-12-12T15:00:00Z') + 4 * DAY, origin: 'text' }],
  })
  assert.equal(r.length, 2)
})

test('sem fechamento so liga por valor exato; sem valor exato billMonth fica null', () => {
  const exato = detectCardPayments({
    billTotals: { '2026-12': 18141 },
    closingDay: null,
    cardCredits: [{ id: 'c1', cents: 18141, dateMs: ms('2026-12-12T15:00:00Z') }],
    bankOutflows: [],
  })
  assert.equal(exato[0].billMonth, '2026-12')
  const parcial = detectCardPayments({
    billTotals: { '2026-12': 18141 },
    cardCredits: [{ id: 'c2', cents: 10000, dateMs: ms('2026-12-12T15:00:00Z') }],
    bankOutflows: [],
  })
  assert.equal(parcial.length, 1)
  assert.equal(parcial[0].billMonth, null)
  assert.equal(parcial[0].cents, 10000)
})

test('com fechamento, pagamento parcial abate a fatura fechada mais antiga com saldo (FIFO)', () => {
  const r = detectCardPayments({
    billTotals: { '2026-11': 30000, '2026-12': 40000 },
    closingDay: 7,
    cardCredits: [
      { id: 'p1', cents: 10000, dateMs: ms('2026-12-20T15:00:00Z') },
      { id: 'p2', cents: 25000, dateMs: ms('2026-12-21T15:00:00Z') },
    ],
    bankOutflows: [],
  })
  // p1 abate 10000 de novembro (resta 20000); p2 (25000) abate os 20000 de novembro
  assert.deepEqual(r.map((p) => p.billMonth), ['2026-11', '2026-11'])
})

test('parcial nunca liga a fatura que ainda nao fechou', () => {
  const r = detectCardPayments({
    billTotals: { '2026-12': 40000 },
    closingDay: 7,
    cardCredits: [{ id: 'p1', cents: 10000, dateMs: ms('2026-12-03T15:00:00Z') }],
    bankOutflows: [],
  })
  assert.equal(r[0].billMonth, null)
})

test('transferencia propria so vira pagamento com valor igual ao total e ate 31 dias do fechamento', () => {
  const base = { billTotals: { '2026-12': 18141 }, closingDay: 7, cardCredits: [] }
  const ok = detectCardPayments({
    ...base,
    bankOutflows: [{ id: 's1', cents: 18141, dateMs: ms('2026-12-20T15:00:00Z'), origin: 'self' }],
  })
  assert.equal(ok.length, 1)
  assert.equal(ok[0].source, 'bank-self')
  assert.equal(ok[0].billMonth, '2026-12')
  assert.equal(ok[0].linkedBankId, 's1')
  const valorDiferente = detectCardPayments({
    ...base,
    bankOutflows: [{ id: 's2', cents: 18000, dateMs: ms('2026-12-20T15:00:00Z'), origin: 'self' }],
  })
  assert.deepEqual(valorDiferente, [])
  const foraDaJanela = detectCardPayments({
    ...base,
    bankOutflows: [{ id: 's3', cents: 18141, dateMs: ms('2027-01-20T15:00:00Z'), origin: 'self' }],
  })
  assert.deepEqual(foraDaJanela, [])
  const antesDoFechamento = detectCardPayments({
    ...base,
    bankOutflows: [{ id: 's4', cents: 18141, dateMs: ms('2026-12-03T15:00:00Z'), origin: 'self' }],
  })
  assert.deepEqual(antesDoFechamento, [])
  const semFechamento = detectCardPayments({
    billTotals: { '2026-12': 18141 },
    cardCredits: [],
    bankOutflows: [{ id: 's5', cents: 18141, dateMs: ms('2026-12-20T15:00:00Z'), origin: 'self' }],
  })
  assert.deepEqual(semFechamento, [])
})

test('debito reconhecido por texto e aceito por valor exato ou por FIFO', () => {
  const exato = detectCardPayments({
    billTotals: { '2026-12': 18141 },
    closingDay: 7,
    cardCredits: [],
    bankOutflows: [{ id: 'b1', cents: 18141, dateMs: ms('2026-12-14T15:00:00Z'), origin: 'text' }],
  })
  assert.equal(exato[0].source, 'bank-text')
  assert.equal(exato[0].billMonth, '2026-12')
  assert.equal(exato[0].linkedBankId, 'b1')
  const parcial = detectCardPayments({
    billTotals: { '2026-12': 18141 },
    closingDay: 7,
    cardCredits: [],
    bankOutflows: [{ id: 'b2', cents: 5000, dateMs: ms('2026-12-14T15:00:00Z'), origin: 'text' }],
  })
  assert.equal(parcial[0].billMonth, '2026-12')
})

test('duas faturas fechadas: valor igual liga a fatura certa, sem igualdade liga a mais antiga', () => {
  const billTotals = { '2026-11': 30000, '2026-12': 18141 }
  const igualDez = detectCardPayments({
    billTotals,
    closingDay: 7,
    cardCredits: [{ id: 'c1', cents: 18141, dateMs: ms('2026-12-20T15:00:00Z') }],
    bankOutflows: [],
  })
  assert.equal(igualDez[0].billMonth, '2026-12')
  const igualNov = detectCardPayments({
    billTotals,
    closingDay: 7,
    cardCredits: [{ id: 'c1', cents: 30000, dateMs: ms('2026-12-20T15:00:00Z') }],
    bankOutflows: [],
  })
  assert.equal(igualNov[0].billMonth, '2026-11')
  const sem = detectCardPayments({
    billTotals,
    closingDay: 7,
    cardCredits: [{ id: 'c1', cents: 7000, dateMs: ms('2026-12-20T15:00:00Z') }],
    bankOutflows: [],
  })
  assert.equal(sem[0].billMonth, '2026-11')
})

test('entradas invalidas e vazias nao quebram', () => {
  assert.deepEqual(detectCardPayments({}), [])
  assert.deepEqual(detectCardPayments({ billTotals: null, cardCredits: [{ id: 'x', cents: 0, dateMs: NaN }] }), [])
})
