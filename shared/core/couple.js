// @ts-check
// Resumo do casal (UX-06, D-17) em funcoes puras: percentuais de quem gastou
// mais, totais de cada um e juntos na mesma escala de barras e categorias
// lideres. O nucleo so recebe listas de lancamentos e numeros; nomes de pessoas
// e cores ficam na tela. Tudo em centavos inteiros e sem relogio. Transferencia
// verdadeira (transfer === true) fica fora das entradas e das saidas (PR-14).

import { toCents } from './ledger.js'
import { isDayToDay, sortByUrgency } from './budget.js'
import { limitState } from './limits.js'
import { compareGroupKeys, groupKeyOf } from './categoryOrder.js'

/** @typedef {import('./budget.js').Tx} Tx */
/** @typedef {import('./categories.js').CategoryDef} CategoryDef */
/** @typedef {import('./budget.js').BudgetView} BudgetView */

/**
 * Limiar de "quase empatado" (P-15, ajustavel no UAT): a diferenca de ate este
 * fracao do maior valor, com os dois tendo gasto na categoria, vira empate.
 */
export const NEAR_TIE_RATIO = 0.1

/**
 * @typedef {{ inCents: number, outCents: number, balanceCents: number }} PersonTotals
 */

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   def: CategoryDef | null,
 *   firstCents: number,
 *   secondCents: number,
 *   leader: 'first' | 'second' | 'tie',
 * }} CategoryLead
 */

/**
 * @typedef {{
 *   first: PersonTotals,
 *   second: PersonTotals,
 *   together: PersonTotals,
 *   split: { aPct: number, bPct: number, total: number },
 *   scaleMaxCents: number,
 *   leads: CategoryLead[],
 * }} CoupleSummary
 */

/**
 * Centavos nao negativos e inteiros; invalido conta como zero.
 * @param {number} value
 * @returns {number}
 */
function nonNegative(value) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0
}

/**
 * Divide o total entre dois lados em percentuais inteiros que somam 100, pelo
 * metodo do maior resto (53 e 47 continuam 53 e 47; 1 e 2 viram 33 e 67).
 * Total zero nao inventa percentual: devolve 0 e 0.
 * @param {number} a centavos do primeiro
 * @param {number} b centavos do segundo
 * @returns {{ aPct: number, bPct: number, total: number }}
 */
export function splitShare(a, b) {
  const x = nonNegative(a)
  const y = nonNegative(b)
  const total = x + y
  if (total === 0) return { aPct: 0, bPct: 0, total: 0 }
  let aPct = Math.floor((x * 100) / total)
  let bPct = Math.floor((y * 100) / total)
  const leftover = 100 - aPct - bPct
  if (leftover > 0) {
    // Resto da divisao de cada lado; o maior resto leva o ponto que sobrou
    // (empate vai para o primeiro).
    const aRest = (x * 100) % total
    const bRest = (y * 100) % total
    if (aRest >= bRest) aPct += leftover
    else bPct += leftover
  }
  return { aPct, bPct, total }
}

/**
 * Entradas, saidas e saldo de uma pessoa, fora transferencias.
 * @param {Tx[]} txs
 * @returns {PersonTotals}
 */
function personTotals(txs) {
  let inCents = 0
  let outCents = 0
  for (const tx of txs ?? []) {
    if (tx.transfer === true) continue
    const cents = toCents(tx.amount)
    if (!Number.isFinite(cents)) continue
    if (tx.type === 'entrada') inCents += cents
    else if (isDayToDay(tx)) outCents += cents
  }
  return { inCents, outCents, balanceCents: inCents - outCents }
}

/**
 * Gasto por grupo de categoria de cada pessoa e quem lidera (D-17). Devolve uma
 * linha por categoria em que alguem gastou, do maior gasto do casal para o
 * menor (empate pela ordem de categoryOrder); a tela mostra as primeiras.
 * `leader` e "tie" quando os dois gastaram e a diferenca e de ate
 * NEAR_TIE_RATIO do maior valor; senao e quem gastou mais.
 * @param {Tx[]} first
 * @param {Tx[]} second
 * @param {CategoryDef[]} defs
 * @returns {CategoryLead[]}
 */
