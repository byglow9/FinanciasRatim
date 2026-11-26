// @ts-check
// Resumo do mes que a IA enxerga (IA-02, D-14, D-16). Funcao pura: recebe os dados que o servidor
// ja leu SO da pessoa do token e do casal (Porquinho, metas) e devolve um objeto pequeno, todo em
// texto seguro. Nada aqui le relogio (o "agora" entra como argumento), sorteia ou importa pacote.
//
// Regras do que sai (o findLeaks de aiPrivacy e a defesa final sobre o texto serializado):
//   - todo texto livre (loja, categoria, meta, conta fixa, cartao) passa por aiPrivacy;
//   - nunca ano, chave AAAA-MM nem data completa: o mes vai pelo nome e o ciclo pelo dia do ciclo;
//   - dinheiro sai de formatMoney, porcentagem como "73%" (ate 99999%) e contagem como inteiro pequeno (ate 999),
//     porque findLeaks bloqueia 4 ou mais algarismos seguidos fora de valor em reais e porcentagem;
//   - porcentagem sempre como texto com %: a leitura de numeros do validador (extractNumbers) poe
//     cada numero do resumo no mesmo balde (reais, porcentagem, inteiro) em que a fala vai cita-lo.

import { buildBudgetView, isDayToDay } from './budget.js'
import { cycleOf, shiftCycle, cycleDay, daysBetweenParts, isInCycle } from './cycle.js'
import { normalizePersonConfig } from './limits.js'
import { resolveCategoryId } from './categories.js'
import { toCents } from './ledger.js'
import { DEFAULT_TZ, zonedParts } from './time.js'
import { normalize } from './classify.js'
import { BRAND_DICTIONARY, ESTABLISHMENT_TOKENS } from './insights.js'
import { formatMoney, MONTH_LONG } from './format.js'
import { safeLabel, merchantLabel, findLeaks, freeText } from './aiPrivacy.js'
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
  agenda: 10,
  agendaPassada: 3,
  anotacoes: 6,
  ultimosDias: 10,
})

/** Nenhuma contagem do resumo passa disto (3 algarismos). */
const NUM_CAP = 999

/** Teto da porcentagem do resumo: acima de 999 a fala precisa do valor real (07.1, D-19). */
export const PCT_CAP = 99999

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
 * Porcentagem como texto, de 0% a PCT_CAP (99999%).
 * @param {unknown} n
 * @returns {string}
 */
function pctText(n) {
  return `${Math.min(Math.max(Math.trunc(finite(n)), 0), PCT_CAP)}%`
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
  if (findLeaks(m.label).length === 0 && !looksLikeFullName(m)) return m
  const id = tx.categoryId ?? resolveCategoryId(tx.category ?? '', defs)
  return { label: categoryName(id, defs), kind: 'categoria' }
}

/** Nome composto: duas ou mais palavras, todas com inicial maiuscula (ex.: "Joao Silva Santos"). */
const CAPITALIZED_RUN = /^\p{Lu}[\p{L}'.-]*(?:\s+\p{Lu}[\p{L}'.-]*)+$/u

/**
 * Camada extra sobre aiPrivacy (T-07-25, D-20): descricao MANUAL que e so palavras com inicial
 * maiuscula, sem marca nem termo de estabelecimento, parece nome de pessoa digitado sem
 * preposicao ("Joao Silva Santos"). Perder o nome de uma loja assim e barato; vazar nome nao e.
 * @param {{ label: string, kind: string }} m
 * @returns {boolean}
 */
