// @ts-check
// Detector local de insights (D-14) e contrato unico Insight v1 (D-15): le os lancamentos e
// reconhece o que foi comprado (muito delivery, loja que se repete, categoria acima do normal,
// gasto grande, dias sem lancar, limite perto e estourado), sem IA. O balao consome hoje e a
// Fase 7 herda o mesmo formato. Sem relogio, sem pacote, sem acaso nativo: o "agora" entra como
// argumento e o dia e sempre o do calendario de Sao Paulo (zonedParts), nunca o do aparelho.
//
// Privacidade (T-04-03-01/02): descricao crua, CPF, CNPJ, conta, cartao, e-mail e nome de pessoa
// fisica nunca entram em id, chave legivel, rotulo, evidencia ou payload. O nome de uma loja so
// sai do dicionario de marcas ou de um nome que parece estabelecimento; o resto vira rotulo nulo
// e uma chave por hash escrita so com letras (nunca forma sequencia de 6 digitos).

import { toCents } from './ledger.js'
import { normalize } from './classify.js'
import { DEFAULT_TZ, zonedParts } from './time.js'
import { dayKeyOf } from './dayKey.js'
import { daysBetweenParts } from './cycle.js'

/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./categories.js').CategoryDef} CategoryDef */
/** @typedef {import('./budget.js').Tx} Tx */

/** Versao do contrato Insight. */
export const INSIGHT_VERSION = 1

/**
 * Limiares do detector, todos em inteiros e calibraveis sem mexer em tela (estilo RHYTHM_CUTS).
 * Tudo em porcentagem inteira, centavos inteiros ou contagens.
 */
export const INSIGHT_RULES = Object.freeze({
  WINDOW_DAYS: 7,
  DELIVERY_WEEK_MIN: 3,
  MERCHANT_REPEAT_MIN: 3,
  CATEGORY_RATIO_PCT: 130,
  CATEGORY_RATIO_SEV2_PCT: 160,
  CATEGORY_RATIO_SEV3_PCT: 200,
  CATEGORY_MIN_DIFF_CENTS: 5000,
  CATEGORY_MIN_CYCLES: 2,
  SPIKE_TICKET_MULT: 3,
  SPIKE_TICKET_MULT_SEV3: 5,
  SPIKE_LIMIT_FRACTION_PCT: 30,
  SPIKE_MIN_SAMPLES: 5,
  NO_LAUNCH_DAYS: 3,
  NO_LAUNCH_DAYS_SEV2: 5,
  NO_LAUNCH_DAYS_SEV3: 7,
  LIMIT_NEAR_PCT: 80,
  BASELINE_CYCLES: 3,
})

/**
 * Marca conhecida. `test` roda sobre o texto normalizado (minusculo, sem acento). A primeira que
 * casar vence, entao "99food" fica antes de "99".
 * @typedef {{ key: string, label: string, group: string | null, test: RegExp }} Brand
 */

/** @type {ReadonlyArray<Readonly<Brand>>} */
export const BRAND_DICTIONARY = Object.freeze(
  /** @type {Brand[]} */ ([
    { key: 'ifood', label: 'iFood', group: 'delivery', test: /\b(ifood|ifd)/ },
    { key: 'rappi', label: 'Rappi', group: 'delivery', test: /\brappi/ },
    { key: '99food', label: '99Food', group: 'delivery', test: /\b99 ?food/ },
    { key: 'uber', label: 'Uber', group: null, test: /\buber/ },
    { key: '99', label: '99', group: null, test: /(^|[^a-z0-9])99([^a-z0-9]|$)/ },
    { key: 'netflix', label: 'Netflix', group: null, test: /\bnetflix/ },
    { key: 'spotify', label: 'Spotify', group: null, test: /\bspotify/ },
    { key: 'mercadolivre', label: 'Mercado Livre', group: null, test: /\bmercado ?livre/ },
    { key: 'amazon', label: 'Amazon', group: null, test: /\b(amazon|amzn)/ },
    { key: 'shopee', label: 'Shopee', group: null, test: /\bshopee/ },
  ]).map((b) => Object.freeze(b))
)

/** Palavras que indicam estabelecimento (nao pessoa), comparadas por palavra inteira. */
export const ESTABLISHMENT_TOKENS = Object.freeze([
  'ltda',
  'me',
  'mei',
  'eireli',
  'sa',
  'restaurante',
  'padaria',
  'mercado',
  'farmacia',
  'posto',
  'lanchonete',
  'pizzaria',
  'supermercado',
  'loja',
  'bar',
  'cafe',
])

/** Maior tamanho do rotulo de uma loja desconhecida. */
const LABEL_MAX = 24

