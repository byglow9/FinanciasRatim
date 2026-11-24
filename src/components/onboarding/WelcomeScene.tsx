import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Vintem, type VintemHandle } from '@/components/vintem/Vintem'
import { Lens, PhoneFrame, Ring, SayBubble } from '@/components/onboarding/OnboardingParts'
import {
  BUBBLE_IN_S,
  CAL_DAYS,
  HOME_RING,
  LENS,
  ONBOARDING_SCENES,
  SAY_START_S,
  dayRect,
  sayDuration,
  type SceneState,
} from '@/components/onboarding/onboardingScenes'

interface WelcomeSceneProps {
  /** Tela de boas-vindas: 0 (Seu mes), 1 (Limites) ou 2 (Calendario). */
  index: 0 | 1 | 2
  reduced: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Nomes dos aneis do calendario na ordem do roteiro (dias 8, 14, 19 e 23). */
const DAY_RINGS = CAL_DAYS.map((d) => `d${d.day}`)

/**
 * As tres telas de boas-vindas (S29-09 a S29-17): balao com a fala do Vintem, o Vintem de entrada
 * olhando e reagindo e o celular com o print real do tema. O roteiro so liga temporizadores na
 * montagem e os apaga ao desmontar (seguro em StrictMode); com movimento reduzido nenhum existe e a
 * cena ja nasce na pose final. O estado e os aneis vem de estado React (poucos valores, nunca por quadro).
 */
export function WelcomeScene({ index, reduced }: WelcomeSceneProps) {
  const scene = ONBOARDING_SCENES[index]
  const stageRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const vref = useRef<VintemHandle>(null)

  const [vstate, setVstate] = useState<SceneState>(reduced ? scene.finalState : 'neutro')
  // Aneis do print: reduzido ja nasce com todos em cena.
  const [rings, setRings] = useState<Record<string, boolean>>(() =>
    reduced ? Object.fromEntries(['ring1', ...DAY_RINGS].map((n) => [n, true])) : {},
  )
  const [lensOn, setLensOn] = useState(reduced)
  const [lensTarget, setLensTarget] = useState<number>(reduced ? LENS.to : LENS.from)

  useEffect(() => {
    if (reduced) return
    const timers: number[] = []
    const intervals: number[] = []
    const at = (sec: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, Math.round(sec * 1000)))
    }

    // Olhar guiado: conta em pixels sobre o retangulo do alvo e o do Vintem, escala de 120 px.
    const gazeAtPoint = (px: number, py: number) => {
      const box = boxRef.current
      if (!box) return
      const v = box.getBoundingClientRect()
      const ex = v.left + v.width / 2
      const ey = v.top + v.height * (106 / 200)
      vref.current?.gazeTo(clamp((px - ex) / 120, -1, 1), clamp((py - ey) / 120, -1, 1))
    }
    const gazeAtEl = (selector: string) => {
      const el = stageRef.current?.querySelector(selector)
      if (!el) return
      const r = el.getBoundingClientRect()
      gazeAtPoint(r.left + r.width / 2, r.top + r.height / 2)
    }
    const rest = () => vref.current?.gazeTo(0, 0.1)
    const ring = (name: string) => setRings((prev) => ({ ...prev, [name]: true }))

    const E = SAY_START_S + sayDuration(scene.say)
    // Todas olham para o balao quando ele entra.
    at(BUBBLE_IN_S, () => vref.current?.gazeTo(0, -0.75))

    if (index === 0) {
      at(E - 1.2, () => gazeAtEl('[data-ring="ring1"]'))
      at(E - 0.4, () => ring('ring1'))
      at(E + 0.9, () => setVstate('feliz'))
      at(E + 2.6, () => {
        setVstate('neutro')
        rest()
      })
    } else if (index === 1) {
      at(E - 0.9, () => {
        setLensOn(true)
        const lens = stageRef.current?.querySelector('[data-lens]')
        if (!lens) return
        const r = lens.getBoundingClientRect()
        gazeAtPoint(r.left + r.width * 0.3, r.top + r.height * 0.3)
      })
      at(E + 0.5, () => {
        setLensTarget(LENS.to)
        // O olhar acompanha a ponta da barra enquanto ela enche.
        intervals.push(
          window.setInterval(() => {
            const fill = stageRef.current?.querySelector('[data-lens] [role="progressbar"] > div')
            if (!fill) return
            const r = fill.getBoundingClientRect()
            gazeAtPoint(r.right, r.top + 30)
          }, 120),
        )
      })
      at(E + 1.05, () => setVstate('atento'))
      at(E + 1.6, () => vref.current?.react('susto'))
      at(E + 2.7, () => {
        intervals.forEach((id) => window.clearInterval(id))
        rest()
      })
    } else {
      const when = [E - 0.4, E + 0.4, E + 1.2, E + 2.1]
      DAY_RINGS.forEach((name, i) => {
        at(when[i], () => {
          ring(name)
          gazeAtEl(`[data-ring="${name}"]`)
        })
      })
      at(E + 2.9, () => {
        rest()
        setVstate('feliz')
        vref.current?.react('festa')
      })
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      intervals.forEach((id) => window.clearInterval(id))
    }
  }, [index, reduced, scene.say])

  const stageStyle = { '--onb-shift': scene.shift } as CSSProperties

  return (
    <div
      ref={stageRef}
      data-scene={scene.id}
      data-vintem-state={vstate}
      className="onb-stage"
      style={stageStyle}
    >
      <SayBubble
        text={scene.say}
        startS={SAY_START_S}
        enterS={BUBBLE_IN_S}
        reduced={reduced}
        tailShift="var(--onb-sh)"
      />

      <div ref={boxRef} className="onb-vintem" aria-hidden="true">
        <div className="onb-halo" />
        <div className="onb-drop">
          <Vintem ref={vref} look="entrada" state={vstate} size="stage" follow={false} decorative className="h-auto w-full" />
        </div>
      </div>

      <PhoneFrame print={scene.print} crop={scene.crop}>
        {index === 0 ? <Ring rect={HOME_RING} on={!!rings.ring1} name="ring1" /> : null}
        {index === 1 ? <Lens on={lensOn} target={lensTarget} reduced={reduced} /> : null}
        {index === 2
          ? CAL_DAYS.map((d, i) => (
              <Ring key={d.day} rect={dayRect(d.cx, d.cy)} on={!!rings[DAY_RINGS[i]]} name={DAY_RINGS[i]} />
            ))
          : null}
      </PhoneFrame>
    </div>
  )
}
