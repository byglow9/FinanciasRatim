// @ts-check
// Filtro de transacoes (D-07: busca e chips de tipo e categoria). Puro: devolve
// uma lista nova na ordem de entrada. A busca compara texto normalizado com
// includes (sem regex montada do texto digitado, T-3.1-02-03).

import { normalize } from './classify.js'
import { categoryDisplayName } from './categories.js'
import { groupKeyOf, compareGroupKeys } from './categoryOrder.js'

/** @typedef {import('./categories.js').CategoryDef} CategoryDef */

/**
 * @typedef {{
 *   type: string,
 *   description?: string,
 *   category?: string,
 *   categoryId?: string,
 * }} FilterableTx
 */

/**
 * @typedef {{ type?: string, categoryId?: string, query?: string }} TxFilter
 */

/**
 * Mantem so o que casa com o filtro. `type` 'entrada' ou 'saida' filtra; outro
 * valor (ou ausente) nao filtra. `categoryId` e a chave de grupo (id da
 * categoria, ou a chave legada de texto sem definicao). `query` casa descricao e
 * nome de categoria sem diferenciar caixa nem acento.
 * @template {FilterableTx} T
 * @param {T[]} transactions
 * @param {TxFilter} filter
 * @param {CategoryDef[]} defs
 * @returns {T[]}
 */
export function filterTransactions(transactions, filter, defs) {
  const { type, categoryId } = filter
  const query = normalize(filter.query)
  return transactions.filter((t) => {
    if ((type === 'entrada' || type === 'saida') && t.type !== type) return false
    if (categoryId && groupKeyOf(t, defs).key !== categoryId) return false
    if (query) {
      const haystack = `${normalize(t.description)}\n${normalize(categoryDisplayName(t, defs))}`
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

/**
 * Categorias que tem transacao no conjunto, na ordem de groupKeyOf, com a
 * contagem (para as chips).
 * @param {FilterableTx[]} transactions
 * @param {CategoryDef[]} defs
 * @returns {{ key: string, label: string, def: CategoryDef | null, rank: number, count: number }[]}
 */
export function categoriesPresent(transactions, defs) {
  /** @type {Map<string, { key: string, label: string, def: CategoryDef | null, rank: number, count: number }>} */
  const byKey = new Map()
  for (const t of transactions) {
    const g = groupKeyOf(t, defs)
    const found = byKey.get(g.key)
    if (found) found.count += 1
    else byKey.set(g.key, { ...g, count: 1 })
  }
  return [...byKey.values()].sort(compareGroupKeys)
}
