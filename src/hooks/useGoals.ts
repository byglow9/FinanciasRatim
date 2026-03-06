import { useState, useEffect, useCallback } from 'react'
import type { Goal } from '@/types'
import {
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
} from '@/services/goals.service'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getGoals()
      setGoals(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch goals'))
    } finally {
      setLoading(false)
    }
  }, [])

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

  const updateProgress = async (id: string, currentAmount: number) => {
    await updateGoalProgress(id, currentAmount)
    await fetchGoals()
  }

  return {
    goals,
    loading,
    error,
    add,
    update,
    remove,
    updateProgress,
    refetch: fetchGoals,
  }
}
