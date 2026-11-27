import { useCallback, useMemo } from 'react'
import { useCycleBudget } from '@/hooks/useCycleBudget'
import { coupleBudget } from '@shared/core/couple.js'
import { cycleLabel } from '@shared/core/format.js'

/**
 * Leitura somada do casal (CASAL-01, D-15, D-16): duas BudgetView, uma por pessoa, cada uma no
 * proprio ciclo de salario (useCycleBudget sem o modo ciclo atual), combinadas por coupleBudget.
 * So le: nenhum service de escrita entra aqui (CASAL-02).
 */
export function useCoupleBudget() {
  const ele = useCycleBudget('ele')
  const ela = useCycleBudget('ela')

  const summary = useMemo(() => coupleBudget({ first: ele.view, second: ela.view }), [ele.view, ela.view])

  const { refetch: refetchEle } = ele
  const { refetch: refetchEla } = ela
  const refetch = useCallback(async () => {
    await Promise.all([refetchEle(), refetchEla()])
  }, [refetchEle, refetchEla])

  return {
    summary,
    first: ele.view,
    second: ela.view,
    loading: ele.loading || ela.loading,
    error: ele.error ?? ela.error,
    refetch,
    cycleLabels: { first: cycleLabel(ele.cycle), second: cycleLabel(ela.cycle) },
  }
}
