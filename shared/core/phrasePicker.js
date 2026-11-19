// @ts-check
// Seletor de frases do Vintem (D-10 a D-13): formata os encaixes, escolhe uma
// frase preenchivel sem repetir as ultimas e devolve nulo quando nada serve
// (o balao entao nao aparece: nunca existe texto generico de reserva).
// Sem relogio, sem acaso nativo, sem pacote e sem importar o banco: o banco entra
// por argumento e o acaso entra por `rand` injetado (devolve numero em [0, 1)).
import { formatMoney, plural } from './format.js'

/** Encaixes que uma frase pode usar. */
export const SLOT_NAMES = Object.freeze([
  'loja', 'categoria', 'vezes', 'valor', 'pct', 'dias', 'restante', 'total', 'ordinal',
])

/** Limite de caracteres de loja e categoria dentro do texto do balao. */
const NAME_MAX = 24
/** Tamanho maximo padrao do texto pronto, em pontos de codigo. */
const DEFAULT_MAX_LEN = 110

const SLOT_RE = /\{([a-z]+)\}/g
// Palavras com acento escritas por escapes para o arquivo seguir em ASCII.
const ORDINALS = Object.freeze([
  'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto',
  'sexto', 'sétimo', 'oitavo', 'nono', 'décimo',
])

/**
 * Comprimento em pontos de codigo (o NBSP do formatMoney vale 1).
 * @param {string} text
 * @returns {number}
 */
export function textLength(text) {
  return Array.from(text).length
}

/**
 * Encaixes `{nome}` usados por um modelo, sem repetir, na ordem de aparicao.
 * A leitura e sobre minusculas.
 * @param {string} template
 * @returns {string[]}
 */
export function needsOf(template) {
  /** @type {string[]} */
  const found = []
  for (const m of String(template).toLowerCase().matchAll(SLOT_RE)) {
    if (!found.includes(m[1])) found.push(m[1])
  }
  return found
}

/**
 * Ordinal masculino por extenso de 1 a 10 (primeiro ... decimo); acima disso
 * vira `Nº`.
 * @param {number} n
 * @returns {string}
 */
export function ordinalMasc(n) {
  const k = Math.round(n)
  if (k >= 1 && k <= ORDINALS.length) return ORDINALS[k - 1]
  return `${k}º`
}

/**
 * Texto de nome (loja, categoria): sem chaves, espacos colapsados, ate 24
 * caracteres. Vazio vira nulo.
 * @param {unknown} value
 * @returns {string | null}
 */
function nameSlot(value) {
  if (typeof value !== 'string') return null
  const clean = value.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
  if (clean === '') return null
  return Array.from(clean).slice(0, NAME_MAX).join('').trim()
}

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * Monta os encaixes validos a partir de numeros e textos crus. Campo ausente ou
 * nao finito nao gera encaixe.
 * @param {{ loja?: string, categoria?: string, vezes?: number, valorCents?: number,
 *   pct?: number, dias?: number, restanteCents?: number, totalCents?: number,
 *   ordinal?: number }} [raw]
 * @returns {Record<string, string>}
 */
export function buildSlots(raw = {}) {
  /** @type {Record<string, string>} */
  const out = {}
  const loja = nameSlot(raw.loja)
  if (loja) out.loja = loja
  const categoria = nameSlot(raw.categoria)
  if (categoria) out.categoria = categoria
  if (isNum(raw.vezes) && raw.vezes >= 0) {
    out.vezes = plural(Math.round(raw.vezes), 'vez', 'vezes')
  }
  if (isNum(raw.valorCents)) out.valor = formatMoney(raw.valorCents)
  if (isNum(raw.pct)) out.pct = `${Math.round(raw.pct)}%`
  if (isNum(raw.dias) && raw.dias >= 0) {
    out.dias = plural(Math.round(raw.dias), 'dia', 'dias')
  }
  if (isNum(raw.restanteCents)) out.restante = formatMoney(raw.restanteCents)
  if (isNum(raw.totalCents)) out.total = formatMoney(raw.totalCents)
  if (isNum(raw.ordinal) && raw.ordinal >= 1) out.ordinal = ordinalMasc(raw.ordinal)
  return out
}

