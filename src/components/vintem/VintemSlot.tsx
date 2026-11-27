import { useEffect, useRef, type MouseEvent } from 'react'
import { Vintem, type VintemHandle, type VintemState } from '@/components/vintem/Vintem'
import { useVintem } from '@/contexts/VintemContext'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const POKE_MS = 460

/**
 * Vintem do arco da Home (UI-SPEC S1): botao de 150 por 125 com a arte hero decorativa.
 * Registra o handle no provedor enquanto montado, para as reacoes chegarem a ele.
 */
export function VintemSlot({
  state,
  onTap,
}: {
  state: VintemState
  onTap?: (handle: VintemHandle | null) => void
}) {
  const { registerSlot } = useVintem()
  const handle = useRef<VintemHandle>(null)

  useEffect(() => {
    registerSlot(handle.current)
    return () => registerSlot(null)
  }, [registerSlot])

  const reduced = useReducedMotion()
  const body = useRef<HTMLSpanElement>(null)

  // Cutucao: ele e empurrado para o lado oposto ao dedo, amassa e balanca ate voltar ao lugar.
  const poke = (event: MouseEvent<HTMLButtonElement>) => {
    const el = body.current
    if (el && !reduced && typeof el.animate === 'function') {
      const box = event.currentTarget.getBoundingClientRect()
      // pelo teclado nao ha dedo: empurra para a direita
      const away = event.detail > 0 && event.clientX > box.left + box.width / 2 ? -1 : 1
      el.animate(
        [
          { transform: 'none' },
          { transform: `translateX(${14 * away}px) rotate(${9 * away}deg) scale(0.86, 1.08)`, offset: 0.18 },
          { transform: `translateX(${-7 * away}px) rotate(${-6 * away}deg) scale(1.08, 0.93)`, offset: 0.45 },
          { transform: `translateX(${3 * away}px) rotate(${3 * away}deg) scale(0.97, 1.03)`, offset: 0.7 },
          { transform: 'none' },
        ],
        { duration: POKE_MS, easing: 'ease-out' },
      )
    }
    onTap?.(handle.current)
  }

  return (
    <button
      type="button"
      onClick={poke}
      aria-label="OINC, toque para ouvir uma fala"
      data-vintem-state={state}
      className="flex h-[125px] w-[150px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span ref={body} className="flex origin-bottom items-center justify-center">
        <Vintem ref={handle} size="gauge" state={state} follow />
      </span>
    </button>
  )
}
