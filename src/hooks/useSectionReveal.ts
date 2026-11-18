import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const HIGHLIGHT_MS = 1200

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Rola até a seção com destaque, foca o título e devolve `reveal(id)`. O elemento
 * é achado só por getElementById: nunca se monta seletor a partir de texto de URL.
 */
export function useSectionReveal() {
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  return useCallback((id: string): boolean => {
    const el = document.getElementById(id)
    if (!el) return false
    const reduced = reducedMotion()
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })

    const title = el.querySelector<HTMLElement>('[data-section-title]') ?? el
    if (title === el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    title.focus({ preventScroll: true })

    const cls = reduced ? 'section-highlight-static' : 'anim-section-highlight'
    el.classList.remove('anim-section-highlight', 'section-highlight-static')
    // Força o reinício da animação quando o atalho é tocado de novo.
    void el.offsetWidth
    el.classList.add(cls)
    const timer = window.setTimeout(() => el.classList.remove(cls), HIGHLIGHT_MS)
    timers.current.push(timer)
    return true
  }, [])
}

/**
 * Quando `ready` é verdadeiro e a URL tem hash, decodifica (com tratamento de erro),
 * acha o elemento por id, avisa `onReveal(id)` e rola com destaque.
 */
export function useHashReveal(onReveal: ((id: string) => void) | undefined, ready: boolean) {
  const reveal = useSectionReveal()
  const { hash } = useLocation()
  const onRevealRef = useRef(onReveal)
  useEffect(() => {
    onRevealRef.current = onReveal
  })

  useEffect(() => {
    if (!ready || !hash || hash.length < 2) return
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      return
    }
    if (!document.getElementById(id)) return
    onRevealRef.current?.(id)
    // Espera o painel abrir (onReveal) antes de rolar.
    const frame = requestAnimationFrame(() => {
      reveal(id)
    })
    return () => cancelAnimationFrame(frame)
  }, [hash, ready, reveal])
}
