import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useVintem, type SlotsRaw } from '@/contexts/VintemContext'
import type { VintemHandle, VintemState } from '@/components/vintem/Vintem'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { CategoryDef, Transaction } from '@/types'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { categoryDisplayName } from '@shared/core/categories.js'
import { dayKeyOf } from '@shared/core/dayKey.js'
import { deriveVintemState, situationForTap, type MoodFacts } from '@shared/core/vintemMood.js'

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
  /** Toque no Vintem: acorda o sonolento, gira de lado (sem movimento reduzido) e troca a fala. */
  onTap: (handle: VintemHandle | null) => void
}

/** Tempo em perfil antes de voltar (o giro todo dura cerca de 1,6 s). */
const TURN_HOLD_MS = 600

type View = NonNullable<Budget['view']>

/**
 * Encaixes da fala a partir da view: dias do ciclo e, se a situacao aponta uma categoria, nome,
 * porcentagem, restante e (no estouro) o excesso; sem categoria, o que sobra so quando positivo.
 */
function slotsFor(
  situation: string,
  subject: HomeVintem['subject'],
  view: View,
  categoryDefs: CategoryDef[],
): SlotsRaw {
  const raw: SlotsRaw = { dias: view.daysLeft }
  const row = subject?.categoryId
    ? view.spend.rows.find((r) => r.categoryId === subject.categoryId)
    : undefined
  if (row) {
    raw.categoria = categoryDisplayName({ categoryId: row.categoryId }, categoryDefs)
    raw.pct = row.pct
    raw.restanteCents = row.remainingCents
    if (situation === 'limite-estourou') raw.valorCents = row.excessCents
  } else if (view.safeCents > 0) {
    raw.restanteCents = view.safeCents
  }
  return raw
}

/**
 * Humor de fundo do Vintem da Home: so a BudgetView e as configuracoes alimentam os fatos, e a
 * decisao e da funcao pura deriveVintemState (pior fato vence; neutro sem veredito possivel).
 * Chamado antes dos retornos antecipados da pagina; tudo sai da `view`, nada de variavel tardia.
 */
export function useHomeVintem({ view, cycle, enabled, readOnly, insights }: UseHomeVintemArgs): HomeVintem {
  const { tone, speak } = useVintem()
  const { categoryDefs } = useArea()
  const { now, viewPerson } = useCycle()
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

  const mood = useMemo(() => {
    const result = deriveVintemState(facts, null, 0)
    return { state: result.state, situation: result.situation, subject: result.subject }
  }, [facts])

  // Fala de entrada: uma por visita (chave pessoa:ciclo), so com a view pronta. O portao neutro ja
  // devolve situacao nula em carregando, sem renda, ciclo passado, dado velho e somente leitura.
  // Nunca e anunciada na regiao viva (UI-SPEC S1).
  const spokenKey = useRef<string | null>(null)
  const entryKey = `${viewPerson}:${cycle.key}`
  const { situation, subject } = mood
  useEffect(() => {
    if (view === null || situation === null) return
    if (spokenKey.current === entryKey) return
    spokenKey.current = entryKey
    speak({ situation, raw: slotsFor(situation, subject, view, categoryDefs), announce: false })
  }, [view, situation, subject, entryKey, speak, categoryDefs])

  // Toque: sem view, ciclo passado, sem renda ou somente leitura nao fala nem gira. Os temporizadores
  // do giro ficam em ref e sao limpos ao desmontar.
  const reduced = useReducedMotion()
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const turned = useRef<VintemHandle | null>(null)
  useEffect(
    () => () => {
      if (turnTimer.current !== null) clearTimeout(turnTimer.current)
      turned.current?.setTurn(false)
    },
    [],
  )
  const onTap = useCallback(
    (handle: VintemHandle | null) => {
      if (view === null || !enabled || readOnly || view.isPast || !view.income.hasIncome) return
      const tapSituation = situationForTap(facts)
      if (tapSituation === null) return
      const raw = slotsFor(tapSituation, null, view, categoryDefs)
      // Acordou o sonolento: o susto do proprio Vintem basta, sem giro.
      if (handle?.touch()) {
        speak({ situation: tapSituation, raw, announce: true })
        return
      }
      if (!reduced && handle) {
        if (turnTimer.current !== null) clearTimeout(turnTimer.current)
        handle.setTurn(true)
        turned.current = handle
        turnTimer.current = setTimeout(() => {
          handle.setTurn(false)
          turnTimer.current = null
        }, TURN_HOLD_MS)
      }
      speak({ situation: tapSituation, raw, announce: true })
    },
    [view, enabled, readOnly, facts, categoryDefs, speak, reduced],
  )

  return { ...mood, onTap }
}
