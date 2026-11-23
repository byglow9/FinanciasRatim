import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { vintemToneOf, type VintemTone } from '@/types'
import type { VintemHandle } from '@/components/vintem/Vintem'
import { useArea } from './AreaContext'

// Provedor do Vintem: tom do casal, registro do slot do arco e (Task 2) fala e regiao viva.
// Os fatos de humor entram por quem ja tem a BudgetView (a Home); o provedor nao refaz o ciclo.

export interface VintemContextType {
  tone: VintemTone
  /** Ref do handle do Vintem do arco (nulo fora da Home). */
  slot: RefObject<VintemHandle | null>
  registerSlot: (handle: VintemHandle | null) => void
}

const VintemContext = createContext<VintemContextType | undefined>(undefined)

export function VintemProvider({ children }: { children: ReactNode }) {
  const { settings } = useArea()
  const tone = vintemToneOf(settings)
  const slot = useRef<VintemHandle | null>(null)

  const registerSlot = useCallback((handle: VintemHandle | null) => {
    slot.current = handle
  }, [])

  const value = useMemo<VintemContextType>(() => ({ tone, slot, registerSlot }), [tone, registerSlot])

  return <VintemContext.Provider value={value}>{children}</VintemContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVintem() {
  const context = useContext(VintemContext)
  if (context === undefined) {
    throw new Error('useVintem must be used within a VintemProvider')
  }
  return context
}
