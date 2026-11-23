import { useSyncExternalStore } from 'react'
import { getCanPrompt, promptInstall, subscribeInstall } from '@/lib/pwa/installPrompt'
import type { InstallOutcome } from '@/lib/pwa/installPrompt'

export type PwaPlatform = 'android' | 'iphone'

const STANDALONE_QUERY = '(display-mode: standalone)'

function subscribeStandalone(onChange: () => void): () => void {
  const mq = window.matchMedia(STANDALONE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia(STANDALONE_QUERY).matches || nav.standalone === true
}

/** Sem janela: assume que ainda nao e app. */
function getServerStandalone(): boolean {
  return false
}

// A plataforma nao muda com a pagina aberta: nada a assinar.
function subscribeNever(): () => void {
  return () => {}
}

/** iPhone, iPad e iPadOS que se anuncia como Mac com toque contam como iphone; o resto, android. */
function getPlatform(): PwaPlatform {
  const nav = window.navigator
  if (/iPhone|iPad|iPod/.test(nav.userAgent)) return 'iphone'
  if (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1) return 'iphone'
  return 'android'
}

function getServerPlatform(): PwaPlatform {
  return 'android'
}

function getServerCanPrompt(): boolean {
  return false
}

export interface PwaInstall {
  /** Ha um evento de instalacao guardado e ainda nao usado (so Android e Chrome de computador). */
  canPrompt: boolean
  /** Abre o dialogo de instalacao do navegador. */
  prompt: () => Promise<InstallOutcome>
  /** O app ja esta aberto como app instalado (tela cheia), no Android ou no iPhone. */
  isStandalone: boolean
  platform: PwaPlatform
}

/** Estado de instalacao do PWA para os passos de adicionar a tela inicial. */
export function usePwaInstall(): PwaInstall {
  const canPrompt = useSyncExternalStore(subscribeInstall, getCanPrompt, getServerCanPrompt)
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandalone, getServerStandalone)
  const platform = useSyncExternalStore(subscribeNever, getPlatform, getServerPlatform)
  return { canPrompt, prompt: promptInstall, isStandalone, platform }
}
