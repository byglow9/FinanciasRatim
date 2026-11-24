// @ts-check
// Faturas do cartao de credito (CARD-08, CENT-03, D-04, D-06, D-09). O MeuPluggy
// nao entrega fatura nem datas de fechamento e vencimento; entrega so o mes da
// fatura prevista de cada compra (billForecastDate, AAAA-MM). Aqui o mes da fatura
// vem da Pluggy quando existe e, senao, e derivado pelo dia de fechamento que o
// dono informou. Tudo puro: sem pacote, sem relogio (o "agora" e argumento), em
// America/Sao_Paulo via zonedParts. Funcoes nunca lancam: entrada fora do tipo
// devolve o resultado conservador (null, 'unknown' ou lista vazia).

import { DEFAULT_TZ, monthRangeOf, zonedParts } from './time.js'
import { daysBetweenParts } from './cycle.js'
import { toCents } from './ledger.js'

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

/**
 * Centavos assinados de um lancamento de cartao: compra soma, estorno subtrai,
 * qualquer outro tipo (pagamento, transferencia) nao entra na fatura. O valor
 * ja vem em reais (compra internacional ja convertida, D-08).
 * @param {any} tx
 * @returns {number | null}
 */
function signedCents(tx) {
  if (!tx || typeof tx.amount !== 'number' || !Number.isFinite(tx.amount)) return null
  if (tx.cardKind === 'purchase') return Math.abs(toCents(tx.amount))
  if (tx.cardKind === 'refund') return -Math.abs(toCents(tx.amount))
  return null
}

/**
 * Total por fatura em centavos inteiros. Servidor (cards.billTotals) e cliente
 * usam esta mesma funcao para o total gravado e o exibido nunca divergirem.
 * Lancamento sem billMonth e com data (compra lancada a mao, D-12) usa o mes
 * derivado do fechamento; sem fechamento ou sem data vai para unassignedCents.
 * @param {unknown} txs lancamentos { cardKind, amount, billMonth, date }
 * @param {{ closingDay?: unknown, tz?: string }} [opts]
 * @returns {{ totals: Record<string, number>, unassignedCents: number }}
 */
export function sumBillTotals(txs, { closingDay, tz = DEFAULT_TZ } = {}) {
  /** @type {Record<string, number>} */
  const totals = {}
  let unassignedCents = 0
  if (!Array.isArray(txs)) return { totals, unassignedCents }
  for (const tx of txs) {
    const cents = signedCents(tx)
    if (cents === null) continue
    const { billMonth } = billMonthOf({ billMonth: tx.billMonth, date: tx.date, closingDay, tz })
    if (billMonth === null) unassignedCents += cents
    else totals[billMonth] = (totals[billMonth] ?? 0) + cents
  }
  return { totals, unassignedCents }
}

export const BILL_STATUSES = Object.freeze(['aberta', 'fechada', 'paga', 'atrasada', 'futura'])

/** @typedef {'aberta' | 'fechada' | 'paga' | 'atrasada' | 'futura'} CardBillStatus */

/**
 * Status de uma fatura por datas de calendario. Sem fechamento ou vencimento
 * validos devolve status null: nunca inventar estado sem as datas do dono
 * (D-04, D-09).
 * @param {{
 *   billMonth?: unknown, totalCents?: number, paidCents?: number, overridePaid?: boolean,
 *   now?: Date, closingDay?: unknown, dueDay?: unknown, tz?: string,
 * }} [input]
 * @returns {{ status: CardBillStatus | null, remainingCents: number }}
 */
export function cardBillStatus({ billMonth, totalCents, paidCents, overridePaid, now, closingDay, dueDay, tz = DEFAULT_TZ } = {}) {
  const total = typeof totalCents === 'number' && Number.isFinite(totalCents) ? totalCents : 0
  const paid = typeof paidCents === 'number' && Number.isFinite(paidCents) && paidCents > 0 ? paidCents : 0
  const remaining = Math.max(total - paid, 0)
  const unknown = { status: null, remainingCents: remaining }

  const due = duePartsOf(billMonth, closingDay, dueDay)
  const today = partsOfDate(now, tz)
  const open = openBillMonth(/** @type {Date} */ (now), closingDay, tz)
  if (!due || !today || !open || typeof billMonth !== 'string') return unknown

  if (billMonth > open) return { status: 'futura', remainingCents: remaining }
  if (billMonth === open) return { status: 'aberta', remainingCents: remaining }

  // fatura ja fechada
  if ((total > 0 && paid >= total) || overridePaid === true) return { status: 'paga', remainingCents: 0 }
  if (remaining > 0 && daysBetweenParts(due, today) > 0) return { status: 'atrasada', remainingCents: remaining }
  return { status: 'fechada', remainingCents: remaining }
}

/**
 * Item de fatura (compra ou estorno). `origin` e `manual` para o lancamento que
 * nao vem do banco (sem bankImportId e sem source 'bank', D-12) e `bank` nos demais.
 * @typedef {{
 *   id: string | null, date: Date | null, description: string, amountCents: number,
 *   cardKind: string, cardStatus: string | null, origin: 'bank' | 'manual',
 *   billSource: 'pluggy' | 'derived', tx: any,
 * }} CardBillItem
 */

