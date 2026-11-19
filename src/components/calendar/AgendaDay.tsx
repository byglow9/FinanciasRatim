import { cn } from '@/lib/utils'
import type { DayItem, DayModel } from '@shared/core/calendarModel.js'
import { WEEKDAY_SHORT } from '@shared/core/dayKey.js'
import { formatMoney, shortSigned } from '@shared/core/format.js'

interface AgendaDayProps {
  model: DayModel
  selected: boolean
  mode: 'financeiro' | 'agenda'
}

/** Dia da semana (0 = domingo) de uma data de calendário, sem passar pelo fuso do aparelho. */
function weekdayOf(model: DayModel): number {
  const { year, month, day } = model.parts
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Valor em centavos do item, ou null quando o item não tem valor (post-it, evento). */
function itemCents(item: DayItem): number | null {
  if (item.kind === 'note' || item.kind === 'event') return null
  return item.amountCents
}

function itemKey(item: DayItem): string {
  return item.kind === 'bill' ? `bill-${item.billId}-${item.occurrence.month}-${item.occurrence.day}` : `${item.kind}-${item.id}`
}

/**
 * Um dia da agenda corrida (UI-SPEC S3): grade `56px | 1fr` com o dia da semana, o número em 28/700 e o
 * saldo curto do dia à esquerda, e os itens do dia à direita.
 */
export function AgendaDay({ model, selected, mode }: AgendaDayProps) {
  return (
    <li
      data-day={model.key}
      className="grid grid-cols-[56px_1fr] gap-2"
    >
      <div className="flex flex-col items-center pt-1">
        <span className="text-xs font-bold text-muted-foreground">{WEEKDAY_SHORT[weekdayOf(model)]}</span>
        <span
          aria-current={model.isToday ? 'date' : undefined}
          className={cn(
            'flex min-w-11 items-center justify-center rounded-xl px-2 font-display text-[28px] font-bold leading-tight',
            selected ? 'bg-action text-action-text' : model.isToday ? 'text-ok-ink' : 'text-foreground'
          )}
        >
          {model.parts.day}
        </span>
        {mode === 'financeiro' ? (
          <span className="text-xs font-bold text-foreground">{shortSigned(model.netCents)}</span>
        ) : null}
      </div>
      <ul className="min-w-0 space-y-2">
        {model.items.map((item) => {
          const cents = itemCents(item)
          return (
            <li key={itemKey(item)} className="flex min-h-14 items-center gap-3 rounded-2xl bg-card p-3">
              <span className="min-w-0 flex-1 truncate text-base font-bold">{item.title}</span>
              {cents !== null ? (
                <span className="shrink-0 font-display text-base font-bold">
                  {formatMoney(cents, { decimals: 'always' })}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </li>
  )
}