/**
 * Contrato unico (D-15). Nunca carrega descricao crua, CPF, conta, cartao nem nome de pessoa fisica.
 * @typedef {'delivery-heavy' | 'merchant-repeat' | 'category-over-average' | 'spend-spike'
 *   | 'days-without-launch' | 'limit-near' | 'limit-over' | 'rhythm'} InsightType
 */

/**
 * @typedef {{
 *   v: 1,
 *   id: string,
 *   type: InsightType,
 *   subject: { kind: 'merchant' | 'merchant-group' | 'category' | 'cycle', key: string, label: string | null },
 *   metrics: {
 *     count?: number, totalCents?: number, avgCents?: number, ratioPct?: number, pct?: number,
 *     limitCents?: number, spentCents?: number, days?: number, windowDays?: number,
 *     ordinal?: number, level?: number,
 *   },
 *   severity: 0 | 1 | 2 | 3,
 *   evidence: { txIds: string[], dayKeys: string[] },
 *   cycleKey: string,
 *   day: string,
 * }} Insight
 */

/**
 * Resultado do filtro de loja. `label` nulo significa "nao e loja que se possa nomear".
 * @typedef {{ key: string, label: string | null, group: string | null }} Merchant
 */

/**
 * FNV-1a de 32 bits do texto, escrito so com as letras a a p (uma por digito hexadecimal), de modo
 * que a chave jamais forma uma sequencia de 6 digitos nem passa pelo filtro de privacidade.
 * @param {string} text
 * @returns {string}
 */
function letterHash(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const hex = h.toString(16).padStart(8, '0')
  let out = ''
  for (const ch of hex) out += String.fromCharCode(97 + parseInt(ch, 16))
  return out
}

/**
 * Texto que nunca pode virar loja: Pix para ou de alguem, transferencia, TED ou DOC, 6 ou mais
 * digitos (CPF, CNPJ, conta, cartao, mesmo com pontos, tracos ou espacos no meio), e-mail ou nome
 * igual ao de uma categoria.
 * @param {string} norm texto normalizado
 * @param {string[]} categoryNames nomes de categoria ja normalizados
 * @returns {boolean}
 */
function isBlockedText(norm, categoryNames) {
  if (/^pix (para|de) /.test(norm)) return true
  if (/^transferencia/.test(norm)) return true
  if (/^(ted|doc)\b/.test(norm)) return true
  if (norm.includes('@')) return true
  const squeezed = norm.replace(/(?<=\d)[ .\-/](?=\d)/g, '')
  if (/\d{6,}/.test(squeezed)) return true
  return categoryNames.includes(norm)
}

/**
 * Rotulo seguro de um estabelecimento: so letras, numeros e poucos sinais, ate 24 caracteres.
 * @param {unknown} description
 * @returns {string | null}
 */
