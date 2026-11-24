import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgendaEvent,
  EventCategory,
  GoalContribution,
  Note,
  PersonType,
  SavingsTransaction,
} from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleTransactions } from '@/hooks/useCycleTransactions'
import { useCycleBills } from '@/hooks/useCycleBills'
import { useCards } from '@/hooks/useCards'
import { getSavingsTransactions } from '@/services/savings.service'
import { getContributionsInRange } from '@/services/goalContributions.service'
import { getGoals } from '@/services/goals.service'
import { getNotes } from '@/services/notes.service'
import { getEventsInRange } from '@/services/events.service'
import { getEventCategories } from '@/services/eventCategories.service'
import { buildDayModels, calendarSummary } from '@shared/core/calendarModel.js'
import { cardBillEvents } from '@shared/core/cardCalendar.js'
import type { CalendarContribution, CalendarMode } from '@shared/core/calendarModel.js'
import { isInCycle } from '@shared/core/cycle.js'
import { dayKeyOf } from '@shared/core/dayKey.js'

interface Loaded {
  key: string
  savings: SavingsTransaction[]
  contributions: CalendarContribution[]
  notes: Note[]
  events: AgendaEvent[]
  eventCategories: EventCategory[]
}

const NO_SAVINGS: SavingsTransaction[] = []
const NO_CONTRIBUTIONS: CalendarContribution[] = []
const NO_NOTES: Note[] = []
const NO_EVENTS: AgendaEvent[] = []
const NO_CATEGORIES: EventCategory[] = []

/**
 * Dados do Calendario do ciclo exato escolhido no topo (D-19): lancamentos, contas por ocorrencia,
 * Porquinho, aportes de meta, notas, eventos e categorias de evento, ja no modelo do dia
 * (buildDayModels). Mesmas regras dos outros hooks por ciclo: so mostra o que foi carregado para a mesma
 * chave pessoa:ciclo:dia de salario, e so refaz a consulta quando a chave muda ou quando um lancamento
 * acontece (dataVersion), nunca pelo relogio de 60 segundos. O "hoje" do modelo muda so na virada do dia.
 * Toda consulta passa por servicos com escopo de dono.
 */
export function useCalendarData(person: PersonType, mode: CalendarMode) {
  const { dataVersion, now } = useCycle()
  const { settingsStatus } = useArea()
  const active = settingsStatus === 'ready'

  const tx = useCycleTransactions(person)
  const bills = useCycleBills(person)
  const cycle = tx.cycle
  // Vencimento da fatura do cartao: so cards e cardSettings, nunca as compras (cota de leituras).
  const cardsData = useCards()

  const loadKey = `${person}:${cycle.key}:${cycle.salaryDay}`

  // Referencia de "agora" estavel dentro do mesmo dia: o modelo nao e refeito a cada minuto.
  const [stableNow, setStableNow] = useState<Date>(now)
  const sameDay = dayKeyOf(stableNow) === dayKeyOf(now)
  if (!sameDay) setStableNow(now)
  const today = sameDay ? stableNow : now

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null)
  const latest = useRef(0)

  // Consulta silenciosa: nunca liga loading, para nao desmontar a grade nem perder o dia selecionado.
  const fetchExtra = useCallback((): Promise<void> => {
    if (!active) return Promise.resolve()
    const id = ++latest.current
    return Promise.all([
      getSavingsTransactions(),
      getContributionsInRange(cycle.start, cycle.end),
      getGoals(person),
      // Como a tela atual: falha nas notas nao derruba o resto do Calendario.
      getNotes(person).catch(() => [] as Note[]),
      getEventsInRange(cycle.start, cycle.end),
      getEventCategories(),
    ]).then(
      ([sav, contrib, goals, allNotes, allEvents, categories]) => {
        // Resposta velha (outro ciclo ou outra consulta mais nova): descarta.
        if (id !== latest.current) return
        const goalNames = new Map(goals.map((g) => [g.id, g.name]))
        setLoaded({
          key: loadKey,
          savings: sav.filter((s) => s.person === person && isInCycle(s.date, cycle)),
          // So aportes de metas que existem e sao do perfil atual.
          contributions: contrib
            .filter((c: GoalContribution) => goalNames.has(c.goalId))
            .map((c) => ({ ...c, goalName: goalNames.get(c.goalId) })),
          notes: allNotes.filter((n) => n.date !== undefined && isInCycle(n.date, cycle)),
          events: allEvents.filter((e) => e.person === 'conjunto' || e.person === person),
          eventCategories: categories,
        })
        setFailure(null)
      },
      (err: unknown) => {
        if (id !== latest.current) return
        setFailure({
          key: loadKey,
          error: err instanceof Error ? err : new Error('Failed to fetch calendar data'),
        })
      }
    )
  }, [active, person, cycle, loadKey])

  useEffect(() => {
    // dataVersion so dispara a nova consulta depois de um lancamento.
    void fetchExtra()
    return () => {
      latest.current += 1
    }
  }, [fetchExtra, dataVersion])

  const current = active && loaded !== null && loaded.key === loadKey ? loaded : null
  const extraError = active && failure?.key === loadKey ? failure.error : null

  const savings = current?.savings ?? NO_SAVINGS
  const contributions = current?.contributions ?? NO_CONTRIBUTIONS
  const notes = current?.notes ?? NO_NOTES
  const events = current?.events ?? NO_EVENTS
  const eventCategories = current?.eventCategories ?? NO_CATEGORIES

  const cardBillItems = useMemo(
    () =>
      cardBillEvents({
        cards: cardsData.cards
          .filter((c) => c.person === person)
          .map((c) => ({
            id: c.id,
            displayName: c.displayName,
            name: c.name,
            billTotals: c.billTotals,
            payments: c.payments,
            closingDay: c.settings?.closingDay ?? null,
            dueDay: c.settings?.dueDay ?? null,
            paidMonths: c.settings?.paidMonths ?? [],
          })),
        cycle,
        now: today,
      }),
    [cardsData.cards, person, cycle, today]
  )

  const dayModels = useMemo(
    () =>
      buildDayModels({
        mode,
        cycle,
        now: today,
        transactions: tx.transactions,
        billItems: bills.items,
        cardBillItems,
        savings,
        contributions,
        notes,
        events,
        eventCategories,
      }),
    [mode, cycle, today, tx.transactions, bills.items, cardBillItems, savings, contributions, notes, events, eventCategories]
  )

  const summary = useMemo(
    () => calendarSummary({ transactions: tx.transactions, billItems: bills.items }),
    [tx.transactions, bills.items]
  )

  const error = tx.error ?? bills.error ?? extraError
  const loading = tx.loading || bills.loading || (active ? current === null && extraError === null : true)

  return {
    cycle,
    dayModels,
    summary,
    notes,
    events,
    eventCategories,
    loading,
    error,
    // Recarrega notas, eventos e demais camadas sem ligar loading (depois de gravar post-it ou evento).
    refetch: fetchExtra,
  }
}
