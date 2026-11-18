// @ts-check
// Limites por categoria com historico por ciclo (LIM-01, D-10, PR-09), estado do
// limite (LIM-02) e helpers imutaveis da configuracao por pessoa (LIM-06,
// LIM-10, PR-10). Tudo em centavos inteiros e sem relogio. Passar do limite
// nunca bloqueia nada (D-09): so se informa estado e excesso.

/** Teto de limite em centavos (8 digitos, o mesmo do teclado numerico). */
export const LIMIT_MAX_CENTS = 99_999_999
/** Teto de renda em centavos (8 digitos). */
export const INCOME_MAX_CENTS = 99_999_999

/**
 * Entrada do historico: vale a partir do ciclo `from` (YYYY-MM); `cents` null
 * significa sem limite daquele ciclo em diante.
 * @typedef {{ from: string, cents: number | null }} LimitEntry
 */

/**
 * Configuracao por pessoa guardada em settings.
 * @typedef {{
 *   salaryDay: number,
 *   expectedIncomeCents: number,
 *   incomeOverrides: Record<string, number>,
 *   limits: Record<string, LimitEntry[]>,
 * }} PersonConfig
 */

/**
 * Estado de um limite: ok (abaixo de 80%), warn (80% ate 100% inclusive) e
 * over (acima de 100%). `pct` e inteiro (arredonda para baixo) e satura em 100.
 * @typedef {{
 *   state: 'ok' | 'warn' | 'over',
 *   pct: number,
 *   remainingCents: number,
 *   excessCents: number,
 * }} LimitStateInfo
 */

const CYCLE_KEY = /^\d{4}-(0[1-9]|1[0-2])$/
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * @param {unknown} v
 * @returns {v is string}
 */
function isCycleKey(v) {
  return typeof v === 'string' && CYCLE_KEY.test(v)
}

/**
 * @param {unknown} v
 * @returns {v is number}
 */
function isInt(v) {
  return typeof v === 'number' && Number.isInteger(v)
}

/**
 * @param {unknown} v
 * @returns {v is number}
 */
function isLimitCents(v) {
  return isInt(v) && v > 0 && v <= LIMIT_MAX_CENTS
}

/**
 * @param {unknown} v
 * @returns {v is number}
 */
function isIncomeCents(v) {
  return isInt(v) && v >= 0 && v <= INCOME_MAX_CENTS
}

/**
 * Limite vigente num ciclo: o da entrada de maior `from` menor ou igual ao
 * ciclo. Ciclos passados mantem o limite da epoca.
 * @param {LimitEntry[] | undefined | null} history
 * @param {string} cycleKey YYYY-MM
 * @returns {number | null}
 */
export function limitForCycle(history, cycleKey) {
  if (!Array.isArray(history)) return null
  /** @type {LimitEntry | null} */
  let best = null
  for (const entry of history) {
    if (entry.from <= cycleKey && (best === null || entry.from > best.from)) best = entry
  }
  return best === null ? null : best.cents
}

/**
 * Grava o limite a partir de um ciclo. Editar duas vezes no mesmo ciclo
 * substitui a entrada (o historico nao cresce). Imutavel.
 * @param {LimitEntry[] | undefined | null} history
 * @param {string} cycleKey YYYY-MM
 * @param {number | null} cents centavos inteiros positivos, ou null para sem limite
 * @returns {LimitEntry[]}
 */
export function setLimit(history, cycleKey, cents) {
  if (!isCycleKey(cycleKey)) throw new Error('Ciclo invalido')
  if (cents !== null && !isLimitCents(cents)) throw new Error('Limite invalido')
  const rest = (Array.isArray(history) ? history : []).filter((e) => e.from !== cycleKey)
  return [...rest, { from: cycleKey, cents }].sort((a, b) => (a.from < b.from ? -1 : 1))
}

/**
 * Limites vigentes de todas as categorias num ciclo (so os nao nulos).
 * @param {Record<string, LimitEntry[]> | undefined | null} limits
 * @param {string} cycleKey YYYY-MM
 * @returns {Record<string, number>}
 */
export function limitsForCycle(limits, cycleKey) {
  /** @type {Record<string, number>} */
  const out = {}
  if (!limits || typeof limits !== 'object') return out
  for (const [categoryId, history] of Object.entries(limits)) {
    const cents = limitForCycle(history, cycleKey)
    if (cents !== null) out[categoryId] = cents
  }
  return out
}

/**
 * Estado do limite so com inteiros: warn a partir de 80% (gasto * 100 >= limite * 80),
 * over acima de 100%. Sem limite valido devolve null. Nunca bloqueia (D-09).
 * @param {number} spentCents gasto no ciclo em centavos
 * @param {number | null | undefined} limitCents limite em centavos
 * @returns {LimitStateInfo | null}
 */
