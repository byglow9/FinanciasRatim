import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft } from 'lucide-react'
import { InstallSteps } from '@/components/onboarding/InstallSteps'
import { WelcomeScene } from '@/components/onboarding/WelcomeScene'
import { ONBOARDING_SCENES } from '@/components/onboarding/onboardingScenes'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { markOnboardingSeen } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

export type OnboardingMode = 'first' | 'replay'

interface OnboardingProps {
  /** `first`: antes do login, grava a marca ao sair. `replay`: sobreposicao de Ajustes, nunca grava. */
  mode: OnboardingMode
  onFinish: () => void
}

// Plano 05-23 (S29-09, D-20 a D-22): quatro telas, as tres de boas-vindas do sketch 029 e a de adicionar
// a tela inicial. Os textos e os dados de cada tela moram em onboardingScenes.ts.
const SCENES = ONBOARDING_SCENES

const LAST = SCENES.length - 1

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.tabIndex !== -1,
  )
}

/**
 * Onboarding de quatro telas (IDEN-08, D-17, D-20 a D-22, plano 05-23). Cada cena de boas-vindas monta o
 * seu Vintem de entrada, que fala num balao e e decorativo (sem toque, sem IA). A navegacao e so pelos botoes.
 */
export function Onboarding({ mode, onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const mounted = useRef(false)
  const stepLabelId = useId()
  const replay = mode === 'replay'
  const scene = SCENES[step]
  const isLast = step === LAST

  // So a saida do modo `first` grava a marca (P-03); montar, avancar e voltar nunca gravam.
  const finish = () => {
    if (mode === 'first') markOnboardingSeen()
    onFinish()
  }
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })

  // Replay: trava a rolagem do app por tras, prende o foco, Esc fecha e o foco volta a quem abriu.
  useEffect(() => {
    if (!replay) return
    const origin = document.activeElement as HTMLElement | null
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        finishRef.current()
        return
      }
      const root = rootRef.current
      if (e.key !== 'Tab' || !root) return
      const items = focusableIn(root)
      if (items.length === 0) {
        e.preventDefault()
        titleRef.current?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      const inside = !!active && root.contains(active)
      if (e.shiftKey && (!inside || active === first || active === titleRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
      if (origin && origin.isConnected) origin.focus()
    }
  }, [replay])

  // A cada troca de tela o foco vai para o titulo; na abertura so o replay (para o foco entrar no dialogo).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      if (!replay) return
    }
    titleRef.current?.focus({ preventScroll: true })
  }, [step, replay])

  const go = (next: number, dir: 'forward' | 'back') => {
    setDirection(dir)
    setStep(next)
  }

  const enterStyle = { '--onboarding-shift': direction === 'back' ? '-24px' : '24px' } as CSSProperties

  const column = (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">
      {/* Barra superior: Voltar (invisivel na tela 1) e Pular, Agora nao na ultima (Fechar no replay). */}
      <div className="pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex h-12 items-center justify-between px-3">
          <Button
            type="button"
            variant="ghost"
            tabIndex={step === 0 ? -1 : undefined}
            className={cn('min-h-11 gap-1 px-3 text-muted-foreground', step === 0 && 'invisible')}
            onClick={() => go(step - 1, 'back')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Voltar
          </Button>
          <Button type="button" variant="ghost" className="min-h-11 px-3 text-muted-foreground" onClick={finish}>
            {replay ? 'Fechar' : isLast ? 'Agora não' : 'Pular'}
          </Button>
        </div>
      </div>

      {/* Regiao do meio: a unica que rola, so na vertical. */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div key={step} className="anim-onboarding-in flex min-h-full flex-col" style={enterStyle}>
          <p id={stepLabelId} className="sr-only">
            {`Passo ${step + 1} de ${SCENES.length}`}
          </p>
          <h1
            ref={titleRef}
            tabIndex={-1}
            aria-describedby={stepLabelId}
            className="px-4 pt-0.5 text-center font-display text-[28px] font-bold leading-[1.2] tracking-[-0.02em] focus:outline-none"
          >
            {scene.title}
          </h1>
          {isLast ? (
            <div className="space-y-4 px-4 pt-4">
              <p className="text-center text-base font-normal leading-[1.4] text-muted-foreground">{scene.say}</p>
              <div className="rounded-card bg-card p-4">
                <InstallSteps />
              </div>
            </div>
          ) : (
            <WelcomeScene key={step} index={step as 0 | 1 | 2} reduced={reduced} />
          )}
        </div>
      </div>

      {/* Rodape parado: progresso e botao principal. */}
      <div className="sticky bottom-0 bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <div aria-hidden="true" className="mb-4 flex h-3 items-center justify-center gap-1.5">
          {SCENES.map((s, index) => (
            <span
              key={s.id}
              className={cn('h-1.5 rounded-full', index === step ? 'w-5 bg-action' : 'w-1.5 bg-input')}
            />
          ))}
        </div>
        <Button
          type="button"
          size="circleLg"
          className="h-14 w-full bg-action text-action-text"
          onClick={isLast ? finish : () => go(step + 1, 'forward')}
        >
          {isLast ? (replay ? 'Concluir' : 'Entrar') : 'Continuar'}
        </Button>
      </div>
    </div>
  )

  if (replay) {
    return createPortal(
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Apresentação do Coinc"
        className="fixed inset-0 z-[60] bg-background"
      >
        {column}
      </div>,
      document.body,
    )
  }

  return (
    <main ref={rootRef} className="h-dvh bg-background">
      {column}
    </main>
  )
}
