import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { PersonTotals } from '@shared/core/couple.js'
import { formatMoney } from '@shared/core/format.js'

interface DualBarsProps {
  firstName: string
  secondName: string
  first: PersonTotals
  second: PersonTotals
  /** Maior das seis medidas absolutas: 100% de toda barra (mesma escala). */
  scaleMaxCents: number
}

type Metric = 'inCents' | 'outCents' | 'balanceCents'

const METRICS: { key: Metric; label: string }[] = [
  { key: 'inCents', label: 'Entradas' },
  { key: 'outCents', label: 'Saídas' },
  { key: 'balanceCents', label: 'Saldo' },
]

// Primeira letra do nome (por ponto de codigo) em maiuscula; nome vazio vira "?".
function initialOf(name: string): string {
  const [first] = Array.from(name.trim())
  return first ? first.toUpperCase() : '?'
}

interface AvatarProps {
  name: string
  color: string
}

function Avatar({ name, color }: AvatarProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
          color
        )}
      >
        {initialOf(name)}
      </span>
      <span className="min-w-0 truncate text-xs font-bold text-muted-foreground" title={name}>
        {name}
      </span>
    </div>
  )
}

interface BarLineProps {
  name: string
  metricLabel: string
  cents: number
  scaleMaxCents: number
  tone: 'ele' | 'ela'
}

function BarLine({ name, metricLabel, cents, scaleMaxCents, tone }: BarLineProps) {
  const text = formatMoney(cents)
  return (
    <div className="flex items-center gap-2">
      <Progress
        tone={tone}
        size="md"
        value={Math.abs(cents)}
        max={scaleMaxCents}
        label={`${name}: ${metricLabel}, ${text}`}
        className="min-w-0 flex-1"
      />
      <span
        className={cn(
          'min-w-[96px] shrink-0 text-right font-display text-base font-bold tabular-nums tracking-[-0.02em]',
          cents < 0 ? 'text-danger-ink' : 'text-foreground'
        )}
      >
        {text}
      </span>
    </div>
  )
}

/**
 * Barras duplas por metrica (D-17): entradas, saidas e saldo de cada um, todas na mesma escala
 * (scaleMaxCents do nucleo e 100%). Saldo negativo vai em danger-ink com a barra pelo valor absoluto.
 */
export function DualBars({ firstName, secondName, first, second, scaleMaxCents }: DualBarsProps) {
  return (
    <section className="rounded-[22px] bg-card px-4 py-1" aria-label="Comparativo por métrica">
      <div className="flex items-center gap-4 py-3">
        <Avatar name={firstName} color="bg-ele" />
        <Avatar name={secondName} color="bg-ela" />
      </div>
      {METRICS.map(({ key, label }) => (
        <div key={key} className="grid grid-cols-[80px_1fr] items-center gap-3 border-t border-border py-3">
          <p className="text-xs font-bold text-muted-foreground">{label}</p>
          <div className="flex min-w-0 flex-col gap-1">
            <BarLine name={firstName} metricLabel={label} cents={first[key]} scaleMaxCents={scaleMaxCents} tone="ele" />
            <BarLine name={secondName} metricLabel={label} cents={second[key]} scaleMaxCents={scaleMaxCents} tone="ela" />
          </div>
        </div>
      ))}
    </section>
  )
}
