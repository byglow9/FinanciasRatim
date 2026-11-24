import { useCallback, useEffect, useState } from 'react'
import { subscribeCards, type Card } from '@/services/cards.service'

/**
 * Cartoes do dono em tempo real, com carregando e erro. `retry` refaz a assinatura depois de uma falha.
 */
export function useCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(
    () =>
      subscribeCards(
        (list) => {
          setCards(list)
          setError(null)
          setLoading(false)
        },
        (err) => {
          setError(err)
          setLoading(false)
        }
      ),
    [attempt]
  )

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  return { cards, loading, error, retry }
}
