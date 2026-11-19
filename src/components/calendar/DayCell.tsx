import { cn } from '@/lib/utils'
import { dayAriaLabel } from '@shared/core/calendarModel.js'
import type { CalendarMode, DayModel } from '@shared/core/calendarModel.js'
import type { DateParts } from '@shared/core/cycle.js'
import { MONTH_LONG } from '@shared/core/format.js'

interface DayCellProps {
  /** Data da célula (também dos dias de folga, que não têm modelo). */
  parts: DateParts
  /** Modelo do dia; ausente nos dias de folga, que só completam a linha da semana. */
  model: DayModel | undefined
  selected: boolean
  mode: CalendarMode
  onSelect: (key: string) => void
}

/**
 * Célula do dia da grade do ciclo (UI-SPEC S3): um botão de 48px com o número do dia num círculo de
 * 24px, o hoje em círculo cheio e o selecionado com borda de 2px na cor de ação. Dia de folga (fora do
 * ciclo) fica esmaecido e `aria-disabled`.
 */
export function DayCell({ parts, model, selected, mode, onSelect }: DayCellProps) {
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
      aria-label={dayAriaLabel(model, mode)}
      aria-pressed={selected}
      aria-current={model.isToday ? 'date' : undefined}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(model.key)}
      className={cn(
        'relative flex h-12 flex-col items-center justify-center rounded-[14px] bg-surface-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
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
    </button>
  )
}
