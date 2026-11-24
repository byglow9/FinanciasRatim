// @ts-check
// Entrada do cartao de credito (puro, sem I/O e sem relogio): valor em reais
// (regra do dolar, D-08), tipo da entrada (compra, estorno ou pagamento),
// mes da fatura da Pluggy e status. Parcelas ficam em cardInstallments.js e
// a reconciliacao pendente/confirmada em cardReconcile.js.

import { cleanDescription, isCardBillPayment, normalize, toLocalDate } from './classify.js'
import { toCents } from './ledger.js'

// DATA DA COMPRA - REGRA AINDA NAO CONFIRMADA PELO DONO (resposta pendente em
// 06-02). Enquanto nao houver resposta, a data da compra e o campo `date` da
// Pluggy. A amostra real (D-06) nao trouxe `purchaseDate`. Para trocar a regra,
// altere SO esta constante (ex.: 'purchaseDate'); se o campo escolhido faltar
// na transacao, cai em `date`. Nenhum outro ponto do modulo escolhe o campo.
export const PURCHASE_DATE_FIELD = 'date'

/**
 * @typedef {{
 *   kind: 'purchase' | 'refund' | 'payment',
 *   cents: number | null,
 *   brlMissing: boolean,
 *   date: Date,
 *   description: string,
 *   raw: string,
 *   status: 'pending' | 'posted',
 *   billMonth: string | null,
 *   billMonthSource: 'pluggy' | null,
 *   installment: null | { n: number, total: number, source: string },
 *   currency?: { code: string, originalCents: number }
 * }} CardTxEntry
 */

/**
 * Valor de uma entrada do cartao em centavos de reais, sempre positivo.
 * Moeda diferente de BRL usa `amountInAccountCurrency` (D-08); sem ele devolve
 * null em vez de chutar (T-06-12). Moeda ausente conta como BRL.
 * @param {any} tx transacao crua da Pluggy
 * @returns {number | null}
 */
export function cardAmountCents(tx) {
  const code = String(tx?.currencyCode ?? 'BRL').trim().toUpperCase() || 'BRL'
  if (code === 'BRL') {
    const amount = Number(tx?.amount)
    return Number.isFinite(amount) ? Math.abs(toCents(amount)) : null
  }
  const raw = tx?.amountInAccountCurrency
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return Math.abs(toCents(raw))
}

/**
 * Mes da fatura (AAAA-MM) a partir de texto AAAA-MM, data ISO ou Date.
 * @param {unknown} value
 * @returns {string | null}
 */
export function parseBillForecast(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 7)
  }
  if (typeof value !== 'string') return null
  const m = value.trim().match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2}(?:T.*)?)?$/)
  return m ? `${m[1]}-${m[2]}` : null
}

/**
 * @param {any} tx
 * @returns {string | number | Date}
 */
function purchaseDateOf(tx) {
  return tx?.[PURCHASE_DATE_FIELD] ?? tx?.date
}

/**
 * Classifica uma transacao crua do cartao. Devolve null para valor zero.
 * Data futura NAO e descartada (o cartao pode lancar parcelas adiante; o
 * orcamento filtra por data sozinho). Moeda estrangeira sem valor convertido
 * volta com `cents: null` e `brlMissing: true` (sem valor em reais).
 * Saida em lista fechada de campos: nunca copia numero do cartao nem titular.
 * @param {any} tx transacao crua da Pluggy
 * @param {{ categoryNames?: string[] }} [ctx]
 * @returns {CardTxEntry | null}
 */
export function classifyCardTx(tx, { categoryNames = [] } = {}) {
  const amount = Number(tx?.amount)
  if (!Number.isFinite(amount) || toCents(Math.abs(amount)) === 0) return null

  const cents = cardAmountCents(tx)
  if (cents === 0) return null

  const categoryText = normalize(categoryNames.join(' | '))
  /** @type {'purchase' | 'refund' | 'payment'} */
  let kind
  if (tx.type === 'DEBIT') {
    kind = 'purchase'
  } else if (tx.type === 'CREDIT' || amount < 0) {
    kind = isCardBillPayment(tx, categoryText) ? 'payment' : 'refund'
  } else {
    kind = 'purchase'
  }

  const raw = String(tx.description || tx.descriptionRaw || 'Transacao bancaria').trim()
  const billMonth = parseBillForecast(tx.billForecastDate)
  const code = String(tx.currencyCode ?? 'BRL').trim().toUpperCase() || 'BRL'

  /** @type {CardTxEntry} */
  const entry = {
    kind,
    cents,
    brlMissing: cents === null,
    date: toLocalDate(purchaseDateOf(tx)),
    description: cleanDescription(raw),
    raw,
    status: tx.status === 'PENDING' ? 'pending' : 'posted',
    billMonth,
    billMonthSource: billMonth ? 'pluggy' : null,
    installment: null,
  }
  if (code !== 'BRL') {
    entry.currency = { code, originalCents: Math.abs(toCents(amount)) }
  }
  return entry
}