function looksLikeFullName(m) {
  if (m.kind !== 'manual' || !CAPITALIZED_RUN.test(m.label)) return false
  const norm = normalize(m.label)
  if (BRAND_DICTIONARY.some((b) => b.test.test(norm))) return false
  return !norm.split(/[^a-z0-9]+/).some((w) => ESTABLISHMENT_TOKENS.includes(w))
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
 *   events?: unknown[],
 *   notes?: unknown[],
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

  if (view.income.hasIncome) {
    summary.renda = { recebida: money(view.income.receivedCents), esperada: money(view.income.expectedCents) }
  }

  if (view.bills.totalCount > 0) {
    summary.fixas = {
      total: money(view.bills.totalCents),
      pagas: smallInt(view.bills.paidCount),
      aPagar: smallInt(view.bills.totalCount - view.bills.paidCount),
      proximas: view.bills.items
        .filter((item) => !item.paid)
        .slice(0, SUMMARY_LIMITS.fixasProximas)
        .map((item) => ({
          nome: freeLabel(item.name, 'conta', { strict: true }),
          dia: smallInt(item.dueDay),
          valor: money(item.costCents),
        })),
    }
  }

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

  const semLimite = view.spend.generalByCategory
    .filter((g) => g.cents > 0)
    .map((g) => ({ categoria: categoryName(g.categoryId, defs), cents: g.cents }))
    .sort((a, b) => b.cents - a.cents || cmp(a.categoria, b.categoria))
    .slice(0, SUMMARY_LIMITS.semLimite)
    .map((g) => ({ categoria: g.categoria, gasto: money(g.cents) }))
  if (semLimite.length > 0) summary.semLimite = semLimite

  const lojas = buildMerchants({ txs, cycle, now, tz, defs })
  if (lojas.length > 0) summary.lojas = lojas

  const comparacao = buildComparison({
    cycle,
    now,
    tz,
    txs,
    prevTxs: ownTransactions(src.prevTransactions, person),
    defs,
  })
  if (comparacao.length > 0) summary.comparacao = comparacao

  const metas = buildGoals(src.goals, person)
  if (metas.length > 0) summary.metas = metas

  if (typeof src.porquinhoCents === 'number' && Number.isFinite(src.porquinhoCents)) {
    summary.porquinho = money(src.porquinhoCents)
  }

  const fatura = buildCards(src.cards, person)
  if (fatura.length > 0) summary.fatura = fatura

  const padroes = buildPatterns(src.insights, { person, cycleKey: cycle.key, defs })
  if (padroes.length > 0) summary.padroes = padroes

  const agenda = buildAgenda(src.events, { person, now, tz })
  if (agenda.length > 0) summary.agenda = agenda

  const anotacoes = buildNotes(src.notes, { person, now, tz })
  if (anotacoes.length > 0) summary.anotacoes = anotacoes

  const ultimosDias = buildRecent({ txs, now, tz, defs })
  if (ultimosDias.length > 0) summary.ultimosDias = ultimosDias

  summary.assuntos = rankTopics(summary)

  const last = buildLatest(src.latestTx, defs, person)
  if (last !== null) summary.ultimoLancamento = last

  return summary
}

/**
 * Ordem total de textos, sem depender de locale.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Id da categoria do lancamento (o gravado ou o resolvido pelo nome, como o orcamento faz).
 * @param {any} t
 * @param {CategoryDef[]} defs
 * @returns {string | null}
 */
function categoryIdOf(t, defs) {
  return t.categoryId ?? resolveCategoryId(t.category ?? '', defs)
}

/** Janela da "ultima semana" em dias de calendario, igual a do detector de padroes. */
const WEEK_DAYS = 7

/**
 * Lojas que mais aparecem no ciclo: rotulo seguro, vezes na ultima semana e no ciclo e total.
 * Pix para pessoa e agrupado em "uma pessoa". `tipo` diz de onde veio o rotulo (loja reconhecida,
 * pessoa, categoria ou descricao manual), e e por ele que reactionLabels sabe o que e loja.
 * @param {{ txs: any[], cycle: import('./cycle.js').Cycle, now: Date, tz: string, defs: CategoryDef[] }} args
 * @returns {AiSummary[]}
 */
function buildMerchants({ txs, cycle, now, tz, defs }) {
  const today = zonedParts(now, tz)
  /** @type {Map<string, { label: string, kind: string, week: number, inCycle: number, cents: number }>} */
  const groups = new Map()
  for (const t of txs) {
    if (!isDayToDay(t) || !isInCycle(t.date, cycle)) continue
    const cents = toCents(Number(t.amount))
    if (!Number.isFinite(cents)) continue
    const m = safeMerchant(t, defs)
    const key = `${m.kind}|${normalize(m.label)}`
    let g = groups.get(key)
    if (!g) {
      g = { label: m.label, kind: m.kind, week: 0, inCycle: 0, cents: 0 }
      groups.set(key, g)
    } else if (m.label < g.label) {
      g.label = m.label
    }
    g.inCycle += 1
    g.cents += cents
    const age = daysBetweenParts(zonedParts(t.date, tz), today)
    if (age >= 0 && age < WEEK_DAYS) g.week += 1
  }
  return [...groups.values()]
    .sort((a, b) => b.inCycle - a.inCycle || b.cents - a.cents || cmp(normalize(a.label), normalize(b.label)) || cmp(a.kind, b.kind))
    .slice(0, SUMMARY_LIMITS.lojas)
    .map((g) => ({
      loja: g.label,
      tipo: g.kind,
      naSemana: smallInt(g.week),
      noCiclo: smallInt(g.inCycle),
      total: money(g.cents),
    }))
}

