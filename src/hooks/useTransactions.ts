import { useState, useEffect, useCallback } from 'react'
import type { Transaction, PersonType } from '@/types'
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/services/transactions.service'

export function useTransactions(person: PersonType, selectedMonth: Date) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getTransactions(person, selectedMonth)
      setTransactions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'))
    } finally {
      setLoading(false)
    }
  }, [person, selectedMonth])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const add = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    await addTransaction(transaction)
    await fetchTransactions()
  }

  const update = async (id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    await updateTransaction(id, transaction)
    await fetchTransactions()
  }

  const remove = async (id: string) => {
    await deleteTransaction(id)
    await fetchTransactions()
  }

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'entrada') {
        acc.entradas += t.amount
      } else {
        acc.saidas += t.amount
      }
      return acc
    },
    { entradas: 0, saidas: 0 }
  )

  return {
    transactions,
    loading,
    error,
    add,
    update,
    remove,
    refetch: fetchTransactions,
    totals: {
      ...totals,
      saldo: totals.entradas - totals.saidas,
    },
  }
}
