import { useEffect, useState, type ReactNode } from 'react'
import { PiggyBank } from 'lucide-react'
import type { ArcTone } from '@/lib/rhythm'

// Comprimento do semicírculo M16 104 A84 84 0 0 1 184 104 (π × 84 ≈ 264).
const ARC_LENGTH = 264
const ARC_PATH = 'M16 104 A84 84 0 0 1 184 104'

const STROKE_BY_TONE: Record<ArcTone, string> = {
  brand: 'stroke-brand',
  warn: 'stroke-warn',
  danger: 'stroke-danger',
  neutral: 'stroke-muted-foreground',
}

interface ArcGaugeProps {
  /** Porcentagem do dinheiro do ciclo que resta (já calculada pelo núcleo). Nulo = carregando. */
  restPct: number | null | undefined
  tone: ArcTone
  loading?: boolean
  ariaLabel?: string
  /** Conteúdo do slot central de 84px; padrão: porquinho (a Fase 4 troca por mascote). */
  children?: ReactNode
}

/** Arco do hero: só exibe o `restPct` que a BudgetView entrega, sem fórmula. */
export function ArcGauge({ restPct, tone, loading, ariaLabel, children }: ArcGaugeProps) {
  const empty = Boolean(loading) || restPct == null || !Number.isFinite(restPct)
  const pct = empty ? 0 : Math.min(Math.max(restPct as number, 0), 100)

  // Na montagem o arco sai de vazio para o valor: o estado vira num frame seguinte.
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const shown = drawn ? pct : 0
  const offset = ARC_LENGTH * (1 - shown / 100)
  const label = ariaLabel ?? `Restam ${Math.round(pct)}% do dinheiro do ciclo`

  return (
    <div className="relative mx-auto" style={{ width: 'min(272px, calc(100% - 32px))' }}>
      <svg
        viewBox="0 0 200 110"
        className="block h-auto w-full"
        role="img"
        aria-label={empty ? 'Arco do dinheiro do ciclo' : label}
      >
        <path
          d={ARC_PATH}
          fill="none"
          strokeWidth={13}
          strokeLinecap="round"
          className={`stroke-track ${loading ? 'anim-pulse' : ''}`}
        />
        {!empty && (
          <path
            d={ARC_PATH}
            fill="none"
            strokeWidth={13}
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={offset}
            className={STROKE_BY_TONE[tone]}
            style={{
              transition:
                'stroke-dashoffset 500ms cubic-bezier(.2,.8,.2,1), stroke 500ms cubic-bezier(.2,.8,.2,1)',
            }}
          />
        )}
      </svg>
      <div
        className="absolute left-1/2 flex h-[125px] w-[150px] -translate-x-1/2 items-center justify-center"
        style={{ top: 45 }}
      >
        {children ?? <PiggyBank className="h-[42px] w-[42px] text-brand" aria-hidden="true" />}
      </div>
    </div>
  )
}
