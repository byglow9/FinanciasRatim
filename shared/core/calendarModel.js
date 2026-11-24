// @ts-check
// Modelo do dia do Calendario (UX-03, D-08 a D-12, D-19). Uma funcao pura monta,
// para cada dia do ciclo exibido, os itens, o saldo, o gasto, o nivel de calor,
// os pontinhos e os post-its; a tela so desenha. Regras:
//  - a chave do dia vem de dayKeyOf (Sao Paulo), nunca de Date#getDate;
//  - saldo do dia e base do calor sao so de transacoes (entradas menos saidas),
//    ignorando transferencia verdadeira (P-05); dinheiro sempre em centavos;
//  - o calor e percentil dos dias gastadores do PROPRIO ciclo (heatLevels), e
//    no modo "agenda" todo dia e "none";
//  - sem relogio implicito: `now` entra como argumento, so para isToday;
//  - vencimento de fatura de cartao (cardBillItems) e desenhado como conta, mas
//    nunca soma em saldo, gasto nem calor, e calendarSummary nao o recebe: a
//    compra do cartao ja conta como gasto na data da compra (CARD-03, CENT-04).

import { billStatus } from './billGroups.js'
import { addDaysToParts, daysBetweenParts } from './cycle.js'
import { dayKeyOf } from './dayKey.js'
import { MONTH_LONG, plural, shortSigned } from './format.js'
import { heatLevels } from './heat.js'
import { toCents } from './ledger.js'
import { zonedParts } from './time.js'

/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./cycle.js').DateParts} DateParts */
/** @typedef {import('./heat.js').HeatLevel} HeatLevel */
/** @typedef {import('./budget.js').BillItem} BillItem */
/** @typedef {import('./billGroups.js').BillStatus} BillStatus */

/** @typedef {'financeiro' | 'agenda'} CalendarMode */

/**
 * Lancamento como o app guarda: valor em reais.
 * @typedef {{
 *   id: string,
 *   type: 'entrada' | 'saida',
 *   amount: number,
 *   date: Date,
 *   description?: string,
 *   category?: string,
 *   categoryId?: string,
 *   transfer?: boolean,
 * }} CalendarTx
 */

/**
 * Tipo do pontinho. `hex` so existe no modo agenda (cor da categoria do evento);
 * nos demais a cor sai do tipo, na tela.
 * @typedef {{ kind: 'in' | 'out' | 'bill-pending' | 'bill-paid' | 'pig' | 'goal' | 'event', hex?: string }} DayDot
 */

/**
 * Item do dia, discriminado por `kind`.
 * @typedef {{
 *   kind: 'tx',
 *   id: string,
 *   type: 'entrada' | 'saida',
 *   title: string,
 *   category: string,
 *   categoryId?: string,
 *   amountCents: number,
 *   transfer: boolean,
 *   date: Date,
 * }} TxDayItem
 */

/**
 * @typedef {{
 *   kind: 'bill',
 *   billId: string,
 *   title: string,
 *   amountCents: number,
 *   plannedCents: number,
 *   paid: boolean,
 *   status: BillStatus,
 *   occurrence: DateParts,
 *   categoryId?: string,
 *   category?: string,
 * }} BillDayItem
 */

/**
 * @typedef {{
 *   kind: 'savings',
 *   id: string,
 *   type: 'deposito' | 'saque',
 *   title: string,
 *   amountCents: number,
 *   date: Date,
 * }} SavingsDayItem
 */

/**
 * @typedef {{
 *   kind: 'goal',
 *   id: string,
 *   goalId: string,
 *   title: string,
 *   amountCents: number,
 *   date: Date,
 * }} GoalDayItem
 */

/** @typedef {'yellow' | 'blue' | 'green' | 'pink' | 'purple'} NoteColor */

/**
 * @typedef {{
 *   kind: 'note',
 *   id: string,
 *   title: string,
 *   content: string,
 *   color: NoteColor,
 *   createdAt: Date,
 * }} NoteDayItem
 */

/**
 * @typedef {{
 *   kind: 'event',
 *   id: string,
 *   title: string,
 *   time?: string,
 *   location?: string,
 *   notes?: string,
 *   categoryId?: string,
 *   color: string,
 * }} EventDayItem
 */

/** @typedef {TxDayItem | BillDayItem | SavingsDayItem | GoalDayItem | NoteDayItem | EventDayItem} DayItem */

