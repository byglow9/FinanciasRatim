import { useEffect, useMemo, useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { DayCell } from '@/components/calendar/DayCell'
import type { CalendarMode, DayModel } from '@shared/core/calendarModel.js'
import { cn } from '@/lib/utils'
import { addDaysToParts, cycleGrid } from '@shared/core/cycle.js'
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
  /**
   * Teclado: o dia pedido pelas setas, Home ou End (chave YYYY-MM-DD, possivelmente fora do ciclo). A página
   * decide se muda de dia, de ciclo ou fica onde está.
   */
  onMove: (key: string) => void
  /** Deslizar a grade (D-11): -1 volta ao ciclo anterior, 1 vai ao próximo. */
  onSwipe: (direction: -1 | 1) => void
}

const pad = (n: number) => String(n).padStart(2, '0')
const keyOfParts = (p: { year: number; month: number; day: number }) => `${p.year}-${pad(p.month)}-${pad(p.day)}`

// Setas do teclado (D-12): um dia para os lados, uma semana para cima e para baixo.
const ARROW_DELTA: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

// Deslizar: pelo menos 48px e claramente mais horizontal do que vertical, para não brigar com a rolagem.
const SWIPE_MIN_PX = 48
const SWIPE_RATIO = 1.5

function partsOfKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return { year, month, day }
}

/**
 * Grade de sete colunas com as semanas do ciclo exato (cycleGrid do núcleo, D-19): os dias de folga que
 * completam a primeira e a última semana aparecem esmaecidos. Recolhida, todas as linhas continuam no DOM
 * (sem montar e desmontar nada ao recolher e reabrir) e só a semana do dia selecionado mantém altura; as
 * outras colapsam por `max-height` em 200ms, ou na hora com movimento reduzido, e saem do foco por `inert`.
 */
export function MonthGrid({ cycle, models, selectedKey, mode, collapsed, onSelect, onMove, onSwipe }: MonthGridProps) {
  const weeks = useMemo(() => cycleGrid(cycle), [cycle])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const pendingFocus = useRef(false)
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null)

  // Depois de mover o dia pelo teclado, o foco acompanha o dia selecionado (roving tabindex), também
  // quando a grade trocou de ciclo ou de semana no meio do caminho.
  useEffect(() => {
    if (!pendingFocus.current) return
    const button = rootRef.current?.querySelector<HTMLButtonElement>(`[data-key="${selectedKey}"]`)
    if (!button) return
    pendingFocus.current = false
    button.focus({ preventScroll: true })
  }, [selectedKey, cycle, collapsed, models])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const delta = ARROW_DELTA[event.key]
    let next: string
    if (delta !== undefined) next = keyOfParts(addDaysToParts(partsOfKey(selectedKey), delta))
    else if (event.key === 'Home') next = keyOfParts(cycle.startParts)
    else if (event.key === 'End') next = keyOfParts(cycle.endParts)
    else return
    event.preventDefault()
    if (next !== selectedKey) pendingFocus.current = true
    onMove(next)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return
    swipeStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (start === null || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return
    // Para a esquerda avança para o próximo ciclo; para a direita volta ao anterior.
    onSwipe(dx < 0 ? 1 : -1)
  }

  return (
    // touch-pan-y: a rolagem vertical da página segue livre; o movimento horizontal chega ao gesto.
    <div
      ref={rootRef}
      className="-mx-2 touch-pan-y"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStart.current = null
      }}
    >
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
