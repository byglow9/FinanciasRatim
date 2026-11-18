import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCycle } from '@/contexts/CycleContext'
import { cn } from '@/lib/utils'
import { shiftCycle } from '@shared/core/cycle.js'
import { cycleLabel } from '@shared/core/format.js'

// Pilula do ciclo (S1, LIM-10): rotulo do ciclo da pessoa vista, chevrons e lista dos ultimos 12
// ciclos. Toda a navegacao e do nucleo (shiftCycle) e do contexto (shift, setOffset): nada de
// aritmetica de data no fuso do host.

const CYCLES_SHOWN = 12

const CHEVRON =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40'

export function CycleSelector() {
  const { offset, shift, setOffset, isCurrent, viewPerson, cycleFor } = useCycle()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const shown = cycleFor(viewPerson)
  // Ciclo atual da pessoa: o ponto de partida da lista (a lista nao anda com o deslocamento).
  const current = shiftCycle(shown, -offset)
  const options = Array.from({ length: CYCLES_SHOWN }, (_, i) => ({
    index: i,
    label: cycleLabel(i === 0 ? current : shiftCycle(current, -i)) as string,
  }))

  useEffect(() => {
    if (!open) return
    function onMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        labelRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Foco inicial na lista: o ciclo escolhido, ou o primeiro quando ele esta fora dos 12.
  useEffect(() => {
    if (!open) return
    const items = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')
    if (!items || items.length === 0) return
    const selected = Array.from(items).find((el) => el.getAttribute('aria-selected') === 'true')
    ;(selected ?? items[0]).focus()
  }, [open])

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
    if (items.length === 0) return
    event.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLElement)
    let next = at
    if (event.key === 'ArrowDown') next = at < 0 ? 0 : (at + 1) % items.length
    if (event.key === 'ArrowUp') next = at <= 0 ? items.length - 1 : at - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    items[next].focus()
  }

  function choose(index: number) {
    setOffset(-index)
    setOpen(false)
    labelRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="inline-flex h-11 max-w-full min-w-0 items-center rounded-[16px] bg-card">
        <button
          type="button"
          aria-label="Ciclo anterior"
          onClick={() => shift(-1)}
          className={CHEVRON}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          ref={labelRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="h-11 min-w-0 flex-1 truncate rounded-[12px] px-1 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {cycleLabel(shown)}
        </button>
        <button
          type="button"
          aria-label="Próximo ciclo"
          disabled={isCurrent}
          onClick={() => shift(1)}
          className={CHEVRON}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Ciclos"
          onKeyDown={onListKeyDown}
          className="absolute left-0 top-full z-50 mt-2 max-h-[60dvh] w-56 max-w-[calc(100vw-32px)] overflow-y-auto rounded-[20px] border border-border bg-surface-2 p-2 shadow-float"
        >
          {options.map((option) => {
            const selected = option.index === -offset
            return (
              <button
                key={option.index}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(option.index)}
                className={cn(
                  'flex min-h-11 w-full items-center rounded-[14px] px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'bg-primary font-bold text-primary-foreground' : 'font-normal hover:bg-card'
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
