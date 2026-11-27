import { useEffect, useMemo, useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCycle } from '@/contexts/CycleContext'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { useCycleBills } from '@/hooks/useCycleBills'
import { useGoals } from '@/hooks/useGoals'
import { useSavings } from '@/hooks/useSavings'
import { getEventsInRange } from '@/services/events.service'
import { getNotes } from '@/services/notes.service'
import { toBills } from '@/lib/cycleData'
import type { AgendaEvent, Note, PersonType, Transaction } from '@/types'
import { toCents } from '@shared/core/ledger.js'
import { APP_AGENDA_DAYS, buildFacts } from '@shared/core/oincFacts.js'
import { zonedParts, zonedTimeToInstant } from '@shared/core/time.js'

// Fatos da propria pessoa para as falas do OINC (07.1, D-19). Montados no navegador com o que o app ja
// carrega e guardados so em memoria: nada daqui vai ao servidor, ao armazenamento local nem ao console.
// So existem para a pessoa logada, no proprio perfil e fora do somente leitura (D-07).

export type OincFacts = ReturnType<typeof buildFacts>

export interface UseOincFactsArgs {
  view: ReturnType<typeof useCycleBudget>['view']
  cycle: ReturnType<typeof useCycleBudget>['cycle']
  transactions: Transaction[] | null
  /** Pessoa vista na Home. */
  person: PersonType
  /** Falso (aba Porquinho): sem fatos. */
  enabled: boolean
}

const NO_FACTS: OincFacts = []
/** Sem o ciclo anterior aqui, "semana sem gastar" so e verdade depois deste tanto de dias de ciclo. */
const WEEK_DAYS = 7
/** Cenas cujo restante e o da categoria ou o da meta: nao dependem das contas fixas. */
const OWN_REMAINDER: ReadonlySet<string> = new Set(['limite-quase', 'meta-status'])

// Calendario (compromissos e anotacoes) lido ao abrir a Home e reaproveitado por alguns minutos, para o que
// foi anotado agora entrar na conversa sem reabrir o app. Falha fica como lista vazia, sem erro na tela.
const AGENDA_TTL_MS = 5 * 60_000
interface Agenda {
  events: AgendaEvent[]
  notes: Note[]
}
let agenda: { key: string; at: number; load: Promise<Agenda> } | null = null

function loadAgenda(uid: string, person: PersonType): Promise<Agenda> {
  const key = `${uid}:${person}`
  if (agenda === null || agenda.key !== key || Date.now() - agenda.at > AGENDA_TTL_MS) {
    const today = zonedParts(new Date())
    const start = zonedTimeToInstant(today.year, today.month, today.day)
    const after = zonedTimeToInstant(today.year, today.month, today.day + APP_AGENDA_DAYS + 1)
    const load = Promise.all([
      getEventsInRange(start, new Date(after.getTime() - 1)).catch(() => []),
      getNotes(person).catch(() => []),
    ]).then(([events, notes]) => ({ events, notes }))
    agenda = { key, at: Date.now(), load }
  }
  return agenda.load
}

/**
 * Lista de fatos do mes da pessoa logada. Fonte que falha fica de fora; sem a view, sem os lancamentos,
 * com as contas ainda carregando, em ciclo que nao e o atual ou fora do proprio perfil, lista vazia.
 */
export function useOincFacts({ view, cycle, transactions, person, enabled }: UseOincFactsArgs): OincFacts {
  const { user } = useAuth()
  const { categoryDefs, personConfigFor, readOnly } = useArea()
  const { now, isCurrent } = useCycle()
  const own = user !== null && user.person === person && !readOnly
  const uid = own ? user.uid : null

  const { items, expenses, loading: billsLoading, error: billsError } = useCycleBills(person)
  const { goals } = useGoals(person)
  const savings = useSavings()
  const porquinhoCents = savings.loading || savings.error !== null ? null : toCents(savings.balance)

  const [calendar, setCalendar] = useState<(Agenda & { uid: string }) | null>(null)
  useEffect(() => {
    if (uid === null) return
    let alive = true
    void loadAgenda(uid, person).then((loaded) => {
      if (alive) setCalendar({ uid, ...loaded })
    })
    return () => {
      alive = false
    }
  }, [uid, person])

  return useMemo<OincFacts>(() => {
    if (!own || !enabled || !isCurrent || view === null || view.isPast || transactions === null) return NO_FACTS
    // Sem as contas o restante do mes sairia maior que o real: espera a carga terminar.
    if (billsLoading && billsError === null) return NO_FACTS
    try {
      const facts = buildFacts(
        {
          now,
          person,
          cycle,
          config: personConfigFor(person),
          categoryDefs,
          transactions,
          bills: toBills(expenses, person),
          // O pagamento sai da propria ocorrencia paga, com o mesmo mes e ano que a gravacao usa.
          payments: items
            .filter((item) => item.paid)
            .map((item) => ({
              billId: item.billId,
              month: item.occurrence.month,
              year: item.occurrence.year,
              paidCents: item.paidCents,
            })),
          goals: goals
            .filter((g) => g.person === person)
            .map((g) => ({
              name: g.name,
              person: g.person,
              targetCents: toCents(g.targetAmount),
              currentCents: toCents(g.currentAmount),
            })),
          porquinhoCents,
          events: calendar !== null && calendar.uid === uid ? calendar.events : [],
          notes: calendar !== null && calendar.uid === uid ? calendar.notes : [],
        },
        { surface: 'app' },
      )
      const youngCycle = view.daysElapsed < WEEK_DAYS
      return facts.filter((fact) => {
        if (youngCycle && fact.cena === 'semana-sem-gastar') return false
        // Contas que nao carregaram: nada que dependa do restante do mes ou do ritmo.
        if (billsError !== null) {
          if (fact.cena === 'mes-folgado' || fact.cena === 'mes-apertado') return false
          if (fact.slots.restante !== undefined && !OWN_REMAINDER.has(fact.cena)) return false
        }
        return true
      })
    } catch {
      return NO_FACTS
    }
  }, [
    own,
    enabled,
    isCurrent,
    view,
    transactions,
    billsLoading,
    billsError,
    now,
    person,
    cycle,
    personConfigFor,
    categoryDefs,
    expenses,
    items,
    goals,
    porquinhoCents,
    calendar,
    uid,
  ])
}
