import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { PersonType } from '@/types'
import { useArea } from './AreaContext'
import { useNow } from '@/hooks/useNow'
import { cycleOf, shiftCycle } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'

// Quantos ciclos para tras o historico alcanca; nunca ha ciclo futuro.
const MIN_OFFSET = -24

interface CycleContextType {
  now: Date
  // 0 = ciclo atual; negativo = ciclo passado.
  offset: number
  setOffset: (offset: number) => void
  shift: (delta: number) => void
  isCurrent: boolean
  // Pessoa do perfil visto; no Porquinho, o ultimo perfil de pessoa.
  viewPerson: PersonType
  cycleFor: (person: PersonType) => Cycle
  // Muda a cada lancamento: os hooks de dados refazem a consulta.
  dataVersion: number
  bumpData: () => void
}

const CycleContext = createContext<CycleContextType | undefined>(undefined)

function clamp(offset: number): number {
  return Math.max(MIN_OFFSET, Math.min(0, offset))
}

export function CycleProvider({ children }: { children: ReactNode }) {
  const { currentArea, lastPerson, personConfigFor } = useArea()
  const now = useNow(60_000)
  const [offset, setOffsetState] = useState(0)
  const [dataVersion, setDataVersion] = useState(0)

  const setOffset = useCallback((next: number) => setOffsetState(clamp(next)), [])
  const shift = useCallback((delta: number) => setOffsetState((o) => clamp(o + delta)), [])
  const bumpData = useCallback(() => setDataVersion((v) => v + 1), [])

  const viewPerson: PersonType = currentArea === 'porquinho' ? lastPerson : currentArea

  const cycleFor = useCallback(
    (person: PersonType): Cycle => {
      const base = cycleOf(now, personConfigFor(person).salaryDay)
      return offset === 0 ? base : shiftCycle(base, offset)
    },
    [now, offset, personConfigFor]
  )

  const value = useMemo<CycleContextType>(
    () => ({
      now,
      offset,
      setOffset,
      shift,
      isCurrent: offset === 0,
      viewPerson,
      cycleFor,
      dataVersion,
      bumpData,
    }),
    [now, offset, setOffset, shift, viewPerson, cycleFor, dataVersion, bumpData]
  )

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCycle() {
  const context = useContext(CycleContext)
  if (context === undefined) {
    throw new Error('useCycle must be used within a CycleProvider')
  }
  return context
}