/**
 * @typedef {{
 *   billMonth: string, closeParts: DateParts | null, dueParts: DateParts | null,
 *   totalCents: number, paidCents: number, remainingCents: number,
 *   count: number, pendingCount: number, status: CardBillStatus | null,
 *   isCurrent: boolean, isNext: boolean, items: CardBillItem[],
 * }} CardBill
 */

/**
 * @param {any} tx
 * @returns {'bank' | 'manual'}
 */
function originOf(tx) {
  return tx.bankImportId || tx.source === 'bank' ? 'bank' : 'manual'
}

/**
 * Instante de uma data de lancamento para ordenar (null vira o menor valor).
 * @param {unknown} value
 * @returns {number}
 */
function timeOf(value) {
  if (value == null || value === '') return Number.NEGATIVE_INFINITY
  const d = value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : Number.NEGATIVE_INFINITY
}

/**
 * Agrupa os lancamentos do cartao por mes da fatura (da Pluggy ou derivado do
 * fechamento) com fechamento, vencimento, total e status. Sem fechamento ou
 * vencimento agrupa so pelo mes da Pluggy e deixa datas e status null (CARD-08
 * depende do dono informar, D-09). Lancamento sem mes e sem como derivar fica
 * fora da lista e volta somado em `unassignedCents`. Nao cria fatura vazia: so
 * existe fatura onde ha lancamento.
 * `count` conta compras (estorno entra no total e nos itens, nao na contagem);
 * `pendingCount` conta compras com cardStatus pending.
 * @param {{
 *   txs?: unknown, payments?: unknown, paidMonths?: unknown, closingDay?: unknown,
 *   dueDay?: unknown, now?: Date, tz?: string,
 * }} [input]
 * @returns {{ bills: CardBill[], unassignedCents: number }}
 */
export function groupBills({ txs, payments, paidMonths, closingDay, dueDay, now, tz = DEFAULT_TZ } = {}) {
  const list = Array.isArray(txs) ? txs : []
  const { totals, unassignedCents } = sumBillTotals(list, { closingDay, tz })

  /** @type {Map<string, CardBillItem[]>} */
  const itemsByBill = new Map()
  /** @type {Record<string, { count: number, pending: number }>} */
  const counts = {}
  for (const tx of list) {
    const cents = signedCents(tx)
    if (cents === null) continue
    const { billMonth, source } = billMonthOf({ billMonth: tx.billMonth, date: tx.date, closingDay, tz })
    if (billMonth === null) continue
    const item = /** @type {CardBillItem} */ ({
      id: typeof tx.id === 'string' ? tx.id : null,
      date: tx.date instanceof Date ? tx.date : null,
      description: typeof tx.description === 'string' ? tx.description : '',
      amountCents: cents,
      cardKind: tx.cardKind,
      cardStatus: typeof tx.cardStatus === 'string' ? tx.cardStatus : null,
      origin: originOf(tx),
      billSource: source === 'pluggy' ? 'pluggy' : 'derived',
      tx,
    })
    const bucket = itemsByBill.get(billMonth) ?? []
    bucket.push(item)
    itemsByBill.set(billMonth, bucket)
    const c = counts[billMonth] ?? (counts[billMonth] = { count: 0, pending: 0 })
    if (tx.cardKind === 'purchase') {
      c.count++
      if (tx.cardStatus === 'pending') c.pending++
    }
  }

  /** @type {Record<string, number>} */
  const paidByBill = {}
  if (Array.isArray(payments)) {
    for (const p of payments) {
      if (!p || !parseBillMonth(p.billMonth) || typeof p.cents !== 'number' || !Number.isFinite(p.cents)) continue
      paidByBill[p.billMonth] = (paidByBill[p.billMonth] ?? 0) + p.cents
    }
  }
  const marked = new Set(Array.isArray(paidMonths) ? paidMonths : [])

  const open = now ? openBillMonth(now, closingDay, tz) : null
  const next = open ? shiftBillMonth(open, 1) : null

  const bills = [...itemsByBill.keys()].sort().map((billMonth) => {
    const totalCents = totals[billMonth] ?? 0
    const paidCents = paidByBill[billMonth] ?? 0
    const { status, remainingCents } = cardBillStatus({
      billMonth,
      totalCents,
      paidCents,
      overridePaid: marked.has(billMonth),
      now,
      closingDay,
      dueDay,
      tz,
    })
    const items = /** @type {CardBillItem[]} */ (itemsByBill.get(billMonth))
      .slice()
      .sort((a, b) => timeOf(b.date) - timeOf(a.date) || String(b.id).localeCompare(String(a.id)))
    return /** @type {CardBill} */ ({
      billMonth,
      closeParts: closingPartsOf(billMonth, closingDay),
      dueParts: duePartsOf(billMonth, closingDay, dueDay),
      totalCents,
      paidCents,
      remainingCents,
      count: counts[billMonth]?.count ?? 0,
      pendingCount: counts[billMonth]?.pending ?? 0,
      status,
      isCurrent: billMonth === open,
      isNext: billMonth === next,
      items,
    })
  })
  return { bills, unassignedCents }
}
