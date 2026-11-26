// @ts-check
// Eventos de push com id estavel (PUSH-02, PUSH-04, D-07). O id de cada evento e
// deterministico e sem barra: e o id do marcador unico que sobrevive a reinicio.
// Um evento so carrega ids, categoria, limiar e chaves de ciclo e de dia, nunca
// texto de aviso nem valor (o texto e do servidor). Sem relogio implicito.

import { alertId, thresholdsToFire } from './alerts.js'
import { dayKeyOf } from './dayKey.js'
import { inWindow, parseWindow } from './pushPrefs.js'
import { zonedParts } from './time.js'
import { hashSeed } from './vintemPhrasesPush.js'
import { mulberry32 } from './vintemSpring.js'

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
 * Evento do aviso aleatorio: um id e uma tag por vaga do dia de Sao Paulo, o que impoe no maximo um
 * por vaga (D-20). A tag por vaga impede que um aviso apague o outro no aparelho.
 * @param {{ hid: string, person: string, now: Date, slot: number }} input `slot` comeca em 1
 * @returns {SpontaneousEvent}
 */
export function spontaneousEvent({ hid, person, now, slot }) {
  return {
    kind: 'espontanea',
    id: docId(`${hid}__${person}__espontanea__${eventDayKey(now)}__${slot}`),
    person,
    tag: `espontanea-${slot}`,
    url: '/',
  }
}

const DAY_MINUTES = 24 * 60

/** @param {string} hhmm */
const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/**
 * Vaga do aviso aleatorio no instante. A janela e dividida em `total` faixas e cada faixa tem um
 * minuto sorteado pelo id do evento (muda por pessoa, por dia e por vaga), deixando um intervalo do
 * relogio livre antes do fim da faixa, para sempre haver uma rodada depois dele. So a faixa atual
 * conta: vaga perdida e perdida, um reinicio nunca solta as anteriores. `due` diz se o minuto
 * sorteado ja passou. Fora da janela ou com total zero devolve null.
 * @param {{ now: Date, window: { from: string, to: string }, total: number, tickMinutes: number,
 *   hid: string, person: string }} input
 * @returns {{ slot: number, due: boolean } | null}
 */
export function spontaneousSlot({ now, window, total, tickMinutes, hid, person }) {
  if (!Number.isInteger(total) || total < 1 || !inWindow(now, window)) return null
  const { from, to } = parseWindow(`${window?.from}-${window?.to}`)
  const length = (minutesOf(to) - minutesOf(from) + DAY_MINUTES) % DAY_MINUTES
  const { hour, minute } = zonedParts(now)
  const elapsed = (hour * 60 + minute - minutesOf(from) + DAY_MINUTES) % DAY_MINUTES

  /** @param {number} i */
  const startOf = (i) => Math.floor((i * length) / total)
  const index = Math.floor(((elapsed + 1) * total - 1) / length)
  const start = startOf(index)
  const span = Math.max(1, startOf(index + 1) - start - tickMinutes)
  const { id } = spontaneousEvent({ hid, person, now, slot: index + 1 })
  // mulberry32 sobre o hash: ids que so mudam no ultimo caractere nao ficam com horarios parecidos.
  const target = start + Math.floor(mulberry32(hashSeed(id))() * span)
  return { slot: index + 1, due: elapsed >= target }
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
