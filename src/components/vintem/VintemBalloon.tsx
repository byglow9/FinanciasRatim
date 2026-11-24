import { useLayoutEffect, useRef } from 'react'
import { Spring, SPRING_PARAMS } from '@shared/core/vintemSpring.js'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { onFrame } from '@/lib/vintem/world'
import { cn } from '@/lib/utils'

export type VintemBalloonPlacement = 'below' | 'inline'

export interface VintemBalloonProps {
  /** Texto simples da fala: entra como filho React, nunca como HTML. */
  text: string
  /** `below`: abaixo do arco, com rabicho no topo. `inline`: ao lado do Vintem de 48 px. */
  placement?: VintemBalloonPlacement
  onDismiss?: () => void
  /** Muda a cada fala nova: reinicia o pop de mola. */
  popKey?: string | number
  /** Interruptor de teste que vale mais que a midia de movimento reduzido. */
  reduced?: boolean
}

/** Duracao do fade de entrada, em segundos (150 ms; 100 ms com movimento reduzido). */
const FADE_SEC = 0.15
const FADE_REDUCED_SEC = 0.1
/** Escala em que o pop comeca (UI-SPEC S1: 0,6 para 1). */
const POP_FROM = 0.6

/**
 * Balao de fala do Vintem (UI-SPEC S1): botao que dispensa ao ativar, texto simples e sem corte.
 * O pop de mola `bub` roda por `onFrame`, o laco unico do mundo, escrevendo `style` por `ref`:
 * nenhum estado por quadro. Com movimento reduzido so aparece com fade.
 */
export function VintemBalloon({ text, placement = 'below', onDismiss, popKey, reduced }: VintemBalloonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const media = useReducedMotion()
  const effectiveReduced = reduced ?? media
  const inline = placement === 'inline'

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.transformOrigin = inline ? '0% 50%' : '50% 0%'
    el.style.opacity = '0'
    const fadeSec = effectiveReduced ? FADE_REDUCED_SEC : FADE_SEC
    const spring = new Spring(POP_FROM, SPRING_PARAMS.bub[0], SPRING_PARAMS.bub[1])
    spring.t = 1
    el.style.transform = effectiveReduced ? 'none' : `scale(${POP_FROM})`
    let elapsed = 0
    const off = onFrame((dt) => {
      elapsed += dt
      el.style.opacity = String(Math.min(1, elapsed / fadeSec))
      if (effectiveReduced) {
        const done = elapsed >= fadeSec
        if (done) el.style.opacity = '1'
        return !done
      }
      spring.step(dt)
      const settled = Math.abs(spring.x - 1) < 0.002 && Math.abs(spring.v) < 0.02
      el.style.transform = settled ? 'none' : `scale(${spring.x.toFixed(4)})`
      if (settled && elapsed >= fadeSec) {
        el.style.opacity = '1'
        return false
      }
      return true
    })
    return () => {
      off()
      el.style.opacity = ''
      el.style.transform = ''
    }
  }, [popKey, effectiveReduced, inline])

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Dispensar fala do OINC"
      onClick={onDismiss}
      className={cn(
        'relative block rounded-card bg-[var(--vintem-balloon)] px-4 py-3 text-left text-base font-normal leading-normal text-[var(--vintem-balloon-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        inline ? 'min-h-12 w-full' : 'mx-auto min-h-14 w-[min(360px,100%)]',
      )}
    >
      <span aria-hidden="true">{text}</span>
      {inline ? (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-4 h-0 w-0 border-y-8 border-r-8 border-y-transparent border-r-[color:var(--vintem-balloon)]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-b-8 border-x-transparent border-b-[color:var(--vintem-balloon)]"
        />
      )}
    </button>
  )
}