export function leadCategories(first, second, defs) {
  /** @type {Map<string, { gk: import('./categoryOrder.js').GroupKey, firstCents: number, secondCents: number }>} */
  const byKey = new Map()
  /**
   * @param {Tx[]} txs
   * @param {'firstCents' | 'secondCents'} side
   */
  const add = (txs, side) => {
    for (const tx of txs ?? []) {
      if (!isDayToDay(tx)) continue
      const cents = toCents(tx.amount)
      if (!Number.isFinite(cents)) continue
      const gk = groupKeyOf(tx, defs)
      const slot = byKey.get(gk.key) ?? { gk, firstCents: 0, secondCents: 0 }
      slot[side] += cents
      byKey.set(gk.key, slot)
    }
  }
  add(first, 'firstCents')
  add(second, 'secondCents')

  const tiePct = Math.round(NEAR_TIE_RATIO * 100)
  const rows = [...byKey.values()].filter((s) => s.firstCents > 0 || s.secondCents > 0)
  rows.sort((a, b) => {
    const byMax = Math.max(b.firstCents, b.secondCents) - Math.max(a.firstCents, a.secondCents)
    return byMax !== 0 ? byMax : compareGroupKeys(a.gk, b.gk)
  })

  return rows.map(({ gk, firstCents, secondCents }) => {
    const biggest = Math.max(firstCents, secondCents)
    const diff = Math.abs(firstCents - secondCents)
    /** @type {CategoryLead['leader']} */
    let leader
    if (firstCents > 0 && secondCents > 0 && diff * 100 <= biggest * tiePct) leader = 'tie'
    else leader = firstCents >= secondCents ? 'first' : 'second'
    return { key: gk.key, label: gk.label, def: gk.def, firstCents, secondCents, leader }
  })
}

/**
 * Resumo do casal: totais de cada um e juntos, percentuais das saidas, escala
 * comum das barras (a maior das seis medidas absolutas: entradas, saidas e saldo
 * de cada um) e as categorias lideres.
 * @param {{ first: Tx[], second: Tx[], defs: CategoryDef[] }} args
 * @returns {CoupleSummary}
 */
export function coupleSummary({ first, second, defs }) {
  const a = personTotals(first)
  const b = personTotals(second)
  const together = {
    inCents: a.inCents + b.inCents,
    outCents: a.outCents + b.outCents,
    balanceCents: a.balanceCents + b.balanceCents,
  }
  const scaleMaxCents = Math.max(
    Math.abs(a.inCents),
    Math.abs(a.outCents),
    Math.abs(a.balanceCents),
    Math.abs(b.inCents),
    Math.abs(b.outCents),
    Math.abs(b.balanceCents),
  )
  return {
    first: a,
    second: b,
    together,
    split: splitShare(a.outCents, b.outCents),
    scaleMaxCents,
    leads: leadCategories(first, second, defs),
  }
}

/**
 * Parte de uma pessoa numa categoria do casal: tem limite proprio ou nao, e o
 * gasto dela na categoria (de quem nao tem limite vem do gasto geral).
 * @typedef {{ hasLimit: boolean, limitCents: number | null, spentCents: number }} CouplePart
 */

/**
 * Linha de limite somado por categoria: o teto e o gasto contam so quem tem
 * limite; `pct` e inteiro (para baixo) e NAO satura em 100, como na Home.
 * @typedef {{
 *   categoryId: string,
 *   limitCents: number,
 *   spentCents: number,
 *   pct: number,
 *   state: 'ok' | 'warn' | 'over',
 *   parts: { first: CouplePart, second: CouplePart },
 * }} CoupleLimitRow
 */

