import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface DayPickerProps {
  // Dia escolhido, de 1 a 31.
  value: number
  onChange: (day: number) => void
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

/**
 * Grade de 1 a 31 para o dia do salário (UI-SPEC S5): radiogroup de 7 colunas, botões de 44x44.
 * Setas movem a escolha (esquerda e direita um dia, cima e baixo uma semana); só o dia
 * escolhido entra na ordem de Tab.
 */
export function DayPicker({ value, onChange }: DayPickerProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const move = (day: number) => {
    const next = Math.max(1, Math.min(31, day))
    onChange(next)
    buttons.current[next - 1]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let target: number | null = null
    if (e.key === 'ArrowRight') target = value + 1
    else if (e.key === 'ArrowLeft') target = value - 1
    else if (e.key === 'ArrowDown') target = value + 7
    else if (e.key === 'ArrowUp') target = value - 7
    else if (e.key === 'Home') target = 1
    else if (e.key === 'End') target = 31
    if (target === null) return
    e.preventDefault()
    move(target)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Dia do mês"
      onKeyDown={onKeyDown}
      className="mt-3 grid grid-cols-7 justify-items-center gap-1"
    >
      {DAYS.map((day) => {
        const selected = day === value
        return (
          <button
            key={day}
            ref={(el) => {
              buttons.current[day - 1] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(day)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected ? 'bg-action text-action-text' : 'bg-surface-2 text-foreground'
            )}
          >
            {day}
          </button>
        )
      })}
    </div>
  )
}
