// @ts-check
// Cerebro de humor do Vintem: dado o que a Home ja sabe (linhas de limite, ritmo,
// dado velho, insights), devolve estado e situacao da fala. Sem relogio, sem
// pacote: o instante entra como `nowMs` e o dia como `todayKey`.
//
// Faixas do limite (D-06b), sempre em inteiros, sem divisao nem ponto flutuante:
//   abaixo de 75% = abaixo; de 75% ate menos de 80% = atento; de 80% a 100% = perto
//   (gasto igual ao limite ainda e perto); estourou so quando gasto > limite, que
//   e `row.state === 'over'` (mesma regra dos alertas), nunca `pct >= 100`.

import { previewLaunch } from './budget.js'
import { VINTEM_STATES } from './vintemStates.js'

/**
 * Cortes das faixas, em porcentagem do limite. `estourouBravoAte` e o fim da
 * faixa em que o tom escolhe entre triste e bravo; acima dele e sempre triste.
 */
export const MOOD_BANDS = Object.freeze({ atento: 75, perto: 80, estourouBravoAte: 130 })

/** Um dos sete estados de VINTEM_STATES (vintemStates.js). @typedef {'neutro' | 'feliz' | 'triste' | 'bravo' | 'sonolento' | 'surpreso' | 'atento'} VintemState */

/**
 * Fatos que a Home ja calculou. Nada aqui exige leitura nem rede.
 * `cheer` e o evento de comemoracao (meta batida ou aporte no Porquinho).
 * Cada insight traz `type`, `day` (dia da chave `todayKey`), `severity` e
 * `subject.key` (categoryId, ou merchantKey no tipo `merchant-repeat`).
 * @typedef {{
 *   loading: boolean,
 *   readOnly: boolean,
 *   isPast: boolean,
 *   noIncome: boolean,
 *   suppressed: boolean,
 *   tone: 'suave' | 'direto' | 'sem-filtro',
 *   todayKey: string,
 *   rhythmLevel: 0 | 1 | 2 | 3 | 4 | null,
 *   rows: Array<{ categoryId: string, spentCents: number, limitCents: number, state: 'ok' | 'warn' | 'over', pct: number }>,
 *   cheer: 'meta-batida' | 'porquinho-guardou' | null,
 *   insights: Array<{ type: string, day?: string, severity?: number, subject?: { key?: string } }>,
 * }} MoodFacts
 */

/**
 * Resultado da derivacao. `subject` e so um identificador ja filtrado.
 * @typedef {{
 *   state: VintemState,
 *   situation: string | null,
 *   subject: { categoryId?: string, merchantKey?: string } | null,
 * }} MoodResult
 */

/**
 * @param {unknown} v
 * @returns {v is number}
 */
function isPositiveInt(v) {
  return typeof v === 'number' && Number.isInteger(v) && v > 0
}

/**
 * Faixa de uso do limite de uma linha, so por inteiros.
 * @param {{ spentCents: number, limitCents: number, state?: string }} row
 * @returns {'estourou' | 'perto' | 'atento' | 'abaixo'}
 */
export function limitBand(row) {
  if (row?.state === 'over') return 'estourou'
  const limit = row?.limitCents
  const spent = row?.spentCents
  if (!isPositiveInt(limit)) return 'abaixo'
  if (typeof spent !== 'number' || !Number.isFinite(spent)) return 'abaixo'
  if (spent * 100 >= limit * MOOD_BANDS.perto) return 'perto'
  if (spent * 100 >= limit * MOOD_BANDS.atento) return 'atento'
  return 'abaixo'
}

const NEUTRAL = Object.freeze({ state: 'neutro', situation: null, subject: null })

/**
 * Pior linha de uma faixa: maior pct; empate por categoryId (ordem estavel).
 * @param {MoodFacts['rows']} rows
 * @param {'estourou' | 'perto' | 'atento'} band
 */
