import { forwardRef, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import {
  LENS,
  LIMITS_ROW,
  PRINT_SIZE,
  sayTimes,
  type PrintKey,
  type PrintRect,
} from '@/components/onboarding/onboardingScenes'
import homeClaro from '@/assets/onboarding/home-claro.webp'
import homeEscuro from '@/assets/onboarding/home-escuro.webp'
import limitesClaro from '@/assets/onboarding/limites-claro.webp'
import limitesEscuro from '@/assets/onboarding/limites-escuro.webp'
import calendarioClaro from '@/assets/onboarding/calendario-claro.webp'
import calendarioEscuro from '@/assets/onboarding/calendario-escuro.webp'

// Prints reais do app (modo MOCK, dados ficticios), trocados pelo tema (D-22, T-05-23-02). Entram por
// import: o Vite gera nomes com hash em /assets/ e nada vem de rede de terceiros (T-05-23-01).
const PRINTS: Record<PrintKey, { claro: string; escuro: string }> = {
  home: { claro: homeClaro, escuro: homeEscuro },
  limites: { claro: limitesClaro, escuro: limitesEscuro },
  calendario: { claro: calendarioClaro, escuro: calendarioEscuro },
}

interface PhoneFrameProps {
  print: PrintKey
  /** Largura do celular (CSS); padrao: a variavel --onb-pw do palco. */
  width?: string
  /** Quanto do topo do print sai do vidro em telas baixas, em pixels do print (so com --onb-k > 0). */
  crop?: number
  className?: string
  /** Camadas por cima do print (aneis, lente, interface do navegador): posicao absoluta no vidro. */
  children?: ReactNode
}

/** Moldura de celular decorativa com o print do tema; o texto da tela nunca depende dela. */
export const PhoneFrame = forwardRef<HTMLDivElement, PhoneFrameProps>(function PhoneFrame(
  { print, width, crop = 0, className, children },
  ref,
) {
  const { resolved } = useTheme()
  const src = PRINTS[print][resolved === 'escuro' ? 'escuro' : 'claro']
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-print={print}
      className={cn('onb-phone relative z-[2]', className)}
      style={width ? { width } : undefined}
    >
      <div className="onb-glass relative">
        <div className="onb-layer relative" style={{ '--onb-crop': crop } as CSSProperties}>
          <img
            src={src}
            alt=""
            width={600}
            height={1298}
            draggable={false}
            decoding="sync"
            className="block h-auto w-full select-none"
          />
          {children}
        </div>
      </div>
    </div>
  )
})

/** Retangulo do print em porcentagem do vidro (390 por 844): nenhuma medicao em JS. */
function rectStyle(rect: PrintRect): CSSProperties {
  const [x, y, w, h] = rect
  return {
    left: `${(x / PRINT_SIZE.w) * 100}%`,
    top: `${(y / PRINT_SIZE.h) * 100}%`,
    width: `${(w / PRINT_SIZE.w) * 100}%`,
    height: `${(h / PRINT_SIZE.h) * 100}%`,
  }
}

interface RingProps {
  rect: PrintRect
  on: boolean
  /** Nome para os executores (data-ring). */
  name: string
}

/** Anel de destaque: entra por opacidade e escala (a transicao some com movimento reduzido). */
export function Ring({ rect, on, name }: RingProps) {
  return <div data-ring={name} data-on={on ? 'true' : 'false'} className="onb-ring" style={rectStyle(rect)} />
}

const MONEY = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

interface LensProps {
  /** A lente aparece (opacidade e subida). */
  on: boolean
  /** Alvo da contagem: de LENS.from a LENS.to. */
  target: number
  reduced: boolean
}

