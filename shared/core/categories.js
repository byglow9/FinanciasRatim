// @ts-check
// Categorias com id estavel (D-07): o id nasce de um slug na criacao e nunca
// muda; renomear troca so o nome. Excluir arquiva e nunca apaga (D-08), para
// que lancamentos antigos continuem mostrando o nome. Tudo imutavel e puro.

import { normalize } from './classify.js'

/** @typedef {'gasto' | 'receita'} CategoryKind */
/**
 * `kind` so filtra listas de escolha (gasto ou receita); nunca decide o que e
 * gasto no calculo (isso e o type da transacao).
 * @typedef {{ id: string, name: string, color?: string, archived?: boolean, icon?: string, kind?: CategoryKind }} CategoryDef
 */

/**
 * Icones Lucide permitidos nas categorias, por grupo (a ordem e a de exibicao no seletor). Os ids
 * ja salvos continuam validos: so entram ids novos, nunca se renomeia nem remove um.
 * @type {{ id: string, label: string, icons: string[] }[]}
 */
export const CATEGORY_ICON_GROUPS = [
  {
    id: 'casa',
    label: 'Casa',
    icons: ['house', 'sofa', 'bed-double', 'bath', 'washing-machine', 'hammer', 'lightbulb'],
  },
  {
    id: 'comida',
    label: 'Comida',
    icons: ['utensils', 'shopping-cart', 'coffee', 'pizza', 'apple', 'wine'],
  },
  {
    id: 'transporte',
    label: 'Transporte',
    icons: ['car', 'bus', 'train-front', 'bike', 'fuel', 'plane', 'car-taxi-front'],
  },
  {
    id: 'saude',
    label: 'Saúde',
    icons: ['heart-pulse', 'stethoscope', 'pill', 'hospital', 'dumbbell', 'smile'],
  },
  {
    id: 'lazer',
    label: 'Lazer',
    icons: ['party-popper', 'clapperboard', 'music', 'gamepad-2', 'ticket', 'tv', 'tree-palm'],
  },
  {
    id: 'compras',
    label: 'Compras',
    icons: ['shopping-bag', 'shirt', 'gem', 'gift', 'store', 'sparkles'],
  },
  {
    id: 'educacao',
    label: 'Educação',
    icons: ['graduation-cap', 'book-open', 'backpack', 'languages'],
  },
  {
    id: 'trabalho',
    label: 'Trabalho',
    icons: ['briefcase', 'laptop', 'wrench', 'smartphone', 'wifi'],
  },
  {
    id: 'familia',
    label: 'Família',
    icons: ['users', 'baby', 'heart', 'cake'],
  },
  {
    id: 'pets',
    label: 'Pets',
    icons: ['paw-print', 'dog', 'cat', 'fish'],
  },
  {
    id: 'contas',
    label: 'Contas',
    icons: ['receipt', 'credit-card', 'wallet', 'zap', 'droplets', 'flame', 'shield-check'],
  },
  {
    id: 'investimentos',
    label: 'Investimentos',
    icons: ['trending-up', 'banknote', 'piggy-bank', 'coins', 'chart-line', 'landmark', 'bitcoin', 'target', 'hand-coins', 'circle-dollar-sign'],
  },
  {
    id: 'outros',
    label: 'Outros',
    icons: ['tag', 'layout-grid', 'star', 'map-pin'],
  },
]

/** Nomes de icone Lucide permitidos nas categorias (todos os grupos, sem repetir). */
export const CATEGORY_ICONS = CATEGORY_ICON_GROUPS.flatMap((g) => g.icons)

const KINDS = ['gasto', 'receita']