function worstRow(rows, band) {
  let best = null
  for (const row of rows) {
    if (limitBand(row) !== band) continue
    if (
      best === null ||
      row.pct > best.pct ||
      (row.pct === best.pct && String(row.categoryId) < String(best.categoryId))
    ) {
      best = row
    }
  }
  return best
}

/**
 * Estado de uma linha estourada: acima de 130% e sempre triste; de 100 a 130 o
 * tom decide (suave triste, direto e sem-filtro bravo). Compara em centavos.
 * @param {{ spentCents: number, limitCents: number }} row
 * @param {MoodFacts['tone']} tone
 * @returns {'triste' | 'bravo'}
 */
function overState(row, tone) {
  if (row.spentCents * 100 > row.limitCents * MOOD_BANDS.estourouBravoAte) return 'triste'
  return tone === 'suave' ? 'triste' : 'bravo'
}

/** Tipos de insight de leitura de gasto e a situacao de cada um (ordem = desempate). */
const READING_SITUATION = Object.freeze({
  'delivery-heavy': 'delivery-semana',
  'merchant-repeat': 'loja-repete',
  'category-over-average': 'categoria-acima-media',
})
const READING_TYPES = Object.keys(READING_SITUATION)

/**
 * Sujeito de um insight: so identificador ja filtrado (nunca descricao crua).
 * `merchant-repeat` traz merchantKey; os demais trazem categoryId.
 * @param {{ type: string, subject?: { key?: string } }} insight
 * @returns {MoodResult['subject']}
 */
function subjectOf(insight) {
  const key = insight.subject?.key
  if (typeof key !== 'string' || key === '') return null
  return insight.type === 'merchant-repeat' ? { merchantKey: key } : { categoryId: key }
}

/**
 * Insight de leitura de maior severidade; empate pela ordem dos tipos e depois
 * pela chave, para o resultado nao depender da ordem de entrada.
 * @param {MoodFacts['insights']} insights
 */
function topReading(insights) {
  let best = null
  for (const ins of insights) {
    if (!READING_TYPES.includes(ins.type)) continue
    if (best === null) {
      best = ins
      continue
    }
    const a = ins.severity ?? 0
    const b = best.severity ?? 0
    if (a !== b) {
      if (a > b) best = ins
      continue
    }
    const ta = READING_TYPES.indexOf(ins.type)
    const tb = READING_TYPES.indexOf(best.type)
    if (ta !== tb) {
      if (ta < tb) best = ins
      continue
    }
    if (String(ins.subject?.key ?? '') < String(best.subject?.key ?? '')) best = ins
  }
  return best
}

/**
 * Situacao e estado de fundo, na ordem de D-06b: estourou, gasto grande, perto,
 * atento, leitura de gasto, meta ou aporte, ritmo, sem lancar, inicio.
 * @param {MoodFacts} facts
 * @returns {MoodResult}
 */
