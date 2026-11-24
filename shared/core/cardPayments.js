// @ts-check
// Pagamento da fatura do cartao (CARD-04, D-05): liga evidencias de tres fontes
// a fatura certa. Fontes, da mais para a menos confiavel: entrada de credito no
// proprio cartao (card), debito na conta reconhecido pelo texto de pagamento de
// fatura (bank-text) e transferencia entre contas proprias de valor igual ao
// total de uma fatura fechada (bank-self). A mesma operacao vista por dois lados
// conta uma vez. Puro: sem pacote e sem relogio, tudo vem das datas das evidencias.

import { DEFAULT_TZ } from './time.js'
import { daysBetweenParts } from './cycle.js'
import { closingPartsOf, parseBillMonth, partsOfDate } from './cardBills.js'

const DAY_MS = 86_400_000
/** Janela para ver a mesma operacao por dois lados. */
const MERGE_WINDOW_MS = 3 * DAY_MS
/** Transferencia propria so conta ate tantos dias depois do fechamento. */
const SELF_WINDOW_DAYS = 31
/** Tolerancia de igualdade de valor com a fatura, em centavos. */
const EXACT_TOLERANCE = 1

/**
 * @typedef {{
 *   id: string,
 *   billMonth: string | null,
 *   cents: number,
 *   atMs: number,
 *   source: 'card' | 'bank-text' | 'bank-self',
 *   linkedBankId: string | null,
 * }} CardPayment
 */

/** @type {Record<string, number>} */
const RANK = { card: 0, 'bank-text': 1, 'bank-self': 2 }

/**
 * @param {unknown} v
 * @returns {v is number}
 */
function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * Dias de calendario do fechamento da fatura ate o instante (null se nao ha fechamento).
 * @param {string} billMonth
 * @param {number | null | undefined} closingDay
 * @param {number} atMs
 * @param {string} tz
 * @returns {number | null}
 */
function daysAfterClosing(billMonth, closingDay, atMs, tz) {
  const close = closingPartsOf(billMonth, closingDay)
  const at = partsOfDate(atMs, tz)
  if (!close || !at) return null
  return daysBetweenParts(close, at)
}

/**
 * Detecta os pagamentos de fatura e liga cada um a uma fatura.
 * @param {{
 *   billTotals?: Record<string, number> | null,
 *   closingDay?: number | null,
 *   cardCredits?: Array<{ id: string, cents: number, dateMs: number }>,
 *   bankOutflows?: Array<{ id: string, cents: number, dateMs: number, origin: 'text' | 'self' | string }>,
 *   tz?: string,
 * }} input
 * @returns {CardPayment[]}
 */
export function detectCardPayments({ billTotals, closingDay, cardCredits, bankOutflows, tz = DEFAULT_TZ } = {}) {
  /** @type {CardPayment[]} */
  const evidences = []
  for (const c of cardCredits ?? []) {
    if (!c || !isNum(c.cents) || c.cents <= 0 || !isNum(c.dateMs)) continue
    evidences.push({ id: c.id, billMonth: null, cents: c.cents, atMs: c.dateMs, source: 'card', linkedBankId: null })
  }
  for (const b of bankOutflows ?? []) {
    if (!b || !isNum(b.cents) || b.cents <= 0 || !isNum(b.dateMs)) continue
    if (b.origin !== 'text' && b.origin !== 'self') continue
    evidences.push({
      id: b.id,
      billMonth: null,
      cents: b.cents,
      atMs: b.dateMs,
      source: b.origin === 'text' ? 'bank-text' : 'bank-self',
      linkedBankId: b.id,
    })
  }

  // Fusao: a mesma operacao vista por dois lados (valor igual e ate 3 dias) conta
  // uma vez, mantida a evidencia de maior confianca.
  evidences.sort((a, b) => RANK[a.source] - RANK[b.source] || a.atMs - b.atMs)
  /** @type {CardPayment[]} */
  const merged = []
  for (const e of evidences) {
    const twin = merged.find(
      (m) =>
        m.source !== e.source &&
        m.cents === e.cents &&
        Math.abs(m.atMs - e.atMs) <= MERGE_WINDOW_MS &&
        (m.source !== 'card' || m.linkedBankId === null)
    )
    if (twin) {
      if (twin.linkedBankId === null && e.source !== 'card') twin.linkedBankId = e.id
      continue
    }
    merged.push({ ...e })
  }

  // Saldo restante por fatura, em centavos, so de faturas com total positivo.
  /** @type {Array<{ month: string, remaining: number }>} */
  const bills = []
  for (const [month, total] of Object.entries(billTotals ?? {})) {
    if (parseBillMonth(month) && isNum(total) && total > 0) bills.push({ month, remaining: total })
  }
  bills.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))

  const hasClosing = closingPartsOf('2026-01', closingDay) !== null
  const closedDays = (/** @type {string} */ month, /** @type {number} */ atMs) =>
    hasClosing ? daysAfterClosing(month, closingDay, atMs, tz) : null

  /** @type {CardPayment[]} */
  const out = []
  merged.sort((a, b) => a.atMs - b.atMs || RANK[a.source] - RANK[b.source])
  for (const p of merged) {
    const exact = (/** @type {{ remaining: number }} */ b) => Math.abs(b.remaining - p.cents) <= EXACT_TOLERANCE

    if (p.source === 'bank-self') {
      // Transferencia propria: so valor exato de fatura fechada, ate 31 dias depois.
      const hit = bills.find((b) => {
        const d = closedDays(b.month, p.atMs)
        return exact(b) && d !== null && d >= 1 && d <= SELF_WINDOW_DAYS
      })
      if (!hit) continue
      hit.remaining = 0
      out.push({ ...p, billMonth: hit.month })
      continue
    }

    const byValue = bills.find(exact)
    if (byValue) {
      byValue.remaining = 0
      out.push({ ...p, billMonth: byValue.month })
      continue
    }
    const fifo = bills.find((b) => {
      const d = closedDays(b.month, p.atMs)
      return d !== null && d >= 1 && b.remaining > EXACT_TOLERANCE
    })
    if (fifo) {
      fifo.remaining = Math.max(fifo.remaining - p.cents, 0)
      out.push({ ...p, billMonth: fifo.month })
      continue
    }
    out.push({ ...p, billMonth: null })
  }
  return out
}
