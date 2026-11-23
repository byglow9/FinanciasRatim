import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useVintem, type SlotsRaw } from '@/contexts/VintemContext'
import type { VintemHandle, VintemState } from '@/components/vintem/Vintem'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useVintemInsights } from '@/hooks/useVintemInsights'
import type { CategoryDef, Transaction } from '@/types'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { categoryDisplayName } from '@shared/core/categories.js'
import { dayKeyOf } from '@shared/core/dayKey.js'
import type { Insight } from '@shared/core/insights.js'
import { deriveVintemState, situationForTap, type MoodFacts } from '@shared/core/vintemMood.js'

type Budget = ReturnType<typeof useCycleBudget>

export interface UseHomeVintemArgs {
  view: Budget['view']
  /** Ciclo e lancamentos do ciclo, ja carregados pela Home, alimentam o detector de insights. */
  cycle: Budget['cycle']
  transactions: Transaction[] | null
  /** Falso (aba Porquinho): o Vintem fica neutro. */
  enabled: boolean
  readOnly: boolean
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

/** Insight que sustenta a situacao de leitura de gasto, se houver (o sujeito ja vem filtrado). */
function insightFor(
  situation: string,
  subject: HomeVintem['subject'],
  insights: Insight[],
  todayKey: string,
): Insight | undefined {
  switch (situation) {
    case 'delivery-semana':
      return insights.find((i) => i.type === 'delivery-heavy')
    case 'loja-repete':
      return insights.find((i) => i.type === 'merchant-repeat' && i.subject.key === subject?.merchantKey)
    case 'categoria-acima-media':
      return insights.find((i) => i.type === 'category-over-average' && i.subject.key === subject?.categoryId)
    case 'gasto-grande':
      return insights.find(
        (i) => i.type === 'spend-spike' && i.day === todayKey && i.subject.key === subject?.categoryId,
      )
    case 'sem-lancar':
      return insights.find((i) => i.type === 'days-without-launch')
    default:
      return undefined
  }
}

/**
 * Encaixes da fala a partir da view: dias do ciclo e, se a situacao aponta uma categoria, nome,
 * porcentagem, restante e (no estouro) o excesso; sem categoria, o que sobra so quando positivo.
 * Situacoes de leitura de gasto trazem os numeros do insight (ordinal, vezes, valor, loja, dias).
 */
function slotsFor(
  situation: string,
  subject: HomeVintem['subject'],
  view: View,
  categoryDefs: CategoryDef[],
  insights: Insight[] = [],
  todayKey = '',
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

  const insight = insightFor(situation, subject, insights, todayKey)
  if (insight) {
    const m = insight.metrics
    if (insight.subject.kind === 'category') {
      raw.categoria = categoryDisplayName({ categoryId: insight.subject.key }, categoryDefs)
    }
    if (situation === 'delivery-semana') {
      raw.ordinal = m.ordinal
      raw.vezes = m.count
      raw.valorCents = m.totalCents
    } else if (situation === 'loja-repete') {
      if (insight.subject.label) raw.loja = insight.subject.label
      raw.vezes = m.count
      raw.ordinal = m.ordinal
      raw.valorCents = m.totalCents
    } else if (situation === 'categoria-acima-media') {
      raw.pct = m.ratioPct
      raw.valorCents = m.spentCents
    } else if (situation === 'gasto-grande') {
      raw.valorCents = m.totalCents
    } else if (situation === 'sem-lancar') {
      raw.dias = m.days
    }
  }
  return raw
}

/**
 * Humor de fundo do Vintem da Home: so a BudgetView e as configuracoes alimentam os fatos, e a
 * decisao e da funcao pura deriveVintemState (pior fato vence; neutro sem veredito possivel).
 * Chamado antes dos retornos antecipados da pagina; tudo sai da `view`, nada de variavel tardia.
 */
export function useHomeVintem({ view, cycle, transactions, enabled, readOnly }: UseHomeVintemArgs): HomeVintem {
  const { tone, speak } = useVintem()
  const { categoryDefs } = useArea()
  const { now, viewPerson } = useCycle()
  const todayKey = dayKeyOf(now)

  // Insights do detector local: sem leitura nova do ciclo (usa as transacoes da Home) e com a linha
  // de base dos ciclos anteriores vinda do cache depois da primeira consulta. Somente leitura: nada.
  const { insights, ready: insightsReady } = useVintemInsights({
    person: viewPerson,
    cycle,
    view,
    transactions,
    categoryDefs,
    enabled: enabled && !readOnly,
  })

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
      insights,
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
    // Espera a linha de base: a fala de entrada sai uma vez so e precisa ja ter os insights completos.
    if (view === null || situation === null || !insightsReady) return
    if (spokenKey.current === entryKey) return
    spokenKey.current = entryKey
    speak({
      situation,
      raw: slotsFor(situation, subject, view, categoryDefs, insights, todayKey),
      announce: false,
    })
  }, [view, situation, subject, entryKey, speak, categoryDefs, insights, insightsReady, todayKey])

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
