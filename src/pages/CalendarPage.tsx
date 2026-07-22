import { useState, useEffect, useRef } from 'react'
import { isSameMonth, startOfMonth } from 'date-fns'
import type { Transaction, FixedExpense, FixedExpensePayment, SavingsTransaction, GoalContribution, Goal, Note, PersonType, AgendaEvent, EventCategory } from '@/types'
import { getTransactions } from '@/services/transactions.service'
import { getFixedExpenses, getPaymentsForMonth } from '@/services/fixedExpenses.service'
import { getSavingsTransactions } from '@/services/savings.service'
import { getContributionsForMonth } from '@/services/goalContributions.service'
import { getGoals } from '@/services/goals.service'
import { getNotes, addNote, updateNote, deleteNote } from '@/services/notes.service'
import { getEventsForMonth, addEvent, updateEvent, deleteEvent } from '@/services/events.service'
import { getEventCategories } from '@/services/eventCategories.service'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { AgendaCalendar } from '@/components/calendar/AgendaCalendar'
import { EventForm } from '@/components/calendar/EventForm'
import { NoteForm } from '@/components/notes/NoteForm'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/ui/button'
import { Info, PiggyBank, Target, StickyNote, Wallet, CalendarDays, Plus } from 'lucide-react'

type CalendarMode = 'financeiro' | 'agenda'
const MODE_STORAGE_KEY = 'calendarMode'
const modeToIndex: Record<CalendarMode, number> = { financeiro: 0, agenda: 1 }

