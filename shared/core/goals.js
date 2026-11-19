// @ts-check
// Metas: progresso e soma de aportes em centavos inteiros, sem ponto flutuante e sem arredondar
// antes de decidir se a meta esta concluida.

import { fromCents, toCents } from './ledger.js'

/**
 * Progresso de uma meta a partir dos valores em reais. A conclusao e decidida em centavos: 99,5%
 * arredonda para 100 no texto, mas a meta so esta concluida quando o guardado alcanca o alvo.
 * @param {number} currentAmount reais guardados
 * @param {number} targetAmount reais do alvo
 * @returns {{ complete: boolean, percent: number, remainingCents: number }}
 */
export function goalProgress(currentAmount, targetAmount) {
  const current = toCents(currentAmount)
  const target = toCents(targetAmount)
  if (!(target > 0)) return { complete: false, percent: 0, remainingCents: 0 }
  const complete = current >= target
  const percent = complete ? 100 : Math.max(0, Math.min(99, Math.round((current / target) * 100)))
  return { complete, percent, remainingCents: Math.max(0, target - current) }
}

/**
 * Soma um aporte ao valor guardado em centavos inteiros e devolve reais.
 * @param {number} currentAmount reais guardados
 * @param {number} amount reais do aporte
 * @returns {number}
 */
export function addAmount(currentAmount, amount) {
  return fromCents(toCents(currentAmount) + toCents(amount))
}
