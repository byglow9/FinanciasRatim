// @ts-check
// Preferencias de push e decisao de entrega (PUSH-03, D-06, D-21). Funcoes puras:
// o "agora" entra como argumento, o fuso e sempre America/Sao_Paulo (o host do
// servidor roda em UTC) e nada aqui toca Firestore nem rede.

import { DEFAULT_TZ, zonedParts } from './time.js'

/**
 * @typedef {{
 *   types: { limite80: boolean, limite100: boolean, espontanea: boolean, conta: boolean, compromisso: boolean },
 *   quiet: { enabled: boolean, from: string, to: string },
 * }} PushPrefs
 */

/** Padroes de partida (D-06, D-21): sem silencio e os tipos ligados. */
export const DEFAULT_PUSH_PREFS = Object.freeze({
  types: Object.freeze({ limite80: true, limite100: true, espontanea: true, conta: true, compromisso: true }),
  quiet: Object.freeze({ enabled: false, from: '22:00', to: '08:00' }),
})

/** Tipos que moram no objeto de preferencias (a fatura vem do interruptor legado). */
const TYPE_KEYS = /** @type {const} */ (['limite80', 'limite100', 'espontanea', 'conta', 'compromisso'])
const QUIET_KEYS = /** @type {const} */ (['enabled', 'from', 'to'])
const TOP_KEYS = /** @type {const} */ (['types', 'quiet'])

/** Janela padrao do push espontaneo do servidor (hora de Sao Paulo), sem madrugada (D-20). */
export const DEFAULT_SPONTANEOUS_WINDOW = Object.freeze({ from: '09:00', to: '21:00' })

/** Mensagens fixas da validacao (nunca ecoam a entrada). */
export const PUSH_PREFS_ERRORS = Object.freeze({
  shape: 'Preferências de aviso inválidas.',
  key: 'Preferências de aviso com campo desconhecido.',
  type: 'Preferências de aviso com valor de tipo errado.',
  hour: 'Horário de silêncio inválido.',
  same: 'O início e o fim do silêncio não podem ser iguais.',
})

/**
 * Minutos desde a meia-noite de um texto HH:MM valido, ou null.
 * @param {unknown} text
 * @returns {number | null}
 */
