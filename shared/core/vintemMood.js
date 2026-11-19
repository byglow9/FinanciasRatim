// @ts-check
// Cerebro de humor do Vintem: dado o que a Home ja sabe (linhas de limite, ritmo,
// dado velho, insights), devolve estado e situacao da fala. Sem relogio, sem
// pacote: o instante entra como `nowMs` e o dia como `todayKey`.
//
// Faixas do limite (D-06b), sempre em inteiros, sem divisao nem ponto flutuante:
//   abaixo de 75% = abaixo; de 75% ate menos de 80% = atento; de 80% a 100% = perto
//   (gasto igual ao limite ainda e perto); estourou so quando gasto > limite, que
//   e `row.state === 'over'` (mesma regra dos alertas), nunca `pct >= 100`.

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

/**
 * Humor de fundo e situacao da fala.
 * @param {MoodFacts} facts
 * @param {{ kind: string, state: VintemState, untilMs: number } | null | undefined} reaction
 * @param {number} nowMs
 * @returns {MoodResult}
 */
export function deriveVintemState(facts, reaction, nowMs) {
  void reaction
  void nowMs
  // Portao neutro (D-08): nunca elogio nem bronca sobre dado velho ou ausente.
  if (facts.loading || facts.readOnly || facts.isPast || facts.noIncome || facts.suppressed) {
    return { ...NEUTRAL }
  }
  const rows = facts.rows ?? []
  const over = worstRow(rows, 'estourou')
  if (over) {
    return {
      state: overState(over, facts.tone),
      situation: 'limite-estourou',
      subject: { categoryId: over.categoryId },
    }
  }
  const near = worstRow(rows, 'perto')
  if (near) {
    return { state: 'atento', situation: 'limite-perto', subject: { categoryId: near.categoryId } }
  }
  const watch = worstRow(rows, 'atento')
  if (watch) {
    return { state: 'atento', situation: 'limite-atento', subject: { categoryId: watch.categoryId } }
  }
  return { state: 'neutro', situation: 'inicio', subject: null }
}
