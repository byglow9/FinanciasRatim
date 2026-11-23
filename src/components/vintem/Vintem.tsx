import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { createVintemView, type VintemFreeze, type VintemViewHandle } from '@/lib/vintem/view'
import { ACCESSORY_SHAPES, COIN, EYE, FRONT, GROUND, PROFILE, VIEWBOX } from '@/lib/vintem/geometry'

/** Os sete estados do Vintem (D-05b). */
export type VintemState = 'neutro' | 'feliz' | 'triste' | 'bravo' | 'sonolento' | 'surpreso' | 'atento'

/** Tamanhos: largura da arte; a altura segue a proporcao 6:5 do viewBox 240x200. */
export const VINTEM_SIZES = {
  hero: { width: 84, height: 70 },
  inline: { width: 48, height: 40 },
  empty: { width: 120, height: 100 },
  gauge: { width: 150, height: 125 },
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
  /**
   * Pose fixa para o autoteste (so a pagina de teste usa): congela estado e giro. Uma vez
   * congelada, a instancia fica congelada ate desmontar; mude a pose trocando o objeto.
   */
  frozen?: VintemFreeze
  className?: string
  ref?: Ref<VintemHandle>
}

/** Reacoes curtas (D-09): voltam ao humor de fundo sozinhas. */
export type VintemReaction = 'spend' | 'susto' | 'bronca' | 'festa' | 'wake'

/** Controle imperativo do Vintem (React 19: `ref` como prop). */
export interface VintemHandle {
  react: (kind: VintemReaction) => void
  /** Toque: desperta o sonolento (devolve true); senao so pisca. */
  touch: () => boolean
  /** Giro de lado: frente (falso) ou perfil (verdadeiro). */
  setTurn: (on: boolean) => void
  /** O elemento svg vivo (o autoteste le geometria e estilos computados dele). */
  svg: () => SVGSVGElement | null
}

const ink = 'var(--vintem-ink)'
const bodyFill = 'var(--vintem-body)'

/** Sufixos de id de cada olho (a pose usa cvL e cvR para as palpebras de cima). */
const EYE_IDS = {
  L: { eye: 'eL', lid: 'lidL', wet: 'wetL', cv: 'cvL', clip: 'clipL' },
  R: { eye: 'eR', lid: 'lidR', wet: 'wetR', cv: 'cvR', clip: 'clipR' },
  P: { eye: 'eP', lid: 'lidP', wet: 'wetP', cv: 'cvP', clip: 'clipP' },
} as const

/** Ids das patas do perfil (a frente nao tem patas, P-04). */
const PAW_IDS = {
  far: ['pawFarA', 'pawFarB'],
  near: ['pawNearA', 'pawNearB'],
} as const

