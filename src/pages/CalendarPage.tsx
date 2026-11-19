import { useCallback, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCalendarActions } from '@/hooks/useCalendarActions'
import { useCalendarData } from '@/hooks/useCalendarData'
import { useReadOnly } from '@/hooks/useReadOnly'
import { CalendarLegend } from '@/components/calendar/CalendarLegend'
import { EventSheet } from '@/components/calendar/EventSheet'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { NoteSheet } from '@/components/calendar/NoteSheet'
import { AgendaList } from '@/components/calendar/AgendaList'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { AgendaEvent, Note, PersonType } from '@/types'
import type { CalendarMode } from '@shared/core/calendarModel.js'
import { dayKeyOf } from '@shared/core/dayKey.js'
import { compactMoney, cycleLabel } from '@shared/core/format.js'

const MODE_STORAGE_KEY = 'calendarMode'

/** Meio-dia local da chave YYYY-MM-DD: a data gravada não escorrega de dia por causa do fuso. */
function dateOfKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

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
  const { cycle, dayModels, summary, notes, events, eventCategories, loading, error, refetch } = useCalendarData(
    person,
    mode
  )
  const { readOnly, guard } = useReadOnly()
  const { saveNote, removeNote, saveEvent, removeEvent } = useCalendarActions({
    person,
    // Refetch silencioso: não liga o carregando, então a grade e o dia selecionado continuam.
    onChanged: () => {
      void refetch()
    },
  })

  // Os Sheets ficam montados durante a animação de saída: o item em edição é guardado à parte de `open`.
  const [noteSheet, setNoteSheet] = useState<{ open: boolean; note: Note | null }>({ open: false, note: null })
  const [eventSheet, setEventSheet] = useState<{ open: boolean; event: AgendaEvent | null }>({
    open: false,
    event: null,
  })

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

  const openNote = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id)
    if (note) setNoteSheet({ open: true, note })
  }, [notes])

  const openEvent = useCallback((id: string) => {
    const event = events.find((e) => e.id === id)
    if (event) setEventSheet({ open: true, event })
  }, [events])

  // Criar vale para o dia selecionado: nota no Financeiro, evento na Agenda.
  const openCreate = () => {
    if (guard('editar')) return
    if (mode === 'agenda') setEventSheet({ open: true, event: null })
    else setNoteSheet({ open: true, note: null })
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
        <CalendarLegend />
        <Button
          type="button"
          size="circle"
          aria-label={mode === 'agenda' ? 'Novo evento' : 'Nova nota'}
          aria-disabled={readOnly ? true : undefined}
          onClick={openCreate}
          className="shrink-0 aria-disabled:opacity-50"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Button>
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
        onOpenNote={openNote}
        onOpenEvent={openEvent}
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
              <Button type="button" variant="outline" onClick={openCreate}>
                {mode === 'agenda' ? 'Adicionar evento' : 'Adicionar post-it'}
              </Button>
            </div>
          ) : undefined
        }
      />

      <NoteSheet
        open={noteSheet.open}
        onClose={() => setNoteSheet((s) => ({ ...s, open: false }))}
        note={noteSheet.note}
        date={noteSheet.note?.date ?? dateOfKey(selectedKey)}
        onSave={saveNote}
        onDelete={removeNote}
        readOnly={readOnly}
        onBlocked={() => guard('editar')}
      />
      <EventSheet
        open={eventSheet.open}
        onClose={() => setEventSheet((s) => ({ ...s, open: false }))}
        event={eventSheet.event}
        date={eventSheet.event?.date ?? dateOfKey(selectedKey)}
        categories={eventCategories}
        onSave={saveEvent}
        onDelete={removeEvent}
        readOnly={readOnly}
        onBlocked={() => guard('editar')}
      />
    </div>
  )
}
