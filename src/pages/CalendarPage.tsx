import { useState, useEffect } from 'react'
import { isSameMonth } from 'date-fns'
import type { Transaction, FixedExpense, FixedExpensePayment, SavingsTransaction, PersonType } from '@/types'
import { getTransactions } from '@/services/transactions.service'
import { getFixedExpenses, getPaymentsForMonth } from '@/services/fixedExpenses.service'
import { getSavingsTransactions } from '@/services/savings.service'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { useArea } from '@/contexts/AreaContext'

export function CalendarPage() {
  const { currentArea, settings } = useArea()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [payments, setPayments] = useState<FixedExpensePayment[]>([])
  const [savings, setSavings] = useState<SavingsTransaction[]>([])
  const [loading, setLoading] = useState(true)

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
    ]).then(([tx, fe, pay, sav]) => {
      setTransactions(tx)
      setFixedExpenses(fe)
      setPayments(pay)
      setSavings(
        sav
          .filter((s) => isSameMonth(s.date, selectedMonth) && s.person === person)
      )
    }).finally(() => setLoading(false))
  }, [selectedMonth, person])

  const areaLabel = currentArea === 'porquinho'
    ? settings.tabNames.area1
    : currentArea === 'ele'
      ? settings.tabNames.area1
      : settings.tabNames.area2

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold">Calendario — {areaLabel}</h1>
          <p className="text-muted-foreground">Visao mensal dos eventos financeiros de {areaLabel}</p>
        </div>
        <MonthSelector selectedDate={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-300" />
          Entradas
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-300" />
          Saidas
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-orange-200" />
          Conta fixa pendente
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200" />
          Conta fixa paga
        </span>
        <span className="flex items-center gap-1 text-pink-600">
          🐷 Porquinho
        </span>
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
        />
      )}
    </div>
  )
}
