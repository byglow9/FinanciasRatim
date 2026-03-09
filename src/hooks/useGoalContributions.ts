import { useState, useEffect, useCallback } from 'react'
import type { GoalContribution } from '@/types'
import { getContributions } from '@/services/goalContributions.service'

export function useGoalContributions(goalId: string | null) {
  const [contributions, setContributions] = useState<GoalContribution[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchContributions = useCallback(async () => {
    if (!goalId) {
      setContributions([])
      return
    }

    try {
      setLoading(true)
      const data = await getContributions(goalId)
      setContributions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch contributions'))
    } finally {
      setLoading(false)
    }
  }, [goalId])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

  return {
    contributions,
    loading,
    error,
    refetch: fetchContributions,
  }
}