/**
 * Gasto do dia a dia por categoria, em centavos.
 * @param {any[]} txs
 * @param {CategoryDef[]} defs
 * @param {(t: any) => boolean} include
 * @returns {Map<string | null, number>}
 */
function sumByCategory(txs, defs, include) {
  /** @type {Map<string | null, number>} */
  const out = new Map()
  for (const t of txs) {
    if (!isDayToDay(t) || !include(t)) continue
    const cents = toCents(Number(t.amount))
    if (!Number.isFinite(cents)) continue
    const id = categoryIdOf(t, defs)
    out.set(id, (out.get(id) ?? 0) + cents)
  }
  return out
}

/**
 * Tendencia contra o ciclo anterior ate o mesmo dia do ciclo, por categoria (D-11).
 * @param {{ cycle: import('./cycle.js').Cycle, now: Date, tz: string, txs: any[], prevTxs: any[], defs: CategoryDef[] }} args
 * @returns {AiSummary[]}
 */
function buildComparison({ cycle, now, tz, txs, prevTxs, defs }) {
  const prevCycle = shiftCycle(cycle, -1, tz)
  const day = cycleDay(cycle, now, tz)
  const current = sumByCategory(txs, defs, (t) => isInCycle(t.date, cycle))
  const previous = sumByCategory(prevTxs, defs, (t) => {
    if (!isInCycle(t.date, prevCycle)) return false
    return daysBetweenParts(prevCycle.startParts, zonedParts(t.date, tz)) + 1 <= day
  })
  return [...current.entries()]
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ id, name: categoryName(id, defs), cents, before: previous.get(id) ?? 0 }))
    .sort((a, b) => b.cents - a.cents || cmp(a.name, b.name) || cmp(String(a.id), String(b.id)))
    .slice(0, SUMMARY_LIMITS.comparacao)
    .map((row) => {
      /** @type {AiSummary} */
      const out = { categoria: row.name, atual: money(row.cents) }
      if (row.before > 0) {
        out.anterior = money(row.before)
        out.variacao = signedPct(Math.trunc(((row.cents - row.before) * 100) / row.before))
      } else {
        out.variacao = 'nova'
      }
      return out
    })
}

/**
 * Porcentagem com sinal como texto, de -99999% a +99999%.
 * @param {number} n
 * @returns {string}
 */
