import { ArrowUpRight, Check, Clock, OctagonAlert, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react'
import { RHYTHM_LEVELS, type RhythmLevel } from '@/lib/rhythm'

const ICONS: Record<(typeof RHYTHM_LEVELS)[number]['icon'], LucideIcon> = {
  'trending-up': TrendingUp,
  check: Check,
  'triangle-alert': TriangleAlert,
  'arrow-up-right': ArrowUpRight,
  'octagon-alert': OctagonAlert,
}

interface RhythmPillProps {
  level: RhythmLevel | null | undefined
  /** Veredito suprimido (dado do banco velho): mostra o estado neutro. */
  suppressed?: boolean
}

const BASE = 'inline-flex h-8 items-center gap-1 rounded-full px-3 text-base font-bold'

/** Pílula do ritmo: rótulo e ícone sempre presentes, nunca só cor. Não interativa. */
export function RhythmPill({ level, suppressed }: RhythmPillProps) {
  if (suppressed) {
    return (
      <span className={`${BASE} bg-card text-muted-foreground`}>
        <Clock className="h-4 w-4" aria-hidden="true" />
        Aguardando dados do banco
      </span>
    )
  }
  if (level == null) return null
  const info = RHYTHM_LEVELS[level]
  if (!info) return null
  const Icon = ICONS[info.icon]
  return (
    <span className={`${BASE} ${info.bg} ${info.fg}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {info.label}
    </span>
  )
}
