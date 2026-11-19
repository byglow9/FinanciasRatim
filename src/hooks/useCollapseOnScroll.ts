import { useCallback, useEffect, useReducer, useRef } from 'react'
import { collapseReducer, COLLAPSE_AT } from '@shared/core/collapse.js'
import type { CollapseState } from '@shared/core/collapse.js'

// Quanto tempo a rolagem programatica (tocar num dia, trocar de ciclo, "Hoje", abrir em hoje) ignora o
// evento de scroll. Igual ao sketch 011.
const PROGRAMMATIC_MS = 120

const INITIAL: CollapseState = { collapsed: false, lock: false }

// Faixa da rolagem: so uma mudanca de faixa vale um despacho. Dentro da mesma faixa o redutor
// devolveria o mesmo estado, entao nem o dispatch e feito.
type Zone = 'top' | 'mid' | 'far'

function zoneOf(top: number): Zone {
  if (top <= 0) return 'top'
  return top > COLLAPSE_AT ? 'far' : 'mid'
}

/**
 * Recolhimento do mes ao rolar a agenda (D-08). O estado vive no redutor puro do nucleo; este hook so
 * liga o contêiner de rolagem a ele. O contêiner da agenda (scrollRef) precisa estar montado desde a
 * primeira renderizacao da tela, porque o listener e registrado uma unica vez.
 *
 * - O listener de scroll e passivo e unico; scrollTop so e lido dentro do evento, nunca no render.
 * - progRef (em ref, nao causa render) ignora o evento durante a rolagem programatica.
 * - toggle, reset e markProgrammatic esquecem a ultima faixa, para o proximo evento ser avaliado de novo.
 */
export function useCollapseOnScroll() {
  const [state, dispatch] = useReducer(collapseReducer, INITIAL)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const progRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoneRef = useRef<Zone | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    const onScroll = () => {
      if (progRef.current) return
      const top = el.scrollTop
      const zone = zoneOf(top)
      if (zone === zoneRef.current) return
      zoneRef.current = zone
      dispatch({ type: 'scroll', top })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    },
    []
  )

  const markProgrammatic = useCallback(() => {
    progRef.current = true
    zoneRef.current = null
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      progRef.current = false
      timerRef.current = null
    }, PROGRAMMATIC_MS)
  }, [])

  const toggle = useCallback(() => {
    zoneRef.current = null
    dispatch({ type: 'toggle' })
  }, [])

  const reset = useCallback(() => {
    zoneRef.current = null
    dispatch({ type: 'reset' })
  }, [])

  return {
    collapsed: state.collapsed,
    locked: state.lock,
    scrollRef,
    toggle,
    markProgrammatic,
    reset,
  }
}
