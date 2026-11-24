// @ts-check
// Numero central do app em funcoes puras: gasto por categoria com "Gasto geral"
// (LIM-02, LIM-03, D-04), renda do ciclo (LIM-06, PR-01), contas do ciclo
// (CENT-06) e o "Pode gastar" (D-05) com o valor por dia (D-06). A composicao
// buildBudgetView e o unico caminho do numero: Home, sheet, Central e alertas
// leem dela, para o arco e a Central nunca divergirem.
//
// Formula (D-05): Pode gastar = renda efetiva - contas do ciclo - todo gasto nao
// fixo (inclui o Gasto geral). Limites por categoria so acompanham e avisam; nao
// entram na conta e nunca bloqueiam nada (D-09).
// Renda efetiva (PR-01) = maior entre a renda esperada do ciclo e a recebida.
// Por dia (D-06) = piso do Pode gastar dividido pelos dias que faltam, contando
// hoje. Ritmo (D-07) compara o gasto com o esperado ate hoje em 5 niveis.
// "O mes em uma conta" (LIM-05) mostra Entra, Fixos, Dia a dia e Sobra; a Sobra
// do ciclo atual e uma projecao pela media diaria (PR-05), a do passado e real.
// Premissas implementadas: PR-01, PR-02 (conta paga pelo banco conta duas vezes,
// sem casamento), PR-05 (projecao por media diaria), PR-06 (Investimentos conta
// como gasto), PR-07 (categoria arquivada: limite ignorado no ciclo atual),
// PR-14 (transfer true fora do gasto) e PR-19 (cortes do ritmo 75/100/115).
//
// Tudo em centavos inteiros e sem relogio: o "agora" e sempre argumento.

import { DEFAULT_TZ } from './time.js'
import { toCents } from './ledger.js'
import { resolveCategoryId } from './categories.js'
import { billOccurrences, cycleDay, daysLeftInCycle, isCycleOver } from './cycle.js'
import { limitState, limitsForCycle, normalizePersonConfig } from './limits.js'

/**
 * Lancamento em reais, como o app guarda. Compra do cartao (cardKind purchase)
 * e saida comum e conta pela data da compra (CARD-03); pagamento da fatura e
 * estorno (cardKind payment e refund) carregam transfer true e ficam fora do
 * gasto e da renda (CARD-04), sem mudar a logica deste modulo.
 * @typedef {{
 *   type: 'entrada' | 'saida' | string,
 *   amount: number,
 *   date: Date,
 *   category?: string,
 *   categoryId?: string,
 *   transfer?: boolean,
 *   cardKind?: 'purchase' | 'refund' | 'payment' | string,
 *   id?: string,
 *   description?: string,
 * }} Tx
 */

/** @typedef {import('./categories.js').CategoryDef} CategoryDef */
/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./cycle.js').DateParts} DateParts */
/** @typedef {import('./limits.js').PersonConfig} PersonConfig */

/**
 * Linha de uma categoria com limite no ciclo. `pct` e inteiro (para baixo) e
 * NAO satura em 100: 45000 de 40000 da 112 (a barra da tela limita sozinha).
 * @typedef {{
 *   categoryId: string,
 *   spentCents: number,
 *   limitCents: number,
 *   state: 'ok' | 'warn' | 'over',
 *   pct: number,
 *   remainingCents: number,
 *   excessCents: number,
 *   txs: Tx[],
 * }} BudgetRow
 */

/**
 * @typedef {{
 *   rows: BudgetRow[],
 *   generalCents: number,
 *   generalByCategory: Array<{ categoryId: string | null, cents: number }>,
 *   totalCents: number,
 * }} SpendResult
 */

/**
 * @typedef {{
 *   expectedCents: number,
 *   receivedCents: number,
 *   effectiveCents: number,
 *   hasIncome: boolean,
 * }} IncomeResult
 */

/**
 * Conta (bill) e pagamento, no formato que o adaptador do cliente entrega.
 * @typedef {{ id: string, name: string, dueDay: number, amountCents: number }} Bill
 * @typedef {{ billId: string, month: number, year: number, paidCents: number }} BillPayment
 */

/**
 * @typedef {{
 *   billId: string,
 *   name: string,
 *   dueDay: number,
 *   occurrence: DateParts,
 *   plannedCents: number,
 *   paid: boolean,
 *   paidCents: number,
 *   costCents: number,
 * }} BillItem
 */

/**
 * @typedef {{
 *   totalCents: number,
 *   paidCount: number,
 *   totalCount: number,
 *   items: BillItem[],
 * }} BillsResult
 */

