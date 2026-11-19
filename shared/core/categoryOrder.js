// @ts-check
// Ordem estavel de categorias (D-14): fonte unica da regra para Transacoes e
// Contas Fixas. A ordem depende so da posicao em categoryDefs; nunca do estado
// de pago nem do valor. Ativas na ordem do array, depois arquivadas na ordem do
// array, depois texto legado (sem definicao) em A a Z.

import { normalize } from './classify.js'
import { resolveCategoryId } from './categories.js'

/** @typedef {import('./categories.js').CategoryDef} CategoryDef */

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   def: CategoryDef | null,
 *   rank: number,
 * }} GroupKey
 */

/**
 * Grupo de categoria de um item: por categoryId; sem ele (ou id desconhecido),
 * pelo nome em `category`; texto sem definicao vira grupo legado.
 * @param {{ categoryId?: string, category?: string }} item
 * @param {CategoryDef[]} defs
 * @returns {GroupKey}
 */
export function groupKeyOf(item, defs) {
  const text = String(item.category ?? '').trim()
  const id = (item.categoryId && defs.some((d) => d.id === item.categoryId)
    ? item.categoryId
    : null) ?? resolveCategoryId(text, defs)
  const index = id ? defs.findIndex((d) => d.id === id) : -1
  if (index >= 0) {
    const def = defs[index]
    return {
      key: def.id,
      label: def.name,
      def,
      rank: (def.archived ? defs.length : 0) + index,
    }
  }
  return {
    key: `legacy:${normalize(text)}`,
    label: text || 'Sem categoria',
    def: null,
    rank: defs.length * 2,
  }
}

/**
 * Comparador de grupos: por rank e, entre legados, pelo texto normalizado.
 * @param {GroupKey} a
 * @param {GroupKey} b
 * @returns {number}
 */
export function compareGroupKeys(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank
  if (a.key === b.key) return 0
  return a.key < b.key ? -1 : 1
}
