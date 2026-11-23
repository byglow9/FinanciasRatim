import { useEffect, useMemo, useRef, useState } from 'react'
import type { CategoryDef, PersonType, Transaction } from '@/types'
import { useCycle } from '@/contexts/CycleContext'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { baselineKey, loadBaseline } from '@/lib/vintemBaseline'
import { buildInsights } from '@shared/core/insights.js'
import type { Baseline, Insight } from '@shared/core/insights.js'
import type { Cycle } from '@shared/core/cycle.js'

// Insights do Vintem na Home (plano 04-14): alimenta o detector local com as transacoes que a Home ja
// carregou e com a linha de base dos ciclos anteriores (uma consulta por ciclo e aparelho, depois cache).
// Tambem reconhece lancamento importado do banco por pessoa, com um marco no localStorage que guarda so
// um numero. Nada daqui le ou grava no Firestore alem da consulta da linha de base.

type View = NonNullable<ReturnType<typeof useCycleBudget>['view']>

export interface BankArrival {
  /** Id do lancamento importado, para a Home reagir uma unica vez. */
  id: string
  categoryId: string | null
  cents: number
  bigSpend: boolean
}

export interface UseVintemInsightsArgs {
  person: PersonType
  cycle: Cycle
  view: View | null
  transactions: Transaction[] | null
  categoryDefs: CategoryDef[]
  enabled: boolean
}

export interface VintemInsights {
  insights: Insight[]
  baseline: Baseline | null
  bankArrival: BankArrival | null
  /** Falso enquanto a linha de base ainda carrega: a Home espera para falar com os dados completos. */
  ready: boolean
}

const NO_INSIGHTS: Insight[] = []

export function useVintemInsights({
  person,
  cycle,
  view,
  transactions,
  categoryDefs,
  enabled,
}: UseVintemInsightsArgs): VintemInsights {
  const { now } = useCycle()
  // So ciclo atual e com a view pronta: ciclo passado nunca gera insight nem reacao.
  const active = enabled && view !== null && !view.isPast
  const loadKey = baselineKey(person, cycle)

  const [loaded, setLoaded] = useState<{ key: string; baseline: Baseline | null } | null>(null)
  const latest = useRef(0)
  useEffect(() => {
    if (!active) return
    const id = ++latest.current
    loadBaseline(person, cycle, categoryDefs).then(
      (baseline) => {
        if (id !== latest.current) return
        setLoaded({ key: loadKey, baseline })
      },
      () => {
        // Falha vira linha de base nula, sem barulho: os insights que nao dependem dela seguem.
        if (id !== latest.current) return
        setLoaded({ key: loadKey, baseline: null })
      },
    )
    return () => {
      latest.current += 1
    }
  }, [active, person, cycle, loadKey, categoryDefs])

  const settled = loaded !== null && loaded.key === loadKey
  const baseline = settled ? loaded.baseline : null
  const ready = !active || settled

  const insights = useMemo<Insight[]>(() => {
    if (!active || view === null || transactions === null) return NO_INSIGHTS
    return buildInsights({
      now,
      person,
      cycle,
      transactions,
      categoryDefs,
      rows: view.spend.rows,
      baseline,
      suppressed: view.verdictSuppressed,
      rhythmLevel: view.rhythmLevel,
    })
  }, [active, view, transactions, now, person, cycle, categoryDefs, baseline])

  const bankArrival: BankArrival | null = null

  return { insights, baseline, bankArrival, ready }
}
