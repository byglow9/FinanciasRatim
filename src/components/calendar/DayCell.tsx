import { memo } from 'react'
import { MiniPostIt } from '@/components/calendar/MiniPostIt'
import { cn } from '@/lib/utils'
import { dayAriaLabel } from '@shared/core/calendarModel.js'
import type { CalendarMode, DayDot, DayModel } from '@shared/core/calendarModel.js'
import type { DateParts } from '@shared/core/cycle.js'
import { MONTH_LONG } from '@shared/core/format.js'

// Classes literais: o Tailwind só gera o que aparece escrito por inteiro no código.
const HEAT_BG: Record<DayModel['heat'], string> = {
  none: 'bg-surface-2',
  h1: 'bg-heat-1',
  h2: 'bg-heat-2',
  h3: 'bg-heat-3',
  h4: 'bg-heat-4',
  pos: 'bg-heat-pos',
}

const DOT_BG: Record<Exclude<DayDot['kind'], 'event'>, string> = {
  in: 'bg-dot-in',
  out: 'bg-dot-out',
  'bill-pending': 'bg-dot-bill-pending',
  'bill-paid': 'bg-dot-bill-paid',
  pig: 'bg-dot-pig',
  goal: 'bg-dot-goal',
}

const DOT_RING = 'shadow-[0_0_0_1px_rgba(0,0,0,.14)]'

interface DayCellProps {
  /** Data da célula (também dos dias de folga, que não têm modelo). */
  parts: DateParts
  /** Modelo do dia; ausente nos dias de folga, que só completam a linha da semana. */
  model: DayModel | undefined
  selected: boolean
  /** Roving tabindex: só uma célula da grade entra na ordem de foco. */
  focusable: boolean
  mode: CalendarMode
  onSelect: (key: string) => void
}

/**
 * Célula do dia da grade do ciclo (UI-SPEC S3, D-09, D-12): botão de 48px com o número num círculo de
 * 24px (hoje em círculo cheio), fundo do mapa de calor, até 3 pontinhos de 6px mais "+n" e o mini
 * post-it no canto. Só texto foreground sobre o calor. Selecionada: borda de 2px na cor de ação. Dia de
 * folga (fora do ciclo) fica esmaecido, `aria-disabled` e fora da ordem de foco. Em React.memo: o modelo
 * do dia só muda de referência quando os dados mudam.
 */
export const DayCell = memo(function DayCell({ parts, model, selected, focusable, mode, onSelect }: DayCellProps) {
  if (!model) {
    return (
      <button
        type="button"
        aria-disabled="true"
        tabIndex={-1}
        aria-label={`${parts.day} de ${MONTH_LONG[parts.month - 1].toLowerCase()}, fora do ciclo`}
        className="flex h-12 flex-col items-center justify-center rounded-[14px] border border-border bg-surface-2 opacity-45"
      >
        <span className="flex size-6 items-center justify-center text-xs font-bold leading-none text-foreground">
          {parts.day}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      data-key={model.key}
      aria-label={dayAriaLabel(model, mode)}
      aria-pressed={selected}
      aria-current={model.isToday ? 'date' : undefined}
      tabIndex={focusable ? 0 : -1}
      onClick={() => onSelect(model.key)}
      className={cn(
        'relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-[14px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        mode === 'agenda' ? 'bg-surface-2' : HEAT_BG[model.heat],
        selected ? 'border-2 border-action' : 'border border-border'
      )}
    >
      <span
        className={cn(
          'flex size-6 items-center justify-center rounded-full text-xs font-bold leading-none',
          model.isToday ? 'bg-action text-action-text' : 'text-foreground'
        )}
      >
        {parts.day}
      </span>
      <span aria-hidden="true" className="flex h-3 items-center gap-0.5">
        {model.dots.map((dot, index) =>
          dot.kind === 'event' ? (
            <span
              key={`${dot.kind}-${index}`}
              className={cn('size-1.5 rounded-full', DOT_RING)}
              style={{ backgroundColor: dot.hex }}
            />
          ) : (
            <span key={`${dot.kind}-${index}`} className={cn('size-1.5 rounded-full', DOT_BG[dot.kind], DOT_RING)} />
          )
        )}
        {model.extraDots > 0 ? (
          <span className="text-xs font-bold leading-none text-foreground">+{model.extraDots}</span>
        ) : null}
      </span>
      <MiniPostIt colors={model.postIts} />
    </button>
  )
})