/**
 * Pode gastar, gasto e sobra somados dos dois (CASAL-01, D-15, D-16). Cada
 * lado ja vem recortado no proprio ciclo; nada aqui recalcula a conta da Home.
 * @typedef {{
 *   safeTogetherCents: number,
 *   spentTogetherCents: number,
 *   sobraTogetherCents: number,
 *   sobraProjected: boolean,
 *   noIncome: { first: boolean, second: boolean },
 *   rows: CoupleLimitRow[],
 * }} CoupleBudget
 */

/**
 * Parte de uma pessoa numa categoria: com limite vem de spend.rows; sem limite
 * o gasto vem de spend.generalByCategory (zero se nao gastou) (D-14).
 * @param {BudgetView | null} view
 * @param {string} categoryId
 * @returns {CouplePart}
 */
function partOf(view, categoryId) {
  const row = view?.spend.rows.find((r) => r.categoryId === categoryId)
  if (row) return { hasLimit: true, limitCents: row.limitCents, spentCents: row.spentCents }
  const general = view?.spend.generalByCategory.find((g) => g.categoryId === categoryId)
  return { hasLimit: false, limitCents: null, spentCents: general ? general.cents : 0 }
}

/**
 * Linhas de limite somadas: a uniao das categorias com limite nos dois lados.
 * Teto e gasto contam so quem tem limite; o estado usa os mesmos cortes da Home.
 * @param {BudgetView | null} first
 * @param {BudgetView | null} second
 * @returns {CoupleLimitRow[]}
 */
function limitRows(first, second) {
  const ids = new Set()
  for (const view of [first, second]) {
    for (const row of view?.spend.rows ?? []) ids.add(row.categoryId)
  }
  /** @type {CoupleLimitRow[]} */
  const rows = []
  for (const categoryId of ids) {
    const parts = { first: partOf(first, categoryId), second: partOf(second, categoryId) }
    let limitCents = 0
    let spentCents = 0
    for (const part of [parts.first, parts.second]) {
      if (!part.hasLimit || part.limitCents === null) continue
      limitCents += part.limitCents
      spentCents += part.spentCents
    }
    const info = limitState(spentCents, limitCents)
    if (info === null) continue
    rows.push({
      categoryId,
      limitCents,
      spentCents,
      pct: Math.floor((Math.max(spentCents, 0) * 100) / limitCents),
      state: info.state,
      parts,
    })
  }
  // Urgencia (over, warn, ok); dentro do estado, maior gasto e depois categoryId.
  const byState = (/** @type {CoupleLimitRow} */ a, /** @type {CoupleLimitRow} */ b) => {
    const order = sortByUrgency({ state: a.state, pct: 0, categoryId: '' }, { state: b.state, pct: 0, categoryId: '' })
    if (order !== 0) return order
    if (b.spentCents !== a.spentCents) return b.spentCents - a.spentCents
    return a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0
  }
  return rows.sort(byState)
}

/**
 * Soma das duas BudgetView (a mesma da Home de cada um). Lado nulo conta zero.
 * Pode gastar negativo soma como negativo. Sem fonte de renda, `noIncome` avisa
 * mas o numero continua inteiro.
 * @param {{ first: BudgetView | null | undefined, second: BudgetView | null | undefined }} args
 * @returns {CoupleBudget}
 */
export function coupleBudget({ first, second }) {
  const sides = [first ?? null, second ?? null]
  let safeTogetherCents = 0
  let spentTogetherCents = 0
  let sobraTogetherCents = 0
  let sobraProjected = false
  for (const view of sides) {
    if (!view) continue
    safeTogetherCents += view.safeCents
    spentTogetherCents += view.spend.totalCents
    sobraTogetherCents += view.monthInOne.sobra.cents
    if (view.monthInOne.sobra.projected) sobraProjected = true
  }
  return {
    safeTogetherCents,
    spentTogetherCents,
    sobraTogetherCents,
    sobraProjected,
    noIncome: {
      first: sides[0] ? !sides[0].income.hasIncome : false,
      second: sides[1] ? !sides[1].income.hasIncome : false,
    },
    rows: limitRows(sides[0], sides[1]),
  }
}
