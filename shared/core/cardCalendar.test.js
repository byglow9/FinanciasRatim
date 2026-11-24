import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardBillEvents, cardBillAlerts } from './cardCalendar.js'
import { cycleOf } from './cycle.js'

// Meio-dia em Sao Paulo (15:00 UTC): nunca cruza a virada do dia em UTC nem em Tokyo.
const at = (day) => new Date(`${day}T15:00:00Z`)

const nubank = (extra = {}) => ({
  id: 'acc1',
  displayName: 'Nubank',
  name: 'Mastercard Gold',
  closingDay: 7,
  dueDay: 14,
  billTotals: { '2026-12': 18141 },
  payments: [],
  paidMonths: [],
  ...extra,
})

test('fatura de 181,41 que vence 14/12 vira evento nessa data', () => {
  const cycle = cycleOf(at('2026-12-10'), 1)
  const events = cardBillEvents({ cards: [nubank()], cycle, now: at('2026-11-24') })
  assert.equal(events.length, 1)
  const [e] = events
  assert.deepEqual(e.occurrence, { year: 2026, month: 12, day: 14 })
  assert.equal(e.costCents, 18141)
  assert.equal(e.plannedCents, 18141)
  assert.equal(e.name, 'Fatura Nubank')
  assert.equal(e.paid, false)
  assert.equal(e.billId, 'card-acc1-2026-12')
})

test('fatura com pagamentos ligados que cobrem o total vira paid', () => {
  const cycle = cycleOf(at('2026-12-10'), 1)
  const card = nubank({ payments: [{ billMonth: '2026-12', cents: 18141 }] })
  const [e] = cardBillEvents({ cards: [card], cycle, now: at('2026-12-20') })
  assert.equal(e.paid, true)
  const marked = nubank({ paidMonths: ['2026-12'] })
  assert.equal(cardBillEvents({ cards: [marked], cycle, now: at('2026-12-20') })[0].paid, true)
})

test('sem fechamento ou vencimento, ou sem total, nenhum evento', () => {
  const cycle = cycleOf(at('2026-12-10'), 1)
  const now = at('2026-11-24')
  assert.deepEqual(cardBillEvents({ cards: [nubank({ closingDay: null })], cycle, now }), [])
  assert.deepEqual(cardBillEvents({ cards: [nubank({ dueDay: null })], cycle, now }), [])
  assert.deepEqual(cardBillEvents({ cards: [nubank({ billTotals: { '2026-12': 0 } })], cycle, now }), [])
  assert.deepEqual(cardBillEvents({ cards: [nubank({ billTotals: {} })], cycle, now }), [])
  assert.deepEqual(cardBillEvents({ cards: [nubank({ billTotals: undefined })], cycle, now }), [])
  assert.deepEqual(cardBillEvents({ cards: null, cycle, now }), [])
})

test('evento fora do ciclo nao volta e a fatura aparece so no ciclo dela', () => {
  const now = at('2026-11-24')
  const nov = cycleOf(at('2026-11-10'), 1)
  const dec = cycleOf(at('2026-12-10'), 1)
  const jan = cycleOf(at('2027-01-10'), 1)
  assert.equal(cardBillEvents({ cards: [nubank()], cycle: nov, now }).length, 0)
  assert.equal(cardBillEvents({ cards: [nubank()], cycle: dec, now }).length, 1)
  assert.equal(cardBillEvents({ cards: [nubank()], cycle: jan, now }).length, 0)
})

test('aviso para fatura fechada e nao paga dentro da janela, com dias e valor', () => {
  // 10/12: fatura de dezembro fechou dia 7 e vence dia 14 (4 dias)
  const alerts = cardBillAlerts({ cards: [nubank()], now: at('2026-12-10'), daysBefore: 5, enabled: true })
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].daysUntil, 4)
  assert.equal(alerts[0].amountCents, 18141)
  assert.equal(alerts[0].overdue, false)
  assert.equal(alerts[0].name, 'Nubank')
  assert.deepEqual(alerts[0].dueParts, { year: 2026, month: 12, day: 14 })
  // fora da janela
  assert.equal(cardBillAlerts({ cards: [nubank()], now: at('2026-12-10'), daysBefore: 3, enabled: true }).length, 0)
  // no proprio dia do vencimento
  const today = cardBillAlerts({ cards: [nubank()], now: at('2026-12-14'), daysBefore: 3, enabled: true })
  assert.equal(today[0].daysUntil, 0)
})

test('aviso de atrasada para fatura vencida e nao paga, com dias de atraso', () => {
  const alerts = cardBillAlerts({ cards: [nubank()], now: at('2026-12-16'), daysBefore: 3, enabled: true })
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].overdue, true)
  assert.equal(alerts[0].daysUntil, -2)
})

test('aberta, paga e interruptor desligado nao geram aviso', () => {
  // 24/11: a fatura de dezembro ainda esta aberta
  assert.deepEqual(cardBillAlerts({ cards: [nubank()], now: at('2026-11-24'), daysBefore: 30, enabled: true }), [])
  // paga por pagamento ligado
  const paid = nubank({ payments: [{ billMonth: '2026-12', cents: 18141 }] })
  assert.deepEqual(cardBillAlerts({ cards: [paid], now: at('2026-12-10'), daysBefore: 5, enabled: true }), [])
  // marcada como paga
  const marked = nubank({ paidMonths: ['2026-12'] })
  assert.deepEqual(cardBillAlerts({ cards: [marked], now: at('2026-12-10'), daysBefore: 5, enabled: true }), [])
  // interruptor desligado
  assert.deepEqual(cardBillAlerts({ cards: [nubank()], now: at('2026-12-10'), daysBefore: 5, enabled: false }), [])
  // sem datas do dono
  assert.deepEqual(cardBillAlerts({ cards: [nubank({ dueDay: null })], now: at('2026-12-10'), daysBefore: 5, enabled: true }), [])
})

test('pagamento parcial reduz o valor do aviso', () => {
  const card = nubank({ payments: [{ billMonth: '2026-12', cents: 5000 }] })
  const [a] = cardBillAlerts({ cards: [card], now: at('2026-12-10'), daysBefore: 5, enabled: true })
  assert.equal(a.amountCents, 13141)
})

test('apelido e o nome usado quando existe, senao o nome do cartao', () => {
  const cycle = cycleOf(at('2026-12-10'), 1)
  const now = at('2026-11-24')
  assert.equal(cardBillEvents({ cards: [nubank({ displayName: 'Roxinho' })], cycle, now })[0].name, 'Fatura Roxinho')
  assert.equal(cardBillEvents({ cards: [nubank({ displayName: '  ' })], cycle, now })[0].name, 'Fatura Mastercard Gold')
  assert.equal(
    cardBillAlerts({ cards: [nubank({ displayName: undefined })], now: at('2026-12-10'), daysBefore: 5, enabled: true })[0].name,
    'Mastercard Gold',
  )
})