/**
 * Modelo de um dia do ciclo. `postIts` guarda a cor (nome) das ate 2 notas mais
 * recentes; a tela mapeia para o token --color-pit-*.
 * @typedef {{
 *   key: string,
 *   parts: DateParts,
 *   items: DayItem[],
 *   netCents: number,
 *   spentCents: number,
 *   heat: HeatLevel,
 *   dots: DayDot[],
 *   extraDots: number,
 *   postIts: NoteColor[],
 *   isToday: boolean,
 * }} DayModel
 */

/** Aporte de meta como o app guarda (reais). `goalName` e acrescentado pelo chamador. */
/** @typedef {{ id: string, goalId: string, amount: number, description?: string, goalName?: string, date: Date }} CalendarContribution */

/** Movimento do Porquinho como o app guarda (reais). */
/** @typedef {{ id: string, type: 'deposito' | 'saque', amount: number, description?: string, date: Date }} CalendarSavings */

/** Nota como o app guarda; sem `date` ela nao aparece no calendario. */
/** @typedef {{ id: string, title: string, content: string, color: NoteColor, date?: Date, createdAt: Date }} CalendarNote */

/** Evento da agenda como o app guarda. */
/** @typedef {{ id: string, title: string, date: Date, time?: string, location?: string, notes?: string, categoryId?: string }} CalendarEvent */

/** @typedef {{ id: string, color: string }} CalendarEventCategory */

/**
 * Ocorrencia de conta como a tela recebe (billsForCycle), com a categoria da
 * conta opcional.
 * @typedef {BillItem & { categoryId?: string, category?: string }} CalendarBillItem
 */

/**
 * @typedef {{
 *   mode?: CalendarMode,
 *   cycle: Cycle,
 *   now: Date,
 *   transactions?: CalendarTx[],
 *   billItems?: CalendarBillItem[],
 *   cardBillItems?: CalendarBillItem[],
 *   savings?: CalendarSavings[],
 *   contributions?: CalendarContribution[],
 *   notes?: CalendarNote[],
 *   events?: CalendarEvent[],
 *   eventCategories?: CalendarEventCategory[],
 * }} BuildDayModelsInput
 */

/** Quantos pontinhos aparecem antes do "+n" (D-09). */
const MAX_DOTS = 3

/** Ordem dos tipos de pontinho no modo financeiro (D-09). */
const DOT_ORDER = /** @type {const} */ (['in', 'out', 'bill-pending', 'bill-paid', 'pig', 'goal'])

/**
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function pad(n, width) {
  return String(n).padStart(width, '0')
}

/**
 * Chave YYYY-MM-DD de uma data de calendario.
 * @param {DateParts} p
 * @returns {string}
 */
function keyOfParts(p) {
  return `${pad(p.year, 4)}-${pad(p.month, 2)}-${pad(p.day, 2)}`
}

/** Cor do evento sem categoria (ou com categoria que nao existe mais). */
const EVENT_FALLBACK_HEX = '#6b7280'

/**
 * Rascunho mutavel de um dia, so dentro de buildDayModels.
 * @typedef {{
 *   key: string,
 *   parts: DateParts,
 *   netCents: number,
 *   spentCents: number,
 *   tx: TxDayItem[],
 *   bills: BillDayItem[],
 *   savings: SavingsDayItem[],
 *   goals: GoalDayItem[],
 *   notes: NoteDayItem[],
 *   events: EventDayItem[],
 * }} DayDraft
 */

/**
 * Comparacao de texto estavel, sem localeCompare (que depende do ambiente).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Ordem por instante e, no empate, por id.
 * @param {{ date: Date, id: string }} a
 * @param {{ date: Date, id: string }} b
 * @returns {number}
 */
function byDateThenId(a, b) {
  return a.date.getTime() - b.date.getTime() || cmp(a.id, b.id)
}

/**
 * Pontinhos do modo financeiro: um por tipo presente, na ordem fixa de D-09.
 * @param {DayDraft} draft
 * @returns {DayDot[]}
 */
function financeDots(draft) {
  const present = new Set()
  for (const t of draft.tx) present.add(t.type === 'entrada' ? 'in' : 'out')
  for (const b of draft.bills) present.add(b.paid ? 'bill-paid' : 'bill-pending')
  if (draft.savings.length > 0) present.add('pig')
  if (draft.goals.length > 0) present.add('goal')
  return DOT_ORDER.filter((kind) => present.has(kind)).map((kind) => ({ kind }))
}

/**
 * Pontinhos do modo agenda: um por cor de categoria de evento, na ordem dos itens.
 * @param {EventDayItem[]} events
 * @returns {DayDot[]}
 */
function agendaDots(events) {
  const seen = new Set()
  /** @type {DayDot[]} */
  const dots = []
  for (const e of events) {
    if (seen.has(e.color)) continue
    seen.add(e.color)
    dots.push({ kind: 'event', hex: e.color })
  }
  return dots
}