export function CalendarPage() {
  const { currentArea, settings } = useArea()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [mode, setMode] = useState<CalendarMode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return stored === 'agenda' ? 'agenda' : 'financeiro'
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [payments, setPayments] = useState<FixedExpensePayment[]>([])
  const [savings, setSavings] = useState<SavingsTransaction[]>([])
  const [contributions, setContributions] = useState<GoalContribution[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showLegend, setShowLegend] = useState(false)
  const legendRef = useRef<HTMLDivElement>(null)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | undefined>(undefined)
  const [eventFormDate, setEventFormDate] = useState(new Date())
  const [noteFormOpen, setNoteFormOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined)
  const [noteFormDate, setNoteFormDate] = useState(new Date())

  const handleModeChange = (value: string) => {
    const next = value as CalendarMode
    setMode(next)
    localStorage.setItem(MODE_STORAGE_KEY, next)
  }

  // Data padrão pro botão "+" do cabeçalho: hoje, se estiver dentro do mês
  // selecionado, senão o 1º dia do mês selecionado
  const getDefaultFormDate = () => {
    const today = new Date()
    return isSameMonth(today, selectedMonth) ? today : startOfMonth(selectedMonth)
  }

  // Close legend when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (legendRef.current && !legendRef.current.contains(event.target as Node)) {
        setShowLegend(false)
      }
    }
    if (showLegend) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLegend])

  // When porquinho is selected, fall back to 'ele' for person-based data
  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea

  useEffect(() => {
    if (mode !== 'financeiro') return
    setLoading(true)
    const month = selectedMonth.getMonth() + 1
    const year = selectedMonth.getFullYear()

    Promise.all([
      getTransactions(person, selectedMonth),
      getFixedExpenses(person),
      getPaymentsForMonth(month, year),
      getSavingsTransactions(),
      getContributionsForMonth(selectedMonth),
      getGoals(person),
      getNotes(person).catch(() => [] as Note[]),
    ]).then(([tx, fe, pay, sav, contrib, g, n]) => {
      setTransactions(tx)
      setFixedExpenses(fe)
      setPayments(pay)
      setSavings(
        sav
          .filter((s) => isSameMonth(s.date, selectedMonth) && s.person === person)
      )
      // Filtrar contribuições: apenas de metas que existem E são do perfil atual
      const goalIds = new Set(g.map(goal => goal.id))
      setContributions(contrib.filter(c => goalIds.has(c.goalId)))
      setGoals(g)
      setNotes((n as Note[]).filter((note) => note.date && isSameMonth(note.date, selectedMonth)))
    }).finally(() => setLoading(false))
  }, [selectedMonth, person, mode])

  // Refetch silencioso (sem mexer em `loading`) usado após criar/editar/excluir nota,
  // pelo mesmo motivo do fetchAgendaData abaixo: não desmontar o grid e perder o dia selecionado
  const refetchNotes = () => {
    getNotes(person).then((n) => {
      setNotes(n.filter((note) => note.date && isSameMonth(note.date, selectedMonth)))
    })
  }

  // showLoading=false ao recarregar após criar/editar/excluir, para não desmontar o
  // grid (e perder o dia selecionado) durante a atualização
  const fetchAgendaData = (showLoading = true) => {
    if (showLoading) setLoading(true)
    Promise.all([
      getEventsForMonth(selectedMonth),
      getEventCategories(),
    ]).then(([ev, cats]) => {
      setEvents(ev)
      setEventCategories(cats)
    }).finally(() => { if (showLoading) setLoading(false) })
  }

  useEffect(() => {
    if (mode !== 'agenda') return
    fetchAgendaData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, mode])

  const handleAddEvent = (date: Date) => {
    setEditingEvent(undefined)
    setEventFormDate(date)
    setEventFormOpen(true)
  }

  const handleEditEvent = (event: AgendaEvent) => {
    setEditingEvent(event)
    setEventFormDate(event.date)
    setEventFormOpen(true)
  }

  const handleDeleteEvent = async (event: AgendaEvent) => {
    if (window.confirm(`Excluir o evento "${event.title}"?`)) {
      await deleteEvent(event.id)
      fetchAgendaData(false)
    }
  }

  const handleEventFormSubmit = async (data: Omit<AgendaEvent, 'id' | 'createdAt'>) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data)
    } else {
      await addEvent(data)
    }
    fetchAgendaData(false)
  }

  const handleEventFormOpenChange = (open: boolean) => {
    setEventFormOpen(open)
    if (!open) setEditingEvent(undefined)
  }

  const handleAddNote = (date: Date) => {
    setEditingNote(undefined)
    setNoteFormDate(date)
    setNoteFormOpen(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setNoteFormDate(note.date ?? new Date())
    setNoteFormOpen(true)
  }

  const handleDeleteNote = async (note: Note) => {
    if (window.confirm(`Excluir a anotação "${note.title}"?`)) {
      await deleteNote(note.id)
      refetchNotes()
    }
  }

  const handleNoteFormSubmit = async (data: Omit<Note, 'id' | 'createdAt'>) => {
    if (editingNote) {
      await updateNote(editingNote.id, data)
    } else {
      await addNote(data)
    }
    refetchNotes()
  }

  const handleNoteFormOpenChange = (open: boolean) => {
    setNoteFormOpen(open)
    if (!open) setEditingNote(undefined)
  }

  const areaLabel = currentArea === 'porquinho'
    ? settings.tabNames.area1
    : currentArea === 'ele'
      ? settings.tabNames.area1
      : settings.tabNames.area2

  return (
    <div className="space-y-4">
      <div className="relative flex items-center gap-4">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold">
            Calendario — {mode === 'financeiro' ? areaLabel : 'Agenda'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'financeiro'
              ? `Visao mensal dos eventos financeiros de ${areaLabel}`
              : 'Visao mensal dos nossos compromissos e eventos'}
          </p>
        </div>
        <div className="flex-1 flex items-center gap-2 justify-center sm:flex-none sm:ml-auto">
          <MonthSelector selectedDate={selectedMonth} onChange={setSelectedMonth} />

          {/* Legend Button */}
          <div className="relative" ref={legendRef}>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowLegend(!showLegend)}
            >
              <Info className="h-4 w-4" />
            </Button>

            {showLegend && (
              <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-popover border rounded-lg shadow-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Legenda</p>

                {mode === 'financeiro' ? (
                  <div className="grid grid-cols-1 gap-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-400 shrink-0" />
                      <span>Entradas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-400 shrink-0" />
                      <span>Saidas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" />
                      <span>Conta fixa pendente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-300 shrink-0" />
                      <span>Conta fixa paga</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-3 h-3 text-pink-500 shrink-0" />
                      <span>Porquinho</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-purple-500 shrink-0" />
                      <span>Metas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>Anotações</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 text-sm">
                    {eventCategories.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhuma categoria criada ainda.</p>
                    )}
                    {eventCategories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Atalho de criação rápida (mobile) */}
        <Button
          size="icon"
          className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white shrink-0"
          onClick={() => mode === 'agenda' ? handleAddEvent(getDefaultFormDate()) : handleAddNote(getDefaultFormDate())}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Mode toggle */}
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-2 sm:w-[280px]" activeIndex={modeToIndex[mode]} itemCount={2}>
          <TabsTrigger value="financeiro" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Agenda
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : mode === 'financeiro' ? (
        <MonthCalendar
          month={selectedMonth}
          transactions={transactions}
          fixedExpenses={fixedExpenses}
          payments={payments}
          savings={savings}
          contributions={contributions}
          goals={goals}
          notes={notes}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
        />
      ) : (
        <AgendaCalendar
          month={selectedMonth}
          events={events}
          categories={eventCategories}
          onAddEvent={handleAddEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      <EventForm
        key={`event-${editingEvent?.id ?? 'new'}`}
        open={eventFormOpen}
        onOpenChange={handleEventFormOpenChange}
        onSubmit={handleEventFormSubmit}
        defaultDate={eventFormDate}
        initialData={editingEvent}
      />

      <NoteForm
        key={`note-${editingNote?.id ?? 'new'}`}
        open={noteFormOpen}
        onOpenChange={handleNoteFormOpenChange}
        onSubmit={handleNoteFormSubmit}
        currentPerson={person}
        defaultDate={noteFormDate}
        initialData={editingNote}
      />
    </div>
  )
}
