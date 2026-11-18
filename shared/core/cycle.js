// @ts-check
// Ciclo do salario em America/Sao_Paulo (LIM-10, D-11), sem dependencias e sem
// relogio implicito: o "agora" e sempre argumento. Fronteiras de ciclo usam so
// zonedParts e zonedTimeToInstant de time.js (nunca o fuso do host).

import { DEFAULT_TZ, monthRangeOf, zonedParts, zonedTimeToInstant } from './time.js'

const DAY_MS = 86_400_000

/**
 * Data de calendario (sem hora).
 * @typedef {{ year: number, month: number, day: number }} DateParts
 */

/**
 * Ciclo do salario. `end` e o proximo inicio menos 1 ms; `days` conta datas de
 * calendario (imune a horario de verao).
 * @typedef {{
 *   key: string,
 *   start: Date,
 *   end: Date,
 *   startParts: DateParts,
 *   endParts: DateParts,
 *   days: number,
 *   salaryDay: number,
 * }} Cycle
 */

/**
 * @param {unknown} n
 * @returns {boolean}
 */
function isDayOfMonth(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 31
}

/**
 * Dias do mes de calendario.
 * @param {number} year
 * @param {number} month mes de 1 a 12
 * @returns {number}
 */
function daysInMonthOf(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Soma meses a um ano e mes.
 * @param {number} year
 * @param {number} month mes de 1 a 12
 * @param {number} delta
 * @returns {{ year: number, month: number }}
 */
function addMonths(year, month, delta) {
  const idx = year * 12 + (month - 1) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

/**
 * Chave YYYY-MM.
 * @param {number} year
 * @param {number} month
 * @returns {string}
 */
function keyOf(year, month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

/**
 * Data de calendario de um dia pedido num mes, limitado ao tamanho do mes.
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {DateParts}
 */
function clampedDate(year, month, day) {
  return { year, month, day: Math.min(day, daysInMonthOf(year, month)) }
}

/**
 * Instante de inicio (00:00 no fuso) de uma data de calendario.
 * @param {DateParts} d
 * @param {string} tz
 * @returns {Date}
 */
function startInstant(d, tz) {
  return zonedTimeToInstant(d.year, d.month, d.day, 0, 0, 0, tz)
}

/**
 * Dias inteiros de calendario de a ate b (negativo se b vem antes).
 * @param {DateParts} a
 * @param {DateParts} b
 * @returns {number}
 */
export function daysBetweenParts(a, b) {
  const ua = Date.UTC(a.year, a.month - 1, a.day)
  const ub = Date.UTC(b.year, b.month - 1, b.day)
  return Math.round((ub - ua) / DAY_MS)
}

/**
 * Ciclo do salario que contem o instante, no fuso pedido.
 * @param {Date} now
 * @param {number} [salaryDay] dia do salario de 1 a 31 (1 coincide com o mes-calendario)
 * @param {string} [tz]
 * @returns {Cycle}
 */
export function cycleOf(now, salaryDay = 1, tz = DEFAULT_TZ) {
  if (!isDayOfMonth(salaryDay)) throw new Error('Dia do salario invalido')
  const today = zonedParts(now, tz)
  const effective = Math.min(salaryDay, monthRangeOf(today.year, today.month, tz).daysInMonth)
  const base = today.day < effective ? addMonths(today.year, today.month, -1) : today
  const startParts = clampedDate(base.year, base.month, salaryDay)
  const nextBase = addMonths(base.year, base.month, 1)
  const nextParts = clampedDate(nextBase.year, nextBase.month, salaryDay)
  const start = startInstant(startParts, tz)
  const end = new Date(startInstant(nextParts, tz).getTime() - 1)
  const endZoned = zonedParts(end, tz)
  return {
    key: keyOf(startParts.year, startParts.month),
    start,
    end,
    startParts,
    endParts: { year: endZoned.year, month: endZoned.month, day: endZoned.day },
    days: daysBetweenParts(startParts, nextParts),
    salaryDay,
  }
}

/**
 * Ciclo vizinho (delta negativo volta, positivo avanca), sempre pelo instante
 * logo fora do ciclo, nunca por duracao fixa.
 * @param {Cycle} cycle
 * @param {number} delta
 * @param {string} [tz]
 * @returns {Cycle}
 */
export function shiftCycle(cycle, delta, tz = DEFAULT_TZ) {
  let current = cycle
  const steps = Math.abs(Math.trunc(delta))
  for (let i = 0; i < steps; i += 1) {
    const edge =
      delta < 0 ? new Date(current.start.getTime() - 1) : new Date(current.end.getTime() + 1)
    current = cycleOf(edge, cycle.salaryDay, tz)
  }
  return current
}

/**
 * Dia do ciclo de 1 a `days`, contando hoje; satura nas pontas.
 * @param {Cycle} cycle
 * @param {Date} now
 * @param {string} [tz]
 * @returns {number}
 */
export function cycleDay(cycle, now, tz = DEFAULT_TZ) {
  const today = zonedParts(now, tz)
  const n = daysBetweenParts(cycle.startParts, today) + 1
  return Math.min(Math.max(n, 1), cycle.days)
}

/**
 * Dias que restam no ciclo, contando hoje; 0 se o ciclo ja acabou.
 * @param {Cycle} cycle
 * @param {Date} now
 * @param {string} [tz]
 * @returns {number}
 */
export function daysLeftInCycle(cycle, now, tz = DEFAULT_TZ) {
  if (isCycleOver(cycle, now)) return 0
  return cycle.days - cycleDay(cycle, now, tz) + 1
}

/**
 * O instante ja passou do fim do ciclo.
 * @param {Cycle} cycle
 * @param {Date} now
 * @returns {boolean}
 */
export function isCycleOver(cycle, now) {
  return now.getTime() > cycle.end.getTime()
}

/**
 * Meses de calendario cobertos pelo ciclo (1 ou 2, sem repetir).
 * @param {Cycle} cycle
 * @returns {{ month: number, year: number }[]}
 */
export function cycleMonths(cycle) {
  const first = { month: cycle.startParts.month, year: cycle.startParts.year }
  const last = { month: cycle.endParts.month, year: cycle.endParts.year }
  if (first.month === last.month && first.year === last.year) return [first]
  return [first, last]
}

/**
 * Datas em que um vencimento cai dentro do ciclo (0 a 2 itens). O dia e
 * limitado ao tamanho do mes de cada candidato.
 * @param {number} dueDay dia de vencimento de 1 a 31
 * @param {Cycle} cycle
 * @param {string} [tz]
 * @returns {DateParts[]}
 */
export function billOccurrences(dueDay, cycle, tz = DEFAULT_TZ) {
  if (!isDayOfMonth(dueDay)) throw new Error('Dia de vencimento invalido')
  const nextMonth = addMonths(cycle.startParts.year, cycle.startParts.month, 1)
  const candidates = [
    clampedDate(cycle.startParts.year, cycle.startParts.month, dueDay),
    clampedDate(nextMonth.year, nextMonth.month, dueDay),
  ]
  return candidates.filter((c) => {
    const at = startInstant(c, tz).getTime()
    return at >= cycle.start.getTime() && at <= cycle.end.getTime()
  })
}

/**
 * Primeira data de vencimento em ou depois de hoje (calendario do fuso).
 * @param {number} dueDay dia de vencimento de 1 a 31
 * @param {Date} now
 * @param {string} [tz]
 * @returns {DateParts}
 */
export function nextOccurrence(dueDay, now, tz = DEFAULT_TZ) {
  if (!isDayOfMonth(dueDay)) throw new Error('Dia de vencimento invalido')
  const t = zonedParts(now, tz)
  const today = { year: t.year, month: t.month, day: t.day }
  const next = addMonths(t.year, t.month, 1)
  const candidates = [
    clampedDate(t.year, t.month, dueDay),
    clampedDate(next.year, next.month, dueDay),
  ]
  return candidates.find((c) => daysBetweenParts(today, c) >= 0) ?? candidates[1]
}
