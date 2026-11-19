// @ts-check
// Calculos de dinheiro puros: somas em centavos inteiros (sem erro de ponto
// flutuante) devolvidas em reais. Relogio sempre injetado (D-11); o orcamento,
// os limites e os alertas nascem na Fase 3 e nao entram aqui (D-12).

import { DEFAULT_TZ, monthRangeOf, zonedParts } from './time.js'
import { daysBetweenParts } from './cycle.js'

/** @typedef {{ type: string, amount: number, date: Date }} LedgerTx */

/**
 * Reais para centavos inteiros.
 * @param {number} value
 * @returns {number}
 */
export function toCents(value) {
  return Math.round(Number(value) * 100)
}

/**
 * Centavos inteiros para reais.
 * @param {number} cents
 * @returns {number}
 */
export function fromCents(cents) {
  return cents / 100
}

/**
 * Saldo em centavos: entrada soma, saida subtrai.
 * @param {LedgerTx[]} transactions
 * @returns {number}
 */
function netCents(transactions) {
  let sum = 0
  for (const t of transactions) {
    sum += t.type === 'entrada' ? toCents(t.amount) : -toCents(t.amount)
  }
  return sum
}

/**
 * Totais de uma lista de lancamentos (ja filtrada pelo mes).
 * @param {LedgerTx[]} transactions
 * @returns {{ entradas: number, saidas: number, saldo: number }}
 */
export function monthTotals(transactions) {
  let entradas = 0
  let saidas = 0
  for (const t of transactions) {
    if (t.type === 'entrada') entradas += toCents(t.amount)
    else saidas += toCents(t.amount)
  }
  return {
    entradas: fromCents(entradas),
    saidas: fromCents(saidas),
    saldo: fromCents(entradas - saidas),
  }
}

/**
 * Saldo acumulado de tudo ate o instante limite (inclusive), meses anteriores incluidos.
 * @param {LedgerTx[]} transactions
 * @param {Date} untilInstant
 * @returns {number}
 */
export function accumulatedBalance(transactions, untilInstant) {
  const limit = untilInstant.getTime()
  return fromCents(netCents(transactions.filter((t) => t.date.getTime() <= limit)))
}

/**
 * Quanto ainda pode gastar por semana no mes escolhido: saldo do mes dividido
 * pelas semanas que faltam (dias restantes contando hoje, arredondado para
 * cima de 7 em 7). Dia de referencia e hoje em Sao Paulo, limitado ao mes.
 * @param {{
 *   transactions: LedgerTx[],
 *   now: Date,
 *   month: { year: number, month: number },
 *   tz?: string
 * }} input
 * @returns {{ daysRemaining: number, weeksRemaining: number, saldoMensal: number, maxWeeklySpend: number }}
 */
export function weeklySpend({ transactions, now, month, tz = DEFAULT_TZ }) {
  const range = monthRangeOf(month.year, month.month, tz)
  const inMonth = transactions.filter(
    (t) => t.date.getTime() >= range.start.getTime() && t.date.getTime() <= range.end.getTime()
  )
  const reference =
    now.getTime() < range.start.getTime() ? range.start : now.getTime() > range.end.getTime() ? range.end : now
  const daysRemaining = range.daysInMonth - zonedParts(reference, tz).day + 1
  const weeksRemaining = Math.ceil(daysRemaining / 7)
  const saldoCents = netCents(inMonth)
  return {
    daysRemaining,
    weeksRemaining,
    saldoMensal: fromCents(saldoCents),
    maxWeeklySpend: fromCents(Math.round(saldoCents / weeksRemaining)),
  }
}

/**
 * Variante por ciclo de weeklySpend: mesma semantica, mas sobre a janela exata
 * cycle.start a cycle.end (nao o mes-calendario). Os dias restantes contam hoje
 * ate cycle.endParts, inclusive; antes do inicio a referencia e o inicio, depois
 * do fim e o fim (1 dia). Semanas = teto de dias / 7; o limite semanal e o saldo
 * do ciclo dividido pelas semanas, arredondado ao centavo.
 * @param {{
 *   transactions: LedgerTx[],
 *   cycle: import('./cycle.js').Cycle,
 *   now: Date,
 *   tz?: string
 * }} input
 * @returns {{ daysRemaining: number, weeksRemaining: number, saldoCiclo: number, maxWeeklySpend: number }}
 */
export function weeklySpendForCycle({ transactions, cycle, now, tz = DEFAULT_TZ }) {
  const startMs = cycle.start.getTime()
  const endMs = cycle.end.getTime()
  const inCycle = transactions.filter((t) => t.date.getTime() >= startMs && t.date.getTime() <= endMs)
  const reference = now.getTime() < startMs ? cycle.start : now.getTime() > endMs ? cycle.end : now
  const daysRemaining = daysBetweenParts(zonedParts(reference, tz), cycle.endParts) + 1
  const weeksRemaining = Math.ceil(daysRemaining / 7)
  const saldoCents = netCents(inCycle)
  return {
    daysRemaining,
    weeksRemaining,
    saldoCiclo: fromCents(saldoCents),
    maxWeeklySpend: fromCents(Math.round(saldoCents / weeksRemaining)),
  }
}
