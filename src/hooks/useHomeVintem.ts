import { useMemo } from 'react'
import { useCycle } from '@/contexts/CycleContext'
import { useVintem } from '@/contexts/VintemContext'
import type { VintemState } from '@/components/vintem/Vintem'
import type { Transaction } from '@/types'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { dayKeyOf } from '@shared/core/dayKey.js'
import { deriveVintemState, type MoodFacts } from '@shared/core/vintemMood.js'

type Budget = ReturnType<typeof useCycleBudget>

export interface UseHomeVintemArgs {
  view: Budget['view']
  /** Ciclo e lancamentos ja chegam para o detector de insights (plano 04-14). */
  cycle: Budget['cycle']
  transactions: Transaction[] | null
  /** Falso (aba Porquinho): o Vintem fica neutro. */
  enabled: boolean
  readOnly: boolean
  /** Insights do detector; vazio por padrao. */
  insights?: MoodFacts['insights']
}

export interface HomeVintem {
  state: VintemState
  situation: string | null
  subject: { categoryId?: string; merchantKey?: string } | null
}

/**
 * Humor de fundo do Vintem da Home: so a BudgetView e as configuracoes alimentam os fatos, e a
 * decisao e da funcao pura deriveVintemState (pior fato vence; neutro sem veredito possivel).
 * Chamado antes dos retornos antecipados da pagina; tudo sai da `view`, nada de variavel tardia.
 */
export function useHomeVintem({ view, enabled, readOnly, insights }: UseHomeVintemArgs): HomeVintem {
  const { tone } = useVintem()
  const { now } = useCycle()
  const todayKey = dayKeyOf(now)

  const facts = useMemo<MoodFacts>(
    () => ({
      loading: !enabled || view === null,
      readOnly,
      isPast: view?.isPast === true,
      noIncome: view !== null && !view.income.hasIncome,
      suppressed: view?.verdictSuppressed === true,
      tone,
      todayKey,
      rhythmLevel: view?.rhythmLevel ?? null,
      rows: view?.spend.rows ?? [],
      cheer: null,
      insights: insights ?? [],
    }),
    [enabled, view, readOnly, tone, todayKey, insights],
  )

  return useMemo<HomeVintem>(() => {
    const mood = deriveVintemState(facts, null, 0)
    return { state: mood.state, situation: mood.situation, subject: mood.subject }
  }, [facts])
}
