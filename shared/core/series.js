// @ts-check
// Serie por ciclo para Relatorios (D-19): recebe os lancamentos de uma janela larga
// (uma consulta por pessoa) e os reparte pelos ciclos exatos do salario, em centavos
// inteiros e sem relogio. Transferencia verdadeira fica fora das duas pontas, como no
// resto do nucleo (PR-14).

import { toCents } from './ledger.js'
import { isInCycle } from './cycle.js'
import { groupKeyOf } from './categoryOrder.js'

/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./categories.js').CategoryDef} CategoryDef */
/** @typedef {import('./budget.js').Tx} Tx */

/**
 * @typedef {{ key: string, label: string, cents: number }} CategorySlice
 */

/**
 * Ponto da serie: totais e divisao de saidas por categoria de um ciclo.
 * @typedef {{
 *   key: string,
 *   cycle: Cycle,
 *   entradasCents: number,
 *   saidasCents: number,
 *   saldoCents: number,
 *   byCategory: CategorySlice[],
 * }} CyclePoint
 */

/**
 * Um ponto por ciclo pedido, do mais antigo ao mais recente. Cada lancamento vai
 * para o ciclo que o contem (limites inclusivos); o que cai fora de todos e ignorado.
 * @param {{ transactions: Tx[], cycles: Cycle[], defs: CategoryDef[] }} input
 * @returns {CyclePoint[]}
 */
export function cycleSeries({ transactions, cycles, defs }) {
  const ordered = [...cycles].sort((a, b) => a.start.getTime() - b.start.getTime())
  const acc = ordered.map((cycle) => ({
    cycle,
    entradasCents: 0,
    saidasCents: 0,
    /** @type {Map<string, CategorySlice>} */
    slices: new Map(),
  }))

  for (const t of transactions) {
    if (t.transfer === true) continue
    if (t.type !== 'entrada' && t.type !== 'saida') continue
    const slot = acc.find((a) => isInCycle(t.date, a.cycle))
    if (!slot) continue
    const cents = toCents(t.amount)
    if (t.type === 'entrada') {
      slot.entradasCents += cents
      continue
    }
    slot.saidasCents += cents
    const group = groupKeyOf(t, defs)
    const slice = slot.slices.get(group.key)
    if (slice) slice.cents += cents
    else slot.slices.set(group.key, { key: group.key, label: group.label, cents })
  }

  return acc.map((a) => ({
    key: a.cycle.key,
    cycle: a.cycle,
    entradasCents: a.entradasCents,
    saidasCents: a.saidasCents,
    saldoCents: a.entradasCents - a.saidasCents,
    byCategory: [...a.slices.values()].sort(
      (x, y) => y.cents - x.cents || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0)
    ),
  }))
}