function backgroundMood(facts) {
  const rows = facts.rows ?? []
  const insights = facts.insights ?? []

  const over = worstRow(rows, 'estourou')
  if (over) {
    return {
      state: overState(over, facts.tone),
      situation: 'limite-estourou',
      subject: { categoryId: over.categoryId },
    }
  }
  const spike = insights.find((i) => i.type === 'spend-spike' && i.day === facts.todayKey)
  if (spike) return { state: 'surpreso', situation: 'gasto-grande', subject: subjectOf(spike) }
  const near = worstRow(rows, 'perto')
  if (near) {
    return { state: 'atento', situation: 'limite-perto', subject: { categoryId: near.categoryId } }
  }
  const watch = worstRow(rows, 'atento')
  if (watch) {
    return { state: 'atento', situation: 'limite-atento', subject: { categoryId: watch.categoryId } }
  }
  const reading = topReading(insights)
  if (reading) {
    return {
      state: (reading.severity ?? 0) >= 3 ? 'bravo' : 'atento',
      situation: READING_SITUATION[/** @type {keyof typeof READING_SITUATION} */ (reading.type)],
      subject: subjectOf(reading),
    }
  }
  if (facts.cheer === 'meta-batida' || facts.cheer === 'porquinho-guardou') {
    return { state: 'feliz', situation: facts.cheer, subject: null }
  }
  switch (facts.rhythmLevel) {
    case 4:
      return { state: 'triste', situation: 'ritmo-estourou', subject: null }
    case 3:
      return { state: 'atento', situation: 'ritmo-atencao', subject: null }
    case 2:
      return { state: 'neutro', situation: 'ritmo-atencao', subject: null }
    case 0:
      if (rows.every((r) => r.pct < 40)) {
        return { state: 'feliz', situation: 'ritmo-folgado', subject: null }
      }
      break
    default:
      break
  }
  if (insights.some((i) => i.type === 'days-without-launch')) {
    return { state: 'neutro', situation: 'sem-lancar', subject: null }
  }
  return { state: 'neutro', situation: 'inicio', subject: null }
}

/**
 * Humor de fundo e situacao da fala. O portao neutro (D-08) vem antes de tudo,
 * inclusive da reacao: dado velho nunca gera elogio nem bronca. Com reacao
 * ativa (`nowMs < untilMs`) o estado e o da reacao e a situacao continua a de
 * fundo (D-09). Varios dias sem lancar tornam feliz ou neutro em sonolento;
 * atento, bravo, triste e surpreso nunca sao trocados.
 * @param {MoodFacts} facts
 * @param {{ kind: string, state: VintemState, untilMs: number } | null | undefined} reaction
 * @param {number} nowMs
 * @returns {MoodResult}
 */
export function deriveVintemState(facts, reaction, nowMs) {
  if (facts.loading || facts.readOnly || facts.isPast || facts.noIncome || facts.suppressed) {
    return { ...NEUTRAL }
  }
  const mood = backgroundMood(facts)
  const sleepy = (facts.insights ?? []).some((i) => i.type === 'days-without-launch')
  if (sleepy && (mood.state === 'feliz' || mood.state === 'neutro')) mood.state = 'sonolento'
  if (reaction && Number.isFinite(nowMs) && nowMs < reaction.untilMs) {
    return { ...mood, state: reaction.state }
  }
  return mood
}

/**
 * Situacao da fala ao tocar no Vintem: perfil somente leitura nao fala; dado
 * velho tem uma unica fala neutra e sem veredito; nos demais casos, `toque`.
 * @param {MoodFacts} facts
 * @returns {string | null}
 */
export function situationForTap(facts) {
  if (facts.readOnly) return null
  if (facts.suppressed) return 'dados-velhos'
  return 'toque'
}

/**
 * Humor da linha do Vintem em "Limites do mes" (D-16, UI-SPEC S3): segue a categoria mais
 * critica, que e a primeira de `rows` (o nucleo ja as entrega por urgencia). Estourou e triste
 * acima de 130% do limite ou no tom suave, senao bravo; perto e atento viram atento; abaixo
 * e feliz quando todas as linhas estao abaixo de 40%, senao neutro. Sem linhas, nao ha linha.
 * O veredito sobre dado velho e o perfil do parceiro ficam com quem chama.
 * @param {{ rows: MoodFacts['rows'], tone: MoodFacts['tone'] }} args
 * @returns {{ state: VintemState, situation: 'central', subject: { categoryId: string } } | null}
 */
export function inlineMood({ rows, tone }) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const top = rows[0]
  const band = limitBand(top)
  /** @type {VintemState} */
  let state
  if (band === 'estourou') state = overState(top, tone)
  else if (band === 'perto' || band === 'atento') state = 'atento'
  else state = rows.every((r) => r.pct < 40) ? 'feliz' : 'neutro'
  return { state, situation: 'central', subject: { categoryId: top.categoryId } }
}

