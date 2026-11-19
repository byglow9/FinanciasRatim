import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PersonType, Transaction } from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleWindow } from '@/hooks/useCycleWindow'
import { getTransactionsInRange } from '@/services/transactions.service'
import { shiftCycle } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'
import { cycleSeries } from '@shared/core/series.js'
import type { CyclePoint } from '@shared/core/series.js'

/**
 * Serie dos ultimos `count` ciclos de uma pessoa para Relatorios (D-19). O ciclo escolhido no topo e o
 * ultimo da serie. Faz UMA consulta pela janela larga (do inicio do primeiro ao fim do ultimo ciclo) e
 * reparte os lancamentos pelo nucleo (cycleSeries), em vez de uma consulta por mes e por grafico.
 * Os dados so aparecem quando foram carregados para a mesma pessoa:ciclo:dia de salario:quantidade;
 * enquanto isso `series` fica vazia e `loading` verdadeiro, sem numero de outra janela.
 */
export function useCycleSeries(person: PersonType, count: number) {
  const { dataVersion } = useCycle()
  const { settingsStatus, categoryDefs } = useArea()
  // So consulta com as configuracoes carregadas de verdade: nunca monta numero sobre o dia de salario padrao.
  const active = settingsStatus === 'ready'
  const last = useCycleWindow(person)
  const size = Math.max(1, Math.trunc(count))

  // Do ciclo mais antigo ao escolhido no topo; a referencia so muda com a chave, o dia do salario ou a quantidade.
  const cycles = useMemo<Cycle[]>(
    () => Array.from({ length: size }, (_, i) => shiftCycle(last, -(size - 1 - i))),
    [last, size]
  )

  const loadKey = `${person}:${last.key}:${last.salaryDay}:${size}`

  const [loaded, setLoaded] = useState<{ key: string; data: Transaction[] } | null>(null)
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null)
  const latest = useRef(0)

  const fetchData = useCallback((): Promise<void> => {
    if (!active) return Promise.resolve()
    const id = ++latest.current
    const first = cycles[0]
    return getTransactionsInRange(person, first.start, last.end).then(
      (data) => {
        // Resposta velha (outra janela ou consulta mais nova): descarta.
        if (id !== latest.current) return
        setLoaded({ key: loadKey, data })
        setFailure(null)
      },
      (err: unknown) => {
        if (id !== latest.current) return
        setFailure({
          key: loadKey,
          error: err instanceof Error ? err : new Error('Failed to fetch cycle series'),
        })
      }
    )
  }, [active, person, cycles, last, loadKey])

  useEffect(() => {
    // dataVersion so dispara a nova consulta depois de um lancamento.
    void fetchData()
    return () => {
      latest.current += 1
    }
  }, [fetchData, dataVersion])

  const current = active && loaded !== null && loaded.key === loadKey ? loaded.data : null
  const error = active && failure?.key === loadKey ? failure.error : null

  const series = useMemo<CyclePoint[]>(
    () => (current ? cycleSeries({ transactions: current, cycles, defs: categoryDefs }) : []),
    [current, cycles, categoryDefs]
  )

  return {
    series,
    loading: active ? current === null && error === null : true,
    error,
    refetch: fetchData,
  }
}
