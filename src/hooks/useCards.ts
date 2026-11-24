import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  subscribeCards,
  subscribeCardSettings,
  type Card,
} from '@/services/cards.service'
import type { CardSettings } from '@/types'

/** Cartao com a configuracao que o dono informou (settings) e o nome a exibir (apelido ou nome do banco). */
export type CardWithSettings = Card & {
  settings: CardSettings | null
  displayName: string
}

const FALLBACK_NAME = 'Cartão de crédito'

/**
 * Cartoes do dono em tempo real, ja com a configuracao de cada um, com carregando e erro (de
 * qualquer das duas assinaturas). `retry` refaz as assinaturas depois de uma falha.
 */
export function useCards() {
  const [rawCards, setRawCards] = useState<Card[]>([])
  const [rawSettings, setRawSettings] = useState<CardSettings[]>([])
  const [cardsReady, setCardsReady] = useState(false)
  const [settingsReady, setSettingsReady] = useState(false)
  const [cardsError, setCardsError] = useState<Error | null>(null)
  const [settingsError, setSettingsError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(
    () =>
      subscribeCards(
        (list) => {
          setRawCards(list)
          setCardsError(null)
          setCardsReady(true)
        },
        (err) => {
          setCardsError(err)
          setCardsReady(true)
        }
      ),
    [attempt]
  )

  useEffect(
    () =>
      subscribeCardSettings(
        (list) => {
          setRawSettings(list)
          setSettingsError(null)
          setSettingsReady(true)
        },
        (err) => {
          setSettingsError(err)
          setSettingsReady(true)
        }
      ),
    [attempt]
  )

  const cards = useMemo<CardWithSettings[]>(() => {
    const byId = new Map(rawSettings.map((s) => [s.accountId, s]))
    return rawCards.map((card) => {
      const settings = byId.get(card.id) ?? null
      const nickname = settings?.nickname.trim() ?? ''
      return { ...card, settings, displayName: nickname || card.name || FALLBACK_NAME }
    })
  }, [rawCards, rawSettings])

  const retry = useCallback(() => {
    setCardsReady(false)
    setSettingsReady(false)
    setCardsError(null)
    setSettingsError(null)
    setAttempt((n) => n + 1)
  }, [])

  return {
    cards,
    loading: !(cardsReady && settingsReady),
    error: cardsError ?? settingsError,
    retry,
  }
}
