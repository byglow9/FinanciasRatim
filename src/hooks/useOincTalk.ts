import { useEffect, useRef, type RefObject } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { babble, babbleSeconds, voiceMood } from '@/lib/vintem/babble'

/** Duracao de um balanco do corpo na voz neutra, em milissegundos. */
const BOB_MS = 190

interface Motion {
  /** Quadros do corpo (apoiado na base). */
  body: Keyframe[]
  /** Quanto o focinho mexe, em unidades do desenho. */
  snout: number
  /** Largura e altura maximas da boquinha. */
  mouth: [number, number]
}

const pose = (...transforms: string[]): Keyframe[] => ['none', ...transforms, 'none'].map((transform) => ({ transform }))

/** O jeito de se mexer de cada expressao, no mesmo clima da cara dele. */
const MOTIONS: Readonly<Record<string, Motion>> = {
  neutro: { body: pose('scale(1.05, 0.93)', 'scale(0.97, 1.04)'), snout: 3, mouth: [1.1, 5] },
  atento: { body: pose('translateY(-3px) rotate(-3deg)', 'rotate(2deg)'), snout: 3, mouth: [1.1, 5] },
  // pulinhos
  feliz: { body: pose('scale(1.08, 0.9)', 'translateY(-10px) scale(0.95, 1.07)', 'scale(1.05, 0.94)'), snout: 3, mouth: [1.5, 6] },
  // tremendo de raiva
  bravo: { body: pose('translateX(-4px) rotate(-4deg) scale(1.04, 0.96)', 'translateX(4px) rotate(4deg)', 'translateX(-3px) rotate(-3deg)'), snout: 4.5, mouth: [1.7, 7] },
  // murcho, balancando devagar
  triste: { body: pose('scale(1.03, 0.93) rotate(-2deg)', 'scale(1.04, 0.91)', 'scale(1.02, 0.94) rotate(2deg)'), snout: 1.5, mouth: [0.7, 3] },
  // respiracao pesada e boca de bocejo
  sonolento: { body: pose('scale(1.03, 0.96) rotate(-3deg)', 'scale(0.99, 1.02) rotate(-3deg)'), snout: 1.5, mouth: [1, 8] },
  // susto: estica e recua
  surpreso: { body: pose('translateY(-8px) scale(0.9, 1.14)', 'scale(1.1, 0.9)', 'translateY(-3px) scale(0.96, 1.05)'), snout: 3.5, mouth: [1.2, 9] },
}

/**
 * Enquanto ha fala nova: resmungos e animacao "tudo junto" (corpo, focinho e boquinha), os dois no
 * clima da expressao que o porco esta mostrando. `ref` envolve o desenho. `feel` diz a expressao na
 * hora em que a fala comeca. Movimento reduzido tira so a animacao. `popKey` reinicia a cada fala.
 */
export function useOincTalk(ref: RefObject<HTMLElement | null>, text: string | null, popKey?: number, feel?: () => string) {
  const reduced = useReducedMotion()
  // a expressao do momento da fala vale ate o fim dela: mudar depois nao recomeca o som
  const mood = useRef(feel)
  useEffect(() => {
    mood.current = feel
  })

  useEffect(() => {
    if (text === null || text === '') return
    const feeling = mood.current?.() ?? 'neutro'
    const motion = MOTIONS[feeling] ?? MOTIONS.neutro
    const stop = babble(text, feeling)
    const el = ref.current
    const running: Animation[] = []
    if (el && !reduced && typeof el.animate === 'function') {
      const total = babbleSeconds(text, feeling) * 1000
      const beat = BOB_MS * voiceMood(feeling).speed
      const play = (target: Element, frames: Keyframe[], duration: number) =>
        running.push(target.animate(frames, { duration, iterations: Math.max(1, Math.round(total / duration)) }))
      el.style.transformOrigin = '50% 100%'
      play(el, motion.body, beat * (motion.body.length - 2))
      const k = motion.snout
      for (const snout of el.querySelectorAll('[data-talk="snout"]')) {
        play(snout, pose(`translate(0, -${k}px)`, `translate(${k / 2}px, 1px)`, `translate(-${k / 2}px, 0)`), beat * 0.8)
      }
      const [wide, tall] = motion.mouth
      for (const lips of el.querySelectorAll('[data-talk="mouth"]')) {
        play(
          lips,
          ['scale(1, 1)', `scale(${wide}, ${tall})`, `scale(0.8, ${tall / 2.5})`, 'scale(1, 1)'].map((transform) => ({ opacity: 1, transform })),
          beat * 0.9,
        )
      }
    }
    return () => {
      stop()
      for (const animation of running) animation.cancel()
    }
  }, [ref, text, popKey, reduced])
}
