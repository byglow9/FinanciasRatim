import { useState, useEffect, useCallback } from 'react'
import type { FixedExpense, FixedExpensePayment, PersonType } from '@/types'
import {
  getFixedExpenses,
  addFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  getPaymentsForMonth,
  markAsPaid,
  unmarkAsPaid,
} from '@/services/fixedExpenses.service'
import { getMonth, getYear } from 'date-fns'

export function useFixedExpenses(person?: PersonType | 'conjunto', selectedMonth?: Date) {
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [payments, setPayments] = useState<FixedExpensePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const month = selectedMonth ? getMonth(selectedMonth) + 1 : getMonth(new Date()) + 1
  const year = selectedMonth ? getYear(selectedMonth) : getYear(new Date())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [expensesData, paymentsData] = await Promise.all([
        getFixedExpenses(person),
        getPaymentsForMonth(month, year),
      ])
      setExpenses(expensesData)
      setPayments(paymentsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setLoading(false)
    }
  }, [person, month, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const add = async (expense: Omit<FixedExpense, 'id' | 'createdAt'>) => {
    await addFixedExpense(expense)
    await fetchData()
  }

  const update = async (id: string, expense: Partial<Omit<FixedExpense, 'id' | 'createdAt'>>) => {
    await updateFixedExpense(id, expense)
    await fetchData()
  }

  const remove = async (id: string) => {
    await deleteFixedExpense(id)
    await fetchData()
  }

  const togglePaid = async (expenseId: string, amount: number) => {
    const existingPayment = payments.find(
      (p) => p.fixedExpenseId === expenseId
    )

    if (existingPayment) {
      await unmarkAsPaid(existingPayment.id)
    } else {
      await markAsPaid(expenseId, month, year, amount)
    }
    await fetchData()
  }

  const isExpensePaid = (expenseId: string): boolean => {
    return payments.some((p) => p.fixedExpenseId === expenseId)
  }

  const getPaymentForExpense = (expenseId: string): FixedExpensePayment | undefined => {
    return payments.find((p) => p.fixedExpenseId === expenseId)
  }

  // Filtrar pagamentos apenas das despesas da pessoa atual
  const expenseIds = new Set(expenses.map((e) => e.id))
  const personPayments = payments.filter((p) => expenseIds.has(p.fixedExpenseId))

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalPaid = personPayments.reduce((sum, p) => sum + p.paidAmount, 0)
  const totalPending = totalExpenses - totalPaid
  const paidCount = personPayments.length
  const activeCount = expenses.filter((e) => e.isActive).length

  return {
    expenses,
    payments,
    loading,
    error,
    add,
    update,
    remove,
    togglePaid,
    isExpensePaid,
    getPaymentForExpense,
    refetch: fetchData,
    totals: {
      total: totalExpenses,
      paid: totalPaid,
      pending: totalPending,
      paidCount,
      activeCount,
    },
  }
}