/** Lente sobre a linha de Alimentacao do print: o percentual sobe e passa para o tom de aviso. */
export function Lens({ on, target, reduced }: LensProps) {
  const [pct, setPct] = useState<number>(reduced ? LENS.to : LENS.from)

  // Contagem de cerca de 1,1 s; o estado so existe neste componente. Reduzido: ja nasce em 82%.
  useEffect(() => {
    if (reduced) return
    const from = pct
    if (from === target) return
    // Contagem de 1,1 s por tempo decorrido (nao por quadro). Sem requestAnimationFrame: a guarda do laco
    // unico da Fase 4 (phase4-testpage) so o permite em world.ts, ArcGauge e useSectionReveal.
    const t0 = performance.now()
    const timer = window.setInterval(() => {
      const u = Math.min(1, (performance.now() - t0) / LENS.countMs)
      const eased = 1 - (1 - u) * (1 - u)
      setPct(from + (target - from) * eased)
      if (u >= 1) window.clearInterval(timer)
    }, 16)
    return () => window.clearInterval(timer)
    // `pct` e lido so na partida de cada contagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced])

  const value = reduced ? target : pct
  const shown = Math.round(value)
  const hot = shown >= LENS.hot
  const spent = shown === LENS.from ? 1574 : Math.round((LENS.cap * shown) / 100)
  return (
    <div
      data-lens
      data-pct={shown}
      data-on={on ? 'true' : 'false'}
      className="onb-lens absolute inset-x-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-foreground shadow-lg"
      style={{ top: `${(LIMITS_ROW.y / PRINT_SIZE.h) * 100}%` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-bold leading-[1.2]">Alimentação</span>
        <span className="text-xs font-normal text-muted-foreground">{shown}%</span>
      </div>
      <Progress value={value} tone={hot ? 'warn' : 'ok'} className="my-2" />
      <p className={cn('text-xs', hot ? 'font-bold text-warn-ink' : 'font-normal text-muted-foreground')}>
        {`R$ ${MONEY.format(spent)} de R$ ${MONEY.format(LENS.cap)}`}
      </p>
    </div>
  )
}

interface SayBubbleProps {
  text: string
  /** Segundos desde a montagem ate comecar a digitar. */
  startS: number
  /** Segundos ate o balao entrar (atraso da animacao). */
  enterS: number
  reduced: boolean
  /** Rabicho: deslocamento horizontal em relacao ao centro do balao (qualquer comprimento CSS). */
  tailShift?: string
}

/**
 * Balao de fala do Vintem: texto fixo, no fluxo da cena. O texto completo fica num `sr-only`, um
 * espacador invisivel com o texto inteiro define a altura (nunca muda durante a digitacao) e o texto
 * digitado fica por cima. Com movimento reduzido o texto aparece inteiro, sem temporizador.
 */
export function SayBubble({ text, startS, enterS, reduced, tailShift = '0px' }: SayBubbleProps) {
  const times = useMemo(() => sayTimes(text), [text])
  const [count, setTyped] = useState(0)
  // Reduzido: o texto aparece inteiro desde o primeiro quadro e nenhum temporizador existe.
  const typed = reduced ? text.length : count

  useEffect(() => {
    if (reduced) return
    // Um unico temporizador por vez: agenda o proximo caractere pelo instante da tabela.
    let timer = 0
    let n = 0
    const t0 = performance.now() + startS * 1000
    const step = () => {
      const elapsed = performance.now() - t0
      while (n < times.at.length && times.at[n] <= elapsed) n++
      setTyped(n)
      if (n < times.at.length) timer = window.setTimeout(step, Math.max(8, t0 + times.at[n] - performance.now()))
    }
    timer = window.setTimeout(step, startS * 1000)
    return () => window.clearTimeout(timer)
  }, [reduced, startS, text, times])

  const style = {
    '--onb-tail': tailShift,
    animationDelay: reduced ? undefined : `${enterS}s`,
    animationFillMode: 'backwards',
  } as CSSProperties
  return (
    <div
      data-say
      data-typed={typed}
      className="anim-vintem-say relative z-[4] w-[min(312px,calc(100%_-_48px))] rounded-card bg-action px-4 py-3.5 text-base font-normal leading-[1.4] text-action-text shadow-lg"
      style={style}
    >
      <span className="sr-only" data-say-full>
        {text}
      </span>
      <span aria-hidden="true" className="invisible block">
        {text}
      </span>
      <span aria-hidden="true" data-say-typed className="absolute inset-x-4 top-3.5">
        {text.slice(0, typed)}
      </span>
      <span aria-hidden="true" className="onb-tail absolute -bottom-[7px] h-4 w-4 rotate-45 rounded-br-[5px] bg-action" />
    </div>
  )
}
