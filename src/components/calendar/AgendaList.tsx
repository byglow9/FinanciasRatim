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
}

/**
 * Agenda corrida (UI-SPEC S3): lista só os dias com itens. O contêiner fica montado desde a primeira
 * renderização, também carregando, para o listener de rolagem do plano 22 ser ligado uma vez.
 */
export function AgendaList({ days, selectedKey, mode, state, containerRef }: AgendaListProps) {
  const withItems = days.filter((d) => d.items.length > 0)
  return (
    <div ref={containerRef} aria-label="Agenda do ciclo" role="region" className="space-y-2">
      {state ?? (
        <ul className="space-y-4">
          {withItems.map((model) => (
            <AgendaDay key={model.key} model={model} selected={model.key === selectedKey} mode={mode} />
          ))}
        </ul>
      )}
    </div>
  )
}
