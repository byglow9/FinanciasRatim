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
import { parseBRL, plural } from './format.js'

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

/**
 * Totais das ocorrencias do ciclo. `totalCents` e a soma de `costCents`, o mesmo
 * numero de `billsForCycle(...).totalCents` da Home.
 * @typedef {{
 *   totalCents: number,
 *   paidCents: number,
 *   pendingCents: number,
 *   paidCount: number,
 *   count: number,
 * }} BillsSummary
 */

/** @typedef {'name' | 'amount' | 'day' | 'category'} BillField */

/**
 * Rascunho do formulario, com o texto que o usuario digitou.
 * @typedef {{ name?: unknown, amount?: unknown, day?: unknown, category?: unknown }} BillDraft
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   errors: Partial<Record<BillField, string>>,
 *   firstInvalid: BillField | null,
 *   value: { name: string, amountCents: number, day: number, category: string } | null,
 * }} BillDraftResult
 */

/** Mensagens por campo, exatamente as do contrato de copia da UI-SPEC. */
const BILL_MESSAGES = Object.freeze({
  name: 'Informe o nome da conta',
  amount: 'Informe um valor maior que zero',
  day: 'Informe um dia de 1 a 31',
  category: 'Escolha uma categoria',
})

/** Ordem de validacao e do foco no primeiro campo com erro. */
const BILL_FIELD_ORDER = /** @type {const} */ (['name', 'amount', 'day', 'category'])

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

/**
 * Resumo das ocorrencias do ciclo (D-13), da mesma origem dos totais da Home:
 * total e a soma de `costCents`, pagas e pendentes dividem esse total, entao
 * `totalCents` e sempre `paidCents + pendingCents`.
 * @param {BillItem[]} items
 * @returns {BillsSummary}
 */
export function billsSummary(items) {
  let totalCents = 0
  let paidCents = 0
  let paidCount = 0
  let count = 0
  for (const item of items ?? []) {
    count += 1
    totalCents += item.costCents
    if (item.paid) {
      paidCount += 1
      paidCents += item.costCents
    }
  }
  return { totalCents, paidCents, pendingCents: totalCents - paidCents, paidCount, count }
}

/**
 * Frase de apoio da linha da conta (UI-SPEC, contrato de copia): so o dia do mes
 * aparece no texto; a diferenca vem de `daysBetweenParts`.
 * "Venceu dia 5 \u00b7 3 dias de atraso", "Vence hoje",
 * "Vence amanh\u00e3 \u00b7 dia 19", "Vence dia 25 \u00b7 em 12 dias", "Paga".
 * @param {DateParts} occurrence
 * @param {BillStatus} status
 * @param {DateParts} todayParts
 * @returns {string}
 */
export function billSupportText(occurrence, status, todayParts) {
  if (status === 'paid') return 'Paga'
  const diff = daysBetweenParts(todayParts, occurrence)
  if (status === 'overdue' || diff < 0) {
    return `Venceu dia ${occurrence.day} \u00b7 ${plural(Math.abs(diff), 'dia', 'dias')} de atraso`
  }
  if (diff === 0) return 'Vence hoje'
  if (diff === 1) return `Vence amanh\u00e3 \u00b7 dia ${occurrence.day}`
  return `Vence dia ${occurrence.day} \u00b7 em ${plural(diff, 'dia', 'dias')}`
}

/**
 * Texto do dia: so 1 ou 2 digitos, de 1 a 31 (T-3.1-07-01). Aceita numero inteiro.
 * @param {unknown} raw
 * @returns {number | null}
 */
function parseDay(raw) {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  if (!/^\d{1,2}$/.test(text)) return null
  const day = Number(text)
  return day >= 1 && day <= 31 ? day : null
}

/**
 * Valida o formulario de conta (D-15), um erro por campo. Valor so por
 * `parseBRL` em centavos inteiros; dia so por 1 ou 2 digitos entre 1 e 31; nome
 * com trim; a categoria precisa estar entre as permitidas (o chamador inclui a
 * categoria atual da conta mesmo arquivada). `firstInvalid` segue a ordem nome,
 * valor, dia, categoria.
 * @param {BillDraft} draft
 * @param {string[]} allowedCategoryNames
 * @returns {BillDraftResult}
 */
export function validateBillDraft(draft, allowedCategoryNames) {
  const input = draft ?? {}
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const amountCents = parseBRL(input.amount)
  const day = parseDay(input.day)
  const category = typeof input.category === 'string' ? input.category.trim() : ''
  const allowed = new Set((allowedCategoryNames ?? []).map((n) => String(n).trim()))

  /** @type {Partial<Record<BillField, string>>} */
  const errors = {}
  if (name === '') errors.name = BILL_MESSAGES.name
  if (amountCents === null || amountCents <= 0) errors.amount = BILL_MESSAGES.amount
  if (day === null) errors.day = BILL_MESSAGES.day
  if (category === '' || !allowed.has(category)) errors.category = BILL_MESSAGES.category

  const firstInvalid = BILL_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
  if (firstInvalid !== null || amountCents === null || day === null) {
    return { ok: false, errors, firstInvalid, value: null }
  }
  return { ok: true, errors: {}, firstInvalid: null, value: { name, amountCents, day, category } }
}
