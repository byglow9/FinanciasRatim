import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PersonType } from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useBankFreshness } from '@/hooks/useBankFreshness'
import { loadCycleInputs, type CycleInputs } from '@/lib/cycleData'
import { buildBudgetView } from '@shared/core/budget.js'
import { cycleOf } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'

interface Options {
  // Falso: nao consulta e devolve view nula sem carregando. Padrao: verdadeiro.
  enabled?: boolean
  // Verdadeiro: usa o ciclo atual da pessoa e ignora o deslocamento (sheet e avisos).
  currentCycle?: boolean
}

/**
 * BudgetView do ciclo para uma pessoa. Busca as entradas e delega toda a conta ao nucleo
 * (buildBudgetView). A view e nula enquanto carrega e sempre que as entradas carregadas sao
 * de outra pessoa, de outro ciclo ou de outro dia de salario: nunca ha numero falso.
 */
export function useCycleBudget(person: PersonType, opts: Options = {}) {
  const { enabled = true, currentCycle = false } = opts
  const { now, cycleFor, dataVersion } = useCycle()
  const { personConfigFor, categoryDefs, settingsStatus } = useArea()
  // So consulta com as configuracoes carregadas de verdade (CR-01): nunca monta numero sobre padroes.
  const active = enabled && settingsStatus === 'ready'
  const { suppress } = useBankFreshness()

  const config = personConfigFor(person)
  const fresh: Cycle = currentCycle ? cycleOf(now, config.salaryDay) : cycleFor(person)

  // Referencia estavel do ciclo enquanto chave e dia do salario nao mudam: `now` renova a cada
  // minuto e nao pode refazer a consulta.
  const [stable, setStable] = useState<Cycle>(fresh)
  const same = stable.key === fresh.key && stable.salaryDay === fresh.salaryDay
  if (!same) setStable(fresh)
  const cycle = same ? stable : fresh

  const loadKey = `${person}:${cycle.key}:${cycle.salaryDay}`

  const [loaded, setLoaded] = useState<{ key: string; inputs: CycleInputs } | null>(null)
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null)
  const latest = useRef(0)

  const fetchInputs = useCallback((): Promise<void> => {
    if (!active) return Promise.resolve()
    const id = ++latest.current
    return loadCycleInputs(person, cycle).then(
      (inputs) => {
        if (id !== latest.current) return
        setLoaded({ key: loadKey, inputs })
        setFailure(null)
      },
      (err: unknown) => {
        if (id !== latest.current) return
        setFailure({
          key: loadKey,
          error: err instanceof Error ? err : new Error('Failed to load cycle'),
        })
      }
    )
  }, [active, person, cycle, loadKey])

  useEffect(() => {
    // dataVersion so dispara a nova consulta depois de um lancamento.
    void fetchInputs()
    return () => {
      latest.current += 1
    }
  }, [fetchInputs, dataVersion])

  const current = active && loaded !== null && loaded.key === loadKey ? loaded.inputs : null
  const error = active && failure?.key === loadKey ? failure.error : null

  const view = useMemo(
    () =>
      current
        ? buildBudgetView({
            now,
            cycle,
            config,
            transactions: current.transactions,
            bills: current.bills,
            payments: current.payments,
            categoryDefs,
            suppressVerdict: suppress,
          })
        : null,
    [current, now, cycle, config, categoryDefs, suppress]
  )

  return {
    view,
    cycle,
    loading: enabled && current === null && error === null,
    error,
    refetch: fetchInputs,
  }
}