/**
 * @typedef {{
 *   cycleKey: string,
 *   isPast: boolean,
 *   daysTotal: number,
 *   daysElapsed: number,
 *   daysLeft: number,
 *   income: IncomeResult,
 *   bills: BillsResult,
 *   spend: SpendResult,
 *   safeCents: number,
 *   budgetCents: number,
 *   perDayCents: number,
 *   restPct: number,
 *   rhythmLevel: RhythmLevel | null,
 *   verdictSuppressed: boolean,
 *   monthInOne: MonthInOne,
 *   counts: { ok: number, warn: number, over: number, total: number },
 * }} BudgetView
 */

/**
 * "O mes em uma conta": quatro linhas. `sobra.projected` diz se a tela mostra o
 * chip de estimativa (ciclo atual) ou o valor real (ciclo passado).
 * @typedef {{
 *   entra: { expectedCents: number, receivedCents: number, effectiveCents: number },
 *   fixos: { totalCents: number, paidCount: number, totalCount: number },
 *   diaADia: { spentCents: number },
 *   sobra: { cents: number, projected: boolean },
 * }} MonthInOne
 */

/**
 * Nivel do ritmo: 0 Folgado, 1 No ritmo, 2 Atencao, 3 Acima do ritmo, 4 Estourou.
 * @typedef {0 | 1 | 2 | 3 | 4} RhythmLevel
 */

/**
 * Cortes do ritmo em porcentagem do gasto esperado ate hoje (PR-19, D-07).
 * @typedef {{ folgado: number, noRitmo: number, atencao: number }} RhythmCuts
 */

const URGENCY = { over: 0, warn: 1, ok: 2 }

/**
 * @param {unknown} v
 * @returns {v is number}
 */
function isInt(v) {
  return typeof v === 'number' && Number.isInteger(v)
}

/**
 * Valor da propriedade propria de um mapa de limites (nunca herdada).
 * @param {Record<string, number>} map
 * @param {string | null} id
 * @returns {number | undefined}
 */
function ownLimit(map, id) {
  if (id === null || !map || !Object.prototype.hasOwnProperty.call(map, id)) return undefined
  return map[id]
}

/**
 * Gasto do dia a dia: saida que nao e transferencia (D-03, PR-14). O criterio
 * e o tipo do lancamento, nunca o campo kind da categoria.
 * @param {Pick<Tx, 'type' | 'transfer'>} tx
 * @returns {boolean}
 */
export function isDayToDay(tx) {
  return tx.type === 'saida' && tx.transfer !== true
}

/**
 * Comparador de urgencia: passou, atencao, em dia; dentro do estado, maior
 * porcentagem primeiro; empate por categoryId.
 * @param {Pick<BudgetRow, 'state' | 'pct' | 'categoryId'>} a
 * @param {Pick<BudgetRow, 'state' | 'pct' | 'categoryId'>} b
 * @returns {number}
 */
export function sortByUrgency(a, b) {
  const byState = URGENCY[a.state] - URGENCY[b.state]
  if (byState !== 0) return byState
  if (b.pct !== a.pct) return b.pct - a.pct
  if (a.categoryId < b.categoryId) return -1
  return a.categoryId > b.categoryId ? 1 : 0
}

/**
 * Gasto do ciclo por categoria. Categoria com limite vira linha; o resto (sem
 * limite, sem categoria, ou arquivada no ciclo atual) soma no Gasto geral (D-04).
 * Os lancamentos ja devem ser do ciclo (a composicao filtra pela janela).
 * @param {{
 *   transactions: Tx[],
 *   categoryDefs: CategoryDef[],
 *   limitsByCategory: Record<string, number>,
 *   cycleKey?: string,
 *   includeArchivedLimits?: boolean,
 * }} args
 * @returns {SpendResult}
 */
