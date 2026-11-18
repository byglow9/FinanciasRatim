import type { FixedExpense, FixedExpensePayment, PersonType, Transaction } from '@/types'
import { getTransactionsInRange } from '@/services/transactions.service'
import { getFixedExpenses, getPaymentsForMonths } from '@/services/fixedExpenses.service'
import { cycleMonths } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'
import { toCents } from '@shared/core/ledger.js'
import type { Bill, BillPayment } from '@shared/core/budget.js'

export interface CycleInputs {
  transactions: Transaction[]
  bills: Bill[]
  payments: BillPayment[]
}

/**
 * Contas fixas no formato do nucleo: so as ativas da pessoa. Conta 'conjunto' fica de fora (PR-03).
 * Adaptador puro, sem calculo: os reais viram centavos inteiros e mais nada.
 */
export function toBills(expenses: FixedExpense[], person: PersonType): Bill[] {
  return expenses
    .filter((e) => e.isActive && e.person === person)
    .map((e) => ({ id: e.id, name: e.name, dueDay: e.dueDay, amountCents: toCents(e.amount) }))
}

/** Pagamentos no formato do nucleo (reais viram centavos inteiros). */
export function toBillPayments(payments: FixedExpensePayment[]): BillPayment[] {
  return payments.map((p) => ({
    billId: p.fixedExpenseId,
    month: p.month,
    year: p.year,
    paidCents: toCents(p.paidAmount),
  }))
}

/**
 * Entradas de um ciclo para uma pessoa: lancamentos da janela, contas e pagamentos dos meses
 * cobertos, em paralelo. Nenhum calculo: quem compoe o numero e o nucleo (buildBudgetView).
 */
export async function loadCycleInputs(person: PersonType, cycle: Cycle): Promise<CycleInputs> {
  const [transactions, expenses, payments] = await Promise.all([
    getTransactionsInRange(person, cycle.start, cycle.end),
    getFixedExpenses(person),
    getPaymentsForMonths(cycleMonths(cycle)),
  ])
  return {
    transactions,
    bills: toBills(expenses, person),
    payments: toBillPayments(payments),
  }
}
