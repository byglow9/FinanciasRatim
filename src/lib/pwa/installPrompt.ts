// Captura do evento de instalacao do navegador (Android e Chrome de computador). Sem React.
// O evento beforeinstallprompt dispara cedo e uma vez por carga: o ouvinte nasce no boot
// (main.tsx chama captureInstallPrompt antes de o React montar) e o evento fica guardado aqui.

/** Evento nao padronizado do Chrome; nao existe no lib.dom do TypeScript. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

let deferred: BeforeInstallPromptEvent | null = null
let captured = false
const subscribers = new Set<() => void>()

function notify(): void {
  for (const cb of Array.from(subscribers)) cb()
}

/** Registra os ouvintes uma unica vez; chamadas seguintes nao fazem nada. */
export function captureInstallPrompt(): void {
  if (captured || typeof window === 'undefined') return
  captured = true

  window.addEventListener('beforeinstallprompt', (event) => {
    // Segura o banner automatico: quem decide quando perguntar e a tela de instalacao.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** Assina mudancas de getCanPrompt. Devolve a funcao que cancela a assinatura. */
export function subscribeInstall(cb: () => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

/** Verdadeiro quando ha um evento guardado e ainda nao usado. */
export function getCanPrompt(): boolean {
  return deferred !== null
}

/** Abre o dialogo de instalacao do navegador. O evento so vale uma vez, entao e descartado depois do uso. */
export async function promptInstall(): Promise<InstallOutcome> {
  const event = deferred
  if (!event) return 'unavailable'
  deferred = null
  notify()
  try {
    await event.prompt()
    const choice = await event.userChoice
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch {
    return 'dismissed'
  }
}
