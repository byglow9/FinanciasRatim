// @ts-check
// Modelo do dia do Calendario (UX-03, D-08 a D-12, D-19). Uma funcao pura monta,
// para cada dia do ciclo exibido, os itens, o saldo, o gasto, o nivel de calor,
// os pontinhos e os post-its; a tela so desenha. Regras:
//  - a chave do dia vem de dayKeyOf (Sao Paulo), nunca de Date#getDate;
//  - saldo do dia e base do calor sao so de transacoes (entradas menos saidas),
//    ignorando transferencia verdadeira (P-05); dinheiro sempre em centavos;
//  - o calor e percentil dos dias gastadores do PROPRIO ciclo (heatLevels), e
//    no modo "agenda" todo dia e "none";
//  - sem relogio implicito: `now` entra como argumento, so para isToday.

import { addDaysToParts, daysBetweenParts } from './cycle.js'
import { dayKeyOf } from './dayKey.js'
import { heatLevels } from './heat.js'
import { toCents } from './ledger.js'

/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./cycle.js').DateParts} DateParts */
/** @typedef {import('./heat.js').HeatLevel} HeatLevel */

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

/** @typedef {TxDayItem} DayItem */

/**
 * Modelo de um dia do ciclo.
 * @typedef {{
 *   key: string,
 *   parts: DateParts,
 *   items: DayItem[],
 *   netCents: number,
 *   spentCents: number,
 *   heat: HeatLevel,
 *   dots: DayDot[],
 *   extraDots: number,
 *   postIts: string[],
 *   isToday: boolean,
 * }} DayModel
 */

/**
 * @typedef {{
 *   mode?: CalendarMode,
 *   cycle: Cycle,
 *   now: Date,
 *   transactions?: CalendarTx[],
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

/**
 * Rascunho mutavel de um dia, so dentro de buildDayModels.
 * @typedef {{
 *   key: string,
 *   parts: DateParts,
 *   netCents: number,
 *   spentCents: number,
 *   tx: TxDayItem[],
 * }} DayDraft
 */

/**
 * Monta o modelo de todos os dias do ciclo, do primeiro ao ultimo, mesmo vazios.
 * @param {BuildDayModelsInput} input
 * @returns {Map<string, DayModel>}
 */
export function buildDayModels(input) {
  const { mode = 'financeiro', cycle, now, transactions = [] } = input
  const todayKey = dayKeyOf(now)

  /** @type {Map<string, DayDraft>} */
  const drafts = new Map()
  const total = daysBetweenParts(cycle.startParts, cycle.endParts) + 1
  for (let i = 0; i < total; i += 1) {
    const parts = addDaysToParts(cycle.startParts, i)
    const key = keyOfParts(parts)
    drafts.set(key, { key, parts, netCents: 0, spentCents: 0, tx: [] })
  }

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

  const classify = heatLevels([...drafts.values()].map((d) => d.netCents))

  /** @type {Map<string, DayModel>} */
  const models = new Map()
  for (const draft of drafts.values()) {
    const items = [...draft.tx].sort(
      (a, b) => a.date.getTime() - b.date.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    const kinds = new Set(items.map((i) => (i.type === 'entrada' ? 'in' : 'out')))
    const ordered = DOT_ORDER.filter((k) => kinds.has(k))
    models.set(draft.key, {
      key: draft.key,
      parts: draft.parts,
      items,
      netCents: draft.netCents,
      spentCents: draft.spentCents,
      heat: mode === 'financeiro' ? classify(draft.netCents) : 'none',
      dots: ordered.slice(0, MAX_DOTS).map((kind) => ({ kind })),
      extraDots: Math.max(0, ordered.length - MAX_DOTS),
      postIts: [],
      isToday: draft.key === todayKey,
    })
  }
  return models
}
