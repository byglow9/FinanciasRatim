import { useEffect, type RefObject } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { babble, babbleSeconds } from '@/lib/vintem/babble'

/** Duracao de um balanco do corpo enquanto fala, em milissegundos. */
const BOB_MS = 190

/**
 * Enquanto ha fala nova: resmungos e o porco quicando no lugar (achata e estica pela base, sem sair
 * do centro). Movimento reduzido tira so o balanco. `popKey` muda a cada fala e reinicia os dois.
 */
export function useOincTalk(ref: RefObject<HTMLElement | null>, text: string | null, popKey?: number) {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (text === null || text === '') return
    const stop = babble(text)
    const el = ref.current
    let bob: Animation | undefined
    if (el && !reduced && typeof el.animate === 'function') {
      el.style.transformOrigin = '50% 100%'
      bob = el.animate(
        [
          { transform: 'scale(1, 1)' },
          { transform: 'scale(1.05, 0.93)' },
          { transform: 'scale(0.97, 1.04)' },
          { transform: 'scale(1, 1)' },
        ],
        { duration: BOB_MS, iterations: Math.round((babbleSeconds(text) * 1000) / BOB_MS) },
      )
    }
    return () => {
      stop()
      bob?.cancel()
    }
  }, [ref, text, popKey, reduced])
}
