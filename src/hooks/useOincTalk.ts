import { useEffect, useRef, type RefObject } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { babble, babbleSeconds, voiceMood } from '@/lib/vintem/babble'

/** Duracao de um balanco do corpo na voz neutra, em milissegundos. */
const BOB_MS = 340

interface Motion {
  /** Quadros do corpo (apoiado na base). */
  body: Keyframe[]
  /** Quanto o focinho mexe, em unidades do desenho. */
  snout: number
  /** Largura e altura maximas da boquinha. */
  mouth: [number, number]
}

const pose = (...transforms: string[]): Keyframe[] => ['none', ...transforms, 'none'].map((transform) => ({ transform }))

/** O jeito de se mexer de cada expressao, no mesmo clima da cara dele. Movimentos curtos: o dono achou
 * que balancava demais. */
const MOTIONS: Readonly<Record<string, Motion>> = {
  neutro: { body: pose('scale(1.02, 0.97)', 'scale(0.99, 1.015)'), snout: 1.6, mouth: [1.1, 4] },
  atento: { body: pose('translateY(-1px) rotate(-1.5deg)', 'rotate(1deg)'), snout: 1.6, mouth: [1.1, 4] },
  // pulinhos
  feliz: { body: pose('scale(1.03, 0.96)', 'translateY(-4px) scale(0.98, 1.025)', 'scale(1.02, 0.98)'), snout: 1.6, mouth: [1.4, 5] },
  // tremendo de raiva
  bravo: { body: pose('translateX(-1.5px) rotate(-1.8deg) scale(1.02, 0.98)', 'translateX(1.5px) rotate(1.8deg)', 'translateX(-1px) rotate(-1deg)'), snout: 2.2, mouth: [1.5, 5.5] },
  // murcho, balancando devagar
  triste: { body: pose('scale(1.015, 0.97) rotate(-1deg)', 'scale(1.02, 0.955)', 'scale(1.01, 0.97) rotate(1deg)'), snout: 1, mouth: [0.7, 3] },
  // respiracao pesada e boca de bocejo
  sonolento: { body: pose('scale(1.015, 0.98) rotate(-1.5deg)', 'scale(0.995, 1.01) rotate(-1.5deg)'), snout: 1, mouth: [1, 7] },
  // susto: estica e recua
  surpreso: { body: pose('translateY(-4px) scale(0.95, 1.07)', 'scale(1.05, 0.95)', 'translateY(-1px) scale(0.98, 1.025)'), snout: 2, mouth: [1.2, 7] },
}

/**
 * Enquanto ha fala nova: resmungos e animacao "tudo junto" (corpo, focinho e boquinha), os dois no
 * clima da expressao que o porco esta mostrando. `ref` envolve o desenho. `feel` diz a expressao na
 * hora em que a fala comeca. Movimento reduzido tira so a animacao. `popKey` reinicia a cada fala.
 */
export function useOincTalk(
  ref: RefObject<HTMLElement | null>,
  text: string | null,
  popKey?: number,
  feel?: () => string,
  /** Verdadeiro quando outro porco e quem esta dizendo esta fala. */
  quiet?: () => boolean,
) {
  const reduced = useReducedMotion()
  // a expressao do momento da fala vale ate o fim dela: mudar depois nao recomeca o som
  const mood = useRef(feel)
  const mute = useRef(quiet)
  useEffect(() => {
    mood.current = feel
    mute.current = quiet
  })

  useEffect(() => {
    if (text === null || text === '' || mute.current?.() === true) return
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
        play(snout, pose(`translate(0, -${k}px)`, `translate(${k / 2}px, 1px)`, `translate(-${k / 2}px, 0)`), beat)
      }
      const [wide, tall] = motion.mouth
      for (const lips of el.querySelectorAll('[data-talk="mouth"]')) {
        play(
          lips,
          ['scale(1, 1)', `scale(${wide}, ${tall})`, `scale(0.8, ${tall / 2.5})`, 'scale(1, 1)'].map((transform) => ({ opacity: 1, transform })),
          beat,
        )
      }
    }
    return () => {
      stop()
      for (const animation of running) animation.cancel()
    }
  }, [ref, text, popKey, reduced])
}
