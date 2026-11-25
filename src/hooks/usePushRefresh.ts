import { useEffect } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { primePush, refreshPush } from '@/lib/push/messaging'

// Depois de 6 horas com o app aberto, voltar para a aba renova o registro de novo.
const STALE_MS = 6 * 60 * 60 * 1000

// Uma vez por abertura do app: sobrevive a remontagens do casco, some ao recarregar a pagina.
let openedOnce = false
let lastRefresh = 0

async function run(): Promise<void> {
  lastRefresh = Date.now()
  try {
    await primePush()
    await refreshPush()
  } catch {
    /* melhor esforco: a renovacao nunca atrapalha a tela */
  }
}

/**
 * Renova o registro do aparelho para os avisos (PUSH-01) a cada abertura, so com a permissao ja concedida.
 * Nunca pede permissao, nunca mostra erro e nao roda no perfil do parceiro (somente leitura).
 */
export function usePushRefresh(): void {
  const { user } = useAuth()
  const { readOnly } = useArea()
  const active = Boolean(user) && !readOnly

  useEffect(() => {
    if (!active) return
    if (!openedOnce) {
      openedOnce = true
      void run()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh > STALE_MS) void run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [active])
}
