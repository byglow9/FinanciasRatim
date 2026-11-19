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
import { cycleDay, daysBetweenParts, isInCycle } from './cycle.js'
import { resolveCategoryId } from './categories.js'
import { isDayToDay } from './budget.js'

/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./categories.js').CategoryDef} CategoryDef */
/** @typedef {import('./budget.js').Tx} Tx */
/** @typedef {import('./budget.js').BudgetRow} BudgetRow */

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
 * Linha de base por categoria: so ids e numeros, nenhum texto de loja ou descricao. `cumulative`
 * tem uma lista por ciclo passado com gasto na categoria; cada lista traz a soma acumulada em
 * centavos por dia do ciclo (posicao 0 = dia 1). `cycles` conta os ciclos com gasto na categoria.
 * @typedef {{ cycles: number, samples: number, ticketAvgCents: number, cumulative: number[][] }} BaselineEntry
 * @typedef {{ v: 1, byCategory: Record<string, BaselineEntry> }} Baseline
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
 * Entrada da linha de base de uma categoria (propriedade propria, nunca herdada).
 * @param {Baseline | null | undefined} baseline
 * @param {string} categoryId
 * @returns {BaselineEntry | undefined}
 */
function entryOf(baseline, categoryId) {
  const map = baseline?.byCategory
  if (!map || !Object.prototype.hasOwnProperty.call(map, categoryId)) return undefined
  return map[categoryId]
}

/**
 * Id da categoria de um lancamento: o gravado ou o resolvido pelo nome (como spendByCategory).
 * @param {Pick<Tx, 'categoryId' | 'category'>} t
 * @param {CategoryDef[]} defs
 * @returns {string | null}
 */
function categoryIdOf(t, defs) {
  return t.categoryId ?? resolveCategoryId(t.category ?? '', defs)
}

/**
 * Nome da categoria para o rotulo do sujeito (o nome e do usuario, nao descricao de lancamento).
 * @param {string} categoryId
 * @param {CategoryDef[]} defs
 * @returns {string | null}
 */
function categoryLabel(categoryId, defs) {
  return defs.find((d) => d.id === categoryId)?.name ?? null
}

/**
 * Linha de base dos ciclos passados (so os BASELINE_CYCLES mais recentes). `pastCycles` e uma
 * lista de `{ cycle, transactions }`. Guarda so ids de categoria e numeros.
 * @param {{
 *   pastCycles: Array<{ cycle: Cycle, transactions: Tx[] }>,
 *   categoryDefs?: CategoryDef[],
 *   tz?: string,
 * }} input
 * @returns {Baseline}
 */
export function buildBaseline({ pastCycles, categoryDefs = [], tz = DEFAULT_TZ }) {
  const used = [...pastCycles]
    .sort((a, b) => b.cycle.start.getTime() - a.cycle.start.getTime())
    .slice(0, INSIGHT_RULES.BASELINE_CYCLES)
  /** @type {Record<string, { totalCents: number, samples: number, cycles: number[][] }>} */
  const acc = {}
  for (const { cycle, transactions } of used) {
    /** @type {Map<string, number[]>} */
    const daily = new Map()
    for (const t of transactions) {
      if (!isDayToDay(t) || !isInCycle(t.date, cycle)) continue
      const cents = toCents(t.amount)
      if (!Number.isFinite(cents) || cents <= 0) continue
      const id = categoryIdOf(t, categoryDefs)
      if (id === null) continue
      const n = daysBetweenParts(cycle.startParts, zonedParts(t.date, tz)) + 1
      const dayIndex = Math.min(Math.max(n, 1), cycle.days) - 1
      let list = daily.get(id)
      if (!list) {
        list = new Array(cycle.days).fill(0)
        daily.set(id, list)
      }
      list[dayIndex] += cents
      if (!Object.prototype.hasOwnProperty.call(acc, id)) acc[id] = { totalCents: 0, samples: 0, cycles: [] }
      acc[id].totalCents += cents
      acc[id].samples += 1
    }
    for (const [id, list] of daily) {
      let run = 0
      acc[id].cycles.push(list.map((c) => (run += c)))
    }
  }
  /** @type {Record<string, BaselineEntry>} */
  const byCategory = {}
  for (const id of Object.keys(acc).sort()) {
    const a = acc[id]
    byCategory[id] = {
      cycles: a.cycles.length,
      samples: a.samples,
      ticketAvgCents: a.samples > 0 ? Math.floor(a.totalCents / a.samples) : 0,
      cumulative: a.cycles,
    }
  }
  return { v: 1, byCategory }
}

/**
 * Media acumulada, em centavos, dos ciclos da linha de base ate o dia do ciclo (1 = primeiro dia).
 * Ciclo mais curto que o dia pedido contribui com o total dele. Sem dados devolve null.
 * @param {BaselineEntry | null | undefined} entry
 * @param {number} day
 * @returns {number | null}
 */