/**
 * Preenche o modelo. Devolve nulo se algum encaixe faltar. O encaixe que abre
 * uma frase (inicio do texto ou depois de `.`, `!` ou `?` e espaco) leva a
 * primeira letra em maiuscula: "{ordinal} delivery" vira "Quarto delivery".
 * A troca e de uma passada so: o valor inserido nunca e reinterpretado.
 * @param {string} template
 * @param {Record<string, string>} slots
 * @returns {string | null}
 */
export function fill(template, slots) {
  let missing = false
  const text = String(template).replace(/\{([A-Za-z]+)\}/g, (_all, name, offset) => {
    const value = slots ? slots[String(name).toLowerCase()] : undefined
    if (typeof value !== 'string' || value === '') {
      missing = true
      return ''
    }
    const before = template.slice(0, offset)
    const opens = before === '' || /[.!?]\s+$/.test(before)
    return opens ? value.charAt(0).toUpperCase() + value.slice(1) : value
  })
  return missing ? null : text
}

/**
 * Chave de historico de repeticao.
 * @param {string} situation
 * @param {string} tone
 * @returns {string}
 */
export function recentKey(situation, tone) {
  return `${situation}:${tone}`
}

/**
 * Quantos ids recentes guardar: o menor entre 5 e a metade das variantes.
 * @param {number} variants
 * @returns {number}
 */
export function recentLimit(variants) {
  return Math.max(0, Math.min(5, Math.floor(variants / 2)))
}

/**
 * Acrescenta um id ao historico (imutavel), mantendo so os ultimos `limit`.
 * O mais recente fica por ultimo.
 * @param {Record<string, string[]>} recent
 * @param {string} key
 * @param {string} id
 * @param {number} limit
 * @returns {Record<string, string[]>}
 */
export function pushRecent(recent, key, id, limit) {
  const base = recent && Array.isArray(recent[key]) ? recent[key] : []
  const next = [...base.filter((x) => x !== id), id]
  const kept = limit > 0 ? next.slice(-limit) : []
  return { ...(recent || {}), [key]: kept }
}

/**
 * Embaralha uma copia (Fisher-Yates) com o acaso injetado.
 * @template T
 * @param {T[]} list
 * @param {() => number} rand
 * @returns {T[]}
 */
function shuffled(list, rand) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(rand() * (i + 1))))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

/**
 * Escolhe uma frase do tom e da situacao cujos encaixes estao todos preenchidos,
 * sem repetir as usadas recentemente. Se nada sobrar, relaxa para "tudo menos a
 * mais recente"; se ainda assim nada servir, devolve nulo (balao nao aparece).
 * `recent` e o mapa `{ [recentKey]: ids }` (ou direto a lista de ids), do mais
 * antigo para o mais recente.
 * @param {{ situation: string, tone: string, slots: Record<string, string>,
 *   recent?: Record<string, string[]> | string[], rand: () => number,
 *   bank: Record<string, Record<string, { id: string, t: string }[]>>,
 *   maxLen?: number }} args
 * @returns {{ id: string, text: string } | null}
 */
export function pick({ situation, tone, slots, recent, rand, bank, maxLen = DEFAULT_MAX_LEN }) {
  const list = (bank && bank[situation] && bank[situation][tone]) || []
  const have = slots || {}
  const ready = list.filter(
    (p) => needsOf(p.t).every((name) => typeof have[name] === 'string' && have[name] !== ''),
  )
  if (ready.length === 0) return null

  const key = recentKey(situation, tone)
  const seen = Array.isArray(recent) ? recent : (recent && recent[key]) || []
  const last = seen.length > 0 ? seen[seen.length - 1] : null
  const fresh = ready.filter((p) => !seen.includes(p.id))
  const relaxed = ready.filter((p) => p.id !== last)
  const random = typeof rand === 'function' ? rand : () => 0

  for (const pool of [fresh, relaxed]) {
    for (const phrase of shuffled(pool, random)) {
      const text = fill(phrase.t, have)
      if (text === null || /[{}]/.test(text)) continue
      if (textLength(text) > maxLen) continue
      return { id: phrase.id, text }
    }
  }
  return null
}
