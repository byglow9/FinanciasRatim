import { useMemo } from 'react'
import { DayCell } from '@/components/calendar/DayCell'
import type { CalendarMode, DayModel } from '@shared/core/calendarModel.js'
import { cn } from '@/lib/utils'
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
  /** Mês recolhido (D-08): só a linha da semana do dia selecionado fica visível. */
  collapsed: boolean
  onSelect: (key: string) => void
}

const pad = (n: number) => String(n).padStart(2, '0')
const keyOfParts = (p: { year: number; month: number; day: number }) => `${p.year}-${pad(p.month)}-${pad(p.day)}`

/**
 * Grade de sete colunas com as semanas do ciclo exato (cycleGrid do núcleo, D-19): os dias de folga que
 * completam a primeira e a última semana aparecem esmaecidos. Recolhida, todas as linhas continuam no DOM
 * (sem montar e desmontar nada ao recolher e reabrir) e só a semana do dia selecionado mantém altura; as
 * outras colapsam por `max-height` em 200ms, ou na hora com movimento reduzido, e saem do foco por `inert`.
 */
export function MonthGrid({ cycle, models, selectedKey, mode, collapsed, onSelect }: MonthGridProps) {
  const weeks = useMemo(() => cycleGrid(cycle), [cycle])

  return (
    <div className="-mx-2">
      <div className="grid grid-cols-7 gap-1 px-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="flex h-6 items-center justify-center text-xs font-bold text-muted-foreground">
            <span aria-hidden="true">{w.letter}</span>
            <span className="sr-only">{w.name}</span>
          </div>
        ))}
      </div>
      {weeks.map((week) => {
        const hidden = collapsed && !week.some((cell) => keyOfParts(cell.parts) === selectedKey)
        return (
          <div
            key={`${week[0].parts.year}-${week[0].parts.month}-${week[0].parts.day}`}
            data-week-row=""
            data-hidden={hidden ? 'true' : undefined}
            inert={hidden}
            className={cn(
              // O respiro de 4px em volta existe para o anel de foco não ser cortado pelo overflow-hidden.
              'grid grid-cols-7 gap-1 overflow-hidden px-1 transition-[max-height,opacity,margin,padding] duration-200 motion-reduce:transition-none',
              hidden ? 'mb-0 max-h-0 py-0 opacity-0' : '-mb-1 max-h-16 py-1 opacity-100'
            )}
          >
            {week.map((cell) => {
              const key = keyOfParts(cell.parts)
              const model = cell.inCycle ? models.get(key) : undefined
              return (
                <DayCell
                  key={key}
                  parts={cell.parts}
                  model={model}
                  selected={key === selectedKey}
                  focusable={key === selectedKey}
                  mode={mode}
                  onSelect={onSelect}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
