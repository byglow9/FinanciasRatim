import { useCallback, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Wallet } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCalendarData } from '@/hooks/useCalendarData'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { AgendaList } from '@/components/calendar/AgendaList'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { PersonType } from '@/types'
import type { CalendarMode } from '@shared/core/calendarModel.js'
import { dayKeyOf } from '@shared/core/dayKey.js'
import { compactMoney, cycleLabel } from '@shared/core/format.js'

const MODE_STORAGE_KEY = 'calendarMode'

const NAV_BUTTON =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40'

export function CalendarPage() {
  const { currentArea } = useArea()
  const { now, shift, setOffset, isCurrent } = useCycle()

  const [mode, setMode] = useState<CalendarMode>(() =>
    localStorage.getItem(MODE_STORAGE_KEY) === 'agenda' ? 'agenda' : 'financeiro'
  )
  const [pickedKey, setPickedKey] = useState<string | null>(null)

  // Porquinho não tem calendário próprio: usa o último perfil de pessoa.
  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea
  const { cycle, dayModels, summary, loading, error, refetch } = useCalendarData(person, mode)

  const todayKey = dayKeyOf(now)
  const days = useMemo(() => Array.from(dayModels.values()), [dayModels])

  // Dia selecionado: o escolhido, se ainda está no ciclo; senão hoje, se está; senão o primeiro dia.
  const selectedKey =
    pickedKey !== null && dayModels.has(pickedKey)
      ? pickedKey
      : dayModels.has(todayKey)
        ? todayKey
        : (days[0]?.key ?? todayKey)

  const handleMode = (next: CalendarMode) => {
    setMode(next)
    localStorage.setItem(MODE_STORAGE_KEY, next)
  }

  const handleSelect = useCallback((key: string) => setPickedKey(key), [])

  const goToday = () => {
    setOffset(0)
    setPickedKey(todayKey)
  }

  // Com salário no dia 1 o ciclo é um mês: "Novembro de 2026"; senão a faixa: "20 nov a 19 dez".
  const label =
    cycle.startParts.day === 1 ? `${cycleLabel(cycle)} de ${cycle.startParts.year}` : (cycleLabel(cycle) as string)

  const todayActive = isCurrent && selectedKey === todayKey

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight">Calendário</h1>
        <button
          type="button"
          aria-disabled={todayActive ? true : undefined}
          onClick={() => {
            if (!todayActive) goToday()
          }}
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-card px-4 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Hoje
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Ciclo anterior" onClick={() => shift(-1)} className={NAV_BUTTON}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="min-w-0 truncate text-center text-base font-bold" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          aria-label="Próximo ciclo"
          disabled={isCurrent}
          onClick={() => shift(1)}
          className={NAV_BUTTON}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SegmentedControl<CalendarMode>
            ariaLabel="Modo do calendário"
            value={mode}
            onChange={handleMode}
            options={[
              { value: 'financeiro', label: 'Financeiro', icon: Wallet },
              { value: 'agenda', label: 'Agenda', icon: CalendarDays },
            ]}
          />
        </div>
      </div>

      {mode === 'financeiro' && !loading && !error ? (
        <p className="text-xs font-normal text-muted-foreground">
          Saiu <span className="font-bold text-foreground">{compactMoney(summary.spentCents)}</span>
          {' · '}A pagar <span className="font-bold text-foreground">{compactMoney(summary.toPayCents)}</span>
        </p>
      ) : null}

      <MonthGrid cycle={cycle} models={dayModels} selectedKey={selectedKey} mode={mode} onSelect={handleSelect} />

      <AgendaList
        days={days}
        selectedKey={selectedKey}
        mode={mode}
        state={
          error ? (
            <Notice
              tone="danger"
              title="Não foi possível carregar o calendário."
              action={
                <Button type="button" variant="outline" onClick={() => void refetch()}>
                  Tentar de novo
                </Button>
              }
            >
              Confira a conexão e tente de novo.
            </Notice>
          ) : loading ? (
            <div role="status" className="space-y-2">
              <span className="sr-only">Carregando o calendário</span>
              {[0, 1, 2].map((i) => (
                <div key={i} aria-hidden="true" className="anim-pulse h-[72px] rounded-2xl bg-card" />
              ))}
            </div>
          ) : days.every((d) => d.items.length === 0) ? (
            <div className="space-y-2">
              <p className="text-base font-bold">Nada agendado neste ciclo</p>
              <p className="text-xs font-normal text-muted-foreground">
                Adicione um post-it ou um evento para ele aparecer aqui.
              </p>
            </div>
          ) : undefined
        }
      />
    </div>
  )
}