export function spendByCategory({
  transactions,
  categoryDefs,
  limitsByCategory,
  includeArchivedLimits = false,
}) {
  /** @type {Map<string | null, { cents: number, txs: Tx[] }>} */
  const byCat = new Map()
  let totalCents = 0
  for (const tx of transactions) {
    if (!isDayToDay(tx)) continue
    const cents = toCents(tx.amount)
    if (!Number.isFinite(cents)) continue
    const id = tx.categoryId ?? resolveCategoryId(tx.category ?? '', categoryDefs)
    const slot = byCat.get(id) ?? { cents: 0, txs: [] }
    slot.cents += cents
    slot.txs.push(tx)
    byCat.set(id, slot)
    totalCents += cents
  }

  const archived = new Set(categoryDefs.filter((d) => d.archived).map((d) => d.id))
  /** @type {BudgetRow[]} */
  const rows = []
  const rowIds = new Set()
  for (const categoryId of Object.keys(limitsByCategory ?? {})) {
    const limit = ownLimit(limitsByCategory, categoryId)
    if (limit === undefined) continue
    if (archived.has(categoryId) && !includeArchivedLimits) continue
    const slot = byCat.get(categoryId)
    const spentCents = slot ? slot.cents : 0
    const info = limitState(spentCents, limit)
    if (info === null) continue
    rowIds.add(categoryId)
    const txs = slot ? [...slot.txs].sort((a, b) => b.date.getTime() - a.date.getTime()) : []
    rows.push({
      categoryId,
      spentCents,
      limitCents: limit,
      state: info.state,
      pct: Math.floor((Math.max(spentCents, 0) * 100) / limit),
      remainingCents: info.remainingCents,
      excessCents: info.excessCents,
      txs,
    })
  }
  rows.sort(sortByUrgency)

  let generalCents = 0
  /** @type {Array<{ categoryId: string | null, cents: number }>} */
  const generalByCategory = []
  for (const [categoryId, slot] of byCat) {
    if (categoryId !== null && rowIds.has(categoryId)) continue
    generalCents += slot.cents
    generalByCategory.push({ categoryId, cents: slot.cents })
  }
  generalByCategory.sort((a, b) => {
    if (a.categoryId === null) return b.categoryId === null ? 0 : 1
    if (b.categoryId === null) return -1
    if (b.cents !== a.cents) return b.cents - a.cents
    return a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0
  })

  return { rows, generalCents, generalByCategory, totalCents }
}

/**
 * Renda do ciclo (PR-01): esperada = sobreposicao do ciclo, senao a base;
 * recebida = entradas do ciclo (sem transferencia); efetiva = a maior das duas.
 * @param {{ config: unknown, cycleKey: string, transactions: Tx[] }} args
 * @returns {IncomeResult}
 */
export function incomeForCycle({ config, cycleKey, transactions }) {
  const cfg = normalizePersonConfig(config)
  const override = Object.prototype.hasOwnProperty.call(cfg.incomeOverrides, cycleKey)
    ? cfg.incomeOverrides[cycleKey]
    : undefined
  const expectedCents = override ?? cfg.expectedIncomeCents
  let receivedCents = 0
  for (const tx of transactions) {
    if (tx.type !== 'entrada' || tx.transfer === true) continue
    const cents = toCents(tx.amount)
    if (Number.isFinite(cents)) receivedCents += cents
  }
  return {
    expectedCents,
    receivedCents,
    effectiveCents: Math.max(expectedCents, receivedCents),
    hasIncome: expectedCents > 0 || receivedCents > 0,
  }
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
 * Contas do ciclo: cada conta vira uma item por ocorrencia dentro do ciclo, e o
 * pagamento casa por conta, mes e ano da ocorrencia (CENT-06). O custo e o valor
 * pago quando ha pagamento, senao o planejado. Nao pagas primeiro, por data.
 * @param {{ bills: Bill[], payments: BillPayment[], cycle: Cycle, tz?: string }} args
 * @returns {BillsResult}
 */
export function billsForCycle({ bills, payments, cycle, tz = DEFAULT_TZ }) {
  /** @type {Map<string, BillPayment>} */
  const paidBy = new Map()
  for (const p of payments ?? []) paidBy.set(`${p.billId}|${p.year}|${p.month}`, p)

  /** @type {BillItem[]} */
  const items = []
  for (const bill of bills ?? []) {
    if (!isInt(bill.dueDay) || bill.dueDay < 1 || bill.dueDay > 31) continue
    const plannedCents = isInt(bill.amountCents) ? bill.amountCents : 0
    for (const occurrence of billOccurrences(bill.dueDay, cycle, tz)) {
      const payment = paidBy.get(`${bill.id}|${occurrence.year}|${occurrence.month}`)
      const paid = payment !== undefined
      const paidCents = paid && isInt(payment.paidCents) ? payment.paidCents : 0
      items.push({
        billId: bill.id,
        name: bill.name,
        dueDay: bill.dueDay,
        occurrence,
        plannedCents,
        paid,
        paidCents,
        costCents: paid ? paidCents : plannedCents,
      })
    }
  }
  items.sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    const byDate = dateKey(a.occurrence) - dateKey(b.occurrence)
    if (byDate !== 0) return byDate
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })

  let totalCents = 0
  let paidCount = 0
  for (const item of items) {
    totalCents += item.costCents
    if (item.paid) paidCount += 1
  }
  return { totalCents, paidCount, totalCount: items.length, items }
}

