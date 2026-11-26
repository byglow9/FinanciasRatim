// @ts-check
// Eventos de push com id estavel (PUSH-02, PUSH-04, D-07). O id de cada evento e
// deterministico e sem barra: e o id do marcador unico que sobrevive a reinicio.
// Um evento so carrega ids, categoria, limiar e chaves de ciclo e de dia, nunca
// texto de aviso nem valor (o texto e do servidor). Sem relogio implicito.

import { alertId, thresholdsToFire } from './alerts.js'
import { dayKeyOf } from './dayKey.js'

/**
 * @typedef {{
 *   kind: 'limite',
 *   id: string,
 *   threshold: 80 | 100,
 *   silent: boolean,
 *   categoryId: string,
 *   cycleKey: string,
 *   person: string,
 *   tag: string,
 *   url: string,
 * }} LimitEvent
 */

/**
 * @typedef {{
 *   kind: 'espontanea',
 *   id: string,
 *   person: string,
 *   tag: string,
 *   url: string,
 * }} SpontaneousEvent
 */

/**
 * Id de documento: nunca carrega barra, mesmo que uma parte venha com ela.
 * @param {string} id
 * @returns {string}
 */
function docId(id) {
  return id.replaceAll('/', '_')
}

/**
 * Eventos de limite do ciclo. `knownAlertIds` sao ids de alerta SEM o prefixo do
 * casal; o 80 vira silencioso quando o gasto saltou direto para o 100.
 * @param {{ hid: string, person: string, cycleKey: string, rows: import('./alerts.js').LimitRow[], knownAlertIds?: Set<string> | string[] }} input
 * @returns {LimitEvent[]}
 */
export function limitEvents({ hid, person, cycleKey, rows, knownAlertIds = [] }) {
  const drafts = thresholdsToFire(Array.isArray(rows) ? rows : [], knownAlertIds, { person, cycleKey })
  return drafts.map((d) => ({
    kind: 'limite',
    id: docId(`${hid}__limite__${alertId(person, cycleKey, d.categoryId, d.threshold)}`),
    threshold: d.threshold,
    silent: d.silent,
    categoryId: d.categoryId,
    cycleKey,
    person,
    tag: `limite-${d.categoryId}-${cycleKey}`,
    url: '/',
  }))
}

/**
 * Dia de Sao Paulo do instante (YYYY-MM-DD), base da contagem diaria do servidor.
 * @param {Date} now
 * @returns {string}
 */
export function eventDayKey(now) {
  return dayKeyOf(now)
}

/**
 * Evento do push espontaneo: um id por pessoa e por dia de Sao Paulo, o que
 * impoe no maximo um por dia (D-12).
 * @param {{ hid: string, person: string, now: Date }} input
 * @returns {SpontaneousEvent}
 */
export function spontaneousEvent({ hid, person, now }) {
  return {
    kind: 'espontanea',
    id: docId(`${hid}__${person}__espontanea__${eventDayKey(now)}`),
    person,
    tag: 'espontanea',
    url: '/',
  }
}

/**
 * Colapsa os eventos retidos de um mesmo envio em um por `tag`: nos de limite
 * fica o de maior limiar, nos de prazo (com `daysLeft`) o mais proximo do
 * vencimento, nos demais o mais recente por id. A ordem de entrada dos que ficam
 * e mantida; o servidor marca os `drop` como colapsados.
 * @template {{ kind: string, id: string, tag: string, threshold?: number, daysLeft?: number }} E
 * @param {E[]} events
 * @returns {{ keep: E[], drop: E[] }}
 */
export function collapseHeld(events) {
  const list = Array.isArray(events) ? events : []
  /** @type {Map<string, E>} */
  const best = new Map()
  /** @param {E} a @param {E} b @returns {boolean} true quando a vence b */
  const beats = (a, b) => {
    if (a.kind === 'limite' && b.kind === 'limite' && a.threshold !== b.threshold) {
      return (a.threshold ?? 0) > (b.threshold ?? 0)
    }
    if (typeof a.daysLeft === 'number' && typeof b.daysLeft === 'number' && a.daysLeft !== b.daysLeft) {
      return a.daysLeft < b.daysLeft
    }
    return a.id > b.id
  }
  for (const e of list) {
    const cur = best.get(e.tag)
    if (!cur || beats(e, cur)) best.set(e.tag, e)
  }
  const winners = new Set(best.values())
  return { keep: list.filter((e) => winners.has(e)), drop: list.filter((e) => !winners.has(e)) }
}
