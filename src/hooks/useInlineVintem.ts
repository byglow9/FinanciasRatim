import { useCallback, useEffect, useMemo, useState } from 'react'
import { useVintem } from '@/contexts/VintemContext'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useHomePigVisible, usePeekOpen } from '@/lib/vintem/stage'
import type { VintemState } from '@/components/vintem/Vintem'
import type { CategoryDef } from '@/types'
import type { BudgetRow } from '@shared/core/budget.js'
import { categoryDisplayName } from '@shared/core/categories.js'
import { inlineMood } from '@shared/core/vintemMood.js'

// Linha do Vintem em "Limites do mes" (D-16, UI-SPEC S3): humor e fala sobre a categoria mais
// critica. A fala e sorteada em efeito (nunca na renderizacao) quando essa categoria muda e a
// linha nunca usa a regiao viva nem a fala da Home. Sem veredito com dado velho nem no perfil
// do parceiro (T-04-16-02).

export interface UseInlineVintemArgs {
  rows: BudgetRow[]
  /** Dado velho: sem elogio nem bronca, a linha some. */
  neutralOk: boolean
  categoryDefs: CategoryDef[]
}

export interface InlineVintem {
  visible: boolean
  state: VintemState
  text: string | null
  popKey: number
  /** Toque no Vintem: outra fala sobre a mesma categoria, sem giro. */
  onTap: () => void
  /** Toque no balao: a linha some ate o hook montar de novo. */
  onDismiss: () => void
}

export function useInlineVintem({ rows, neutralOk, categoryDefs }: UseInlineVintemArgs): InlineVintem {
  const { tone, pickPhrase } = useVintem()
  const { readOnly } = useReadOnly()

  const mood = useMemo(() => inlineMood({ rows, tone }), [rows, tone])
  const top = rows[0]
  const hidden = readOnly || neutralOk || mood === null || top === undefined

  // Primitivos da categoria mais critica: a fala so e refeita quando um deles muda.
  const topId = hidden ? null : top.categoryId
  const topPct = hidden ? 0 : top.pct
  const topRemaining = hidden ? 0 : top.remainingCents
  const topName = useMemo(
    () => (topId === null ? '' : categoryDisplayName({ categoryId: topId }, categoryDefs) || topId),
    [topId, categoryDefs],
  )

  const [text, setText] = useState<string | null>(null)
  const [popKey, setPopKey] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  // Um porco de cada vez: a linha se cala com o da Home na tela ou com um de lado aberto.
  const homePig = useHomePigVisible()
  const peek = usePeekOpen()

  const draw = useCallback(() => {
    const chosen = pickPhrase({
      situation: 'central',
      raw: { categoria: topName, pct: topPct, restanteCents: topRemaining },
      // Tamanho maximo da fala da situacao `central` (UI-SPEC S3, P-12).
      maxLen: 80,
    })
    setText(chosen === null ? null : chosen.text)
    setPopKey((k) => k + 1)
  }, [pickPhrase, topName, topPct, topRemaining])

  useEffect(() => {
    if (topId === null) {
      // O sorteio usa acaso e sessionStorage, que so podem rodar depois da renderizacao: por isso
      // o estado nasce no efeito, e so quando a categoria mais critica ou os numeros mudam.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(null)
      return
    }
    draw()
  }, [topId, draw])

  const onTap = useCallback(() => {
    if (topId !== null) draw()
  }, [topId, draw])

  const onDismiss = useCallback(() => setDismissed(true), [])

  return {
    visible: !hidden && !dismissed && !homePig && !peek && text !== null,
    state: mood?.state ?? 'neutro',
    text,
    popKey,
    onTap,
    onDismiss,
  }
}
