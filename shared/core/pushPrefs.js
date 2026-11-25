// @ts-check
// Preferencias de push e decisao de entrega (PUSH-03, D-06, D-21). Funcoes puras:
// o "agora" entra como argumento, o fuso e sempre America/Sao_Paulo (o host do
// servidor roda em UTC) e nada aqui toca Firestore nem rede.

import { DEFAULT_TZ, zonedParts } from './time.js'

/**
 * @typedef {{
 *   types: { limite80: boolean, limite100: boolean, espontanea: boolean },
 *   quiet: { enabled: boolean, from: string, to: string },
 * }} PushPrefs
 */

/** Padroes de partida (D-06, D-21): sem silencio e os tipos ligados. */
export const DEFAULT_PUSH_PREFS = Object.freeze({
  types: Object.freeze({ limite80: true, limite100: true, espontanea: true }),
  quiet: Object.freeze({ enabled: false, from: '22:00', to: '08:00' }),
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
 * O silencio vale no instante? Janela que cruza a meia-noite funciona; o inicio
 * e inclusive e o fim e exclusive.
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
  if (from === null || to === null || from === to) return false
  const p = zonedParts(instant, tz)
  const now = p.hour * 60 + p.minute
  return from < to ? now >= from && now < to : now >= from || now < to
}

/**
 * Decisao de entrega: enviar agora, reter ate o silencio acabar (limite e
 * fatura, D-21), pular (espontaneo no silencio) ou tipo desligado.
 * @param {{ prefs: PushPrefs, kind: string, faturaEnabled?: boolean, now: Date, tz?: string }} input
 * @returns {'enviar' | 'reter' | 'pular' | 'desligado'}
 */
export function deliveryDecision({ prefs, kind, faturaEnabled, now, tz = DEFAULT_TZ }) {
  const types = prefs?.types
  const on = kind === 'fatura' ? faturaEnabled !== false : types?.[/** @type {keyof PushPrefs['types']} */ (kind)] === true
  if (!on) return 'desligado'
  if (!isQuiet(prefs, now, tz)) return 'enviar'
  return kind === 'espontanea' ? 'pular' : 'reter'
}
