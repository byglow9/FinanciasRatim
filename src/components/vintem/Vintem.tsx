import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { createVintemView, type VintemViewHandle } from '@/lib/vintem/view'
import { EYE, FRONT, VIEWBOX } from '@/lib/vintem/geometry'

/** Os sete estados do Vintem (D-05b). */
export type VintemState = 'neutro' | 'feliz' | 'triste' | 'bravo' | 'sonolento' | 'surpreso' | 'atento'

/** Tamanhos: largura da arte; a altura segue a proporcao 6:5 do viewBox 240x200. */
export const VINTEM_SIZES = {
  hero: { width: 84, height: 70 },
  inline: { width: 48, height: 40 },
  empty: { width: 120, height: 100 },
  stage: { width: 240, height: 200 },
} as const

export type VintemSize = keyof typeof VINTEM_SIZES

export interface VintemProps {
  state?: VintemState
  size?: VintemSize
  /** O olhar segue o ponteiro (padrao verdadeiro). */
  follow?: boolean
  /** Arte decorativa (padrao verdadeiro): o texto acessivel vem do elemento que envolve. */
  decorative?: boolean
  /** Interruptor de teste que vale mais que a midia de movimento reduzido. */
  reduced?: boolean
  className?: string
}

const ink = 'var(--vintem-ink)'
const bodyFill = 'var(--vintem-body)'

/** Um olho em camadas: esclera, pelicula, pupila, brilho, palpebras, cobertura do piscar e arco. */
function Eye({ uid, side }: { uid: string; side: 'L' | 'R' }) {
  return (
    <g id={`${uid}-e${side}`}>
      <g clipPath={`url(#${uid}-clip${side})`}>
        <g data-e="sclG">
          <ellipse data-e="scl" fill="var(--vintem-eye)" rx={EYE.rx} ry={EYE.ry} />
          <ellipse data-e="wet" id={`${uid}-wet${side}`} fill="var(--vintem-wet)" opacity={0} />
          <circle data-e="pup" fill={ink} r={8} />
          <circle data-e="gl" fill="var(--vintem-eye)" r={2} />
        </g>
        <g data-e="lidG" id={`${uid}-lid${side}`}>
          <rect data-e="up" id={`${uid}-cv${side}`} x={-60} y={-111} width={120} height={90} fill={bodyFill} />
          <path data-e="lidl" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" opacity={0} />
        </g>
        <ellipse data-e="lo" fill={bodyFill} rx={22} ry={36} cy={60} />
        <rect data-e="lb" x={-60} y={EYE.ry} width={120} height={120} fill={bodyFill} />
      </g>
      <ellipse data-e="ring" fill="none" stroke={bodyFill} strokeWidth={EYE.ringWidth} rx={EYE.rx} ry={EYE.ry} />
      <path data-e="arc" fill="none" stroke="var(--vintem-eye)" strokeWidth={6} strokeLinecap="round" opacity={0} />
    </g>
  )
}

/**
 * O Vintem: porquinho-cofre original em SVG feito em JSX. Sem boca e sem patas na frente.
 * A arte vive em grupos de id (um prefixo por instancia); o desenho por quadro e imperativo
 * (`createVintemView`), entao React nunca recebe estado por quadro.
 */
export function Vintem({
  state = 'neutro',
  size = 'hero',
  follow = true,
  decorative = true,
  reduced,
  className,
}: VintemProps) {
  const rawId = useId()
  const uid = `vt${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const svgRef = useRef<SVGSVGElement>(null)
  const viewRef = useRef<VintemViewHandle | null>(null)
  const dims = VINTEM_SIZES[size]

  // Ultimos valores das props, lidos so pela montagem (as mudancas seguem pelos efeitos abaixo).
  const latest = useRef({ state, follow, reduced })
  useLayoutEffect(() => {
    latest.current = { state, follow, reduced }
  })

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const init = latest.current
    const view = createVintemView(svg, { uid, state: init.state, follow: init.follow, reduced: init.reduced })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [uid])

  useEffect(() => {
    viewRef.current?.setState(state)
  }, [state])

  useEffect(() => {
    viewRef.current?.setFollow(follow)
  }, [follow])

  useEffect(() => {
    viewRef.current?.setReduced(Boolean(reduced))
  }, [reduced])

  const art = (
    <svg
      ref={svgRef}
      className={`vt block overflow-visible ${className ?? ''}`.trim()}
      viewBox={VIEWBOX}
      width={dims.width}
      height={dims.height}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`${uid}-bodyC`}>
          <path d={FRONT.body} />
        </clipPath>
        <clipPath id={`${uid}-clipL`}>
          <ellipse rx={EYE.rx} ry={EYE.ry} />
        </clipPath>
        <clipPath id={`${uid}-clipR`}>
          <ellipse rx={EYE.rx} ry={EYE.ry} />
        </clipPath>
      </defs>
      <ellipse
        id={`${uid}-shadow`}
        cx={FRONT.shadow.cx}
        cy={FRONT.shadow.cy}
        rx={FRONT.shadow.rx}
        ry={FRONT.shadow.ry}
        fill="var(--vintem-ink)"
        opacity={0.12}
      />
      <g id={`${uid}-root`}>
        <g id={`${uid}-front`}>
          <g id={`${uid}-earLg`}>
            <g id={`${uid}-earL`}>
              <path d={FRONT.ear} fill={bodyFill} />
            </g>
          </g>
          <g id={`${uid}-earRg`}>
            <g id={`${uid}-earR`}>
              <path d={FRONT.ear} fill={bodyFill} />
            </g>
          </g>
          <path id={`${uid}-bodyF`} d={FRONT.body} fill={bodyFill} />
          <path id={`${uid}-slit`} d={FRONT.slit} fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
          <g clipPath={`url(#${uid}-bodyC)`}>
            <g id={`${uid}-face`}>
              <g id={`${uid}-snoutG`}>
                <ellipse rx={FRONT.snout.rx} ry={FRONT.snout.ry} fill="var(--vintem-snout)" />
                <ellipse cx={-FRONT.nostril.dx} rx={FRONT.nostril.rx} ry={FRONT.nostril.ry} fill={ink} />
                <ellipse cx={FRONT.nostril.dx} rx={FRONT.nostril.rx} ry={FRONT.nostril.ry} fill={ink} />
              </g>
              <Eye uid={uid} side="L" />
              <Eye uid={uid} side="R" />
              <path id={`${uid}-bL`} fill="none" stroke="var(--vintem-brow)" strokeWidth={4.6} strokeLinecap="round" />
              <path id={`${uid}-bR`} fill="none" stroke="var(--vintem-brow)" strokeWidth={4.6} strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )

  if (decorative) return art
  return (
    <span role="img" aria-label="Vintém, o porquinho-cofre" className="inline-block">
      {art}
    </span>
  )
}
