// @ts-check
// Vencimento da fatura do cartao no Calendario e no sino (CENT-04, D-06, D-09).
// A Pluggy devolve a data de vencimento nula, entao o vencimento vem do dia que o
// dono informou (duePartsOf) sobre o total por fatura que o servidor grava em
// cards.billTotals. Funcoes puras: sem relogio (o "agora" e argumento), sem ler
// compras, so o documento do cartao e a configuracao. Sem dia de fechamento ou de
// vencimento nao ha evento nem aviso: nunca inventar data (D-04, D-09). Funcoes
// nunca lancam: entrada fora do tipo devolve lista vazia.

import { cardBillStatus, duePartsOf, parseBillMonth, openBillMonth } from './cardBills.js'
import { daysBetweenParts } from './cycle.js'
import { DEFAULT_TZ, zonedParts } from './time.js'

/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./cycle.js').DateParts} DateParts */
/** @typedef {import('./calendarModel.js').CalendarBillItem} CalendarBillItem */

/**
 * Cartao como o calendario e o sino o recebem (cards mais cardSettings).
 * @typedef {{
 *   id: string,
 *   displayName?: string,
 *   name?: string,
 *   billTotals?: Record<string, number>,
 *   payments?: Array<{ billMonth?: string | null, cents?: number }>,
 *   closingDay?: number | null,
 *   dueDay?: number | null,
 *   paidMonths?: string[],
 * }} CalendarCard
 */

/**
 * Aviso de fatura no sino.
 * @typedef {{
 *   id: string,
 *   cardId: string,
 *   name: string,
 *   billMonth: string,
 *   dueParts: DateParts,
 *   daysUntil: number,
 *   amountCents: number,
 *   overdue: boolean,
 * }} CardBillAlert
 */

const FALLBACK_NAME = 'Cartão de crédito'

/**
 * @param {CalendarCard} card
 * @returns {string}
 */
function cardLabel(card) {
  const nick = typeof card.displayName === 'string' ? card.displayName.trim() : ''
  if (nick) return nick
  const name = typeof card.name === 'string' ? card.name.trim() : ''
  return name || FALLBACK_NAME
}

/**
 * Faturas conhecidas de um cartao: so as que tem total maior que zero e datas
 * validas do dono, com vencimento, status e saldo a pagar.
 * @param {CalendarCard} card
 * @param {Date} now
 * @param {string} tz
 * @returns {Array<{ billMonth: string, dueParts: DateParts, totalCents: number, remainingCents: number, status: import('./cardBills.js').CardBillStatus }>}
 */
function knownBills(card, now, tz) {
  if (!card || typeof card.id !== 'string' || !card.billTotals || typeof card.billTotals !== 'object') return []
  const { closingDay, dueDay } = card
  if (openBillMonth(now, closingDay, tz) === null) return []

  /** @type {Record<string, number>} */
  const paidByBill = {}
  if (Array.isArray(card.payments)) {
    for (const p of card.payments) {
      if (!p || !parseBillMonth(p.billMonth) || typeof p.cents !== 'number' || !Number.isFinite(p.cents)) continue
      const month = /** @type {string} */ (p.billMonth)
      paidByBill[month] = (paidByBill[month] ?? 0) + p.cents
    }
  }
  const marked = new Set(Array.isArray(card.paidMonths) ? card.paidMonths : [])

  const out = []
  for (const billMonth of Object.keys(card.billTotals).sort()) {
    const totalCents = card.billTotals[billMonth]
    if (!parseBillMonth(billMonth) || typeof totalCents !== 'number' || !Number.isFinite(totalCents) || totalCents <= 0) continue
    const dueParts = duePartsOf(billMonth, closingDay, dueDay)
    if (!dueParts) continue
    const { status, remainingCents } = cardBillStatus({
      billMonth,
      totalCents,
      paidCents: paidByBill[billMonth] ?? 0,
      overridePaid: marked.has(billMonth),
      now,
      closingDay,
      dueDay,
      tz,
    })
    if (status === null) continue
    out.push({ billMonth, dueParts, totalCents, remainingCents, status })
  }
  return out
}

/**
 * Vencimentos de fatura dentro do ciclo, no formato de item de conta do modelo do
 * dia (kind bill). O valor e o total da fatura; paid quando a fatura esta paga.
 * @param {{ cards?: CalendarCard[], cycle: Cycle, now: Date, tz?: string }} input
 * @returns {CalendarBillItem[]}
 */
export function cardBillEvents({ cards, cycle, now, tz = DEFAULT_TZ } = /** @type {any} */ ({})) {
  if (!Array.isArray(cards) || !cycle || !(now instanceof Date)) return []
  /** @type {CalendarBillItem[]} */
  const items = []
  for (const card of cards) {
    const label = cardLabel(card)
    for (const bill of knownBills(card, now, tz)) {
      const inCycle =
        daysBetweenParts(cycle.startParts, bill.dueParts) >= 0 && daysBetweenParts(bill.dueParts, cycle.endParts) >= 0
      if (!inCycle) continue
      items.push({
        billId: `card-${card.id}-${bill.billMonth}`,
        name: `Fatura ${label}`,
        dueDay: bill.dueParts.day,
        occurrence: bill.dueParts,
        plannedCents: bill.totalCents,
        paid: bill.status === 'paga',
        paidCents: bill.status === 'paga' ? bill.totalCents : 0,
        costCents: bill.totalCents,
      })
    }
  }
  return items
}

/**
 * Avisos do sino: fatura fechada ou atrasada, nao paga, que vence em ate
 * `daysBefore` dias (ou ja venceu). Aberta, futura e paga nao geram aviso; com o
 * interruptor desligado nada sai.
 * @param {{ cards?: CalendarCard[], now: Date, daysBefore?: number, enabled?: boolean, tz?: string }} input
 * @returns {CardBillAlert[]}
 */
export function cardBillAlerts({ cards, now, daysBefore = 0, enabled = true, tz = DEFAULT_TZ } = /** @type {any} */ ({})) {
  if (enabled !== true || !Array.isArray(cards) || !(now instanceof Date)) return []
  const t = zonedParts(now, tz)
  const today = { year: t.year, month: t.month, day: t.day }
  const window = typeof daysBefore === 'number' && Number.isFinite(daysBefore) && daysBefore > 0 ? daysBefore : 0
  /** @type {CardBillAlert[]} */
  const alerts = []
  for (const card of cards) {
    const label = cardLabel(card)
    for (const bill of knownBills(card, now, tz)) {
      if (bill.status !== 'fechada' && bill.status !== 'atrasada') continue
      if (bill.remainingCents <= 0) continue
      const daysUntil = daysBetweenParts(today, bill.dueParts)
      if (daysUntil > window) continue
      alerts.push({
        id: `card-${card.id}-${bill.billMonth}`,
        cardId: card.id,
        name: label,
        billMonth: bill.billMonth,
        dueParts: bill.dueParts,
        daysUntil,
        amountCents: bill.remainingCents,
        overdue: daysUntil < 0,
      })
    }
  }
  return alerts.sort((a, b) => a.daysUntil - b.daysUntil || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