function signedPct(n) {
  const v = Math.max(-PCT_CAP, Math.min(PCT_CAP, Math.trunc(finite(n))))
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v)}%`
}

/**
 * Metas da pessoa e do casal (as da outra pessoa saem). Incompletas primeiro, por progresso.
 * @param {unknown} raw
 * @param {unknown} person
 * @returns {AiSummary[]}
 */
function buildGoals(raw, person) {
  return list(raw)
    .filter(
      (g) =>
        g &&
        typeof g === 'object' &&
        !isOtherPerson(g, person) &&
        Number.isInteger(g.targetCents) &&
        g.targetCents > 0,
    )
    .map((g) => {
      const current = Math.max(Math.round(finite(g.currentCents)), 0)
      return {
        name: freeLabel(g.name, 'meta', { strict: true }),
        current,
        target: g.targetCents,
        pct: Math.floor((current * 100) / g.targetCents),
      }
    })
    .sort((a, b) => Number(a.pct >= 100) - Number(b.pct >= 100) || b.pct - a.pct || cmp(a.name, b.name))
    .slice(0, SUMMARY_LIMITS.metas)
    .map((g) => ({ meta: g.name, guardado: money(g.current), alvo: money(g.target), progresso: pctText(g.pct) }))
}

/**
 * Cartoes com fatura aberta e o dia do vencimento (ate 2, a maior fatura primeiro).
 * @param {unknown} raw
 * @param {unknown} person
 * @returns {AiSummary[]}
 */
function buildCards(raw, person) {
  return list(raw)
    .filter(
      (c) => c && typeof c === 'object' && !isOtherPerson(c, person) && Number.isFinite(c.openBillCents) && c.openBillCents > 0,
    )
    .map((c) => ({
      name: freeLabel(c.name, 'cartão', { strict: true }),
      open: Math.round(c.openBillCents),
      due: Number.isInteger(c.dueDay) && c.dueDay >= 1 && c.dueDay <= 31 ? c.dueDay : null,
    }))
    .sort((a, b) => b.open - a.open || cmp(a.name, b.name))
    .slice(0, SUMMARY_LIMITS.fatura)
    .map((c) => {
      /** @type {AiSummary} */
      const out = { cartao: c.name, aberta: money(c.open) }
      if (c.due !== null) out.vence = c.due
      return out
    })
}

/**
 * Distancia em dias de calendario ate a data, em palavras.
 * @param {Date} date
 * @param {Date} now
 * @param {string} tz
 * @returns {{ days: number, text: string }}
 */
function whenOf(date, now, tz) {
  const days = daysBetweenParts(zonedParts(now, tz), zonedParts(date, tz))
  const n = smallInt(Math.abs(days))
  if (days === 0) return { days, text: 'hoje' }
  if (days === 1) return { days, text: 'amanhã' }
  if (days === -1) return { days, text: 'ontem' }
  return { days, text: days > 0 ? `daqui a ${n} dias` : `há ${n} dias` }
}

/** @param {Date} date @param {string} tz */
function dayAndMonth(date, tz) {
  const parts = zonedParts(date, tz)
  return { dia: smallInt(parts.day), mes: MONTH_LONG[parts.month - 1].toLowerCase() }
}

/**
 * Eventos do calendario da pessoa e do casal ('conjunto'): os proximos primeiro, depois os que ja
 * aconteceram (D-24). Todo texto passa por freeText.
 * @param {unknown} raw
 * @param {{ person: unknown, now: Date, tz: string }} ctx
 * @returns {AiSummary[]}
 */
function buildAgenda(raw, { person, now, tz }) {
  const items = list(raw)
    .filter((e) => e && typeof e === 'object' && isValidDate(e.date) && !isOtherPerson(e, person))
    .map((e) => ({ e, when: whenOf(e.date, now, tz) }))
  const next = items.filter((i) => i.when.days >= 0).sort((a, b) => a.e.date - b.e.date)
  const past = items.filter((i) => i.when.days < 0).sort((a, b) => b.e.date - a.e.date)
  const keptPast = past.slice(0, Math.max(SUMMARY_LIMITS.agendaPassada, SUMMARY_LIMITS.agenda - next.length))
  return [...next.slice(0, SUMMARY_LIMITS.agenda - Math.min(keptPast.length, SUMMARY_LIMITS.agendaPassada)), ...keptPast]
    .slice(0, SUMMARY_LIMITS.agenda)
    .map(({ e, when }) => {
      /** @type {AiSummary} */
      const out = { quando: when.text, ...dayAndMonth(e.date, tz), evento: freeText(e.title, { max: 40 }) ?? 'compromisso' }
      if (typeof e.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) out.hora = e.time
      const place = freeText(e.location, { max: 30 })
      if (place !== null) out.local = place
      const detail = freeText(e.notes, { max: 80 })
      if (detail !== null) out.detalhe = detail
      return out
    })
}

/**
 * Anotacoes (post-its) da pessoa, da mais nova para a mais antiga (D-24). Anotacao que fala de
 * senha ou chave fica inteira de fora.
 * @param {unknown} raw
 * @param {{ person: unknown, now: Date, tz: string }} ctx
 * @returns {AiSummary[]}
 */
function buildNotes(raw, { person, now, tz }) {
  /** @type {AiSummary[]} */
  const out = []
  for (const n of list(raw)) {
    if (out.length >= SUMMARY_LIMITS.anotacoes) break
    if (!n || typeof n !== 'object' || isOtherPerson(n, person)) continue
    const whole = `${n.title ?? ''} ${n.content ?? ''}`
    if (freeText(whole, { max: 600 }) === null) continue
    const titulo = freeText(n.title, { max: 40 })
    const texto = freeText(n.content, { max: 120 })
    if (titulo === null && texto === null) continue
    /** @type {AiSummary} */
    const item = {}
    if (titulo !== null) item.titulo = titulo
    if (texto !== null) item.texto = texto
    if (isValidDate(n.date)) item.quando = whenOf(n.date, now, tz).text
    out.push(item)
  }
  return out
}

/**
 * O que aconteceu nos ultimos 7 dias: lancamentos do mais novo ao mais antigo.
 * @param {{ txs: any[], now: Date, tz: string, defs: CategoryDef[] }} args
 * @returns {AiSummary[]}
 */
function buildRecent({ txs, now, tz, defs }) {
  return txs
    .map((t) => ({ t, when: whenOf(t.date, now, tz), cents: toCents(Number(t.amount)) }))
    .filter((i) => i.when.days <= 0 && i.when.days > -WEEK_DAYS && Number.isFinite(i.cents))
    .sort((a, b) => b.t.date - a.t.date || cmp(String(a.t.id), String(b.t.id)))
    .slice(0, SUMMARY_LIMITS.ultimosDias)
    .map(({ t, when, cents }) => ({
      quando: when.text,
      loja: safeMerchant(t, defs).label,
      movimento: t.type === 'entrada' ? 'entrada' : 'gasto',
      valor: money(Math.abs(cents)),
    }))
}

/** Tipo de padrao em palavras (so os que sao padrao: limite e ritmo ja tem secao propria). */
const PATTERN_TYPES = Object.freeze({
  'delivery-heavy': 'muito delivery',
  'merchant-repeat': 'loja repetida',
  'category-over-average': 'categoria acima da média',
  'spend-spike': 'gasto grande',
  'days-without-launch': 'dias sem lançar',
})

/** Metricas guardadas do insight e o nome que levam no resumo. */
const PATTERN_MONEY = Object.freeze({ totalCents: 'total', avgCents: 'media', limitCents: 'limite', spentCents: 'gasto' })
const PATTERN_PCT = Object.freeze({ ratioPct: 'razao', pct: 'uso' })
const PATTERN_INT = Object.freeze({ count: 'vezes', days: 'dias', windowDays: 'janelaDias' })

/**
 * Rotulo seguro do assunto de um insight guardado. O documento guardado nao tem texto livre: so a
 * chave. Marca vem do dicionario, categoria do nome da definicao e grupo so o delivery.
 * @param {any} insight
 * @param {CategoryDef[]} defs
 * @returns {string | null}
 */
function patternSubject(insight, defs) {
  const key = insight.subjectKey
  if (insight.subjectKind === 'category') {
    const def = defs.find((d) => d.id === key)
    return def ? freeLabel(def.name, NO_CATEGORY) : null
  }
  if (insight.subjectKind === 'merchant') return BRAND_DICTIONARY.find((b) => b.key === key)?.label ?? null
  if (insight.subjectKind === 'merchant-group') return key === 'delivery' ? 'delivery' : null
  return null
}

/**
 * Padroes ja detectados (insights guardados de severidade 2 ou 3), sem ids de lancamento nem de
 * dia. Toda metrica em centavos vira texto de formatMoney e nenhum inteiro passa de 999.
 * @param {unknown} raw
 * @param {{ person: unknown, cycleKey: string, defs: CategoryDef[] }} ctx
 * @returns {AiSummary[]}
 */
function buildPatterns(raw, { person, cycleKey, defs }) {
  return list(raw)
    .filter(
      (i) =>
        i &&
        typeof i === 'object' &&
        (i.severity === 2 || i.severity === 3) &&
        Object.prototype.hasOwnProperty.call(PATTERN_TYPES, i.type) &&
        !isOtherPerson(i, person) &&
        (i.cycleKey === undefined || i.cycleKey === cycleKey),
    )
    .sort((a, b) => b.severity - a.severity || cmp(a.type, b.type) || cmp(String(a.id), String(b.id)))
    .slice(0, SUMMARY_LIMITS.padroes)
    .map((i) => {
      /** @type {AiSummary} */
      const out = {
        tipo: /** @type {Record<string, string>} */ (PATTERN_TYPES)[i.type],
        forca: i.severity === 3 ? 'forte' : 'média',
      }
      const subject = patternSubject(i, defs)
      if (subject !== null) out.assunto = subject
      const m = i.metrics && typeof i.metrics === 'object' ? i.metrics : {}
      for (const [k, name] of Object.entries(PATTERN_INT)) {
        if (Number.isFinite(m[k])) out[name] = smallInt(m[k])
      }
      for (const [k, name] of Object.entries(PATTERN_MONEY)) {
        if (Number.isFinite(m[k])) out[name] = money(m[k])
      }
      for (const [k, name] of Object.entries(PATTERN_PCT)) {
        if (Number.isFinite(m[k])) out[name] = pctText(m[k])
      }
      return out
    })
}

// ---------------------------------------------------------------------------------------------
// Assuntos candidatos
// ---------------------------------------------------------------------------------------------

/** Assuntos possiveis da fala, na ordem de desempate (D-11). */
export const TOPICS = Object.freeze([
  'padroes',
  'limites',
  'comparacao',
  'ritmo',
  'semana',
  'entradas',
  'metas',
  'porquinho',
  'fixas',
  'fatura',
  'agenda',
  'anotacoes',
])

/** Variacao (em pontos percentuais, para cima ou para baixo) a partir da qual a comparacao e alta. */
const HIGH_COMPARISON_PCT = 30

/**
 * Porcentagem de um texto do resumo ("+30%", "123%").
 * @param {unknown} text
 * @returns {number}
 */
function pctOfText(text) {
  const m = /([+-]?\d+)%/.exec(String(text ?? ''))
  return m ? Number(m[1]) : 0
}

/**
 * Assuntos candidatos presentes no resumo, do mais relevante ao menos: padrao forte, limite
 * estourado, limite perto, comparacao alta, ritmo, e depois o resto na ordem fixa. Estavel e
 * deterministico: o mesmo resumo da sempre a mesma ordem.
 * @param {AiSummary} summary
 * @returns {string[]}
 */
export function rankTopics(summary) {
  const s = summary && typeof summary === 'object' ? summary : {}
  const padroes = list(s.padroes)
  const limites = list(s.limites)
  const comparacao = list(s.comparacao)
  const present = {
    padroes: padroes.length > 0,
    limites: limites.length > 0,
    comparacao: comparacao.length > 0,
    ritmo: Boolean(s.podeGastar && s.podeGastar.ritmo),
    semana: list(s.lojas).some((l) => l && l.naSemana > 0),
    entradas: Boolean(s.renda),
    metas: list(s.metas).length > 0,
    porquinho: typeof s.porquinho === 'string',
    fixas: Boolean(s.fixas),
    fatura: list(s.fatura).length > 0,
    agenda: list(s.agenda).length > 0,
    anotacoes: list(s.anotacoes).length > 0,
  }
  /** @type {string[]} */
  const out = []
  /** @param {string} topic */
  const add = (topic) => {
    if (present[/** @type {keyof typeof present} */ (topic)] && !out.includes(topic)) out.push(topic)
  }
  if (padroes.some((p) => p && p.forca === 'forte')) add('padroes')
  if (limites.some((l) => l && l.estado === 'estourou')) add('limites')
  if (limites.some((l) => l && l.estado === 'perto')) add('limites')
  if (comparacao.some((c) => c && Math.abs(pctOfText(c.variacao)) >= HIGH_COMPARISON_PCT)) add('comparacao')
  if (list(s.agenda).some((e) => e && (e.quando === 'hoje' || e.quando === 'amanhã'))) add('agenda')
  add('ritmo')
  for (const topic of TOPICS) add(topic)
  return out
}

/**
 * Rotulos de loja para a validacao das falas que reagem a um lancamento: o rotulo do lancamento
 * atual e os das outras lojas do resumo (so loja reconhecida, nunca "uma pessoa" nem nome de
 * categoria). A fala que citar uma loja que nao e a do lancamento reprova (loja-errada).
 * @param {AiSummary} summary
 * @returns {{ focusLabel: string | null, otherLabels: string[] }}
 */
export function reactionLabels(summary) {
  const s = summary && typeof summary === 'object' ? summary : {}
  const focus = s.ultimoLancamento && typeof s.ultimoLancamento.loja === 'string' ? s.ultimoLancamento.loja : null
  const focusNorm = focus === null ? '' : normalize(focus)
  /** @type {string[]} */
  const others = []
  const seen = new Set([focusNorm])
  for (const l of list(s.lojas)) {
    if (!l || l.tipo !== 'loja' || typeof l.loja !== 'string') continue
    const norm = normalize(l.loja)
    if (seen.has(norm)) continue
    seen.add(norm)
    others.push(l.loja)
  }
  return { focusLabel: focus, otherLabels: others }
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
  return {
    loja: m.label,
    categoria: categoryName(categoryIdOf(tx, defs), defs),
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
