import { ArrowDownLeft, ArrowUpRight, Check, Clock, Info, PiggyBank, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MiniPostIt } from '@/components/calendar/MiniPostIt'
import { Popover } from '@/components/ui/popover'

const HEAT_SQUARES = ['bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']

const DOTS: { label: string; dot: string; icon: LucideIcon }[] = [
  { label: 'Entrada', dot: 'bg-dot-in', icon: ArrowDownLeft },
  { label: 'Saída', dot: 'bg-dot-out', icon: ArrowUpRight },
  { label: 'Conta pendente', dot: 'bg-dot-bill-pending', icon: Clock },
  { label: 'Conta paga', dot: 'bg-dot-bill-paid', icon: Check },
  { label: 'Porquinho', dot: 'bg-dot-pig', icon: PiggyBank },
  { label: 'Meta', dot: 'bg-dot-goal', icon: Target },
]

const SWATCH = 'size-5 shrink-0 rounded-md border border-border'

/**
 * Legenda do Calendário em Popover (D-11): "Cor do dia", "Pontinhos" e "Post-it". Esc fecha e devolve o
 * foco ao botão. Fica na linha do alternador, junto do botão +.
 */
export function CalendarLegend() {
  return (
    <Popover icon={Info} label="Legenda">
      <p className="text-base font-bold">Legenda</p>

      <div className="mt-3 space-y-2">
        <p className="text-xs font-bold text-muted-foreground">Cor do dia</p>
        <div className="flex gap-1" aria-hidden="true">
          {HEAT_SQUARES.map((bg) => (
            <span key={bg} className={`${SWATCH} ${bg}`} />
          ))}
        </div>
        <p className="text-xs font-normal">De gasto menor a gasto maior, comparado ao seu ciclo</p>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={`${SWATCH} bg-heat-pos`} />
          <p className="text-xs font-normal">entrou mais do que saiu</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-xs font-bold text-muted-foreground">Pontinhos</p>
        <ul className="space-y-1">
          {DOTS.map(({ label, dot, icon: Icon }) => (
            <li key={label} className="flex items-center gap-2 text-xs font-normal">
              <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,.14)] ${dot}`} />
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-xs font-bold text-muted-foreground">Post-it</p>
        <div className="flex items-center gap-2 text-xs font-normal">
          <span className="relative size-5 shrink-0">
            <MiniPostIt colors={['yellow']} />
          </span>
          nota do dia
        </div>
      </div>
    </Popover>
  )
}
