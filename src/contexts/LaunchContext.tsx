import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useReadOnly } from '@/hooks/useReadOnly'

export type LaunchTab = 'gasto' | 'receita' | 'porquinho'

interface LaunchContextType {
  isOpen: boolean
  // Aba com que o sheet abriu (Gasto pelo botao +, Gasto por Novo gasto, Receita por Nova receita).
  tab: LaunchTab
  open: (tab?: LaunchTab) => void
  close: () => void
}

const LaunchContext = createContext<LaunchContextType | undefined>(undefined)

/**
 * Estado de abertura do lancamento rapido. `open` passa pela guarda de somente leitura (IDEN-07):
 * no perfil do parceiro mostra o aviso e nao abre o sheet. Precisa ficar dentro do ToastProvider
 * e do AreaProvider (a montagem no layout e do Plano 18).
 */
export function LaunchProvider({ children }: { children: ReactNode }) {
  const { guard } = useReadOnly()
  const [state, setState] = useState<{ isOpen: boolean; tab: LaunchTab }>({
    isOpen: false,
    tab: 'gasto',
  })

  const open = useCallback(
    (tab: LaunchTab = 'gasto') => {
      if (guard('lançar')) return
      setState({ isOpen: true, tab })
    },
    [guard]
  )
  const close = useCallback(() => setState((s) => ({ ...s, isOpen: false })), [])

  const value = useMemo<LaunchContextType>(
    () => ({ isOpen: state.isOpen, tab: state.tab, open, close }),
    [state.isOpen, state.tab, open, close]
  )

  return <LaunchContext.Provider value={value}>{children}</LaunchContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLaunch() {
  const context = useContext(LaunchContext)
  if (context === undefined) {
    throw new Error('useLaunch must be used within a LaunchProvider')
  }
  return context
}