/**
 * Pode gastar (D-05): renda efetiva menos contas do ciclo menos todo gasto nao
 * fixo. Pode ser negativo.
 * @param {{ incomeCents: number, fixedCents: number, spentCents: number }} args
 * @returns {number}
 */
export function safeToSpend({ incomeCents, fixedCents, spentCents }) {
  return incomeCents - fixedCents - spentCents
}

/**
 * Quanto posso por dia (D-06): piso do restante dividido pelos dias que faltam,
 * contando hoje. Zero quando nao ha restante ou nao faltam dias.
 * @param {number} safeCents
 * @param {number} daysLeft
 * @returns {number}
 */
export function perDayCents(safeCents, daysLeft) {
  if (!(safeCents > 0) || !(daysLeft > 0)) return 0
  return Math.floor(safeCents / daysLeft)
}

/**
 * Porcentagem de 0 a 100 do dinheiro que resta sobre renda menos contas.
 * @param {{ safeCents: number, budgetCents: number }} args
 * @returns {number}
 */
export function restPct({ safeCents, budgetCents }) {
  if (!(budgetCents > 0) || !(safeCents > 0)) return 0
  if (safeCents >= budgetCents) return 100
  return Math.floor((safeCents * 100) / budgetCents)
}

/**
 * Cortes do ritmo (PR-19): ate 75% do esperado e Folgado, ate 100% No ritmo, ate
 * 115% Atencao e acima disso Acima do ritmo. Constante e parametro de `rhythm`
 * para o dono ajustar depois do uso real sem mexer nas telas.
 * @type {RhythmCuts}
 */
export const RHYTHM_CUTS = Object.freeze({ folgado: 75, noRitmo: 100, atencao: 115 })

/**
 * Ritmo do ciclo em 5 niveis (D-07). Estourou e o Pode gastar negativo. Os demais
 * comparam o gasto real com o esperado ate hoje por multiplicacao cruzada de
 * inteiros (gasto * dias do ciclo * 100 contra orcamento * dias decorridos *
 * corte), sem divisao nem ponto flutuante. Sem folga no orcamento (renda menos
 * contas menor ou igual a zero) e sem estouro devolve Atencao.
 * @param {{
 *   incomeCents: number,
 *   fixedCents: number,
 *   spentCents: number,
 *   daysElapsed: number,
 *   daysTotal: number,
 *   cuts?: RhythmCuts,
 * }} args
 * @returns {RhythmLevel}
 */
export function rhythm({
  incomeCents,
  fixedCents,
  spentCents,
  daysElapsed,
  daysTotal,
  cuts = RHYTHM_CUTS,
}) {
  if (safeToSpend({ incomeCents, fixedCents, spentCents }) < 0) return 4
  const budget = incomeCents - fixedCents
  if (budget <= 0) return 2
  const elapsed = Math.max(daysElapsed, 1)
  const total = Math.max(daysTotal, 1)
  const spent = spentCents * total * 100
  if (spent <= budget * elapsed * cuts.folgado) return 0
  if (spent <= budget * elapsed * cuts.noRitmo) return 1
  if (spent <= budget * elapsed * cuts.atencao) return 2
  return 3
}

/**
 * Projecao do gasto do ciclo pela media diaria (PR-05): gasto * dias do ciclo /
 * dias decorridos, arredondado. E so uma estimativa.
 * @param {{ spentCents: number, daysElapsed: number, daysTotal: number }} args
 * @returns {number}
 */
export function projectCycle({ spentCents, daysElapsed, daysTotal }) {
  return Math.round((spentCents * Math.max(daysTotal, 1)) / Math.max(daysElapsed, 1))
}

/**
 * "O mes em uma conta" (LIM-05): Entra, Fixos, Dia a dia e Sobra. A Sobra e a
 * renda efetiva menos fixos menos o gasto projetado no ciclo atual, ou menos o
 * gasto real no ciclo passado.
 * @param {{
 *   income: IncomeResult,
 *   bills: BillsResult,
 *   spentCents: number,
 *   daysElapsed: number,
 *   daysTotal: number,
 *   isPast: boolean,
 * }} args
 * @returns {MonthInOne}
 */
export function monthInOne({ income, bills, spentCents, daysElapsed, daysTotal, isPast }) {
  const dayToDay = isPast ? spentCents : projectCycle({ spentCents, daysElapsed, daysTotal })
  return {
    entra: {
      expectedCents: income.expectedCents,
      receivedCents: income.receivedCents,
      effectiveCents: income.effectiveCents,
    },
    fixos: {
      totalCents: bills.totalCents,
      paidCount: bills.paidCount,
      totalCount: bills.totalCount,
    },
    diaADia: { spentCents },
    sobra: { cents: income.effectiveCents - bills.totalCents - dayToDay, projected: !isPast },
  }
}