/**
 * Evento com hora vem depois do sem hora; depois por hora, titulo e id.
 * @param {EventDayItem} a
 * @param {EventDayItem} b
 * @returns {number}
 */
function compareEvents(a, b) {
  const ta = a.time ?? ''
  const tb = b.time ?? ''
  if (ta !== tb) return ta === '' ? -1 : tb === '' ? 1 : cmp(ta, tb)
  return cmp(a.title, b.title) || cmp(a.id, b.id)
}

/**
 * Monta o modelo de todos os dias do ciclo, do primeiro ao ultimo, mesmo vazios.
 * No modo "financeiro" entram lancamentos, contas, Porquinho, aportes e notas; no
 * modo "agenda", eventos e notas (D-10). O que cai fora do ciclo e ignorado.
 * @param {BuildDayModelsInput} input
 * @returns {Map<string, DayModel>}
 */
export function buildDayModels(input) {
  const {
    mode = 'financeiro',
    cycle,
    now,
    transactions = [],
    billItems = [],
    cardBillItems = [],
    savings = [],
    contributions = [],
    notes = [],
    events = [],
    eventCategories = [],
  } = input
  const finance = mode === 'financeiro'
  const todayKey = dayKeyOf(now)
  const todayParts = zonedParts(now)

  /** @type {Map<string, DayDraft>} */
  const drafts = new Map()
  const total = daysBetweenParts(cycle.startParts, cycle.endParts) + 1
  for (let i = 0; i < total; i += 1) {
    const parts = addDaysToParts(cycle.startParts, i)
    const key = keyOfParts(parts)
    drafts.set(key, {
      key,
      parts,
      netCents: 0,
      spentCents: 0,
      tx: [],
      bills: [],
      savings: [],
      goals: [],
      notes: [],
      events: [],
    })
  }

  if (finance) {
    for (const t of transactions) {
      const draft = drafts.get(dayKeyOf(t.date))
      if (draft === undefined) continue
      const cents = toCents(t.amount)
      draft.tx.push({
        kind: 'tx',
        id: t.id,
        type: t.type,
        title: t.description ?? '',
        category: t.category ?? '',
        categoryId: t.categoryId,
        amountCents: cents,
        transfer: t.transfer === true,
        date: t.date,
      })
      if (t.transfer === true) continue
      if (t.type === 'entrada') draft.netCents += cents
      else {
        draft.netCents -= cents
        draft.spentCents += cents
      }
    }

    // Conta so na data da ocorrencia do ciclo (billsForCycle), nunca pelo numero do dia.
    // O vencimento da fatura do cartao entra junto, so como item e pontinho de conta.
    for (const b of [...billItems, ...cardBillItems]) {
      const o = b.occurrence
      const draft = drafts.get(keyOfParts(o))
      if (draft === undefined) continue
      draft.bills.push({
        kind: 'bill',
        billId: b.billId,
        title: b.name,
        amountCents: b.costCents,
        plannedCents: b.plannedCents,
        paid: b.paid,
        status: billStatus(o, b.paid, todayParts),
        occurrence: o,
        categoryId: b.categoryId,
        category: b.category,
      })
    }

    for (const s of savings) {
      const draft = drafts.get(dayKeyOf(s.date))
      if (draft === undefined) continue
      draft.savings.push({
        kind: 'savings',
        id: s.id,
        type: s.type,
        title: s.description ?? '',
        amountCents: toCents(s.amount),
        date: s.date,
      })
    }

    for (const c of contributions) {
      const draft = drafts.get(dayKeyOf(c.date))
      if (draft === undefined) continue
      draft.goals.push({
        kind: 'goal',
        id: c.id,
        goalId: c.goalId,
        title: c.goalName ?? c.description ?? '',
        amountCents: toCents(c.amount),
        date: c.date,
      })
    }
  } else {
    /** @type {Map<string, string>} */
    const colorById = new Map()
    for (const cat of eventCategories) colorById.set(cat.id, cat.color.toLowerCase())
    for (const e of events) {
      const draft = drafts.get(dayKeyOf(e.date))
      if (draft === undefined) continue
      draft.events.push({
        kind: 'event',
        id: e.id,
        title: e.title,
        time: e.time,
        location: e.location,
        notes: e.notes,
        categoryId: e.categoryId,
        color: (e.categoryId !== undefined ? colorById.get(e.categoryId) : undefined) ?? EVENT_FALLBACK_HEX,
      })
    }
  }

  // Nota sem data nao aparece (como a tela atual): so a que tem dia no ciclo.
  for (const n of notes) {
    if (n.date === undefined) continue
    const draft = drafts.get(dayKeyOf(n.date))
    if (draft === undefined) continue
    draft.notes.push({
      kind: 'note',
      id: n.id,
      title: n.title,
      content: n.content,
      color: n.color,
      createdAt: n.createdAt,
    })
  }

  const classify = heatLevels([...drafts.values()].map((d) => d.netCents))

  /** @type {Map<string, DayModel>} */
  const models = new Map()
  for (const draft of drafts.values()) {
    const noteItems = [...draft.notes].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || cmp(a.id, b.id),
    )
    /** @type {DayItem[]} */
    const items = finance
      ? [
          ...[...draft.bills].sort((a, b) => cmp(a.title, b.title) || cmp(a.billId, b.billId)),
          ...[...draft.tx].sort(byDateThenId),
          ...[...draft.savings].sort(byDateThenId),
          ...[...draft.goals].sort(byDateThenId),
          ...noteItems,
        ]
      : [...[...draft.events].sort(compareEvents), ...noteItems]
    const dots = finance ? financeDots(draft) : agendaDots(/** @type {EventDayItem[]} */ (items.filter((i) => i.kind === 'event')))
    models.set(draft.key, {
      key: draft.key,
      parts: draft.parts,
      items,
      netCents: draft.netCents,
      spentCents: draft.spentCents,
      heat: finance ? classify(draft.netCents) : 'none',
      dots: dots.slice(0, MAX_DOTS),
      extraDots: Math.max(0, dots.length - MAX_DOTS),
      postIts: noteItems.slice(0, 2).map((n) => n.color),
      isToday: draft.key === todayKey,
    })
  }
  return models
}

