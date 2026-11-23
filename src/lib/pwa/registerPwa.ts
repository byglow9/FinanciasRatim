// Registro do service worker com a politica de atualizacao silenciosa (D-14, IDEN-04).
// Toda a decisao mora em shared/core/pwaUpdate.js (funcoes puras); aqui ficam so os efeitos:
// ler o DOM (isBusy), medir o tempo, guardar carimbos em sessionStorage e recarregar a pagina.
// Sem toast, sem aviso, sem botao de atualizar: a troca de versao e invisivel.
// So age em producao; em dev e em MOCK nada muda.
import { registerSW } from 'virtual:pwa-register'
import {
  PRELOAD_RELOAD_KEY,
  SW_RELOAD_GUARD_MS,
  SW_RELOAD_KEY,
  decidePreloadError,
  decideReload,
  decideUpdate,
} from '@shared/core/pwaUpdate.js'
import { isBusy } from '@/lib/pwa/isBusy'

export interface RegisterPwaOptions {
  /** Chamado na segunda falha de carregamento de trecho: quem chama mostra a tela de falha. */
  onBootError?: () => void
}

/** Intervalo de busca por versao nova com o app aberto: 1 hora. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

/** Le uma chave de sessionStorage; falha de acesso vira null e o chamador age de forma conservadora. */
function readSession(key: string): { ok: boolean; value: string | null } {
  try {
    return { ok: true, value: sessionStorage.getItem(key) }
  } catch {
    return { ok: false, value: null }
  }
}

function writeSession(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function clearSession(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* sem armazenamento: nada a limpar */
  }
}

/** Recarga depois da troca de versao, protegida contra laco pelo carimbo da ultima recarga. */
function guardedReload(): void {
  const stamp = readSession(SW_RELOAD_KEY)
  // Sem acesso ao armazenamento nao da para provar que nao ha laco: nao recarrega.
  if (!stamp.ok) return
  const parsed = stamp.value === null ? Number.NaN : Number(stamp.value)
  const lastReloadAt = Number.isFinite(parsed) ? parsed : null
  if (decideReload({ lastReloadAt, now: Date.now() }) !== 'recarregar') return
  if (!writeSession(SW_RELOAD_KEY, String(Date.now()))) return
  window.location.reload()
}

/** Registra o worker e liga a politica de atualizacao. Sem efeito fora de producao. */
export function registerPwa({ onBootError }: RegisterPwaOptions = {}): void {
  if (!import.meta.env.PROD || typeof window === 'undefined') return

  let waiting = false
  let openedAt = Date.now()

  const evaluate = (): void => {
    const busy = isBusy()
    const decision = decideUpdate({
      hasWaiting: waiting,
      msSinceOpen: Date.now() - openedAt,
      busy,
      // Com um lancamento ou uma edicao aberta, ir para segundo plano nao basta: quem sai do app para
      // conferir um valor volta e encontra o formulario. So entra a versao nova com nada em andamento.
      hidden: document.visibilityState === 'hidden' && !busy,
    })
    if (decision !== 'ativar') return
    waiting = false
    // A v2 do plugin ignora o parametro; a recarga vem do evento de controle do novo worker.
    void updateServiceWorker(true)
  }

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      waiting = true
      evaluate()
    },
    onNeedReload() {
      guardedReload()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => {
        if (navigator.onLine && !registration.installing) void registration.update().catch(() => undefined)
      }, UPDATE_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          openedAt = Date.now()
          // Versao que ficou esperando (havia algo em andamento ao sair): vale como nova abertura.
          evaluate()
          if (navigator.onLine && !registration.installing) void registration.update().catch(() => undefined)
        } else {
          // Indo para segundo plano e quando a versao que esperava entra, em recarga invisivel.
          evaluate()
        }
      })
    },
  })

  // Falha ao carregar um trecho depois de um deploy: uma recarga e, se falhar de novo, tela de falha.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    const mark = readSession(PRELOAD_RELOAD_KEY)
    // Sem acesso ao armazenamento vale "nao recarregar de novo".
    const alreadyReloaded = !mark.ok || mark.value === '1'
    if (decidePreloadError({ alreadyReloaded }) === 'recarregar' && writeSession(PRELOAD_RELOAD_KEY, '1')) {
      window.location.reload()
      return
    }
    onBootError?.()
  })

  // Abertura saudavel: depois de um tempo sem falha a marca da recarga por trecho some.
  window.setTimeout(() => clearSession(PRELOAD_RELOAD_KEY), SW_RELOAD_GUARD_MS)
}
