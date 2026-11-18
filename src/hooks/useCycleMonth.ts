import { useMemo } from 'react'
import { useCycle } from '@/contexts/CycleContext'
import { cycleMonthDate } from '@/lib/cycleMonth'

/**
 * Mês-calendário do ciclo escolhido no seletor do topo, para as telas que não têm seletor de mês
 * próprio. A data é MEMOIZADA por `cycle.key`: `useTransactions` e os efeitos do Calendário dependem
 * da identidade do `Date`, e `cycleFor` devolve um objeto novo a cada tique do relógio; sem a
 * memoização haveria laço de refetch.
 */
export function useCycleMonth(): Date {
  const { viewPerson, cycleFor } = useCycle()
  const cycle = cycleFor(viewPerson)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave do ciclo identifica o mês
  return useMemo(() => cycleMonthDate(cycle), [cycle.key])
}
