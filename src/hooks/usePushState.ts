import { useCallback, useEffect, useState } from 'react'
import { PUSH_STATES, describeState, pushState } from '@shared/core/pushState.js'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { checkPushSupported, getLocalFid, isPushConfigured, isPushOff } from '@/lib/push/messaging'
import { getPushStatus } from '@/services/push.service'

export interface PushStateView {
  /** Um dos estados de PUSH_STATES (calculado pelo nucleo, sem reescrever a prioridade). */
  state: string
  /** Titulo, texto e acao do estado, vindos de describeState. */
  copy: { title: string; body: string; action: 'ativar' | 'reativar' | 'passos-iphone' | null }
  /** Le o aparelho e o servidor de novo (depois de ativar, desativar ou voltar o foco). */
  refresh: () => void
}

interface Reading {
  loaded: boolean
  supported: boolean
  permission: string
  registered: boolean | null
}

/** Permissao do navegador; desativar os avisos no app conta como "ainda nao pedida" para voltar ao botao. */
function readPermission(): string {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted' && isPushOff()) return 'default'
  return Notification.permission
}

/**
 * Estado do cartao Notificacoes a partir do que o aparelho e o servidor dizem (PUSH-01, D-08).
 * A leitura roda ao montar, ao voltar o foco para a janela e quando a tela chama refresh.
 */
export function usePushState(): PushStateView {
  const { platform, isStandalone } = usePwaInstall()
  const [reading, setReading] = useState<Reading>({ loaded: false, supported: false, permission: 'default', registered: null })
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      const supported = await checkPushSupported()
      const permission = readPermission()
      let registered: boolean | null = null
      if (supported && permission === 'granted') {
        const fid = getLocalFid()
        if (!fid) {
          registered = false
        } else {
          try {
            registered = (await getPushStatus(fid)).registered
          } catch {
            registered = null
          }
        }
      }
      if (!cancelled) setReading({ loaded: true, supported, permission, registered })
    }
    void read()
    return () => {
      cancelled = true
    }
  }, [tick])

  useEffect(() => {
    const onFocus = () => setTick((n) => n + 1)
    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const computed = pushState({
    configured: isPushConfigured(),
    supported: reading.supported,
    platform,
    standalone: isStandalone,
    permission: reading.permission,
    registered: reading.registered,
  })
  // Antes da primeira leitura o suporte ainda e desconhecido: mostra "conferindo" em vez de "indisponivel".
  const state = !reading.loaded && computed === PUSH_STATES.NAO_SUPORTADO ? PUSH_STATES.VERIFICANDO : computed
  return { state, copy: describeState(state, platform), refresh }
}
