import { useState, useEffect, useCallback } from 'react'
import type { SavingsTransaction } from '@/types'
import {
  getSavingsTransactions,
  addSavingsTransaction,
  deleteSavingsTransaction,
  calculateSavingsBalance,
} from '@/services/savings.service'

export function useSavings() {
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getSavingsTransactions()
      setTransactions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch savings'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const add = async (transaction: Omit<SavingsTransaction, 'id' | 'createdAt'>) => {
    await addSavingsTransaction(transaction)
    await fetchTransactions()
  }

  const remove = async (id: string) => {
    await deleteSavingsTransaction(id)
    await fetchTransactions()
  }

  const balance = calculateSavingsBalance(transactions)

  const totalDeposits = transactions
    .filter((t) => t.type === 'deposito')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalWithdrawals = transactions
    .filter((t) => t.type === 'saque')
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    transactions,
    loading,
    error,
    add,
    remove,
    refetch: fetchTransactions,
    balance,
    totalDeposits,
    totalWithdrawals,
  }
}