/** Um olho em camadas: esclera, pelicula, pupila, brilho, palpebras, cobertura do piscar e arco. */
function Eye({ uid, side }: { uid: string; side: 'L' | 'R' | 'P' }) {
  const ids = EYE_IDS[side]
  return (
    <g id={`${uid}-${ids.eye}`}>
      <g clipPath={`url(#${uid}-${ids.clip})`}>
        <g data-e="sclG">
          <ellipse data-e="scl" fill="var(--vintem-eye)" rx={EYE.rx} ry={EYE.ry} />
          <ellipse data-e="wet" id={`${uid}-${ids.wet}`} fill="var(--vintem-wet)" opacity={0} />
          <circle data-e="pup" fill={ink} r={8} />
          <circle data-e="gl" fill="var(--vintem-eye)" r={2} />
        </g>
        <g data-e="lidG" id={`${uid}-${ids.lid}`}>
          <rect data-e="up" id={`${uid}-${ids.cv}`} x={-60} y={-111} width={120} height={90} fill={bodyFill} />
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

/** Moeda: disco, anel e marca central. So existe nas reacoes `spend` e `festa`. */
function Coin() {
  return (
    <>
      <circle r={COIN.r} fill="var(--vintem-coin)" stroke="var(--vintem-coin-line)" strokeWidth={2.4} />
      <circle r={COIN.ringR} fill="none" stroke="var(--vintem-coin-line)" strokeWidth={2} />
      <rect {...COIN.mark} fill="var(--vintem-coin-line)" />
    </>
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
  frozen,
  className,
  ref,
}: VintemProps) {
  const rawId = useId()
  const uid = `vt${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const svgRef = useRef<SVGSVGElement>(null)
  const viewRef = useRef<VintemViewHandle | null>(null)
  const dims = VINTEM_SIZES[size]
  // O interruptor `reduced` (teste) vale mais que a midia do sistema.
  const mediaReduced = useReducedMotion()
  const effectiveReduced = reduced ?? mediaReduced

  // Ultimos valores das props, lidos so pela montagem (as mudancas seguem pelos efeitos abaixo).
  const latest = useRef({ state, follow, reduced: effectiveReduced })
  useLayoutEffect(() => {
    latest.current = { state, follow, reduced: effectiveReduced }
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

  // Pose de teste: no mesmo ciclo de layout da montagem, antes de qualquer efeito de estado.
  useLayoutEffect(() => {
    if (frozen) viewRef.current?.freeze(frozen)
  }, [frozen])

  useEffect(() => {
    viewRef.current?.setState(state)
  }, [state])

  useEffect(() => {
    viewRef.current?.setFollow(follow)
  }, [follow])

  useEffect(() => {
    viewRef.current?.setReduced(effectiveReduced)
  }, [effectiveReduced])

  useImperativeHandle(
    ref,
    () => ({
      react: (kind) => viewRef.current?.react(kind),
      touch: () => viewRef.current?.touch() ?? false,
      setTurn: (on) => viewRef.current?.setTurn(on),
      svg: () => svgRef.current,
    }),
    [],
  )

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
        <clipPath id={`${uid}-coinC`}>
          <rect
            x={-400}
            y={COIN.clipTop}
            width={1000}
            height={COIN.clipY - COIN.clipTop}
          />
        </clipPath>
        <clipPath id={`${uid}-${EYE_IDS.L.clip}`}>
          <ellipse rx={EYE.rx} ry={EYE.ry} />
        </clipPath>
        <clipPath id={`${uid}-${EYE_IDS.R.clip}`}>
          <ellipse rx={EYE.rx} ry={EYE.ry} />
        </clipPath>
        <clipPath id={`${uid}-${EYE_IDS.P.clip}`}>
          <ellipse rx={EYE.rx} ry={EYE.ry} />
        </clipPath>
        {/* silhueta do perfil: corpo, cabeca e focinho; tudo do rosto fica recortado por ela */}
        <clipPath id={`${uid}-profC`}>
          <ellipse cx={PROFILE.body.cx} cy={PROFILE.body.cy} rx={PROFILE.body.rx} ry={PROFILE.body.ry} />
          <circle cx={PROFILE.head.cx} cy={PROFILE.head.cy} r={PROFILE.head.r} />
          <ellipse cx={PROFILE.snout.cx} cy={PROFILE.snout.cy} rx={PROFILE.snout.rx} ry={PROFILE.snout.ry} />
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
        <ellipse
          id={`${uid}-core`}
          cx={FRONT.core.cx}
          cy={FRONT.core.cy}
          rx={FRONT.core.rx}
          ry={FRONT.core.ry}
          fill={bodyFill}
        />
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
              <g id={`${uid}-tear`} display="none">
                <path d={ACCESSORY_SHAPES.drop} fill="var(--vintem-tear)" stroke="var(--vintem-eye)" strokeWidth={1.2} />
              </g>
            </g>
          </g>
        </g>
        <g id={`${uid}-side`} display="none">
          <g transform={`translate(${GROUND.x},${GROUND.y}) scale(${PROFILE.scale}) translate(${-GROUND.x},${-PROFILE.anchorY})`}>
            {PROFILE.pawsFar.map((r, i) => (
              <rect key={i} id={`${uid}-${PAW_IDS.far[i]}`} {...r} fill="var(--vintem-far)" />
            ))}
            <g transform={`translate(${PROFILE.tail.x},${PROFILE.tail.y})`}>
              <g id={`${uid}-tail`}>
                <path d={PROFILE.tail.path} fill="none" stroke={bodyFill} strokeWidth={7} strokeLinecap="round" />
              </g>
            </g>
            {PROFILE.pawsNear.map((r, i) => (
              <rect key={i} id={`${uid}-${PAW_IDS.near[i]}`} {...r} fill={bodyFill} />
            ))}
            <ellipse id={`${uid}-profBody`} cx={PROFILE.body.cx} cy={PROFILE.body.cy} rx={PROFILE.body.rx} ry={PROFILE.body.ry} fill={bodyFill} />
            <circle id={`${uid}-profHead`} cx={PROFILE.head.cx} cy={PROFILE.head.cy} r={PROFILE.head.r} fill={bodyFill} />
            <ellipse cx={PROFILE.snout.cx} cy={PROFILE.snout.cy} rx={PROFILE.snout.rx} ry={PROFILE.snout.ry} fill="var(--vintem-snout)" />
            <ellipse cx={PROFILE.nostril.cx} cy={PROFILE.nostril.cy} rx={PROFILE.nostril.rx} ry={PROFILE.nostril.ry} fill={ink} />
            <g id={`${uid}-earP`}>
              <path d={PROFILE.ear} fill={bodyFill} />
            </g>
            <g clipPath={`url(#${uid}-profC)`}>
              <path d={PROFILE.slit} fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
              <Eye uid={uid} side="P" />
              <path id={`${uid}-bP`} fill="none" stroke="var(--vintem-brow)" strokeWidth={4.6} strokeLinecap="round" />
              <g id={`${uid}-tearP`} display="none">
                <path d={ACCESSORY_SHAPES.drop} fill="var(--vintem-tear)" stroke="var(--vintem-eye)" strokeWidth={1.2} />
              </g>
            </g>
          </g>
        </g>
        <g clipPath={`url(#${uid}-coinC)`}>
          <g id={`${uid}-coinR`} display="none">
            <g id={`${uid}-coinS`}>
              <Coin />
            </g>
          </g>
        </g>
      </g>
      <g id={`${uid}-accG`}>
        <g id={`${uid}-sweat`} display="none">
          <path d={ACCESSORY_SHAPES.drop} fill="var(--vintem-sweat)" stroke="var(--vintem-eye)" strokeWidth={1.2} />
        </g>
        <g id={`${uid}-anger`} display="none">
          <path d={ACCESSORY_SHAPES.anger} fill="none" stroke="var(--vintem-anger)" strokeWidth={4} strokeLinecap="round" />
        </g>
        <g id={`${uid}-spark`} display="none">
          <path d={ACCESSORY_SHAPES.spark} fill="var(--vintem-spark)" stroke="var(--vintem-accent-line)" strokeWidth={1.5} />
        </g>
        <g id={`${uid}-excl`} display="none">
          <rect {...ACCESSORY_SHAPES.exclBar} fill="var(--vintem-excl)" stroke="var(--vintem-accent-line)" strokeWidth={1.5} />
          <circle {...ACCESSORY_SHAPES.exclDot} fill="var(--vintem-excl)" stroke="var(--vintem-accent-line)" strokeWidth={1.5} />
        </g>
        {[0, 1, 2].map((i) => (
          <g key={i} id={`${uid}-z${i}`} display="none">
            <path
              d={ACCESSORY_SHAPES.z}
              fill="none"
              stroke="var(--vintem-z)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>
      <g id={`${uid}-coinsG`}>
        {Array.from({ length: COIN.maxSmall }, (_, i) => (
          <g key={i} id={`${uid}-pc${i}`} display="none">
            <g id={`${uid}-pcs${i}`}>
              <Coin />
            </g>
          </g>
        ))}
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
