import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCycle } from '@/contexts/CycleContext'
import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'
import { shiftCycle } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'
import { cycleLabel, dayMonth } from '@shared/core/format.js'

// Pilula do ciclo (S1, LIM-10): rotulo do ciclo da pessoa vista, chevrons e lista dos ultimos 12
// ciclos agrupados por ano. Toda a navegacao e do nucleo (shiftCycle) e do contexto (shift,
// setOffset): nada de aritmetica de data no fuso do host. E o UNICO seletor de periodo das telas
// de Transacoes, Calendario e Contas fixas.

const CYCLES_SHOWN = 12

const CHEVRON =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40'

interface Option {
  index: number
  label: string
  period: string
  year: number
}

export function CycleSelector() {
  const { offset, shift, setOffset, isCurrent, viewPerson, cycleFor } = useCycle()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const shown = cycleFor(viewPerson)
  // Ciclo atual da pessoa: o ponto de partida da lista (a lista nao anda com o deslocamento).
  const current = shiftCycle(shown, -offset)
  const options: Option[] = Array.from({ length: CYCLES_SHOWN }, (_, i) => {
    const cycle: Cycle = i === 0 ? current : shiftCycle(current, -i)
    return {
      index: i,
      label: cycleLabel(cycle) as string,
      period: `${dayMonth(cycle.startParts)} a ${dayMonth(cycle.endParts)}`,
      year: cycle.startParts.year,
    }
  })
  const years = Array.from(new Set(options.map((o) => o.year)))

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
    // Contêiner de consulta: em celulares estreitos (menos de 232px livres para o seletor) os
    // chevrons laterais saem e o rotulo ganha a largura toda, para nunca truncar; a lista abaixo
    // continua dando acesso a qualquer um dos 12 ciclos.
    <div ref={rootRef} className="@container relative min-w-0">
      <div className="inline-flex h-11 max-w-full min-w-0 items-center rounded-[16px] bg-card">
        <button
          type="button"
          aria-label="Ciclo anterior"
          onClick={() => shift(-1)}
          className={cn(CHEVRON, 'hidden @min-[232px]:inline-flex')}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          ref={labelRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-[12px] px-1.5 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @min-[232px]:px-1"
        >
          <span>{cycleLabel(shown)}</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          aria-label="Próximo ciclo"
          disabled={isCurrent}
          onClick={() => shift(1)}
          className={cn(CHEVRON, 'hidden @min-[232px]:inline-flex')}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label="Ciclos"
          onKeyDown={onListKeyDown}
          className="absolute left-0 top-full z-50 mt-2 max-h-[60dvh] w-[min(320px,calc(100vw-32px))] overflow-y-auto rounded-[22px] border border-border bg-popover p-2 shadow-float"
        >
          {years.map((year) => (
            <div key={year} role="group" aria-label={String(year)}>
              <p aria-hidden="true" className="px-3 pb-1 pt-2 text-xs font-bold text-muted-foreground">
                {year}
              </p>
              {options
                .filter((o) => o.year === year)
                .map((option) => {
                  const selected = option.index === -offset
                  return (
                    <button
                      key={option.index}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => choose(option.index)}
                      className={cn(
                        'flex h-12 w-full items-center gap-2 rounded-[14px] px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected ? 'bg-surface-2 font-bold' : 'font-normal hover:bg-surface-2'
                      )}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {option.index === 0 && <Chip tone="ok">Atual</Chip>}
                      <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">{option.period}</span>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                      </span>
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
