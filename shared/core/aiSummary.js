// @ts-check
// Resumo do mes que a IA enxerga (IA-02, D-14, D-16). Funcao pura: recebe os dados que o servidor
// ja leu SO da pessoa do token e do casal (Porquinho, metas) e devolve um objeto pequeno, todo em
// texto seguro. Nada aqui le relogio (o "agora" entra como argumento), sorteia ou importa pacote.
//
// Regras do que sai (o findLeaks de aiPrivacy e a defesa final sobre o texto serializado):
//   - todo texto livre (loja, categoria, meta, conta fixa, cartao) passa por aiPrivacy;
//   - nunca ano, chave AAAA-MM nem data completa: o mes vai pelo nome e o ciclo pelo dia do ciclo;
//   - dinheiro sai de formatMoney, porcentagem como "73%" e contagem como inteiro pequeno (ate 999),
//     porque findLeaks bloqueia 4 ou mais algarismos seguidos fora de valor em reais e porcentagem;
//   - porcentagem sempre como texto com %: a leitura de numeros do validador (extractNumbers) poe
//     cada numero do resumo no mesmo balde (reais, porcentagem, inteiro) em que a fala vai cita-lo.

import { buildBudgetView } from './budget.js'
import { cycleOf } from './cycle.js'
import { normalizePersonConfig } from './limits.js'
import { resolveCategoryId } from './categories.js'
import { toCents } from './ledger.js'
import { DEFAULT_TZ } from './time.js'
import { formatMoney, MONTH_LONG } from './format.js'
import { safeLabel, merchantLabel, findLeaks } from './aiPrivacy.js'
import { extractNumbers } from './aiValidate.js'

/** @typedef {import('./categories.js').CategoryDef} CategoryDef */

/** Tamanho maximo de cada lista (orcamento de 1.200 a 1.500 tokens, T-07-27). */
export const SUMMARY_LIMITS = Object.freeze({
  limites: 12,
  semLimite: 5,
  lojas: 8,
  comparacao: 6,
  metas: 5,
  fatura: 2,
  padroes: 5,
  fixasProximas: 5,
})

/** Nenhum inteiro ou porcentagem do resumo passa disto (3 algarismos). */
const NUM_CAP = 999

/** Rotulo quando a categoria nao tem nome aproveitavel. */
const NO_CATEGORY = 'sem categoria'

/** Nome do nivel do ritmo (0 a 4), igual ao da Home. */
const RHYTHM_NAMES = Object.freeze(['folgado', 'no ritmo', 'atenção', 'acima do ritmo', 'estourou'])

/** Estado do limite em palavras. */
const LIMIT_STATE = Object.freeze({ ok: 'ok', warn: 'perto', over: 'estourou' })

// ---------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------

/**
 * @param {unknown} n
 * @returns {number}
 */
function finite(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

/**
 * Inteiro pequeno de 0 a 999.
 * @param {unknown} n
 * @returns {number}
 */
function smallInt(n) {
  return Math.min(Math.max(Math.trunc(finite(n)), 0), NUM_CAP)
}

/**
 * Porcentagem como texto, de 0% a 999%.
 * @param {unknown} n
 * @returns {string}
 */
function pctText(n) {
  return `${smallInt(n)}%`
}

/**
 * Dinheiro em reais de centavos inteiros.
 * @param {unknown} cents
 * @returns {string}
 */
function money(cents) {
  return formatMoney(Math.round(finite(cents)))
}

/**
 * @param {unknown} value
 * @returns {any[]}
 */
function list(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Rotulo seguro de texto livre do usuario (nome de categoria, meta, conta, cartao): passa por
 * safeLabel e, como defesa, por findLeaks, caindo no padrao se algo sobrar.
 * @param {unknown} text
 * @param {string} fallback
 * @param {{ strict?: boolean }} [opts]
 * @returns {string}
 */
function freeLabel(text, fallback, opts = {}) {
  const label = safeLabel(text, { strict: opts.strict === true })
  return label !== null && findLeaks(label).length === 0 ? label : fallback
}

/**
 * Nome seguro de uma categoria por id.
 * @param {string | null | undefined} id
 * @param {ReadonlyArray<CategoryDef>} defs
 * @returns {string}
 */
function categoryName(id, defs) {
  if (id === null || id === undefined) return NO_CATEGORY
  const def = defs.find((d) => d.id === id)
  return def ? freeLabel(def.name, NO_CATEGORY) : NO_CATEGORY
}

/**
 * @param {unknown} d
 * @returns {d is Date}
 */
function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime())
}

/**
 * O item e da outra pessoa? So conta quando os dois lados sao "ele" ou "ela".
 * @param {unknown} item
 * @param {unknown} person
 * @returns {boolean}
 */
function isOtherPerson(item, person) {
  const p = item && typeof item === 'object' ? /** @type {any} */ (item).person : undefined
  return (p === 'ele' || p === 'ela') && (person === 'ele' || person === 'ela') && p !== person
}

/**
 * Lancamentos validos da pessoa (os da outra pessoa saem, por seguranca em dobro: a entrada do
 * servidor nem os tem, D-14).
 * @param {unknown} raw
 * @param {unknown} person
 * @returns {any[]}
 */
function ownTransactions(raw, person) {
  return list(raw).filter(
    (t) =>
      t &&
      typeof t === 'object' &&
      isValidDate(t.date) &&
      Number.isFinite(Number(t.amount)) &&
      !isOtherPerson(t, person),
  )
}

/**
 * Definicoes de categoria validas.
 * @param {unknown} raw
 * @returns {CategoryDef[]}
 */
