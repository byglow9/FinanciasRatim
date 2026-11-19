// @ts-check
// Contas fixas agrupadas por categoria em ordem estavel (UX-05, D-13 a D-16).
// A ordem dos grupos vem de categoryOrder.js (ativas, arquivadas, legado) e a
// ordem das linhas dentro do grupo e a data da ocorrencia, depois o nome, depois
// o billId. Nada aqui ordena por pago, por valor ou por pendente: marcar paga,
// trocar o filtro ou pagar a ultima pendente nunca reordena (requisito do dono).
// O estado da conta e calculado por datas de calendario (daysBetweenParts), nunca
// pelo numero do dia, para valer na virada de mes. Tudo puro, sem relogio: o
// "hoje" entra como argumento.

import { daysBetweenParts } from './cycle.js'
import { compareGroupKeys, groupKeyOf } from './categoryOrder.js'

/** @typedef {import('./budget.js').BillItem} BillItem */
/** @typedef {import('./categories.js').CategoryDef} CategoryDef */
/** @typedef {import('./cycle.js').DateParts} DateParts */

/**
 * Ocorrencia de conta que a tela agrupa: o item de billsForCycle mais a
 * categoria da conta, que o chamador acrescenta (o nucleo do ciclo nao guarda
 * categoria).
 * @typedef {BillItem & { categoryId?: string, category?: string }} CategorizedBillItem
 */

/** @typedef {'all' | 'pending' | 'paid'} BillFilter */

/** @typedef {'paid' | 'overdue' | 'today' | 'soon' | 'pending'} BillStatus */

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   def: CategoryDef | null,
 *   items: CategorizedBillItem[],
 *   allItems: CategorizedBillItem[],
 *   paidCount: number,
 *   totalCount: number,
 *   subtotalCents: number,
 * }} BillGroup
 */

/** Ate quantos dias antes do vencimento a conta aparece como "em breve" (D-15). */
const SOON_DAYS = 3

/**
 * Estado da conta numa ocorrencia (D-15): paga vence qualquer data; vencida se a
 * ocorrencia e anterior a hoje; hoje se igual; em breve de 1 a 3 dias depois;
 * pendente alem disso. Compara datas de calendario, entao vale na virada de mes
 * e de ano e, em ciclo passado, todo item nao pago e vencido.
 * @param {DateParts} occurrence
 * @param {boolean} paid
 * @param {DateParts} todayParts
 * @returns {BillStatus}
 */
export function billStatus(occurrence, paid, todayParts) {
  if (paid) return 'paid'
  const diff = daysBetweenParts(todayParts, occurrence)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= SOON_DAYS) return 'soon'
  return 'pending'
}

/**
 * Chave ordenavel de uma data de calendario.
 * @param {DateParts} d
 * @returns {number}
 */
function dateKey(d) {
  return d.year * 10000 + d.month * 100 + d.day
}

/**
 * Ordem das linhas dentro do grupo: data da ocorrencia ascendente, nome, billId.
 * @param {CategorizedBillItem} a
 * @param {CategorizedBillItem} b
 * @returns {number}
 */
function compareInGroup(a, b) {
  const byDate = dateKey(a.occurrence) - dateKey(b.occurrence)
  if (byDate !== 0) return byDate
  if (a.name !== b.name) return a.name < b.name ? -1 : 1
  if (a.billId === b.billId) return 0
  return a.billId < b.billId ? -1 : 1
}

/**
 * Agrupa as ocorrencias por categoria em ordem fixa (D-13, D-14). Os grupos e a
 * ordem saem de TODOS os itens; o filtro (`all`, `pending`, `paid`) so esconde
 * linhas e descarta os grupos que ficaram vazios, preservando a posicao
 * relativa. `paidCount`, `totalCount` e `subtotalCents` valem para todos os
 * itens do grupo, nao so para os filtrados.
 * @param {CategorizedBillItem[]} items
 * @param {CategoryDef[]} defs
 * @param {BillFilter} [filter]
 * @returns {BillGroup[]}
 */
export function groupBillsByCategory(items, defs, filter = 'all') {
  /** @type {Map<string, { gk: import('./categoryOrder.js').GroupKey, items: CategorizedBillItem[] }>} */
  const byKey = new Map()
  for (const item of items ?? []) {
    const gk = groupKeyOf(item, defs)
    const slot = byKey.get(gk.key)
    if (slot) slot.items.push(item)
    else byKey.set(gk.key, { gk, items: [item] })
  }

  const ordered = [...byKey.values()].sort((a, b) => compareGroupKeys(a.gk, b.gk))

  /** @type {BillGroup[]} */
  const groups = []
  for (const { gk, items: members } of ordered) {
    const allItems = [...members].sort(compareInGroup)
    let paidCount = 0
    let subtotalCents = 0
    for (const item of allItems) {
      if (item.paid) paidCount += 1
      subtotalCents += item.costCents
    }
    const shown =
      filter === 'pending'
        ? allItems.filter((i) => !i.paid)
        : filter === 'paid'
          ? allItems.filter((i) => i.paid)
          : allItems
    if (shown.length === 0) continue
    groups.push({
      key: gk.key,
      label: gk.label,
      def: gk.def,
      items: shown,
      allItems,
      paidCount,
      totalCount: allItems.length,
      subtotalCents,
    })
  }
  return groups
}
