// @ts-check
// Tempo em America/Sao_Paulo, sem dependencias e sem relogio implicito: o
// "agora" e sempre passado como argumento (D-11). Funciona igual em qualquer
// fuso do host (Railway roda em UTC; a maquina de desenvolvimento em Sao Paulo).

export const DEFAULT_TZ = 'America/Sao_Paulo'

/**
 * Partes de calendario de um instante no fuso pedido.
 * @param {Date} date
 * @param {string} [tz]
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }}
 */
export function zonedParts(date, tz = DEFAULT_TZ) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
  /** @type {Record<string, number>} */
  const p = {}
  for (const { type, value } of f.formatToParts(date)) {
    if (type !== 'literal') p[type] = Number(value)
  }
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
  }
}

/**
 * Instante (UTC) que corresponde a uma data e hora de parede no fuso pedido.
 * @param {number} y
 * @param {number} m mes de 1 a 12
 * @param {number} d
 * @param {number} [h]
 * @param {number} [mi]
 * @param {number} [s]
 * @param {string} [tz]
 * @returns {Date}
 */
export function zonedTimeToInstant(y, m, d, h = 0, mi = 0, s = 0, tz = DEFAULT_TZ) {
  const guess = Date.UTC(y, m - 1, d, h, mi, s)
  const p = zonedParts(new Date(guess), tz)
  const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return new Date(guess - (shown - guess))
}

/**
 * Mes (calendario do fuso) de um ano e mes.
 * @param {number} year
 * @param {number} month mes de 1 a 12
 * @param {string} [tz]
 * @returns {{ start: Date, end: Date, year: number, month: number, daysInMonth: number }}
 */
export function monthRangeOf(year, month, tz = DEFAULT_TZ) {
  const start = zonedTimeToInstant(year, month, 1, 0, 0, 0, tz)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextStart = zonedTimeToInstant(nextYear, nextMonth, 1, 0, 0, 0, tz)
  const end = new Date(nextStart.getTime() - 1)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start, end, year, month, daysInMonth }
}

/**
 * Mes do fuso que contem o instante.
 * @param {Date} instant
 * @param {string} [tz]
 * @returns {{ start: Date, end: Date, year: number, month: number, daysInMonth: number }}
 */
export function monthRange(instant, tz = DEFAULT_TZ) {
  const { year, month } = zonedParts(instant, tz)
  return monthRangeOf(year, month, tz)
}

/**
 * Dias que faltam no mes do instante, contando o dia de hoje.
 * @param {Date} instant
 * @param {string} [tz]
 * @returns {number}
 */
export function daysRemainingInMonth(instant, tz = DEFAULT_TZ) {
  const { year, month, day } = zonedParts(instant, tz)
  const { daysInMonth } = monthRangeOf(year, month, tz)
  return daysInMonth - day + 1
}