/** @type {CategoryDef[]} */
export const DEFAULT_CATEGORY_DEFS = [
  { id: 'alimentacao', name: 'Alimentacao', color: '#f97316', icon: 'utensils', kind: 'gasto' },
  { id: 'transporte', name: 'Transporte', color: '#3b82f6', icon: 'car', kind: 'gasto' },
  { id: 'moradia', name: 'Moradia', color: '#8b5cf6', icon: 'house', kind: 'gasto' },
  { id: 'saude', name: 'Saude', color: '#ef4444', icon: 'heart-pulse', kind: 'gasto' },
  { id: 'lazer', name: 'Lazer', color: '#22c55e', icon: 'party-popper', kind: 'gasto' },
  { id: 'educacao', name: 'Educacao', color: '#06b6d4', icon: 'graduation-cap', kind: 'gasto' },
  { id: 'vestuario', name: 'Vestuario', color: '#ec4899', icon: 'shirt', kind: 'gasto' },
  { id: 'servicos', name: 'Servicos', color: '#f59e0b', icon: 'wrench', kind: 'gasto' },
  { id: 'salario', name: 'Salario', color: '#10b981', icon: 'banknote', kind: 'receita' },
  { id: 'investimentos', name: 'Investimentos', color: '#6366f1', icon: 'trending-up', kind: 'receita' },
  { id: 'outros', name: 'Outros', color: '#64748b', icon: 'tag', kind: 'gasto' },
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
 * Valida icone e tipo opcionais (T-03-11); devolve so o que veio.
 * @param {{ icon?: string, kind?: string }} [extra]
 * @returns {{ icon?: string, kind?: CategoryKind }}
 */
function checkMeta(extra = {}) {
  /** @type {{ icon?: string, kind?: CategoryKind }} */
  const out = {}
  if (extra.icon !== undefined) {
    if (!CATEGORY_ICONS.includes(extra.icon)) throw new Error('Icone invalido')
    out.icon = extra.icon
  }
  if (extra.kind !== undefined) {
    if (!KINDS.includes(extra.kind)) throw new Error('Tipo invalido')
    out.kind = /** @type {CategoryKind} */ (extra.kind)
  }
  return out
}

/**
 * Cria uma categoria; se o nome for de uma arquivada, reativa (mesmo id).
 * `extra` (icone e tipo) e opcional e a assinatura de tres parametros segue valida.
 * @param {CategoryDef[]} defs
 * @param {string} name
 * @param {string} [color]
 * @param {{ icon?: string, kind?: string }} [extra]
 * @returns {CategoryDef[]}
 */
export function addCategory(defs, name, color, extra = {}) {
  const trimmed = requireName(name)
  const meta = checkMeta(extra)
  const key = normalize(trimmed)
  const same = defs.find((d) => normalize(d.name) === key)
  if (same) {
    if (!same.archived) throw new Error('Categoria ja existe')
    return defs.map((d) => (d === same ? { ...d, ...meta, archived: false } : d))
  }
  /** @type {CategoryDef} */
  const def = { id: slugify(trimmed, defs.map((d) => d.id)), name: trimmed }
  if (color) def.color = color
  Object.assign(def, meta)
  return [...defs, def]
}

/**
 * Troca icone, cor e/ou tipo; id e nome nunca mudam. Imutavel.
 * @param {CategoryDef[]} defs
 * @param {string} id
 * @param {{ icon?: string, color?: string, kind?: string }} patch
 * @returns {CategoryDef[]}
 */
export function setCategoryMeta(defs, id, patch) {
  if (!defs.some((d) => d.id === id)) throw new Error('Categoria nao encontrada')
  const meta = checkMeta(patch)
  /** @type {{ color?: string }} */
  const colorPatch = {}
  if (patch.color !== undefined) colorPatch.color = patch.color
  return defs.map((d) => (d.id === id ? { ...d, ...meta, ...colorPatch } : d))
}

/**
 * Icone da categoria: o gravado quando valido; senao o padrao do id estavel
 * (documento antigo sem o campo); senao 'tag'.
 * @param {{ id?: string, icon?: string } | null | undefined} def
 * @returns {string}
 */
export function categoryIcon(def) {
  if (def?.icon && CATEGORY_ICONS.includes(def.icon)) return def.icon
  return DEFAULT_CATEGORY_DEFS.find((d) => d.id === def?.id)?.icon ?? 'tag'
}

/**
 * Tipo da categoria: o gravado quando valido; senao o padrao do id; senao 'gasto'.
 * Serve so para filtrar listas de escolha.
 * @param {{ id?: string, kind?: string } | null | undefined} def
 * @returns {CategoryKind}
 */
export function categoryKind(def) {
  if (def?.kind && KINDS.includes(def.kind)) return /** @type {CategoryKind} */ (def.kind)
  return DEFAULT_CATEGORY_DEFS.find((d) => d.id === def?.id)?.kind ?? 'gasto'
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
 * Definicoes reconciliadas com a lista de nomes ativos. Documentos antigos so tem a lista de nomes,
 * e um cliente antigo (rollback) pode editar so essa lista; por isso `names` e a fonte de quem esta
 * ativo: nome na lista = ativa, fora da lista = arquivada, nome novo ganha id. O cliente novo grava
 * as duas coisas juntas, entao nesse caso a reconciliacao nao muda nada. Nao muta a entrada.
 * @param {string[]} names
 * @param {CategoryDef[]} defs
 * @returns {CategoryDef[]}
 */
export function reconcileCategoryDefs(names, defs) {
  const list = names ?? []
  return buildCategoryDefs(list, defs ?? []).map((d) => {
    const active = list.some((n) => resolveCategoryId(n, [d]) === d.id)
    if (active === !d.archived) return d
    return { ...d, archived: !active }
  })
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
