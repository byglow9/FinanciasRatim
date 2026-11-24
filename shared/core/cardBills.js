// @ts-check
// Faturas do cartao de credito (CARD-08, CENT-03, D-04, D-06, D-09). O MeuPluggy
// nao entrega fatura nem datas de fechamento e vencimento; entrega so o mes da
// fatura prevista de cada compra (billForecastDate, AAAA-MM). Aqui o mes da fatura
// vem da Pluggy quando existe e, senao, e derivado pelo dia de fechamento que o
// dono informou. Tudo puro: sem pacote, sem relogio (o "agora" e argumento), em
// America/Sao_Paulo via zonedParts. Funcoes nunca lancam: entrada fora do tipo
// devolve o resultado conservador (null, 'unknown' ou lista vazia).

import { DEFAULT_TZ, monthRangeOf, zonedParts } from './time.js'

/** @typedef {import('./cycle.js').DateParts} DateParts */

/**
 * Regra do dia do fechamento. false: a compra feita no proprio dia do fechamento
 * entra na fatura que fecha naquele dia. E uma suposicao a conferir com dados
 * reais no gate do 06-14 (a derivacao so vale quando a Pluggy nao entrega o mes),
 * por isso mora aqui e e lida por derivedBillMonth, billMonthOf, openBillMonth e
 * cardBillStatus. Para inverter, trocar so este valor.
 */
export const CLOSING_DAY_STARTS_NEXT_BILL = false

/**
 * @param {unknown} n
 * @returns {n is number}
 */
function isDayOfMonth(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 31
}

/**
 * Mes da fatura AAAA-MM em partes. O mes da fatura e o mes em que ela FECHA (a
 * mesma convencao do billForecastDate da Pluggy, D-08).
 * @param {unknown} text
 * @returns {{ year: number, month: number } | null}
 */
export function parseBillMonth(text) {
  if (typeof text !== 'string') return null
  const m = /^(\d{4})-(\d{2})$/.exec(text)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

/**
 * @param {number} year
 * @param {number} month mes de 1 a 12
 * @returns {string}
 */
function keyOf(year, month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

/**
 * Anda meses a partir de um mes de fatura.
 * @param {unknown} billMonth AAAA-MM
 * @param {number} delta
 * @returns {string | null}
 */
export function shiftBillMonth(billMonth, delta) {
  const p = parseBillMonth(billMonth)
  if (!p || typeof delta !== 'number' || !Number.isInteger(delta)) return null
  const idx = p.year * 12 + (p.month - 1) + delta
  return keyOf(Math.floor(idx / 12), (idx % 12) + 1)
}

/**
 * Dia pedido num mes, limitado ao ultimo dia do mes.
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {DateParts}
 */
function clampedDate(year, month, day) {
  return { year, month, day: Math.min(day, monthRangeOf(year, month).daysInMonth) }
}

/**
 * Data de fechamento da fatura do mes.
 * @param {unknown} billMonth AAAA-MM
 * @param {unknown} closingDay dia de 1 a 31
 * @returns {DateParts | null}
 */
export function closingPartsOf(billMonth, closingDay) {
  const p = parseBillMonth(billMonth)
  if (!p || !isDayOfMonth(closingDay)) return null
  return clampedDate(p.year, p.month, closingDay)
}

/**
 * Data de vencimento da fatura do mes: o primeiro dia `dueDay` depois do
 * fechamento (mesmo mes se dueDay for maior que closingDay, senao o mes seguinte).
 * @param {unknown} billMonth AAAA-MM
 * @param {unknown} closingDay dia de 1 a 31
 * @param {unknown} dueDay dia de 1 a 31
 * @returns {DateParts | null}
 */
export function duePartsOf(billMonth, closingDay, dueDay) {
  const p = parseBillMonth(billMonth)
  if (!p || !isDayOfMonth(closingDay) || !isDayOfMonth(dueDay)) return null
  const sameMonth = dueDay > closingDay
  const next = sameMonth ? p : parseBillMonth(shiftBillMonth(billMonth, 1))
  if (!next) return null
  return clampedDate(next.year, next.month, dueDay)
}

/**
 * Mes da fatura de uma data de calendario, pelo dia de fechamento. Unico lugar
 * onde a regra do dia do fechamento e aplicada.
 * @param {DateParts} parts
 * @param {unknown} closingDay
 * @param {boolean} [startsNextBill] padrao: CLOSING_DAY_STARTS_NEXT_BILL
 * @returns {string | null}
 */
export function derivedBillMonth(parts, closingDay, startsNextBill = CLOSING_DAY_STARTS_NEXT_BILL) {
  if (!isDayOfMonth(closingDay)) return null
  if (!parts || !Number.isInteger(parts.year) || !Number.isInteger(parts.month) || !Number.isInteger(parts.day)) {
    return null
  }
  const closeDay = Math.min(closingDay, monthRangeOf(parts.year, parts.month).daysInMonth)
  const pastClosing = startsNextBill ? parts.day >= closeDay : parts.day > closeDay
  return pastClosing ? shiftBillMonth(keyOf(parts.year, parts.month), 1) : keyOf(parts.year, parts.month)
}

/**
 * Partes de calendario (fuso pedido) de uma data que pode vir como Date, texto ou
 * numero. Invalida devolve null.
 * @param {unknown} value
 * @param {string} tz
 * @returns {DateParts | null}
 */
export function partsOfDate(value, tz = DEFAULT_TZ) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) return null
  const { year, month, day } = zonedParts(d, tz)
  return { year, month, day }
}

/**
 * Mes da fatura de uma compra: o da Pluggy quando vem, senao derivado do
 * fechamento do dono, senao desconhecido.
 * @param {{ billMonth?: unknown, date?: unknown, closingDay?: unknown, tz?: string }} input
 * @returns {{ billMonth: string | null, source: 'pluggy' | 'derived' | 'unknown' }}
 */
export function billMonthOf({ billMonth, date, closingDay, tz = DEFAULT_TZ } = {}) {
  if (parseBillMonth(billMonth)) return { billMonth: /** @type {string} */ (billMonth), source: 'pluggy' }
  const parts = partsOfDate(date, tz)
  const derived = parts ? derivedBillMonth(parts, closingDay) : null
  if (derived) return { billMonth: derived, source: 'derived' }
  return { billMonth: null, source: 'unknown' }
}

/**
 * Mes da fatura que ainda aceita compras agora. Null sem fechamento valido.
 * @param {Date} now
 * @param {unknown} closingDay
 * @param {string} [tz]
 * @returns {string | null}
 */
export function openBillMonth(now, closingDay, tz = DEFAULT_TZ) {
  const parts = partsOfDate(now, tz)
  return parts ? derivedBillMonth(parts, closingDay) : null
}

/**
 * Quantas compras trazem mes da Pluggy diferente do derivado pelo fechamento
 * informado: a tela avisa quando o fechamento do dono nao bate com o banco.
 * @param {unknown} txs lancamentos { cardKind, billMonth, date }
 * @param {unknown} closingDay
 * @param {string} [tz]
 * @returns {number}
 */
export function derivationMismatch(txs, closingDay, tz = DEFAULT_TZ) {
  if (!Array.isArray(txs) || !isDayOfMonth(closingDay)) return 0
  let count = 0
  for (const tx of txs) {
    if (!tx || tx.cardKind === 'payment' || !parseBillMonth(tx.billMonth)) continue
    const parts = partsOfDate(tx.date, tz)
    const derived = parts ? derivedBillMonth(parts, closingDay) : null
    if (derived && derived !== tx.billMonth) count++
  }
  return count
}