/**
 * Resumo do ciclo para a linha "Saiu R$ X \u00b7 A pagar R$ Y": saidas do ciclo
 * (sem transferencia) e valor planejado das contas ainda nao pagas, em centavos.
 * @param {{ transactions?: CalendarTx[], billItems?: BillItem[] }} input
 * @returns {{ spentCents: number, toPayCents: number }}
 */
export function calendarSummary({ transactions = [], billItems = [] }) {
  let spentCents = 0
  for (const t of transactions) {
    if (t.type === 'saida' && t.transfer !== true) spentCents += toCents(t.amount)
  }
  let toPayCents = 0
  for (const b of billItems) {
    if (!b.paid) toPayCents += b.plannedCents
  }
  return { spentCents, toPayCents }
}

/**
 * Para onde a agenda rola ao tocar num dia. A agenda lista do dia mais recente
 * ao mais antigo; o alvo e o dia com item igual ou imediatamente anterior ao
 * desejado (o primeiro que aparece ao rolar do desejado para baixo); se todos
 * os dias com item sao posteriores, o mais antigo (o mais proximo); sem nenhum
 * dia com item, null. Nao altera nem depende da ordem da lista de entrada.
 * @param {string[]} daysWithItems chaves YYYY-MM-DD dos dias com item
 * @param {string} wantedKey chave YYYY-MM-DD desejada
 * @returns {string | null}
 */
export function agendaScrollTarget(daysWithItems, wantedKey) {
  if (!daysWithItems || daysWithItems.length === 0) return null
  const sorted = [...daysWithItems].sort()
  const upTo = sorted.filter((k) => k <= wantedKey)
  return upTo.length > 0 ? upTo[upTo.length - 1] : sorted[0]
}

/**
 * Dias na ordem em que a agenda os mostra: do mais recente ao mais antigo
 * (dias a vencer no topo). Nao altera a lista de entrada; os itens de cada dia
 * mantem a ordem.
 * @param {DayModel[]} days modelos em ordem de data
 * @returns {DayModel[]}
 */
export function agendaDaysOrder(days) {
  return [...days].sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
}

/**
 * Rotulo de acessibilidade da celula do dia (D-12): "18 de novembro, hoje, 3
 * itens, saldo \u2212396". Hoje, itens e saldo saem quando nao se aplicam; o saldo
 * so existe no modo financeiro.
 * @param {DayModel} model
 * @param {CalendarMode} mode
 * @returns {string}
 */
export function dayAriaLabel(model, mode) {
  const parts = [`${model.parts.day} de ${MONTH_LONG[model.parts.month - 1].toLowerCase()}`]
  if (model.isToday) parts.push('hoje')
  if (model.items.length > 0) parts.push(plural(model.items.length, 'item', 'itens'))
  if (mode === 'financeiro' && model.netCents !== 0) parts.push(`saldo ${shortSigned(model.netCents)}`)
  return parts.join(', ')
}
