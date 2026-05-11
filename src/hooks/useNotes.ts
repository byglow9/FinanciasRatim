import { useState, useEffect, useCallback } from 'react'
import type { Note, PersonType } from '@/types'
import { getNotes, addNote, updateNote, deleteNote } from '@/services/notes.service'

export function useNotes(person: PersonType) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getNotes(person)
      setNotes(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar anotações'))
    } finally {
      setLoading(false)
    }
  }, [person])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const add = async (note: Omit<Note, 'id' | 'createdAt'>) => {
    await addNote(note)
    await fetchData()
  }

  const update = async (id: string, note: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    await updateNote(id, note)
    await fetchData()
  }

  const remove = async (id: string) => {
    await deleteNote(id)
    await fetchData()
  }

  return { notes, loading, error, add, update, remove, refetch: fetchData }
}
