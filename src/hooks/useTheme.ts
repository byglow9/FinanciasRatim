import { useSyncExternalStore } from 'react'
import { THEME_KEY, normalizeTheme, resolveTheme, themeColorFor } from '@shared/core/theme.js'
import type { ThemePref, ThemeResolved } from '@shared/core/theme.js'

// Tema do aparelho (D-08, D-09): preferencia 'auto' | 'claro' | 'escuro' em localStorage, so neste
// aparelho. Nada aqui toca em servico, contexto de dados nem rede. O script inline do index.html ja
// pintou a pagina antes do primeiro desenho; este modulo assume dali em diante.

const DARK_QUERY = '(prefers-color-scheme: dark)'

const listeners = new Set<() => void>()

function readStored(): ThemePref {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY))
  } catch {
    return 'auto'
  }
}

function systemDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches === true
  } catch {
    return false
  }
}

let pref: ThemePref = readStored()

function notify() {
  for (const listener of listeners) listener()
}

/** Evita que utilitarias com transition-colors animem a troca de variaveis (sem animacao de cor). */
function suppressTransitions() {
  try {
    const style = document.createElement('style')
    style.textContent = '*,*::before,*::after{transition:none!important}'
    document.head.appendChild(style)
    // Leitura forcada: o navegador aplica as cores novas ainda sob a regra acima.
    void window.getComputedStyle(document.body).backgroundColor
    window.setTimeout(() => style.remove(), 50)
  } catch {
    /* sem DOM completo: so deixa de suprimir */
  }
}

/** Escreve o tema resolvido no <html> e na meta da barra do navegador. */
function apply(animate = false) {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(pref, systemDark())
  if (animate) suppressTransitions()
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'escuro')
  root.style.colorScheme = resolved === 'escuro' ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColorFor(resolved))
}

/**
 * Chamado uma vez no boot, antes do createRoot. Aplica o tema, acompanha o tema do celular (quando a
 * preferencia e 'auto') e sincroniza abas do mesmo aparelho pelo evento storage. Devolve o desfazer.
 */
export function initTheme(): () => void {
  pref = readStored()
  apply()

  let mq: MediaQueryList | null = null
  const onSystem = () => {
    if (pref === 'auto') apply(true)
    notify()
  }
  try {
    mq = window.matchMedia(DARK_QUERY)
    mq.addEventListener('change', onSystem)
  } catch {
    mq = null
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== THEME_KEY) return
    pref = readStored()
    apply(true)
    notify()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    mq?.removeEventListener('change', onSystem)
    window.removeEventListener('storage', onStorage)
  }
}

function setPref(next: ThemePref) {
  const valid = normalizeTheme(next)
  pref = valid
  try {
    localStorage.setItem(THEME_KEY, valid)
  } catch {
    /* sem armazenamento: vale ate fechar o app */
  }
  apply(true)
  // O evento storage nao dispara na aba que gravou.
  notify()
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

const getPref = (): ThemePref => pref
const getResolved = (): ThemeResolved => resolveTheme(pref, systemDark())
const getServerPref = (): ThemePref => 'auto'
const getServerResolved = (): ThemeResolved => 'claro'

/** Preferencia escolhida, tema resolvido e a troca. Snapshots sao textos primitivos estaveis. */
export function useTheme(): { pref: ThemePref; resolved: ThemeResolved; setPref: (next: ThemePref) => void } {
  const current = useSyncExternalStore(subscribe, getPref, getServerPref)
  const resolved = useSyncExternalStore(subscribe, getResolved, getServerResolved)
  return { pref: current, resolved, setPref }
}