function cleanDefs(raw) {
  return list(raw).filter((d) => d && typeof d === 'object' && typeof d.id === 'string' && typeof d.name === 'string')
}

/**
 * Rotulo seguro do lancamento (merchantLabel) com findLeaks como defesa final.
 * @param {any} tx
 * @param {CategoryDef[]} defs
 * @returns {{ label: string, kind: 'pessoa' | 'loja' | 'categoria' | 'manual' }}
 */
function safeMerchant(tx, defs) {
  const m = merchantLabel(tx, defs)
  if (findLeaks(m.label).length === 0) return m
  const id = tx.categoryId ?? resolveCategoryId(tx.category ?? '', defs)
  return { label: categoryName(id, defs), kind: 'categoria' }
}

// ---------------------------------------------------------------------------------------------
// buildAiSummary
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {Record<string, any>} AiSummary
 */

/**
 * Monta o resumo do mes da pessoa. Entrada com listas vazias ou campos nulos nunca lanca.
 * @param {{
 *   now: Date,
 *   person?: string,
 *   cycle?: import('./cycle.js').Cycle,
 *   config?: unknown,
 *   categoryDefs?: ReadonlyArray<CategoryDef>,
 *   transactions?: unknown[],
 *   prevTransactions?: unknown[],
 *   bills?: unknown[],
 *   payments?: unknown[],
 *   goals?: unknown[],
 *   porquinhoCents?: number | null,
 *   cards?: unknown[],
 *   insights?: unknown[],
 *   latestTx?: unknown,
 *   tz?: string,
 * }} input
 * @returns {AiSummary}
 */
export function buildAiSummary(input) {
  const src = input ?? /** @type {any} */ ({})
  const now = src.now
  if (!isValidDate(now)) throw new TypeError('buildAiSummary: now invalido')
  const tz = typeof src.tz === 'string' && src.tz !== '' ? src.tz : DEFAULT_TZ
  const person = src.person
  const defs = cleanDefs(src.categoryDefs)
  const cfg = normalizePersonConfig(src.config)
  const cycle = src.cycle ?? cycleOf(now, cfg.salaryDay, tz)
  const txs = ownTransactions(src.transactions, person)
  const bills = list(src.bills).filter((b) => b && typeof b === 'object' && !isOtherPerson(b, person))
  const payments = list(src.payments).filter((p) => p && typeof p === 'object')

  const view = buildBudgetView({
    now,
    cycle,
    config: cfg,
    transactions: txs,
    bills,
    payments,
    categoryDefs: defs,
    tz,
  })

  /** @type {AiSummary} */
  const summary = {}

  summary.ciclo = {
    mes: MONTH_LONG[cycle.startParts.month - 1].toLowerCase(),
    dia: smallInt(view.daysElapsed),
    diasNoCiclo: smallInt(view.daysTotal),
    diasRestantes: smallInt(view.daysLeft),
  }

  /** @type {AiSummary} */
  const pode = { gastoDoCiclo: money(view.spend.totalCents) }
  if (view.income.hasIncome) {
    pode.valor = money(view.safeCents)
    if (view.perDayCents > 0) pode.porDia = money(view.perDayCents)
  }
  if (view.rhythmLevel !== null) pode.ritmo = RHYTHM_NAMES[view.rhythmLevel]
  summary.podeGastar = pode

  const limites = view.spend.rows.slice(0, SUMMARY_LIMITS.limites).map((row) => {
    /** @type {AiSummary} */
    const out = {
      categoria: categoryName(row.categoryId, defs),
      gasto: money(row.spentCents),
      limite: money(row.limitCents),
      uso: pctText(row.pct),
      estado: LIMIT_STATE[row.state],
    }
    if (row.state === 'over') out.passou = money(row.excessCents)
    else out.resta = money(row.remainingCents)
    return out
  })
  if (limites.length > 0) summary.limites = limites

  const last = buildLatest(src.latestTx, defs, person)
  if (last !== null) summary.ultimoLancamento = last

  return summary
}

/**
 * Ultimo lancamento: so rotulo seguro, categoria e valor.
 * @param {unknown} raw
 * @param {CategoryDef[]} defs
 * @param {unknown} person
 * @returns {AiSummary | null}
 */
function buildLatest(raw, defs, person) {
  if (!raw || typeof raw !== 'object' || isOtherPerson(raw, person)) return null
  const tx = /** @type {any} */ (raw)
  const cents = toCents(Number(tx.amount))
  if (!Number.isFinite(cents)) return null
  const m = safeMerchant(tx, defs)
  const id = tx.categoryId ?? resolveCategoryId(tx.category ?? '', defs)
  return {
    loja: m.label,
    categoria: categoryName(id, defs),
    valor: money(Math.abs(cents)),
    movimento: tx.type === 'entrada' ? 'entrada' : 'gasto',
  }
}

// ---------------------------------------------------------------------------------------------
// Texto e numeros permitidos
// ---------------------------------------------------------------------------------------------

/**
 * Texto que vai ao prompt: JSON compacto, sem espacos.
 * @param {AiSummary} summary
 * @returns {string}
 */
export function summaryToPromptText(summary) {
  return JSON.stringify(summary ?? {})
}

/**
 * Numeros que a fala pode citar: tudo o que o resumo traz, lido com a MESMA leitura do validador
 * (extractNumbers), para um numero fora do resumo reprovar.
 * @param {AiSummary} summary
 * @returns {{ moneyCents: Set<number>, pcts: Set<number>, ints: Set<number> }}
 */
export function collectAllowed(summary) {
  const found = extractNumbers(summaryToPromptText(summary))
  return {
    moneyCents: new Set(found.moneyCents),
    pcts: new Set(found.pcts),
    ints: new Set(found.ints),
  }
}
