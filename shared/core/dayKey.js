// @ts-check
// Chave do dia e agrupamento de lancamentos por dia (D-07). O dia sempre vem de
// zonedParts em America/Sao_Paulo, nunca de Date#getDate nem de date-fns (que
// usam o fuso do computador). Sem relogio implicito: o "hoje" entra como chave.

import { DEFAULT_TZ, zonedParts, zonedTimeToInstant } from './time.js'
import { toCents } from './ledger.js'
import { MONTH_LONG, MONTH_SHORT } from './format.js'

/**
 * Data de calendario (sem hora).
 * @typedef {{ year: number, month: number, day: number }} DateParts
 */

/** Dias da semana abreviados, domingo primeiro. */
export const WEEKDAY_SHORT = Object.freeze(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'])

const MIDDOT = '·'
const DAY_MS = 86_400_000

/**
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function pad(n, width) {
  return String(n).padStart(width, '0')
}

/**
 * Chave YYYY-MM-DD do dia do instante no fuso pedido.
 * @param {Date} instant
 * @param {string} [tz]
 * @returns {string}
 */
export function dayKeyOf(instant, tz = DEFAULT_TZ) {
  const p = zonedParts(instant, tz)
  return `${pad(p.year, 4)}-${pad(p.month, 2)}-${pad(p.day, 2)}`
}

/**
 * Meio-dia de Sao Paulo do dia pedido, por chave YYYY-MM-DD ou por instante. E o instante que se
 * grava para "um dia": a chave volta igual em qualquer fuso do aparelho (WR-05).
 * @param {string | Date} dayOrKey
 * @returns {Date}
 */
export function noonOfDay(dayOrKey) {
  const key = typeof dayOrKey === 'string' ? dayOrKey : dayKeyOf(dayOrKey)
  const [year, month, day] = key.split('-').map(Number)
  return zonedTimeToInstant(year, month, day, 12)
}

/**
 * "19/11/2026" no dia de Sao Paulo do instante, qualquer que seja o fuso do aparelho (WR-06).
 * @param {Date} instant
 * @returns {string}
 */
export function formatDayBR(instant) {
  const p = zonedParts(instant)
  return `${pad(p.day, 2)}/${pad(p.month, 2)}/${pad(p.year, 4)}`
}

/**
 * "18 de novembro" no dia de Sao Paulo do instante.
 * @param {Date} instant
 * @returns {string}
 */
export function dayLabelOf(instant) {
  const p = zonedParts(instant)
  return `${p.day} de ${MONTH_LONG[p.month - 1].toLowerCase()}`
}

/**
 * Partes de calendario de uma chave YYYY-MM-DD.
 * @param {string} key
 * @returns {DateParts}
 */
function partsOfKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return { year, month, day }
}

/**
 * Agrupa itens pelo dia de Sao Paulo. `desc` (padrao) vai do dia mais recente ao
 * mais antigo; dentro do dia a ordem de entrada e mantida.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Date} getDate
 * @param {'desc' | 'asc'} [order]
 * @returns {{ key: string, items: T[] }[]}
 */
export function groupByDay(items, getDate, order = 'desc') {
  /** @type {Map<string, T[]>} */
  const byKey = new Map()
  for (const item of items) {
    const key = dayKeyOf(getDate(item))
    const list = byKey.get(key)
    if (list) list.push(item)
    else byKey.set(key, [item])
  }
  const keys = [...byKey.keys()].sort()
  if (order === 'desc') keys.reverse()
  return keys.map((key) => ({ key, items: /** @type {T[]} */ (byKey.get(key)) }))
}

/**
 * Lancamentos agrupados por dia com o liquido do dia (entradas menos saidas, em
 * centavos inteiros). Transferencia verdadeira continua na lista mas fica fora
 * do total.
 * @template {{ type: string, amount: number, date: Date, transfer?: boolean }} T
 * @param {T[]} transactions
 * @param {'desc' | 'asc'} [order]
 * @returns {{ key: string, parts: DateParts, items: T[], netCents: number }[]}
 */
export function transactionDayGroups(transactions, order = 'desc') {
  const sign = order === 'desc' ? -1 : 1
  return groupByDay(transactions, (t) => t.date, order).map(({ key, items }) => {
    const sorted = [...items].sort((a, b) => sign * (a.date.getTime() - b.date.getTime()))
    let netCents = 0
    for (const t of sorted) {
      if (t.transfer === true) continue
      netCents += t.type === 'entrada' ? toCents(t.amount) : -toCents(t.amount)
    }
    return { key, parts: partsOfKey(key), items: sorted, netCents }
  })
}

/**
 * Titulo do dia: 'Hoje · qua, 18 nov', 'Ontem' ou 'seg, 16 nov'.
 * @param {string} key chave YYYY-MM-DD do dia
 * @param {string} todayKey chave YYYY-MM-DD de hoje
 * @returns {string}
 */
export function dayHeading(key, todayKey) {
  const p = partsOfKey(key)
  const t = partsOfKey(todayKey)
  const diff = Math.round(
    (Date.UTC(t.year, t.month - 1, t.day) - Date.UTC(p.year, p.month - 1, p.day)) / DAY_MS,
  )
  const weekday = WEEKDAY_SHORT[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]
  const label = `${weekday}, ${p.day} ${MONTH_SHORT[p.month - 1]}`
  if (diff === 0) return `Hoje ${MIDDOT} ${label}`
  if (diff === 1) return 'Ontem'
  return label
}
