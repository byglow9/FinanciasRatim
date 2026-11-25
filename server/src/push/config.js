// Parametros do push lidos do ambiente (PUSH_*). Ausente ou invalido vale o padrao: nada aqui
// lanca, para um erro de digitacao numa variavel nunca derrubar o deploy.
import { parseWindow } from '../../../shared/core/pushPrefs.js'

const DEFAULT_MAX_PER_DAY = 8
const DEFAULT_SPONT_PER_DAY = 1
const DEFAULT_TICK_MINUTES = 15
const DEFAULT_BILL_CHECK_MINUTES = 60
const DEFAULT_PRUNE_DAYS = 30

/** Inteiro dentro da faixa; texto vazio, fora da faixa ou quebrado vale o padrao. */
function intIn(raw, min, max, fallback) {
  // Number('') e 0: sem esta guarda uma variavel vazia desligaria o relogio e o espontaneo.
  if (typeof raw !== 'number' && (typeof raw !== 'string' || raw.trim() === '')) return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback
}

/**
 * Teto diario de avisos por pessoa (PUSH_MAX_PER_DAY, padrao 8).
 * @param {Record<string, string | undefined>} [env]
 * @returns {number}
 */
export function readMaxPerDay(env = {}) {
  return intIn(env.PUSH_MAX_PER_DAY, 1, 1000, DEFAULT_MAX_PER_DAY)
}

/**
 * Todos os parametros do push, ja com os padroes.
 * PUSH_SPONT_PER_DAY e 0 ou 1; PUSH_TICK_MINUTES igual a 0 desliga o relogio.
 * @param {Record<string, string | undefined>} [env]
 */
export function readPushConfig(env = {}) {
  return {
    maxPerDay: readMaxPerDay(env),
    spontPerDay: intIn(env.PUSH_SPONT_PER_DAY, 0, 1, DEFAULT_SPONT_PER_DAY),
    spontWindow: parseWindow(env.PUSH_SPONT_WINDOW),
    tickMinutes: intIn(env.PUSH_TICK_MINUTES, 0, 1440, DEFAULT_TICK_MINUTES),
    billCheckMinutes: intIn(env.PUSH_BILL_CHECK_MINUTES, 1, 1440, DEFAULT_BILL_CHECK_MINUTES),
    pruneDays: intIn(env.PUSH_PRUNE_DAYS, 1, 3650, DEFAULT_PRUNE_DAYS),
  }
}