export function baselineAvgToDay(entry, day) {
  const lists = entry?.cumulative
  if (!Array.isArray(lists)) return null
  const usable = lists.filter((c) => Array.isArray(c) && c.length > 0)
  if (usable.length === 0) return null
  const d = Math.max(1, Math.trunc(day))
  let sum = 0
  for (const c of usable) sum += c[Math.min(d, c.length) - 1]
  return Math.floor(sum / usable.length)
}

/**
 * Avalia uma saida contra o ticket medio da categoria (>= SPIKE_MIN_SAMPLES amostras) ou, sem
 * historico, contra a fracao do limite do mes. Sem os dois, nao dispara (resolucao 2).
 * @param {{ cents: number, categoryId: string | null, baseline?: Baseline | null, limitCents?: number | null }} input
 * @returns {{ mode: 'ticket' | 'limit', severity: 2 | 3, ratioPct: number, avgCents?: number, limitCents?: number } | null}
 */
function spikeOf({ cents, categoryId, baseline, limitCents }) {
  if (!Number.isInteger(cents) || cents <= 0) return null
  const entry = categoryId === null ? undefined : entryOf(baseline, categoryId)
  if (entry && entry.samples >= INSIGHT_RULES.SPIKE_MIN_SAMPLES && entry.ticketAvgCents > 0) {
    const avg = entry.ticketAvgCents
    if (cents < avg * INSIGHT_RULES.SPIKE_TICKET_MULT) return null
    return {
      mode: 'ticket',
      severity: cents >= avg * INSIGHT_RULES.SPIKE_TICKET_MULT_SEV3 ? 3 : 2,
      ratioPct: Math.floor((cents * 100) / avg),
      avgCents: avg,
    }
  }
  if (typeof limitCents === 'number' && Number.isInteger(limitCents) && limitCents > 0) {
    if (cents * 100 < limitCents * INSIGHT_RULES.SPIKE_LIMIT_FRACTION_PCT) return null
    return { mode: 'limit', severity: 2, ratioPct: Math.floor((cents * 100) / limitCents), limitCents }
  }
  return null
}

/**
 * Uma saida e gasto grande? Para a reacao de lancamento (plano 04-15).
 * @param {{ cents: number, categoryId: string | null, baseline?: Baseline | null, limitCents?: number | null }} input
 * @returns {boolean}
 */
export function isSpendSpike(input) {
  return spikeOf(input) !== null
}

/**
 * Insights do momento. Puro: nao muta as entradas e nao le relogio.
 * @param {{
 *   now: Date,
 *   person: string,
 *   cycle: Cycle,
 *   transactions: Tx[],
 *   categoryDefs?: CategoryDef[],
 *   rows?: BudgetRow[],
 *   baseline?: Baseline | null,
 *   lastLaunchAt?: Date | null,
 *   suppressed?: boolean,
 *   rhythmLevel?: number | null,
 *   tz?: string,
 * }} input
 * @returns {Insight[]}
 */
