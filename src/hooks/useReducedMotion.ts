import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** Sem servidor nem janela: assume movimento normal. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Preferencia de movimento reduzido do sistema, assinada a mudancas (o usuario pode ligar
 * a opcao com a pagina aberta). Hoje so existem leituras avulsas; o Vintem usa este hook.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
