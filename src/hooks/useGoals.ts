import { useState, useEffect, useCallback } from 'react'
import type { Goal, PersonType } from '@/types'
import {
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
} from '@/services/goals.service'
import { addContribution } from '@/services/goalContributions.service'

export function useGoals(person?: PersonType) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getGoals(person)
      setGoals(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch goals'))
    } finally {
      setLoading(false)
    }
  }, [person])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const add = async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    await addGoal(goal)
    await fetchGoals()
  }

  const update = async (id: string, goal: Partial<Omit<Goal, 'id' | 'createdAt'>>) => {
    await updateGoal(id, goal)
    await fetchGoals()
  }

  const remove = async (id: string) => {
    await deleteGoal(id)
    await fetchGoals()
  }

  const contribute = async (goalId: string, amount: number, description?: string) => {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) throw new Error('Meta nao encontrada')

    await addContribution(goalId, amount, goal.currentAmount, description)
    await fetchGoals()
  }

  return {
    goals,
    loading,
    error,
    add,
    update,
    remove,
    contribute,
    refetch: fetchGoals,
  }
}
