import { useState, useEffect, useCallback } from 'react'
import type { EventCategory } from '@/types'
import {
  getEventCategories,
  addEventCategory,
  updateEventCategory,
  deleteEventCategory,
} from '@/services/eventCategories.service'

export function useEventCategories() {
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getEventCategories()
      setCategories(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar categorias'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const add = async (category: Omit<EventCategory, 'id' | 'createdAt'>) => {
    const id = await addEventCategory(category)
    await fetchData()
    return id
  }

  const update = async (id: string, category: Partial<Omit<EventCategory, 'id' | 'createdAt'>>) => {
    await updateEventCategory(id, category)
    await fetchData()
  }

  const remove = async (id: string) => {
    await deleteEventCategory(id)
    await fetchData()
  }

  return { categories, loading, error, add, update, remove, refetch: fetchData }
}
