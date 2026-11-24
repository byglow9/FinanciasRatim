// @ts-check
// Parcelas N/M do cartao (puro, sem I/O e sem relogio) e o total que "sai nas
// proximas faturas" (D-03).
//
// ATENCAO (D-06, D-07): a amostra real da Pluggy nao tinha NENHUMA compra
// parcelada, entao a leitura por texto (palavra "parcela" ou "parc" junto de
// N/M) e uma HEURISTICA a reavaliar com compra parcelada real. Os campos
// `installmentNumber` e `totalInstallments` da Pluggy, quando vierem, valem
// primeiro. Sem dado, nenhuma parcela e prometida (CARD-05): um "dd/mm" solto
// numa descricao nunca vira parcela.

import { normalize } from './classify.js'

/** @typedef {{ n: number, total: number, source: 'pluggy' | 'inferred' | string }} Installment */

const MAX_TEXT = 200
const MAX_TOTAL = 48
const MIN_TOTAL = 2

// Padroes simples e ancorados em palavra, sobre texto ja truncado (T-06-15).
const WORD_BEFORE = /\bparc(?:ela)?s?\.?\s*(\d{1,2})\s*\/\s*(\d{1,2})\b/
const WORD_AFTER = /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*parc(?:ela)?s?\b/
const WORD_BEFORE_G = new RegExp(WORD_BEFORE.source, 'g')
const WORD_AFTER_G = new RegExp(WORD_AFTER.source, 'g')

/**
 * @param {number} n
 * @param {number} total
 * @returns {boolean}
 */
function validPair(n, total) {
  return (
    Number.isInteger(n) &&
    Number.isInteger(total) &&
    n >= 1 &&
    total >= MIN_TOTAL &&
    total <= MAX_TOTAL &&
    n <= total
  )
}

/**
 * @param {any} tx
 * @returns {string}
 */
function rawText(tx) {
  return String(tx?.description || tx?.descriptionRaw || '').slice(0, MAX_TEXT)
}

/**
 * Parcela de uma compra: campos da Pluggy primeiro; senao texto CRU (nunca o
 * limpo, que perde o N/M) com a palavra parcela ou parc. Qualquer outra coisa
 * devolve null.
 * @param {any} tx transacao crua da Pluggy
 * @returns {Installment | null}
 */
export function parseInstallment(tx) {
  const n = tx?.installmentNumber
  const total = tx?.totalInstallments
  if (typeof n === 'number' && typeof total === 'number' && validPair(n, total)) {
    return { n, total, source: 'pluggy' }
  }
  const text = normalize(rawText(tx))
  const m = text.match(WORD_BEFORE) ?? text.match(WORD_AFTER)
  if (!m) return null
  const nn = Number(m[1])
  const tt = Number(m[2])
  return validPair(nn, tt) ? { n: nn, total: tt, source: 'inferred' } : null
}

/**
 * Descricao normalizada sem o sufixo de parcela, para comparar parcelas da
 * mesma compra.
 * @param {unknown} raw
 * @returns {string}
 */
export function installmentBaseName(raw) {
  return normalize(String(raw ?? '').slice(0, MAX_TEXT))
    .replace(WORD_BEFORE_G, ' ')
    .replace(WORD_AFTER_G, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-\s]+|[-\s]+$/g, '')
}

/**
 * Soma k meses a um mes AAAA-MM.
 * @param {string} ym
 * @param {number} k
 * @returns {string | null}
 */
function shiftMonth(ym, k) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(ym)
  if (!m) return null
  const idx = Number(m[1]) * 12 + (Number(m[2]) - 1) + k
  const year = Math.floor(idx / 12)
  const month = (idx % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Projeta as parcelas restantes (n+1 ate total), uma por mes de fatura, a
 * partir dos lancamentos de compra. A parcela do mes continua contando nos
 * limites pelo proprio lancamento; aqui sai so o "a sair" (D-03). Nao projeta
 * mes em que ja exista lancamento real do mesmo nome-base e valor (o banco ja
 * lancou a parcela adiante) nem a mesma parcela duas vezes.
 * @param {{ purchases: { billMonth?: string | null, cents?: number | null, raw?: string, installment?: Installment | null }[] }} input
 * @returns {{
 *   byMonth: Record<string, { cents: number, items: { name: string, n: number, total: number, cents: number, source: string }[] }>,
 *   aSairCents: number
 * }}
 */
export function futureInstallments({ purchases }) {
  /** @type {Set<string>} */
  const real = new Set()
  for (const p of purchases) {
    if (!p.billMonth || typeof p.cents !== 'number') continue
    real.add(`${p.billMonth}|${installmentBaseName(p.raw)}|${p.cents}`)
  }

  /** @type {Record<string, { cents: number, items: { name: string, n: number, total: number, cents: number, source: string }[] }>} */
  const byMonth = {}
  /** @type {Set<string>} */
  const projected = new Set()
  let aSairCents = 0

  for (const p of purchases) {
    const inst = p.installment
    if (!inst || !p.billMonth || typeof p.cents !== 'number' || p.cents <= 0) continue
    const name = installmentBaseName(p.raw)
    for (let k = 1; inst.n + k <= inst.total; k += 1) {
      const month = shiftMonth(p.billMonth, k)
      if (!month) break
      const key = `${month}|${name}|${p.cents}`
      if (real.has(key) || projected.has(key)) continue
      projected.add(key)
      const bucket = (byMonth[month] ??= { cents: 0, items: [] })
      bucket.items.push({
        name,
        n: inst.n + k,
        total: inst.total,
        cents: p.cents,
        source: inst.source,
      })
      bucket.cents += p.cents
      aSairCents += p.cents
    }
  }
  return { byMonth, aSairCents }
}
