import { rankTopics } from '../../../shared/core/aiSummary.js'

// Fala espontanea (D-11, D-12): o assunto do dia sem repeticao e o teto diario de cada tipo.
// Puro: quem guarda o que ja foi usado no dia e o budget.js (aiUsage), e quem decide quando
// perguntar e o app. Os assuntos candidatos sao os do resumo (limites e ritmo, padroes e
// comparacoes, entradas, metas e Porquinho, mais contas fixas, fatura e a semana).

/** Situacoes de fala sem gatilho; o nome e tambem o do contador em aiUsage. */
export const SPONTANEOUS = Object.freeze(['abertura', 'espiar'])

/**
 * Teto diario do tipo, so da configuracao do servidor (AI_OPEN_PER_DAY e AI_PEEK_PER_DAY).
 * Tipo desconhecido ou valor invalido vale zero (fechado).
 * @param {{ openPerDay?: number, peekPerDay?: number }} config
 * @param {string} kind
 * @returns {number}
 */
export function dailyCapOf(config, kind) {
  const raw = kind === 'abertura' ? config?.openPerDay : kind === 'espiar' ? config?.peekPerDay : 0
  const cap = Math.trunc(Number(raw))
  return Number.isFinite(cap) && cap > 0 ? cap : 0
}

/**
 * Assunto mais relevante do resumo que ainda nao foi usado no dia, ou null (nada novo a dizer).
 * @param {{ summary: any, used?: ReadonlyArray<string> }} args
 * @returns {string | null}
 */
export function pickTopic({ summary, used = [] }) {
  const done = new Set(Array.isArray(used) ? used : [])
  return rankTopics(summary).find((topic) => !done.has(topic)) ?? null
}
