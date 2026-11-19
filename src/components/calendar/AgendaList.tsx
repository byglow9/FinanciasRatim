import type { ReactNode, Ref } from 'react'
import { AgendaDay } from '@/components/calendar/AgendaDay'
import type { CalendarMode, DayModel } from '@shared/core/calendarModel.js'

interface AgendaListProps {
  /** Modelos do ciclo em ordem de data; só os dias com itens aparecem. */
  days: DayModel[]
  selectedKey: string
  mode: CalendarMode
  /** Estado de carregando, de erro ou vazio, desenhado dentro do mesmo contêiner (sempre montado). */
  state?: ReactNode
  containerRef?: Ref<HTMLDivElement>
  onOpenNote: (id: string) => void
  onOpenEvent: (id: string) => void
}

/**
 * Agenda corrida (UI-SPEC S3, D-08): lista só os dias com itens e é o ÚNICO contêiner rolável da tela do
 * Calendário. O contêiner fica montado desde a primeira renderização, também carregando, para o listener
 * de rolagem do `useCollapseOnScroll` ser ligado uma vez, e é `relative` para o `offsetTop` dos dias valer
 * dentro dele. O miolo tem altura mínima de 100% mais 64px: sempre sobra rolagem acima do limiar de 24px
 * do redutor, então o navegador nunca devolve o `scrollTop` a 0 quando o mês recolhe e a agenda cresce.
 */
export function AgendaList({ days, selectedKey, mode, state, containerRef, onOpenNote, onOpenEvent }: AgendaListProps) {
  const withItems = days.filter((d) => d.items.length > 0)
  return (
    <div
      ref={containerRef}
      aria-label="Agenda do ciclo"
      role="region"
      className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="min-h-[calc(100%+64px)] space-y-2">
        {state ?? (
          <ul className="space-y-4">
            {withItems.map((model) => (
              <AgendaDay
                key={model.key}
                model={model}
                selected={model.key === selectedKey}
                mode={mode}
                onOpenNote={onOpenNote}
                onOpenEvent={onOpenEvent}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
