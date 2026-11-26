// @ts-check
// Estagios dos avisos fixos (07.1, D-21, D-24, D-25): conta fixa, fatura de cartao e compromisso avisam
// 2 e 1 dia antes; conta e fatura nao pagas avisam tambem no dia. Cada estagio tem id proprio e
// deterministico, sem texto e sem valor: o id e o do marcador unico que sobrevive a reinicio.
//
// `dueStages` devolve o que o servidor precisa para MONTAR O TEXTO na hora do envio (nome, valor e hora);
// `dueEvent` nunca copia esses tres campos para o evento (o marcador so guarda referencias).
// No nucleo, conta fixa e sempre `bill` ou `conta`. Sem relogio implicito: o "agora" entra por argumento.

import { cardBillAlerts } from './cardCalendar.js'
import { daysBetweenParts, nextOccurrence } from './cycle.js'
import { DEFAULT_TZ, zonedParts } from './time.js'

/** Estagios (dias antes do vencimento) de cada tipo. */
const STAGES = Object.freeze({
  conta: Object.freeze([2, 1, 0]),
  fatura: Object.freeze([2, 1, 0]),
  compromisso: Object.freeze([2, 1]),
})

/** Rota aberta ao tocar no aviso, por tipo. */
const URLS = Object.freeze({
  conta: '/contas-fixas',
  fatura: '/cartoes',
  compromisso: '/calendario',
})

/** Tamanho maximo da tag (limite do navegador para tag de notificacao que o app aceita). */
const TAG_MAX = 64

/**
 * @typedef {{
 *   kind: 'conta' | 'compromisso' | 'fatura',
 *   refId: string,
 *   dueKey: string,
 *   daysLeft: number,
 *   nome: string,
 *   amountCents: number | null,
 *   hora: string | null,
 * }} DueStage
 */

/**
 * @typedef {{
 *   kind: 'conta' | 'compromisso' | 'fatura',
 *   id: string,
 *   tag: string,
 *   url: string,
 *   refId: string,
 *   dueKey: string,
 *   daysLeft: number,
 *   person: string,
 * }} DueEvent
 */

/** @param {unknown} v @returns {any[]} */
const list = (v) => (Array.isArray(v) ? v : [])

/** @param {unknown} d @returns {d is Date} */
const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime())

/**
 * O item e da outra pessoa? So conta quando os dois lados sao "ele" ou "ela"; 'conjunto' (ou sem pessoa,
 * quando o servidor ja filtrou) vale para quem pedir.
 * @param {unknown} item
 * @param {unknown} person
 * @returns {boolean}
 */
function isOtherPerson(item, person) {
  const p = item && typeof item === 'object' ? /** @type {any} */ (item).person : undefined
  return (p === 'ele' || p === 'ela') && (person === 'ele' || person === 'ela') && p !== person
}

/**
 * @param {{ year: number, month: number, day: number }} p
 * @returns {string} YYYY-MM-DD
 */