function safeLabel(description) {
  const cleaned = String(description ?? '')
    .replace(/[^\p{L}\p{N} .&'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LABEL_MAX)
    .trim()
  return cleaned === '' ? null : cleaned
}

/**
 * Loja de um lancamento, em ordem rigida: (1) filtro de privacidade; (2) dicionario de marcas;
 * (3) nome desconhecido so se parece estabelecimento; (4) senao rotulo nulo e chave por hash.
 * A descricao nunca vira chave legivel.
 * @param {Pick<Tx, 'description' | 'category'>} tx
 * @param {CategoryDef[]} [categoryDefs]
 * @returns {Merchant}
 */
export function merchantOf(tx, categoryDefs = []) {
  const norm = normalize(tx?.description)
  const hashed = { key: `h:${letterHash(norm)}`, label: null, group: null }
  const names = categoryDefs.map((d) => normalize(d.name))
  const own = normalize(tx?.category)
  if (own !== '') names.push(own)
  if (isBlockedText(norm, names)) return hashed

  const brand = BRAND_DICTIONARY.find((b) => b.test.test(norm))
  if (brand) return { key: brand.key, label: brand.label, group: brand.group }

  const looksLikeShop = norm.split(/[^a-z0-9]+/).some((w) => ESTABLISHMENT_TOKENS.includes(w))
  if (looksLikeShop) {
    const label = safeLabel(tx.description)
    if (label !== null) return { key: hashed.key, label, group: null }
  }
  return hashed
}

/**
 * ID deterministico e sem barra (serve de ID de documento): so partes estruturadas, nunca
 * descricao. A chave por hash de nome desconhecido ja vem no formato `h:` do merchantOf.
 * @param {string} person
 * @param {string} cycleKey
 * @param {string} type
 * @param {string} subjectKey
 * @param {string} window
 * @returns {string}
 */
export function insightId(person, cycleKey, type, subjectKey, window) {
  return [person, cycleKey, type, subjectKey, window].map((p) => String(p).replace(/\//g, '-')).join('__')
}

/**
 * Severidade de 1 a 3 pela contagem: no minimo 1, uma a mais por compra acima do minimo.
 * @param {number} count
 * @param {number} min
 * @returns {1 | 2 | 3}
 */
function severityByCount(count, min) {
  return /** @type {1 | 2 | 3} */ (Math.min(3, Math.max(1, count - min + 1)))
}

/**
 * @param {Insight['type']} type
 * @param {Insight['subject']} subject
 * @param {string} window
 * @param {{ person: string, cycleKey: string, day: string }} ctx
 * @param {Omit<Insight, 'v' | 'id' | 'type' | 'subject' | 'cycleKey' | 'day'>} rest
 * @returns {Insight}
 */
function makeInsight(type, subject, window, ctx, rest) {
  return {
    v: 1,
    id: insightId(ctx.person, ctx.cycleKey, type, subject.key, window),
    type,
    subject,
    metrics: rest.metrics,
    severity: rest.severity,
    evidence: rest.evidence,
    cycleKey: ctx.cycleKey,
    day: ctx.day,
  }
}

/**
 * Comparador do resultado: severidade decrescente, depois tipo e id.
 * @param {Insight} a
 * @param {Insight} b
 * @returns {number}
 */
function compareInsights(a, b) {
  if (b.severity !== a.severity) return b.severity - a.severity
  if (a.type !== b.type) return a.type < b.type ? -1 : 1
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

/**
 * Evidencia so com ids de documento e chaves de dia, em ordem estavel.
 * @param {Array<{ id?: string, dayKey: string }>} items
 * @returns {{ txIds: string[], dayKeys: string[] }}
 */
function evidenceOf(items) {
  const txIds = items.map((i) => i.id).filter((id) => typeof id === 'string' && id !== '')
  const dayKeys = [...new Set(items.map((i) => i.dayKey))].sort()
  return { txIds: /** @type {string[]} */ (txIds), dayKeys }
}

/**
 * Saidas reais (sem transferencia) que cairam nos ultimos WINDOW_DAYS dias do calendario do fuso.
 * @param {Tx[]} transactions
 * @param {Date} now
 * @param {CategoryDef[]} categoryDefs
 * @param {string} tz
 */
function recentOutflows(transactions, now, categoryDefs, tz) {
  const today = zonedParts(now, tz)
  const out = []
  for (let i = 0; i < transactions.length; i += 1) {
    const t = transactions[i]
    if (t.transfer === true || t.type !== 'saida') continue
    const age = daysBetweenParts(zonedParts(t.date, tz), today)
    if (age < 0 || age >= INSIGHT_RULES.WINDOW_DAYS) continue
    const cents = toCents(t.amount)
    if (!Number.isFinite(cents)) continue
    out.push({ tx: t, id: t.id, index: i, cents, dayKey: dayKeyOf(t.date, tz), merchant: merchantOf(t, categoryDefs) })
  }
  out.sort((a, b) => a.tx.date.getTime() - b.tx.date.getTime() || a.index - b.index)
  return out
}

/**
 * Insights do momento. Puro: nao muta as entradas e nao le relogio.
 * @param {{
 *   now: Date,
 *   person: string,
 *   cycle: Cycle,
 *   transactions: Tx[],
 *   categoryDefs?: CategoryDef[],
 *   tz?: string,
 * }} input
 * @returns {Insight[]}
 */
export function buildInsights(input) {
  const { now, person, cycle, transactions } = input
  const categoryDefs = input.categoryDefs ?? []
  const tz = input.tz ?? DEFAULT_TZ
  const day = dayKeyOf(now, tz)
  const ctx = { person, cycleKey: cycle.key, day }
  /** @type {Insight[]} */
  const out = []

  const recent = recentOutflows(transactions, now, categoryDefs, tz)

  // delivery-heavy: compras de marcas do grupo delivery na janela.
  const delivery = recent.filter((r) => r.merchant.group === 'delivery')
  if (delivery.length >= INSIGHT_RULES.DELIVERY_WEEK_MIN) {
    const count = delivery.length
    out.push(
      makeInsight('delivery-heavy', { kind: 'merchant-group', key: 'delivery', label: 'delivery' }, day, ctx, {
        metrics: {
          count,
          totalCents: delivery.reduce((s, r) => s + r.cents, 0),
          windowDays: INSIGHT_RULES.WINDOW_DAYS,
          ordinal: count,
        },
        severity: severityByCount(count, INSIGHT_RULES.DELIVERY_WEEK_MIN),
        evidence: evidenceOf(delivery),
      })
    )
  }

  return out.sort(compareInsights)
}
