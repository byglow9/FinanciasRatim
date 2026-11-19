import { useCallback, useEffect, useRef, useState } from 'react'
import type { Transaction } from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { getTransactionsInRange } from '@/services/transactions.service'
import { cycleOf, shiftCycle } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'
import { cycleLabel } from '@shared/core/format.js'

export type CoupleMode = 'ciclo' | 'mes'

interface Loaded {
  key: string
  first: Transaction[]
  second: Transaction[]
}

/**
 * Dados do Casal (UX-06, D-17, premissa P-02 opcao b): UMA janela para os dois e uma consulta por
 * pessoa nessa mesma janela. No modo `ciclo` a janela e o ciclo do perfil visto (com o deslocamento
 * do topo); no modo `mes` e o mes-calendario (um ciclo de dia de salario 1) deslocado pelo mesmo
 * offset. A referencia da janela e estavel enquanto chave e dia do salario nao mudam: `now` renova
 * a cada minuto e nao pode refazer as consultas. So expoe dados cuja chave bate com a janela atual.
 */
export function useCoupleData(mode: CoupleMode) {
  const { now, cycleFor, viewPerson, offset, dataVersion } = useCycle()
  const { personConfigFor, settingsStatus } = useArea()
  // So consulta com as configuracoes carregadas de verdade: nunca monta numero sobre padroes.
  const active = settingsStatus === 'ready'

  const fresh: Cycle = mode === 'ciclo' ? cycleFor(viewPerson) : shiftCycle(cycleOf(now, 1), offset)

  const [stable, setStable] = useState<Cycle>(fresh)
  const same = stable.key === fresh.key && stable.salaryDay === fresh.salaryDay
  if (!same) setStable(fresh)
  const win = same ? stable : fresh

  const loadKey = `${win.key}:${win.salaryDay}`

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null)
  const latest = useRef(0)

  const fetchData = useCallback((): Promise<void> => {
    if (!active) return Promise.resolve()
    const id = ++latest.current
    return Promise.all([
      getTransactionsInRange('ele', win.start, win.end),
      getTransactionsInRange('ela', win.start, win.end),
    ]).then(
      ([first, second]) => {
        if (id !== latest.current) return
        setLoaded({ key: loadKey, first, second })
        setFailure(null)
      },
      (err: unknown) => {
        if (id !== latest.current) return
        setFailure({
          key: loadKey,
          error: err instanceof Error ? err : new Error('Failed to load couple data'),
        })
      }
    )
  }, [active, win, loadKey])

  useEffect(() => {
    // dataVersion so dispara a nova consulta depois de um lancamento.
    void fetchData()
    return () => {
      latest.current += 1
    }
  }, [fetchData, dataVersion])

  const current = active && loaded !== null && loaded.key === loadKey ? loaded : null
  const error = active && failure?.key === loadKey ? failure.error : null

  const sameSalaryDay = personConfigFor('ele').salaryDay === personConfigFor('ela').salaryDay

  return {
    window: win,
    first: current ? current.first : null,
    second: current ? current.second : null,
    loading: current === null && error === null,
    error,
    refetch: fetchData,
    periodLabel: cycleLabel(win),
    sameSalaryDay,
  }
}
