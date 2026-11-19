import { useState } from 'react'
import type { PersonType } from '@/types'
import { useCycle } from '@/contexts/CycleContext'
import type { Cycle } from '@shared/core/cycle.js'

/**
 * Janela exata do ciclo escolhido no topo para uma pessoa (D-19). A referencia do Cycle e estavel
 * enquanto chave e dia do salario nao mudam: `now` renova a cada minuto e nao pode refazer a consulta
 * de quem depende deste ciclo.
 */
export function useCycleWindow(person: PersonType): Cycle {
  const { cycleFor } = useCycle()
  const fresh = cycleFor(person)

  const [stable, setStable] = useState<Cycle>(fresh)
  const same = stable.key === fresh.key && stable.salaryDay === fresh.salaryDay
  if (!same) setStable(fresh)
  return same ? stable : fresh
}
