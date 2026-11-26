// @ts-check
// Chave canonica do cache da fala da IA (D-02). Pura e deterministica: sem relogio, sem acaso, sem
// pacote e sem hash do node (o servidor aplica o sha256 sobre esta string). So entram partes de
// listas fechadas, faixas de percentual de 5 pontos e o hash do rotulo seguro da loja e da chave do
// fato: nunca texto livre, nome de pessoa nem valor exato. Os valores exatos ficam de fora de
// proposito: o servidor revalida cada variante guardada contra o fato atual antes de servi-la (07-12).
// Parte invalida vira "x" (a funcao nunca lanca).
// Versao 2 (07.1): o assunto e a cena do fato e a ultima parte e o hash da chave do fato; o texto
// livre (anotacao, agenda) entra so pelo fato, nunca pela chave.

import { normalize } from './classify.js'
import { OINC_SCENES } from './oincScenes.js'

/** Versao do formato da chave; muda quando as partes ou a ordem mudam. */
export const CACHE_KEY_VERSION = 2

export const CACHE_TONES = Object.freeze(['suave', 'direto', 'sem-filtro'])
export const CACHE_SITUATIONS = Object.freeze(['lancamento', 'limite', 'sync', 'abertura', 'espiar'])
/** Assuntos antigos (a fala espontanea da Fase 7) e as cenas do catalogo (07.1). */
export const CACHE_TOPICS = Object.freeze([
  ...new Set([
    'limites', 'ritmo', 'padroes', 'entradas', 'metas', 'porquinho', 'fixas', 'fatura', 'comparacao',
    'semana', 'agenda', 'anotacoes',
    ...Object.keys(OINC_SCENES),
  ]),
])
export const CACHE_RHYTHMS = Object.freeze(['folgado', 'no-ritmo', 'atencao', 'estourou'])
/** Situacoes que reagem a um lancamento: so nelas a loja entra na chave. */
export const MERCHANT_SITUATIONS = Object.freeze(['lancamento', 'sync'])

/** Faixa final: tudo de 305% para cima cai numa so faixa. */
export const BUCKET_TOP = 305

/**
 * Leva o percentual a faixa de 5 pontos (arredonda para baixo), limita em 0 e agrupa tudo acima
 * de 300 numa faixa final (BUCKET_TOP). Valor que nao e numero finito vira nulo.
 * @param {unknown} pct
 * @returns {number | null}
 */
export function bucket5(pct) {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return null
  const n = Math.floor(pct / 5) * 5
  if (n < 0) return 0
  return n >= BUCKET_TOP ? BUCKET_TOP : n
}

/**
 * FNV-1a de 32 bits do rotulo normalizado (minusculo, sem acento), em hexadecimal de 8
 * caracteres. Feito aqui para o nucleo nao importar node:crypto.
 * @param {unknown} label
 * @returns {string}
 */
export function labelHash(label) {
  const norm = normalize(label)
  let h = 0x811c9dc5
  for (let i = 0; i < norm.length; i += 1) {
    h ^= norm.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/**
 * @param {unknown} value
 * @param {ReadonlyArray<string>} list
 * @returns {string}
 */
const fromList = (value, list) => (typeof value === 'string' && list.includes(value) ? value : 'x')

/**
 * Chave canonica da situacao: versao e partes em ordem fixa, separadas por barra vertical. A ultima
 * parte e o hash da chave do fato (`fact.key` do seletor de fatos), ou `x` sem fato.
 * @param {{ cycleKey?: unknown, tone?: unknown, situation?: unknown, topic?: unknown,
 *   categoryId?: unknown, pct?: unknown, rhythm?: unknown, merchant?: unknown, fact?: unknown }} [input]
 * @returns {string}
 */
export function canonicalKey(input) {
  const i = input ?? {}
  const cycle = typeof i.cycleKey === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(i.cycleKey) ? i.cycleKey : 'x'
  const situation = fromList(i.situation, CACHE_SITUATIONS)
  const categoryId = typeof i.categoryId === 'string' && /^[a-z0-9_-]{1,40}$/.test(i.categoryId) ? i.categoryId : 'x'
  const band = bucket5(i.pct)
  const rhythm = i.rhythm === null || i.rhythm === undefined ? 'n' : fromList(i.rhythm, CACHE_RHYTHMS)
  const hasMerchant =
    MERCHANT_SITUATIONS.includes(situation) && typeof i.merchant === 'string' && normalize(i.merchant) !== ''
  const merchant = hasMerchant ? `m${labelHash(i.merchant)}` : 'x'
  const hasFact = typeof i.fact === 'string' && normalize(i.fact) !== ''
  const fact = hasFact ? `f${labelHash(i.fact)}` : 'x'
  return [
    `v${CACHE_KEY_VERSION}`,
    cycle,
    fromList(i.tone, CACHE_TONES),
    situation,
    fromList(i.topic, CACHE_TOPICS),
    categoryId,
    band === null ? 'x' : `p${band}`,
    rhythm,
    merchant,
    fact,
  ].join('|')
}
