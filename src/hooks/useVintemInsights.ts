import { useEffect, useMemo, useRef, useState } from 'react'
import type { CategoryDef, PersonType, Transaction } from '@/types'
import { useCycle } from '@/contexts/CycleContext'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { baselineKey, loadBaseline } from '@/lib/vintemBaseline'
import { resolveCategoryId } from '@shared/core/categories.js'
import { buildInsights, isSpendSpike } from '@shared/core/insights.js'
import type { Baseline, Insight } from '@shared/core/insights.js'
import { toCents } from '@shared/core/ledger.js'
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

const SEEN_PREFIX = 'vintem:seen:v1:'
const NO_INSIGHTS: Insight[] = []

/** Maior instante (ms) de chegada ja visto entre os lancamentos importados; nulo na primeira visita. */
function readSeen(person: PersonType): number | null {
  try {
    const raw = localStorage.getItem(`${SEEN_PREFIX}${person}`)
    if (raw === null || !/^\d{1,15}$/.test(raw)) return null
    return Number(raw)
  } catch {
    return null
  }
}

function writeSeen(person: PersonType, ms: number): void {
  try {
    localStorage.setItem(`${SEEN_PREFIX}${person}`, String(ms))
  } catch {
    // Sem armazenamento: so deixa de lembrar o marco.
  }
}

function createdMs(t: Transaction): number {
  const ms = t.createdAt instanceof Date ? t.createdAt.getTime() : Number.NaN
  return Number.isFinite(ms) ? ms : Number.NaN
}

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

  // Marco por pessoa lido uma vez (e de novo ao trocar de pessoa). Fica congelado durante a carga:
  // a gravacao do marco novo vai so ao localStorage, para a chegada de agora continuar visivel.
  const [seen, setSeen] = useState(() => ({ person, mark: readSeen(person) }))
  if (seen.person !== person) setSeen({ person, mark: readSeen(person) })
  const mark = seen.person === person ? seen.mark : null

  const bankArrival = useMemo<BankArrival | null>(() => {
    if (!active || !ready || view === null || transactions === null || mark === null) return null
    let newest: Transaction | null = null
    let newestMs = Number.NEGATIVE_INFINITY
    for (const t of transactions) {
      if (t.source !== 'bank' || t.type !== 'saida' || t.transfer === true) continue
      const ms = createdMs(t)
      if (!Number.isFinite(ms) || ms <= mark) continue
      if (ms > newestMs) {
        newest = t
        newestMs = ms
      }
    }
    if (newest === null) return null
    const cents = toCents(newest.amount)
    if (!Number.isFinite(cents) || cents <= 0) return null
    const categoryId = newest.categoryId ?? resolveCategoryId(newest.category ?? '', categoryDefs)
    const limitCents = view.spend.rows.find((r) => r.categoryId === categoryId)?.limitCents ?? null
    return {
      id: newest.id,
      categoryId,
      cents,
      bigSpend: isSpendSpike({ cents, categoryId, baseline, limitCents }),
    }
  }, [active, ready, view, transactions, mark, categoryDefs, baseline])

  // Registra o marco: na primeira visita so grava (sem reacao); depois avanca para a chegada mais nova.
  useEffect(() => {
    if (!active || transactions === null) return
    let max = 0
    for (const t of transactions) {
      if (t.source !== 'bank') continue
      const ms = createdMs(t)
      if (Number.isFinite(ms) && ms > max) max = ms
    }
    const stored = readSeen(person)
    if (stored === null || max > stored) writeSeen(person, Math.max(max, stored ?? 0))
  }, [active, transactions, person])

  return { insights, baseline, bankArrival, ready }
}