/**
 * Efeito de um lancamento no Pode gastar, para o sheet mostrar antes de gravar
 * (LIM-04). Gasto subtrai; receita so sobe o Pode gastar pela parte que passa da
 * renda esperada (PR-01); Porquinho nunca muda (D-03). Valor zero nao muda nada.
 * Le a view pronta e nao recalcula a composicao.
 * @param {{ safeCents: number, income: IncomeResult }} view
 * @param {'gasto' | 'receita' | 'porquinho'} kind
 * @param {number} cents
 * @returns {{ safeAfterCents: number, overspends: boolean, raisesSafe: boolean }}
 */
export function previewLaunch(view, kind, cents) {
  const unchanged = { safeAfterCents: view.safeCents, overspends: false, raisesSafe: false }
  if (!Number.isFinite(cents) || cents <= 0) return unchanged
  if (kind === 'gasto') {
    const safeAfterCents = view.safeCents - cents
    return { safeAfterCents, overspends: safeAfterCents < 0, raisesSafe: false }
  }
  if (kind === 'receita') {
    const newReceived = view.income.receivedCents + cents
    const newEffective = Math.max(view.income.expectedCents, newReceived)
    const delta = newEffective - view.income.effectiveCents
    return { safeAfterCents: view.safeCents + delta, overspends: false, raisesSafe: delta > 0 }
  }
  return unchanged
}

/**
 * Composicao unica do numero do ciclo. Home, sheet, Central e alertas consomem
 * so isto. Lancamentos fora da janela do ciclo sao ignorados.
 * @param {{
 *   now: Date,
 *   cycle: Cycle,
 *   config: unknown,
 *   transactions: Tx[],
 *   bills: Bill[],
 *   payments: BillPayment[],
 *   categoryDefs: CategoryDef[],
 *   suppressVerdict?: boolean,
 *   tz?: string,
 * }} args
 * @returns {BudgetView}
 */
export function buildBudgetView({
  now,
  cycle,
  config,
  transactions,
  bills,
  payments,
  categoryDefs,
  suppressVerdict = false,
  tz = DEFAULT_TZ,
}) {
  const cfg = normalizePersonConfig(config)
  const start = cycle.start.getTime()
  const end = cycle.end.getTime()
  const inCycle = (transactions ?? []).filter((tx) => {
    const t = tx.date.getTime()
    return t >= start && t <= end
  })

  const isPast = isCycleOver(cycle, now)
  const daysTotal = cycle.days
  const daysElapsed = cycleDay(cycle, now, tz)
  const daysLeft = daysLeftInCycle(cycle, now, tz)

  const income = incomeForCycle({ config: cfg, cycleKey: cycle.key, transactions: inCycle })
  const billsResult = billsForCycle({ bills, payments, cycle, tz })
  const spend = spendByCategory({
    transactions: inCycle,
    categoryDefs,
    limitsByCategory: limitsForCycle(cfg.limits, cycle.key),
    cycleKey: cycle.key,
    includeArchivedLimits: isPast,
  })

  const safeCents = safeToSpend({
    incomeCents: income.effectiveCents,
    fixedCents: billsResult.totalCents,
    spentCents: spend.totalCents,
  })
  const budgetCents = income.effectiveCents - billsResult.totalCents

  // O veredito (ritmo) so sai quando ha renda, o ciclo esta em andamento e o dado
  // do banco nao esta velho; o numero absoluto continua valendo (T-03-18).
  const rhythmLevel =
    !isPast && income.hasIncome && !suppressVerdict
      ? rhythm({
          incomeCents: income.effectiveCents,
          fixedCents: billsResult.totalCents,
          spentCents: spend.totalCents,
          daysElapsed,
          daysTotal,
        })
      : null

  const counts = { ok: 0, warn: 0, over: 0, total: spend.rows.length }
  for (const row of spend.rows) counts[row.state] += 1

  return {
    cycleKey: cycle.key,
    isPast,
    daysTotal,
    daysElapsed,
    daysLeft,
    income,
    bills: billsResult,
    spend,
    safeCents,
    budgetCents,
    perDayCents: isPast ? 0 : perDayCents(safeCents, daysLeft),
    restPct: restPct({ safeCents, budgetCents }),
    rhythmLevel,
    verdictSuppressed: suppressVerdict === true,
    monthInOne: monthInOne({
      income,
      bills: billsResult,
      spentCents: spend.totalCents,
      daysElapsed,
      daysTotal,
      isPast,
    }),
    counts,
  }
}
