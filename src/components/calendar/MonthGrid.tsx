import { useMemo } from 'react'
import { DayCell } from '@/components/calendar/DayCell'
import type { CalendarMode, DayModel } from '@shared/core/calendarModel.js'
import { cycleGrid } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'

// Uma letra por dia da semana a 360px; o nome por extenso fica só para leitor de tela.
const WEEKDAYS = [
  { letter: 'D', name: 'Domingo' },
  { letter: 'S', name: 'Segunda-feira' },
  { letter: 'T', name: 'Terça-feira' },
  { letter: 'Q', name: 'Quarta-feira' },
  { letter: 'Q', name: 'Quinta-feira' },
  { letter: 'S', name: 'Sexta-feira' },
  { letter: 'S', name: 'Sábado' },
]

interface MonthGridProps {
  cycle: Cycle
  models: Map<string, DayModel>
  selectedKey: string
  mode: CalendarMode
  onSelect: (key: string) => void
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Grade de sete colunas com as semanas do ciclo exato (cycleGrid do núcleo, D-19): os dias de folga que
 * completam a primeira e a última semana aparecem esmaecidos.
 */
export function MonthGrid({ cycle, models, selectedKey, mode, onSelect }: MonthGridProps) {
  const weeks = useMemo(() => cycleGrid(cycle), [cycle])

  return (
    <div className="-mx-1 space-y-1">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="flex h-6 items-center justify-center text-xs font-bold text-muted-foreground">
            <span aria-hidden="true">{w.letter}</span>
            <span className="sr-only">{w.name}</span>
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={`${week[0].parts.year}-${week[0].parts.month}-${week[0].parts.day}`} className="grid grid-cols-7 gap-1">
          {week.map((cell) => {
            const key = `${cell.parts.year}-${pad(cell.parts.month)}-${pad(cell.parts.day)}`
            const model = cell.inCycle ? models.get(key) : undefined
            return (
              <DayCell
                key={key}
                parts={cell.parts}
                model={model}
                selected={key === selectedKey}
                mode={mode}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