function partsKey(p) {
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/**
 * Hash curto so com letras (o id nunca forma sequencia de digitos nem carrega o titulo).
 * @param {string} text
 * @returns {string}
 */
function letterHash(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  let out = ''
  for (const ch of h.toString(16).padStart(8, '0')) out += String.fromCharCode(97 + parseInt(ch, 16))
  return out
}

/**
 * Conta fixa paga na ocorrencia: ha pagamento da mesma conta, no mesmo mes e ano do vencimento.
 * @param {unknown[]} payments
 * @param {string} billId
 * @param {{ year: number, month: number }} due
 * @returns {boolean}
 */
function isPaid(payments, billId, due) {
  return payments.some(
    (p) => p && typeof p === 'object' && /** @type {any} */ (p).billId === billId &&
      /** @type {any} */ (p).month === due.month && /** @type {any} */ (p).year === due.year,
  )
}

/**
 * Estagios que existem AGORA (hoje e o dia de cada estagio, em Sao Paulo):
 *   conta       ativa da pessoa ou do casal, nao paga, vence em 2, 1 ou 0 dias (vencida nao avisa);
 *   fatura      saldo nao pago de fatura fechada, vence em 2, 1 ou 0 dias (atrasada nao avisa);
 *   compromisso do dia do evento (Sao Paulo) a 2 ou 1 dia; o da outra pessoa nao avisa.
 * A lista sai ordenada (menos dias primeiro, depois tipo e referencia), igual em qualquer fuso do host.
 * @param {{
 *   now: Date,
 *   person: string,
 *   bills?: unknown[],
 *   payments?: unknown[],
 *   events?: unknown[],
 *   cards?: import('./cardCalendar.js').CalendarCard[],
 *   tz?: string,
 * }} input
 * @returns {DueStage[]}
 */
export function dueStages({ now, person, bills, payments, events, cards, tz = DEFAULT_TZ }) {
  if (!isValidDate(now)) return []
  const t = zonedParts(now, tz)
  const today = { year: t.year, month: t.month, day: t.day }
  const paid = list(payments)
  /** @type {DueStage[]} */
  const out = []

  for (const b of list(bills)) {
    if (!b || typeof b !== 'object' || typeof b.id !== 'string' || b.id === '') continue
    if (b.isActive === false || b.active === false || isOtherPerson(b, person)) continue
    if (!Number.isInteger(b.dueDay) || b.dueDay < 1 || b.dueDay > 31) continue
    const due = nextOccurrence(b.dueDay, now, tz)
    const daysLeft = daysBetweenParts(today, due)
    if (!STAGES.conta.includes(daysLeft) || isPaid(paid, b.id, due)) continue
    out.push({
      kind: 'conta',
      refId: b.id,
      dueKey: partsKey(due),
      daysLeft,
      nome: typeof b.name === 'string' ? b.name : '',
      amountCents: Number.isFinite(b.amountCents) ? Math.round(b.amountCents) : null,
      hora: null,
    })
  }

  for (const card of list(cards)) {
    if (!card || typeof card !== 'object' || isOtherPerson(card, person)) continue
    for (const a of cardBillAlerts({ cards: [card], now, daysBefore: 2, enabled: true, tz })) {
      if (a.overdue || !STAGES.fatura.includes(a.daysUntil)) continue
      out.push({
        kind: 'fatura',
        refId: a.cardId,
        dueKey: partsKey(a.dueParts),
        daysLeft: a.daysUntil,
        nome: a.name,
        amountCents: a.amountCents,
        hora: null,
      })
    }
  }

  for (const e of list(events)) {
    if (!e || typeof e !== 'object' || !isValidDate(e.date) || isOtherPerson(e, person)) continue
    const day = zonedParts(e.date, tz)
    const daysLeft = daysBetweenParts(today, day)
    if (!STAGES.compromisso.includes(daysLeft)) continue
    const title = typeof e.title === 'string' ? e.title : ''
    const dueKey = partsKey(day)
    const time = typeof e.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time) ? e.time : null
    // sem id no evento, a referencia e um hash so de letras do titulo, do dia e da hora
    const refId = typeof e.id === 'string' && e.id !== '' ? e.id : letterHash(`${title.trim().toLowerCase()}|${dueKey}|${time ?? ''}`)
    out.push({ kind: 'compromisso', refId, dueKey, daysLeft, nome: title, amountCents: null, hora: time })
  }

  return out.sort(
    (a, b) =>
      a.daysLeft - b.daysLeft ||
      (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) ||
      (a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0),
  )
}

/**
 * Parte da tag/id: so letras, numeros, dois pontos, sublinhado e hifen.
 * @param {string} s
 * @returns {string}
 */
const safePart = (s) => String(s).replace(/[^A-Za-z0-9:_-]/g, '_')

/**
 * Evento do estagio: so referencias, nunca nome, titulo, valor nem hora. O id leva o estagio (`d{n}`); a
 * tag nao, para os retidos da mesma coisa colapsarem no de menos dias (collapseHeld).
 * @param {{ hid: string, person: string, stage: DueStage }} input
 * @returns {DueEvent}
 */
export function dueEvent({ hid, person, stage }) {
  const { kind, refId, dueKey, daysLeft } = stage
  const id = `${hid}__${person}__${kind}__${refId}__${dueKey}__d${daysLeft}`.replaceAll('/', '_')
  const key = safePart(dueKey)
  const head = safePart(kind)
  // o refId encolhe, nunca a chave do vencimento: a tag tem de seguir unica por vencimento
  const room = Math.max(1, TAG_MAX - head.length - key.length - 2)
  const tag = `${head}-${safePart(refId).slice(0, room)}-${key}`.slice(0, TAG_MAX)
  return { kind, id, tag, url: URLS[kind], refId, dueKey, daysLeft, person }
}
