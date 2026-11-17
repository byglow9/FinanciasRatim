// @ts-check
// Categorias com id estavel (D-07): o id nasce de um slug na criacao e nunca
// muda; renomear troca so o nome. Excluir arquiva e nunca apaga (D-08), para
// que lancamentos antigos continuem mostrando o nome. Tudo imutavel e puro.

import { normalize } from './classify.js'

/** @typedef {{ id: string, name: string, color?: string, archived?: boolean }} CategoryDef */

/** @type {CategoryDef[]} */
export const DEFAULT_CATEGORY_DEFS = [
  { id: 'alimentacao', name: 'Alimentacao', color: '#f97316' },
  { id: 'transporte', name: 'Transporte', color: '#3b82f6' },
  { id: 'moradia', name: 'Moradia', color: '#8b5cf6' },
  { id: 'saude', name: 'Saude', color: '#ef4444' },
  { id: 'lazer', name: 'Lazer', color: '#22c55e' },
  { id: 'educacao', name: 'Educacao', color: '#06b6d4' },
  { id: 'vestuario', name: 'Vestuario', color: '#ec4899' },
  { id: 'servicos', name: 'Servicos', color: '#f59e0b' },
  { id: 'salario', name: 'Salario', color: '#10b981' },
  { id: 'investimentos', name: 'Investimentos', color: '#6366f1' },
  { id: 'outros', name: 'Outros', color: '#64748b' },
]

/**
 * Slug minusculo sem acento (so a-z, 0-9 e hifen). Em colisao com um id ja
 * usado acrescenta -2, -3... Nunca devolve vazio.
 * @param {string} name
 * @param {Iterable<string>} [takenIds]
 * @returns {string}
 */
export function slugify(name, takenIds = []) {
  const base =
    normalize(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'categoria'
  const taken = new Set(takenIds)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/**
 * Id da categoria (inclusive arquivada) cujo nome casa por normalize.
 * @param {string} text
 * @param {CategoryDef[]} defs
 * @returns {string | null}
 */
export function resolveCategoryId(text, defs) {
  const key = normalize(text)
  if (!key) return null
  return defs.find((d) => normalize(d.name) === key)?.id ?? null
}

/**
 * Monta definicoes a partir de nomes. Definicoes existentes nunca sao
 * recalculadas; nomes novos ganham slug unico.
 * @param {string[]} names
 * @param {CategoryDef[]} [existing]
 * @returns {CategoryDef[]}
 */
export function buildCategoryDefs(names, existing = []) {
  const defs = [...existing]
  for (const raw of names) {
    const name = String(raw ?? '').trim()
    if (!name || resolveCategoryId(name, defs)) continue
    defs.push({ id: slugify(name, defs.map((d) => d.id)), name })
  }
  return defs
}

/**
 * Garante uma definicao (arquivada) para cada texto de categoria em uso que
 * nao case com nenhuma existente (por exemplo categorias antigas orfas).
 * @param {CategoryDef[]} defs
 * @param {string[]} usedTexts
 * @returns {{ defs: CategoryDef[], added: CategoryDef[] }}
 */
export function ensureCategoryDefs(defs, usedTexts) {
  const next = [...defs]
  /** @type {CategoryDef[]} */
  const added = []
  for (const raw of usedTexts) {
    const name = String(raw ?? '').trim()
    if (!name || resolveCategoryId(name, next)) continue
    const def = { id: slugify(name, next.map((d) => d.id)), name, archived: true }
    next.push(def)
    added.push(def)
  }
  return { defs: next, added }
}

/**
 * @param {string} name
 * @returns {string}
 */
function requireName(name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) throw new Error('Nome da categoria nao pode ser vazio')
  return trimmed
}

/**
 * Cria uma categoria; se o nome for de uma arquivada, reativa (mesmo id).
 * @param {CategoryDef[]} defs
 * @param {string} name
 * @param {string} [color]
 * @returns {CategoryDef[]}
 */
export function addCategory(defs, name, color) {
  const trimmed = requireName(name)
  const key = normalize(trimmed)
  const same = defs.find((d) => normalize(d.name) === key)
  if (same) {
    if (!same.archived) throw new Error('Categoria ja existe')
    return defs.map((d) => (d === same ? { ...d, archived: false } : d))
  }
  /** @type {CategoryDef} */
  const def = { id: slugify(trimmed, defs.map((d) => d.id)), name: trimmed }
  if (color) def.color = color
  return [...defs, def]
}

/**
 * Troca so o nome; o id nunca muda.
 * @param {CategoryDef[]} defs
 * @param {string} id
 * @param {string} newName
 * @returns {CategoryDef[]}
 */
export function renameCategory(defs, id, newName) {
  const trimmed = requireName(newName)
  if (!defs.some((d) => d.id === id)) throw new Error('Categoria nao encontrada')
  const key = normalize(trimmed)
  if (defs.some((d) => d.id !== id && normalize(d.name) === key)) {
    throw new Error('Categoria ja existe')
  }
  return defs.map((d) => (d.id === id ? { ...d, name: trimmed } : d))
}

/**
 * Arquiva (nunca remove): some das listas novas, o historico continua resolvendo.
 * @param {CategoryDef[]} defs
 * @param {string} id
 * @returns {CategoryDef[]}
 */
export function archiveCategory(defs, id) {
  if (!defs.some((d) => d.id === id)) throw new Error('Categoria nao encontrada')
  return defs.map((d) => (d.id === id ? { ...d, archived: true } : d))
}

/**
 * Nomes das categorias ativas (para listas de escolha).
 * @param {CategoryDef[]} defs
 * @returns {string[]}
 */
export function activeCategoryNames(defs) {
  return defs.filter((d) => !d.archived).map((d) => d.name)
}

/**
 * Nome atual pelo categoryId; senao o texto legado; senao vazio.
 * @param {{ categoryId?: string | null, category?: string | null }} item
 * @param {CategoryDef[]} defs
 * @returns {string}
 */
export function categoryDisplayName(item, defs) {
  if (item.categoryId) {
    const def = defs.find((d) => d.id === item.categoryId)
    if (def) return def.name
  }
  return item.category ?? ''
}