function minutesOf(text) {
  if (typeof text !== 'string') return null
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Janela de minutos contem o minuto do dia? Inicio inclusive, fim exclusive;
 * janela com inicio maior que o fim cruza a meia-noite.
 * @param {number} from
 * @param {number} to
 * @param {number} minute
 * @returns {boolean}
 */
function windowHas(from, to, minute) {
  if (from === to) return false
  return from < to ? minute >= from && minute < to : minute >= from || minute < to
}

/**
 * @param {Date} instant
 * @param {string} tz
 * @returns {number}
 */
function minuteOfDay(instant, tz) {
  const p = zonedParts(instant, tz)
  return p.hour * 60 + p.minute
}

/**
 * Preferencias sempre validas: chave desconhecida cai fora, valor ruim volta ao
 * padrao e janela de inicio igual ao fim volta ao padrao com o silencio
 * desligado. Nunca lanca.
 * @param {unknown} raw
 * @returns {PushPrefs}
 */
export function normalizePushPrefs(raw) {
  const d = DEFAULT_PUSH_PREFS
  const src = isPlainObject(raw) ? raw : {}
  const types = isPlainObject(src.types) ? src.types : {}
  const quiet = isPlainObject(src.quiet) ? src.quiet : {}
  const bool = (/** @type {unknown} */ v, /** @type {boolean} */ fallback) => (v === true || v === false ? v : fallback)
  const hour = (/** @type {unknown} */ v, /** @type {string} */ fallback) => (minutesOf(v) === null ? fallback : /** @type {string} */ (v))
  let enabled = bool(quiet.enabled, d.quiet.enabled)
  let from = hour(quiet.from, d.quiet.from)
  let to = hour(quiet.to, d.quiet.to)
  if (from === to) {
    from = d.quiet.from
    to = d.quiet.to
    enabled = false
  }
  return {
    types: {
      limite80: bool(types.limite80, d.types.limite80),
      limite100: bool(types.limite100, d.types.limite100),
      espontanea: bool(types.espontanea, d.types.espontanea),
      conta: bool(types.conta, d.types.conta),
      compromisso: bool(types.compromisso, d.types.compromisso),
    },
    quiet: { enabled, from, to },
  }
}

/**
 * Validacao de esquema fechado para a rota PUT: chave extra, tipo errado, hora
 * invalida e inicio igual ao fim sao recusados. Campo ausente assume o padrao.
 * A fatura nao faz parte do objeto (vem do interruptor legado, D-21).
 * @param {unknown} raw
 * @returns {{ ok: true, prefs: PushPrefs } | { ok: false, error: string }}
 */
export function validatePushPrefs(raw) {
  const fail = (/** @type {string} */ error) => ({ ok: /** @type {const} */ (false), error })
  if (!isPlainObject(raw)) return fail(PUSH_PREFS_ERRORS.shape)
  if (Object.keys(raw).some((k) => !TOP_KEYS.includes(/** @type {any} */ (k)))) return fail(PUSH_PREFS_ERRORS.key)
  if ((raw.types !== undefined && !isPlainObject(raw.types)) || (raw.quiet !== undefined && !isPlainObject(raw.quiet))) {
    return fail(PUSH_PREFS_ERRORS.shape)
  }
  const types = /** @type {Record<string, unknown>} */ (raw.types ?? {})
  const quiet = /** @type {Record<string, unknown>} */ (raw.quiet ?? {})
  if (Object.keys(types).some((k) => !TYPE_KEYS.includes(/** @type {any} */ (k)))) return fail(PUSH_PREFS_ERRORS.key)
  if (Object.keys(quiet).some((k) => !QUIET_KEYS.includes(/** @type {any} */ (k)))) return fail(PUSH_PREFS_ERRORS.key)
  for (const k of TYPE_KEYS) {
    if (types[k] !== undefined && typeof types[k] !== 'boolean') return fail(PUSH_PREFS_ERRORS.type)
  }
  if (quiet.enabled !== undefined && typeof quiet.enabled !== 'boolean') return fail(PUSH_PREFS_ERRORS.type)
  for (const k of /** @type {const} */ (['from', 'to'])) {
    if (quiet[k] === undefined) continue
    if (typeof quiet[k] !== 'string') return fail(PUSH_PREFS_ERRORS.type)
    if (minutesOf(quiet[k]) === null) return fail(PUSH_PREFS_ERRORS.hour)
  }
  const prefs = normalizePushPrefs(raw)
  const sentFrom = quiet.from ?? DEFAULT_PUSH_PREFS.quiet.from
  const sentTo = quiet.to ?? DEFAULT_PUSH_PREFS.quiet.to
  if (sentFrom === sentTo) return fail(PUSH_PREFS_ERRORS.same)
  return { ok: true, prefs }
}

/**
 * O silencio vale no instante? Janela que cruza a meia-noite funciona; o inicio
 * e inclusive e o fim e exclusive. Sem silencio ligado e sempre falso.
 * @param {PushPrefs} prefs
 * @param {Date} instant
 * @param {string} [tz]
 * @returns {boolean}
 */
export function isQuiet(prefs, instant, tz = DEFAULT_TZ) {
  const quiet = prefs?.quiet
  if (!quiet || quiet.enabled !== true || !(instant instanceof Date)) return false
  const from = minutesOf(quiet.from)
  const to = minutesOf(quiet.to)
  if (from === null || to === null) return false
  return windowHas(from, to, minuteOfDay(instant, tz))
}

/**
 * O tipo de preferencia que um evento consulta: limite vira limite80 ou
 * limite100 conforme o limiar.
 * @param {{ kind: string, threshold?: number }} event
 * @returns {string}
 */
export function prefKindOf(event) {
  if (event?.kind === 'limite') return `limite${event.threshold}`
  return String(event?.kind)
}

/**
 * O tipo esta ligado? limite80, limite100, espontanea, conta e compromisso vem das
 * preferencias; a fatura vem do interruptor legado (padrao ligado quando nao informado).
 * @param {PushPrefs} prefs
 * @param {string} kind
 * @param {{ faturaEnabled?: boolean }} [opts]
 * @returns {boolean}
 */
export function typeEnabled(prefs, kind, { faturaEnabled } = {}) {
  if (kind === 'fatura') return faturaEnabled !== false
  if (!TYPE_KEYS.includes(/** @type {any} */ (kind))) return false
  return prefs?.types?.[/** @type {keyof PushPrefs['types']} */ (kind)] === true
}

/**
 * Janela do push espontaneo a partir de texto como '09:00-21:00'. Texto
 * invalido (ou inicio igual ao fim) devolve a janela padrao.
 * @param {unknown} text
 * @returns {{ from: string, to: string }}
 */
export function parseWindow(text) {
  const m = typeof text === 'string' ? /^\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*$/.exec(text) : null
  if (!m || minutesOf(m[1]) === null || minutesOf(m[2]) === null || m[1] === m[2]) {
    return { from: DEFAULT_SPONTANEOUS_WINDOW.from, to: DEFAULT_SPONTANEOUS_WINDOW.to }
  }
  return { from: m[1], to: m[2] }
}

/**
 * O instante cai dentro da janela (hora de Sao Paulo, fim exclusive)?
 * @param {Date} instant
 * @param {{ from: string, to: string }} window
 * @param {string} [tz]
 * @returns {boolean}
 */
export function inWindow(instant, window, tz = DEFAULT_TZ) {
  if (!(instant instanceof Date)) return false
  const w = parseWindow(`${window?.from}-${window?.to}`)
  return windowHas(/** @type {number} */ (minutesOf(w.from)), /** @type {number} */ (minutesOf(w.to)), minuteOfDay(instant, tz))
}

/**
 * Decisao de entrega: tipo desligado, espontaneo (pula no silencio) ou limite,
 * fatura, conta e compromisso (retidos no silencio, chegam quando ele acaba, D-21). Para limite pode
 * vir `kind: 'limite'` com `threshold`, ou direto limite80 e limite100.
 * @param {{ prefs: PushPrefs, kind: string, threshold?: number, faturaEnabled?: boolean, now: Date, tz?: string }} input
 * @returns {'enviar' | 'reter' | 'pular' | 'desligado'}
 */
export function deliveryDecision({ prefs, kind, threshold, faturaEnabled, now, tz = DEFAULT_TZ }) {
  const prefKind = prefKindOf({ kind, threshold })
  if (!typeEnabled(prefs, prefKind, { faturaEnabled })) return 'desligado'
  if (!isQuiet(prefs, now, tz)) return 'enviar'
  return prefKind === 'espontanea' ? 'pular' : 'reter'
}
