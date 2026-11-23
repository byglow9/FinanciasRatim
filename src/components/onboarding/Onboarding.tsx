import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, Clapperboard } from 'lucide-react'
import { InstallSteps } from '@/components/onboarding/InstallSteps'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Progress } from '@/components/ui/progress'
import { Vintem, type VintemState } from '@/components/vintem/Vintem'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { markOnboardingSeen } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

export type OnboardingMode = 'first' | 'replay'

interface OnboardingProps {
  /** `first`: antes do login, grava a marca ao sair. `replay`: sobreposicao de Ajustes, nunca grava. */
  mode: OnboardingMode
  onFinish: () => void
}

interface Screen {
  title: string
  body: string
}

// Textos do contrato (UI-SPEC S1, D-16).
const SCREENS: Screen[] = [
  {
    title: 'Veja quanto ainda pode gastar',
    body: 'Em um número só, você vê o que ainda dá para gastar no mês, já descontando as contas fixas.',
  },
  {
    title: 'Limites e o Vintém',
    body: 'Defina um limite para cada categoria. O Vintém, seu porquinho, avisa quando você está chegando perto.',
  },
  {
    title: 'Adicionar à tela inicial',
    body: 'Deixe o Coinc na tela do celular e abra como um app, em tela cheia.',
  },
]

// Um estado do Vintem por tela (D-19): apresentacao, perto do limite, chegada.
const VINTEM_BY_SCREEN: VintemState[] = ['neutro', 'atento', 'feliz']

const LAST = SCREENS.length - 1

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.tabIndex !== -1,
  )
}

/** Ilustracao decorativa e fictícia (sempre com o chip Exemplo): nenhum valor vem do Firestore (T-05-14-04). */
function Illustration({ screen }: { screen: number }) {
  if (screen === 0) {
    return (
      <div className="mt-2 flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-normal text-muted-foreground">Pode gastar</p>
        <p className="num-display text-[56px] font-bold leading-none">R$ 1.240</p>
        <Chip className="mt-1">Exemplo</Chip>
      </div>
    )
  }
  if (screen === 1) {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-base font-bold">Lazer</p>
          <Chip>Exemplo</Chip>
        </div>
        <Progress value={82} tone="warn" />
        <p className="text-xs font-normal text-muted-foreground">82% do limite</p>
      </div>
    )
  }
  return null
}

/**
 * Onboarding de 3 telas (IDEN-08, D-16 a D-19). O Vintem e uma unica instancia decorativa que continua
 * montada entre as telas (so o estado muda), sem balao, sem fala e sem toque. A navegacao e so pelos botoes.
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
  const screen = SCREENS[step]
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
      {/* Barra superior: Voltar (invisivel na tela 1) e Pular (Fechar no replay). */}
      <div className="pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex h-12 items-center justify-between px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Voltar"
            tabIndex={step === 0 ? -1 : undefined}
            className={cn(step === 0 && 'invisible')}
            onClick={() => go(step - 1, 'back')}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 px-4 text-muted-foreground"
            onClick={finish}
          >
            {replay ? 'Fechar' : 'Pular'}
          </Button>
        </div>
      </div>

      {/* Regiao do meio: a unica que rola, so na vertical. */}
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4">
        <div className="rounded-card bg-card p-4">
          <div aria-hidden="true" className="flex justify-center">
            <Vintem state={VINTEM_BY_SCREEN[step]} size="empty" follow decorative />
          </div>
          {step < LAST ? (
            <div
              key={step}
              aria-hidden="true"
              className="anim-onboarding-in"
              style={enterStyle}
            >
              <Illustration screen={step} />
            </div>
          ) : null}
        </div>

        <div key={step} className="anim-onboarding-in space-y-4" style={enterStyle}>
          <div className="space-y-2">
            <p id={stepLabelId} className="sr-only">
              {`Passo ${step + 1} de ${SCREENS.length}`}
            </p>
            <h1
              ref={titleRef}
              tabIndex={-1}
              aria-describedby={stepLabelId}
              className="font-display text-[28px] font-bold leading-[1.2] focus:outline-none"
            >
              {screen.title}
            </h1>
            <p className="text-base font-normal leading-normal">{screen.body}</p>
          </div>
          {isLast ? (
            <div className="rounded-card bg-card p-4">
              <InstallSteps />
            </div>
          ) : null}
        </div>
      </div>

      {/* Rodape parado: progresso e botao principal. */}
      <div className="sticky bottom-0 space-y-4 bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <div aria-hidden="true" className="flex items-center justify-center gap-2">
          {SCREENS.map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-2 rounded-full',
                !reduced && 'transition-[width] duration-200',
                index === step ? 'w-6 bg-action' : 'w-2 bg-input',
              )}
            />
          ))}
        </div>
        <Button
          type="button"
          size="lg"
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