/**
 * Duracao de cada reacao a um lancamento, em ms (UI-SPEC, secao Reacoes).
 * `wake` e o despertar ao tocar no Vintem sonolento.
 */
export const REACTION_MS = Object.freeze({ spend: 1400, susto: 1300, bronca: 1700, festa: 2300, wake: 650 })

/**
 * Estado do Vintem durante uma reacao.
 * @param {string} kind
 * @returns {VintemState}
 */
export function reactionState(kind) {
  switch (kind) {
    case 'spend':
    case 'festa':
      return 'feliz'
    case 'susto':
    case 'wake':
      return 'surpreso'
    case 'bronca':
      return 'bravo'
    default:
      return 'neutro'
  }
}

/**
 * Reacao e situacao de um lancamento novo, sem refazer leitura. Gasto segue a
 * ordem de D-06b: estourou, gasto grande, perto, atento, ok. `counted` diz que
 * o gasto ja esta somado na view e nao deve entrar de novo.
 * @param {{
 *   view: { safeCents: number, income: any, spend?: { rows: MoodFacts['rows'] } },
 *   kind: string,
 *   categoryId?: string | null,
 *   cents: number,
 *   bigSpend?: boolean,
 *   counted?: boolean,
 * }} args
 * @returns {{ reaction: 'spend' | 'susto' | 'bronca' | 'festa', situation: string, categoryId: string | null } | null}
 */
export function reactionForLaunch({ view, kind, categoryId = null, cents, bigSpend = false, counted = false }) {
  const cat = categoryId ?? null
  if (kind === 'gasto') {
    const row = (view.spend?.rows ?? []).find((r) => r.categoryId === cat)
    const add = counted || !Number.isFinite(cents) || cents <= 0 ? 0 : cents
    const band = row
      ? limitBand({
          spentCents: row.spentCents + add,
          limitCents: row.limitCents,
          state: row.spentCents + add > row.limitCents ? 'over' : 'ok',
        })
      : 'abaixo'
    if (band === 'estourou') return { reaction: 'bronca', situation: 'limite-estourou', categoryId: cat }
    if (bigSpend) return { reaction: 'susto', situation: 'gasto-grande', categoryId: cat }
    if (band === 'perto') return { reaction: 'susto', situation: 'limite-perto', categoryId: cat }
    if (band === 'atento') return { reaction: 'spend', situation: 'limite-atento', categoryId: cat }
    return { reaction: 'spend', situation: 'lancamento-ok', categoryId: cat }
  }
  if (kind === 'receita') {
    const unexpected = previewLaunch(/** @type {any} */ (view), 'receita', cents).raisesSafe
    return { reaction: unexpected ? 'susto' : 'festa', situation: 'receita', categoryId: null }
  }
  if (kind === 'porquinho-guardou') {
    return { reaction: 'festa', situation: 'porquinho-guardou', categoryId: null }
  }
  if (kind === 'porquinho-retirou') {
    return { reaction: 'susto', situation: 'porquinho-retirou', categoryId: null }
  }
  return null
}

/**
 * Uma situacao de exemplo por estado, para a pagina de teste do Vintem. As
 * chaves sao exatamente VINTEM_STATES.
 */
export const SAMPLE_SITUATION_BY_STATE = Object.freeze(
  /** @type {Record<VintemState, string>} */ ({
    neutro: 'inicio',
    feliz: 'ritmo-folgado',
    triste: 'limite-estourou',
    bravo: 'limite-estourou',
    sonolento: 'sem-lancar',
    surpreso: 'gasto-grande',
    atento: 'limite-perto',
  }),
)

// Guarda de consistencia: a tabela de exemplo cobre os sete estados da tabela de arte.
if (VINTEM_STATES.some((st) => !(st in SAMPLE_SITUATION_BY_STATE))) {
  throw new Error('SAMPLE_SITUATION_BY_STATE precisa cobrir VINTEM_STATES')
}
