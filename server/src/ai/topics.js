// Fala espontanea (D-11, D-12): o ritmo entregue ao app e o teto diario de cada tipo.
// Puro: quem guarda o que ja foi usado no dia e o budget.js (aiUsage), quem escolhe o fato e o
// speech.js e quem decide quando perguntar e o app.

/** Situacoes de fala sem gatilho; o nome e tambem o do contador em aiUsage. */
export const SPONTANEOUS = Object.freeze(['abertura', 'espiar'])

/** Piso da primeira espera e do intervalo entre espiadas: configuracao absurda nunca vira rajada de pedidos (T-07-66). */
export const PEEK_FLOOR_MS = 60_000
/** Teto do intervalo: acima disso o temporizador do navegador estouraria e dispararia na hora. */
export const PEEK_CEILING_MS = 86_400_000

/**
 * Inteiro da configuracao preso na faixa; ausente ou nao numerico vale o padrao.
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function within(value, fallback, min, max) {
  const n = Math.trunc(Number(value ?? Number.NaN))
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : fallback))
}

/**
 * O que o app precisa saber para decidir quando perguntar e quanto esperar (GET /api/vintem/hints),
 * so da configuracao do servidor (D-12). A primeira espera e o minimo tem piso de 60 segundos, o
 * maximo nunca fica abaixo do minimo e o prazo das reacoes fora de 1500 a 4000 volta ao padrao de 2500.
 * @param {{ peekFirstMs?: number, peekMinMs?: number, peekMaxMs?: number, peekPerDay?: number, openPerDay?: number, reactionTimeoutMs?: number }} config
 */
export function hintsOf(config) {
  const peekMinMs = within(config?.peekMinMs, 150_000, PEEK_FLOOR_MS, PEEK_CEILING_MS)
  const reaction = Math.trunc(Number(config?.reactionTimeoutMs))
  return {
    peekFirstMs: within(config?.peekFirstMs, 60_000, PEEK_FLOOR_MS, PEEK_CEILING_MS),
    peekMinMs,
    peekMaxMs: within(config?.peekMaxMs, 210_000, peekMinMs, PEEK_CEILING_MS),
    peekPerDay: dailyCapOf(config, 'espiar'),
    openPerDay: dailyCapOf(config, 'abertura'),
    reactionTimeoutMs: reaction >= 1500 && reaction <= 4000 ? reaction : 2500,
  }
}

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