export function limitState(spentCents, limitCents) {
  if (typeof limitCents !== 'number' || !Number.isInteger(limitCents) || limitCents <= 0) return null
  if (typeof spentCents !== 'number' || !Number.isInteger(spentCents)) return null
  const spent = Math.max(spentCents, 0)
  const pct = Math.min(Math.floor((spent * 100) / limitCents), 100)
  /** @type {'ok' | 'warn' | 'over'} */
  let state = 'ok'
  if (spent > limitCents) state = 'over'
  else if (spent * 100 >= limitCents * 80) state = 'warn'
  return {
    state,
    pct,
    remainingCents: Math.max(limitCents - spent, 0),
    excessCents: Math.max(spent - limitCents, 0),
  }
}

/**
 * Historico saneado de uma categoria: so entradas validas, uma por `from`
 * (a ultima vence) e ordenadas.
 * @param {unknown} raw
 * @returns {LimitEntry[]}
 */
function cleanHistory(raw) {
  if (!Array.isArray(raw)) return []
  /** @type {Map<string, LimitEntry>} */
  const byFrom = new Map()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { from, cents } = /** @type {Record<string, unknown>} */ (item)
    if (!isCycleKey(from)) continue
    if (cents === null) byFrom.set(from, { from, cents: null })
    else if (isLimitCents(cents)) byFrom.set(from, { from, cents })
  }
  return [...byFrom.values()].sort((a, b) => (a.from < b.from ? -1 : 1))
}

/**
 * Configuracao por pessoa com defaults seguros para dado ausente ou ruim do
 * Firestore. Devolve copia profunda e nunca muta a entrada.
 * @param {unknown} raw
 * @returns {PersonConfig}
 */
export function normalizePersonConfig(raw) {
  const src = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
  const salaryDay =
    isInt(src.salaryDay) && src.salaryDay >= 1 && src.salaryDay <= 31 ? src.salaryDay : 1
  const expectedIncomeCents = isIncomeCents(src.expectedIncomeCents) ? src.expectedIncomeCents : 0

  /** @type {Record<string, number>} */
  const incomeOverrides = {}
  const rawOverrides = src.incomeOverrides
  if (rawOverrides && typeof rawOverrides === 'object' && !Array.isArray(rawOverrides)) {
    for (const [key, value] of Object.entries(rawOverrides)) {
      if (UNSAFE_KEYS.has(key)) continue
      if (isCycleKey(key) && isIncomeCents(value)) incomeOverrides[key] = value
    }
  }

  /** @type {Record<string, LimitEntry[]>} */
  const limits = {}
  const rawLimits = src.limits
  if (rawLimits && typeof rawLimits === 'object' && !Array.isArray(rawLimits)) {
    for (const [categoryId, history] of Object.entries(rawLimits)) {
      if (UNSAFE_KEYS.has(categoryId)) continue
      const clean = cleanHistory(history)
      if (clean.length > 0) limits[categoryId] = clean
    }
  }
  return { salaryDay, expectedIncomeCents, incomeOverrides, limits }
}

/**
 * Novo dia do salario (1 a 31). Imutavel.
 * @param {unknown} config
 * @param {number} day
 * @returns {PersonConfig}
 */
export function setSalaryDay(config, day) {
  if (!isInt(day) || day < 1 || day > 31) throw new Error('Dia do salario invalido')
  return { ...normalizePersonConfig(config), salaryDay: day }
}

/**
 * Renda esperada: base (cycleKey null) ou sobreposicao de um ciclo. Imutavel.
 * @param {unknown} config
 * @param {number} cents centavos inteiros de 0 ate INCOME_MAX_CENTS
 * @param {string | null} [cycleKey] YYYY-MM da sobreposicao; null ou ausente altera a base
 * @returns {PersonConfig}
 */
export function setExpectedIncome(config, cents, cycleKey = null) {
  if (!isIncomeCents(cents)) throw new Error('Renda invalida')
  const base = normalizePersonConfig(config)
  if (cycleKey === null || cycleKey === undefined) return { ...base, expectedIncomeCents: cents }
  if (!isCycleKey(cycleKey)) throw new Error('Ciclo invalido')
  return { ...base, incomeOverrides: { ...base.incomeOverrides, [cycleKey]: cents } }
}

/**
 * Limite de uma categoria a partir de um ciclo. Imutavel.
 * @param {unknown} config
 * @param {string} categoryId
 * @param {string} cycleKey YYYY-MM
 * @param {number | null} cents centavos positivos, ou null para sem limite
 * @returns {PersonConfig}
 */
export function setCategoryLimit(config, categoryId, cycleKey, cents) {
  if (typeof categoryId !== 'string' || categoryId === '' || UNSAFE_KEYS.has(categoryId)) {
    throw new Error('Categoria invalida')
  }
  const base = normalizePersonConfig(config)
  const history = setLimit(base.limits[categoryId], cycleKey, cents)
  return { ...base, limits: { ...base.limits, [categoryId]: history } }
}
