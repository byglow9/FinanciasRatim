import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, Clock, PiggyBank, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PostItCard } from '@/components/calendar/PostItCard'
import { Chip } from '@/components/ui/chip'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { cn } from '@/lib/utils'
import { billSupportText } from '@shared/core/billGroups.js'
import type { BillStatus } from '@shared/core/billGroups.js'
import type { BillDayItem, DayItem, DayModel, EventDayItem } from '@shared/core/calendarModel.js'
import { categoryDisplayName } from '@shared/core/categories.js'
import { WEEKDAY_SHORT } from '@shared/core/dayKey.js'
import { formatMoney, shortSigned } from '@shared/core/format.js'
import { zonedParts } from '@shared/core/time.js'

interface AgendaDayProps {
  model: DayModel
  selected: boolean
  mode: 'financeiro' | 'agenda'
  onOpenNote: (id: string) => void
  onOpenEvent: (id: string) => void
}

/** Dia da semana (0 = domingo) de uma data de calendário, sem passar pelo fuso do aparelho. */
function weekdayOf(model: DayModel): number {
  const { year, month, day } = model.parts
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function itemKey(item: DayItem): string {
  return item.kind === 'bill'
    ? `bill-${item.billId}-${item.occurrence.year}-${item.occurrence.month}-${item.occurrence.day}`
    : `${item.kind}-${item.id}`
}

const money = (cents: number) => formatMoney(cents, { decimals: 'always' })

/** Chip de estado da conta, com texto: o estado nunca depende só de cor. */
function StatusChip({ status }: { status: BillStatus }) {
  if (status === 'paid') {
    return (
      <Chip tone="ok" icon={Check}>
        pago
      </Chip>
    )
  }
  if (status === 'pending') return null
  const overdue = status === 'overdue'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-chip px-3 py-1 text-xs font-bold',
        overdue ? 'bg-rhythm-4-bg text-rhythm-4-fg' : 'bg-rhythm-3-bg text-rhythm-3-fg'
      )}
    >
      {overdue ? 'vencida' : status === 'today' ? 'hoje' : 'em breve'}
    </span>
  )
}

interface RowProps {
  icon: LucideIcon
  iconClass?: string
  title: string
  legend?: string
  value?: string
  chip?: ReactNode
}

/** Linha de item do dia: ícone de 20px, título 16/700, legenda 12/400 muted e valor à direita. */
function Row({ icon: Icon, iconClass, title, legend, value, chip }: RowProps) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-card p-3">
      <Icon className={cn('h-5 w-5 shrink-0', iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold">{title}</p>
        {legend ? <p className="truncate text-xs font-normal text-muted-foreground">{legend}</p> : null}
      </div>
      {value !== undefined || chip ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {value !== undefined ? <span className="font-display text-base font-bold">{value}</span> : null}
          {chip}
        </div>
      ) : null}
    </div>
  )
}

/** Evento: marcador na cor da categoria e hora; tocar abre o Sheet de edição. */
function EventRow({ item, onOpen }: { item: EventDayItem; onOpen: (id: string) => void }) {
  const legend = [item.time, item.location].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center">
        <span
          className="size-3 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,.14)]"
          style={{ backgroundColor: item.color }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold">{item.title}</span>
        {legend ? <span className="block truncate text-xs font-normal text-muted-foreground">{legend}</span> : null}
      </span>
    </button>
  )
}

/**
 * Um dia da agenda corrida (UI-SPEC S3, D-10): grade `56px | 1fr` com o dia da semana, o número em 28/700
 * e o saldo curto do dia à esquerda, e os itens do dia à direita (transação, conta fixa, Porquinho, meta,
 * post-it com dobra e evento).
 */
export function AgendaDay({ model, selected, mode, onOpenNote, onOpenEvent }: AgendaDayProps) {
  const { categoryDefs } = useArea()
  const { now } = useCycle()
  const todayParts = useMemo(() => zonedParts(now), [now])

  let noteIndex = 0
  return (
    <li data-day={model.key} className="grid grid-cols-[56px_1fr] gap-2">
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
        {model.items.map((item) => (
          <li key={itemKey(item)}>
            {item.kind === 'tx' ? (
              <Row
                icon={item.type === 'saida' ? ArrowUpRight : ArrowDownLeft}
                iconClass={item.type === 'saida' ? 'text-danger-ink' : 'text-ok-ink'}
                title={item.title || categoryDisplayName(item, categoryDefs) || 'Lançamento'}
                legend={categoryDisplayName(item, categoryDefs)}
                value={money(item.amountCents)}
              />
            ) : item.kind === 'bill' ? (
              <BillRow item={item} todayParts={todayParts} />
            ) : item.kind === 'savings' ? (
              <Row
                icon={PiggyBank}
                title={item.title || 'Porquinho'}
                legend={item.type === 'deposito' ? 'Guardado' : 'Retirado'}
                value={money(item.amountCents)}
              />
            ) : item.kind === 'goal' ? (
              <Row icon={Target} title="Aporte em meta" legend={item.title} value={money(item.amountCents)} />
            ) : item.kind === 'event' ? (
              <EventRow item={item} onOpen={onOpenEvent} />
            ) : (
              <PostItCard note={item} index={noteIndex++} onOpen={onOpenNote} />
            )}
          </li>
        ))}
      </ul>
    </li>
  )
}

/** Conta fixa na data da ocorrência: pendente em `Clock`, paga em `Check`, com a frase de apoio e o chip. */
function BillRow({ item, todayParts }: { item: BillDayItem; todayParts: DayModel['parts'] }) {
  const paid = item.status === 'paid'
  return (
    <Row
      icon={paid ? Check : Clock}
      iconClass={paid ? 'text-ok-ink' : 'text-warn-ink'}
      title={item.title}
      legend={billSupportText(item.occurrence, item.status, todayParts)}
      value={money(item.amountCents)}
      chip={<StatusChip status={item.status} />}
    />
  )
}
