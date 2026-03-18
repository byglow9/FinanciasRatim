import { useState, useEffect, useRef } from 'react'
import { isSameMonth } from 'date-fns'
import type { Transaction, FixedExpense, FixedExpensePayment, SavingsTransaction, GoalContribution, Goal, PersonType } from '@/types'
import { getTransactions } from '@/services/transactions.service'
import { getFixedExpenses, getPaymentsForMonth } from '@/services/fixedExpenses.service'
import { getSavingsTransactions } from '@/services/savings.service'
import { getContributionsForMonth } from '@/services/goalContributions.service'
import { getGoals } from '@/services/goals.service'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/ui/button'
import { Info, PiggyBank, Target } from 'lucide-react'

export function CalendarPage() {
  const { currentArea, settings } = useArea()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [payments, setPayments] = useState<FixedExpensePayment[]>([])
  const [savings, setSavings] = useState<SavingsTransaction[]>([])
  const [contributions, setContributions] = useState<GoalContribution[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showLegend, setShowLegend] = useState(false)
  const legendRef = useRef<HTMLDivElement>(null)

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
    ]).then(([tx, fe, pay, sav, contrib, g]) => {
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
    }).finally(() => setLoading(false))
  }, [selectedMonth, person])

  const areaLabel = currentArea === 'porquinho'
    ? settings.tabNames.area1
    : currentArea === 'ele'
      ? settings.tabNames.area1
      : settings.tabNames.area2

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center sm:justify-between gap-4">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold">Calendario — {areaLabel}</h1>
          <p className="text-muted-foreground">Visao mensal dos eventos financeiros de {areaLabel}</p>
        </div>
        <div className="flex items-center gap-2">
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : (
        <MonthCalendar
          month={selectedMonth}
          transactions={transactions}
          fixedExpenses={fixedExpenses}
          payments={payments}
          savings={savings}
          contributions={contributions}
          goals={goals}
        />
      )}
    </div>
  )
}