export function buildInsights(input) {
  const { now, person, cycle, transactions } = input
  const categoryDefs = input.categoryDefs ?? []
  const rows = input.rows ?? []
  const baseline = input.baseline ?? null
  const tz = input.tz ?? DEFAULT_TZ
  const day = dayKeyOf(now, tz)
  const ctx = { person, cycleKey: cycle.key, day }
  const W = INSIGHT_RULES.WINDOW_DAYS
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
          windowDays: W,
          ordinal: count,
        },
        severity: severityByCount(count, INSIGHT_RULES.DELIVERY_WEEK_MIN),
        evidence: evidenceOf(delivery),
      })
    )
  }

  // merchant-repeat: mesma loja rotulada, fora do delivery (que ja tem regra propria).
  /** @type {Map<string, typeof recent>} */
  const byMerchant = new Map()
  for (const r of recent) {
    if (r.merchant.label === null || r.merchant.group === 'delivery') continue
    const list = byMerchant.get(r.merchant.key)
    if (list) list.push(r)
    else byMerchant.set(r.merchant.key, [r])
  }
  for (const [key, list] of byMerchant) {
    if (list.length < INSIGHT_RULES.MERCHANT_REPEAT_MIN) continue
    const count = list.length
    out.push(
      makeInsight('merchant-repeat', { kind: 'merchant', key, label: list[0].merchant.label }, day, ctx, {
        metrics: { count, totalCents: list.reduce((s, r) => s + r.cents, 0), windowDays: W, ordinal: count },
        severity: severityByCount(count, INSIGHT_RULES.MERCHANT_REPEAT_MIN),
        evidence: evidenceOf(list),
      })
    )
  }

  // category-over-average: gasto da categoria ate o dia corrido contra a media dos ciclos passados.
  const cDay = cycleDay(cycle, now, tz)
  for (const row of rows) {
    const entry = entryOf(baseline, row.categoryId)
    if (!entry || entry.cycles < INSIGHT_RULES.CATEGORY_MIN_CYCLES) continue
    const avg = baselineAvgToDay(entry, cDay)
    if (avg === null || avg <= 0) continue
    const spent = row.spentCents
    const ratioPct = Math.floor((spent * 100) / avg)
    if (ratioPct < INSIGHT_RULES.CATEGORY_RATIO_PCT) continue
    if (spent - avg < INSIGHT_RULES.CATEGORY_MIN_DIFF_CENTS) continue
    const severity = ratioPct >= INSIGHT_RULES.CATEGORY_RATIO_SEV3_PCT ? 3 : ratioPct >= INSIGHT_RULES.CATEGORY_RATIO_SEV2_PCT ? 2 : 1
    const txs = (row.txs ?? []).slice(0, 10).map((t) => ({ id: t.id, dayKey: dayKeyOf(t.date, tz) }))
    out.push(
      makeInsight(
        'category-over-average',
        { kind: 'category', key: row.categoryId, label: categoryLabel(row.categoryId, categoryDefs) },
        day,
        ctx,
        { metrics: { spentCents: spent, avgCents: avg, ratioPct }, severity, evidence: evidenceOf(txs) }
      )
    )
  }

  // spend-spike: uma saida muito acima do normal; um insight por categoria e dia, o maior vence.
  /** @type {Map<string, { r: (typeof recent)[number], categoryId: string, spike: NonNullable<ReturnType<typeof spikeOf>> }>} */
  const spikes = new Map()
  for (const r of recent) {
    const categoryId = categoryIdOf(r.tx, categoryDefs)
    if (categoryId === null) continue
    const limitCents = rows.find((row) => row.categoryId === categoryId)?.limitCents ?? null
    const spike = spikeOf({ cents: r.cents, categoryId, baseline, limitCents })
    if (!spike) continue
    const slot = `${categoryId}|${r.dayKey}`
    const kept = spikes.get(slot)
    if (!kept || r.cents > kept.r.cents) spikes.set(slot, { r, categoryId, spike })
  }
  for (const { r, categoryId, spike } of spikes.values()) {
    out.push(
      makeInsight(
        'spend-spike',
        { kind: 'category', key: categoryId, label: categoryLabel(categoryId, categoryDefs) },
        r.dayKey,
        ctx,
        {
          metrics:
            spike.mode === 'ticket'
              ? { totalCents: r.cents, avgCents: spike.avgCents, ratioPct: spike.ratioPct }
              : { totalCents: r.cents, limitCents: spike.limitCents, pct: spike.ratioPct },
          severity: spike.severity,
          evidence: evidenceOf([r]),
        }
      )
    )
  }

  // days-without-launch: dias de calendario desde o ultimo lancamento (pulado se suprimido).
  if (input.suppressed !== true) {
    let last = input.lastLaunchAt ?? null
    if (!last) {
      for (const t of transactions) if (!last || t.date.getTime() > last.getTime()) last = t.date
    }
    if (last) {
      const days = daysBetweenParts(zonedParts(last, tz), zonedParts(now, tz))
      if (days >= INSIGHT_RULES.NO_LAUNCH_DAYS) {
        const severity =
          days >= INSIGHT_RULES.NO_LAUNCH_DAYS_SEV3 ? 3 : days >= INSIGHT_RULES.NO_LAUNCH_DAYS_SEV2 ? 2 : 1
        out.push(
          makeInsight('days-without-launch', { kind: 'cycle', key: cycle.key, label: null }, day, ctx, {
            metrics: { days },
            severity,
            evidence: { txIds: [], dayKeys: [] },
          })
        )
      }
    }
  }

  // limit-near e limit-over: a partir das linhas do orcamento (reuso do nucleo).
  for (const row of rows) {
    const limit = row.limitCents
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) continue
    const spent = row.spentCents
    const over = row.state === 'over' || spent > limit
    if (!over && spent * 100 < limit * INSIGHT_RULES.LIMIT_NEAR_PCT) continue
    const subject = { kind: /** @type {const} */ ('category'), key: row.categoryId, label: categoryLabel(row.categoryId, categoryDefs) }
    out.push(
      makeInsight(over ? 'limit-over' : 'limit-near', subject, 'ciclo', ctx, {
        metrics: {
          pct: typeof row.pct === 'number' ? row.pct : Math.floor((Math.max(spent, 0) * 100) / limit),
          spentCents: spent,
          limitCents: limit,
        },
        severity: over ? 3 : 2,
        evidence: { txIds: [], dayKeys: [] },
      })
    )
  }

  // rhythm: so quando o nivel do ritmo e informado (0 a 4).
  const level = input.rhythmLevel
  if (typeof level === 'number' && Number.isInteger(level) && level >= 0 && level <= 4) {
    out.push(
      makeInsight('rhythm', { kind: 'cycle', key: cycle.key, label: null }, day, ctx, {
        metrics: { level },
        severity: /** @type {0 | 1 | 2 | 3} */ ([0, 0, 1, 2, 3][level]),
        evidence: { txIds: [], dayKeys: [] },
      })
    )
  }

  return out.sort(compareInsights)
}
