// @ts-check
// Eventos de push com id estavel (PUSH-02, PUSH-04, D-07). O id de cada evento e
// deterministico e sem barra: e o id do marcador unico que sobrevive a reinicio.
// Um evento so carrega ids, categoria, limiar e chaves de ciclo e de dia, nunca
// texto de aviso nem valor (o texto e do servidor). Sem relogio implicito.

import { alertId, thresholdsToFire } from './alerts.js'

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
 * Eventos de limite do ciclo. `knownAlertIds` sao ids de alerta SEM o prefixo do
 * casal; o 80 vira silencioso quando o gasto saltou direto para o 100.
 * @param {{ hid: string, person: string, cycleKey: string, rows: import('./alerts.js').LimitRow[], knownAlertIds?: Set<string> | string[] }} input
 * @returns {LimitEvent[]}
 */
export function limitEvents({ hid, person, cycleKey, rows, knownAlertIds = [] }) {
  const drafts = thresholdsToFire(Array.isArray(rows) ? rows : [], knownAlertIds, { person, cycleKey })
  return drafts.map((d) => ({
    kind: 'limite',
    id: `${hid}__limite__${alertId(person, cycleKey, d.categoryId, d.threshold)}`,
    threshold: d.threshold,
    silent: d.silent,
    categoryId: d.categoryId,
    cycleKey,
    person,
    tag: `limite-${d.categoryId}-${cycleKey}`,
    url: '/',
  }))
}
