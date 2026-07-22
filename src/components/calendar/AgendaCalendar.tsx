import { useState } from 'react'
import {
  startOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AgendaEvent, EventCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, Plus, Pencil, Trash2 } from 'lucide-react'

interface AgendaCalendarProps {
  month: Date
  events: AgendaEvent[]
  categories: EventCategory[]
  onAddEvent: (date: Date) => void
  onEditEvent: (event: AgendaEvent) => void
  onDeleteEvent: (event: AgendaEvent) => void
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DEFAULT_COLOR = '#64748b'

export function AgendaCalendar({ month, events, categories, onAddEvent, onEditEvent, onDeleteEvent }: AgendaCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // Build 42-cell grid starting from Monday of the first week of the month
  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(gridStart, i))
  }

  function getEventsForDay(day: Date): AgendaEvent[] {
    return events
      .filter((e) => isSameDay(e.date, day))
      .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  }

  return (
    <div className="space-y-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px sm:gap-1">
        {cells.map((day, idx) => {
          const inMonth = isSameMonth(day, month)
          const isSelected = selectedDay && isSameDay(day, selectedDay)
          const isCurrentDay = isToday(day)
          const dayEvents = getEventsForDay(day)

          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={cn(
                'group relative aspect-square sm:aspect-auto sm:min-h-[80px] p-0.5 sm:p-1 rounded border cursor-pointer transition-colors overflow-hidden',
                inMonth ? 'bg-card' : 'bg-muted/40 opacity-50',
                isCurrentDay && inMonth && 'border-primary/60 bg-primary/[0.08]',
                isSelected && 'border-primary/35 bg-primary/[0.05] ring-1 ring-primary/15',
                'hover:bg-muted/50'
              )}
            >
              <div className="mb-1 flex items-start justify-between gap-1">
                <span className={cn(
                  'text-xs font-semibold leading-none',
                  inMonth ? 'text-foreground' : 'text-muted-foreground/60',
                  isCurrentDay && inMonth && 'text-primary',
                  isSelected && !isCurrentDay && 'text-primary'
                )}>
                  {format(day, 'd')}
                </span>
                {isCurrentDay && inMonth && (
                  <span className="hidden text-[9px] font-medium uppercase leading-none text-primary/70 sm:inline">
                    Hoje
                  </span>
                )}
              </div>

              {/* Event chips: pill compacta com a cor da categoria */}
              <div className="space-y-0.5 leading-none">
                {dayEvents.slice(0, 2).map((ev) => {
                  const color = categoryMap.get(ev.categoryId ?? '')?.color ?? DEFAULT_COLOR
                  return (
                    <div
                      key={ev.id}
                      className="text-[8px] sm:text-[10px] leading-tight px-1 py-px rounded truncate text-white font-medium"
                      style={{ backgroundColor: color }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  )
                })}
                {dayEvents.length > 2 && (
                  <div className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>

              {/* Add-event affordance on hover (desktop) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddEvent(day)
                }}
                className="hidden sm:flex absolute bottom-1 right-1 h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (() => {
        const dayEvents = getEventsForDay(selectedDay)
        return (
          <div className={cn(
            'border rounded-lg p-4 space-y-4 bg-card',
            isToday(selectedDay) && 'border-primary/35 bg-primary/[0.04]'
          )}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="flex items-center gap-2">
                {isToday(selectedDay) && (
                  <span className="text-xs font-medium text-primary">Hoje</span>
                )}
                {dayEvents.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => onAddEvent(selectedDay)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Novo evento
                  </Button>
                )}
              </div>
            </div>

            {dayEvents.length === 0 && (
              <Button className="w-full h-12 text-base" onClick={() => onAddEvent(selectedDay)}>
                <Plus className="h-5 w-5 mr-2" />
                Novo evento
              </Button>
            )}

            <div className="space-y-2">
              {dayEvents.map((ev) => {
                const category = categoryMap.get(ev.categoryId ?? '')
                return (
                  <div key={ev.id} className="flex items-start justify-between gap-3 border-l-2 pl-3 py-1" style={{ borderColor: category?.color ?? DEFAULT_COLOR }}>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{ev.title}</p>
                        {category && (
                          <span
                            className="text-[10px] rounded-full px-2 py-0.5 text-white"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {ev.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ev.time}
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                      {ev.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ev.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditEvent(ev)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeleteEvent(ev)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
