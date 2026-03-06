import { useState } from 'react'
import {
  startOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  getDate,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Transaction, FixedExpense, FixedExpensePayment, SavingsTransaction } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { PiggyBank } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayEvent {
  type: 'transaction' | 'fixed' | 'savings'
  label: string
  amount?: number
  net?: number
  paid?: boolean
}

interface MonthCalendarProps {
  month: Date
  transactions: Transaction[]
  fixedExpenses: FixedExpense[]
  payments: FixedExpensePayment[]
  savings: SavingsTransaction[]
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function getTransactionColor(net: number): string {
  const abs = Math.abs(net)
  if (net > 0) {
    if (abs < 100) return 'bg-green-100 text-green-700'
    if (abs < 500) return 'bg-green-200 text-green-800'
    return 'bg-green-400 text-green-900'
  } else {
    if (abs < 100) return 'bg-red-100 text-red-700'
    if (abs < 500) return 'bg-red-200 text-red-800'
    return 'bg-red-400 text-red-900'
  }
}

export function MonthCalendar({ month, transactions, fixedExpenses, payments, savings }: MonthCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Build 42-cell grid starting from Monday of the first week of the month
  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(gridStart, i))
  }

  // Precompute paid expense IDs for this month
  const paidIds = new Set(payments.map((p) => p.fixedExpenseId))

  // Get events for a given day
  function getEventsForDay(day: Date): DayEvent[] {
    const events: DayEvent[] = []

    // Transactions: group by day
    const dayTx = transactions.filter((t) => isSameDay(t.date, day))
    if (dayTx.length > 0) {
      const net = dayTx.reduce((sum, t) => {
        return t.type === 'entrada' ? sum + t.amount : sum - t.amount
      }, 0)
      events.push({ type: 'transaction', label: `${dayTx.length} transaç${dayTx.length > 1 ? 'ões' : 'ão'}`, net })
    }

    // Fixed expenses: appear on their dueDay
    const dayNum = getDate(day)
    const dayFixed = fixedExpenses.filter((fe) => fe.dueDay === dayNum)
    for (const fe of dayFixed) {
      events.push({
        type: 'fixed',
        label: fe.name,
        amount: fe.amount,
        paid: paidIds.has(fe.id),
      })
    }

    // Savings
    const daySavings = savings.filter((s) => isSameDay(s.date, day))
    if (daySavings.length > 0) {
      const net = daySavings.reduce((sum, s) => {
        return s.type === 'deposito' ? sum + s.amount : sum - s.amount
      }, 0)
      events.push({ type: 'savings', label: 'Porquinho', net })
    }

    return events
  }

  // Determine detail events for selected day
  function getDetailForDay(day: Date) {
    const dayTx = transactions.filter((t) => isSameDay(t.date, day))
    const dayNum = getDate(day)
    const dayFixed = fixedExpenses.filter((fe) => fe.dueDay === dayNum)
    const daySavings = savings.filter((s) => isSameDay(s.date, day))
    return { dayTx, dayFixed, daySavings }
  }

  return (
    <div className="space-y-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          const inMonth = isSameMonth(day, month)
          const isSelected = selectedDay && isSameDay(day, selectedDay)
          const events = getEventsForDay(day)
          const txEvent = events.find((e) => e.type === 'transaction')
          const fixedEvents = events.filter((e) => e.type === 'fixed')
          const savingsEvent = events.find((e) => e.type === 'savings')

          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={cn(
                'min-h-[80px] p-1 rounded border cursor-pointer transition-colors',
                inMonth ? 'bg-card' : 'bg-muted/30',
                isSelected && 'ring-2 ring-primary',
                'hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1',
                inMonth ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {/* Transaction badge */}
                {txEvent && txEvent.net !== undefined && (
                  <div className={cn(
                    'text-[10px] rounded px-1 py-0.5 font-medium truncate',
                    getTransactionColor(txEvent.net)
                  )}>
                    {txEvent.net >= 0 ? '+' : ''}{formatCurrency(txEvent.net)}
                  </div>
                )}

                {/* Fixed expense badges */}
                {fixedEvents.slice(0, 2).map((fe, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-[10px] rounded px-1 py-0.5 truncate',
                      fe.paid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    )}
                  >
                    {fe.paid ? '✓ ' : ''}{fe.label}
                  </div>
                ))}
                {fixedEvents.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{fixedEvents.length - 2} contas
                  </div>
                )}

                {/* Savings icon */}
                {savingsEvent && (
                  <div className="flex items-center gap-0.5 text-[10px] text-pink-600">
                    <PiggyBank className="h-3 w-3" />
                    <span className="truncate">{savingsEvent.net !== undefined && formatCurrency(savingsEvent.net)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (() => {
        const { dayTx, dayFixed, daySavings } = getDetailForDay(selectedDay)
        const dayNum = getDate(selectedDay)
        const hasAny = dayTx.length > 0 || dayFixed.length > 0 || daySavings.length > 0
        return (
          <div className="border rounded-lg p-4 space-y-4 bg-card">
            <h3 className="font-semibold">
              {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
            </h3>

            {!hasAny && (
              <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
            )}

            {dayTx.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Transações</p>
                <div className="space-y-1">
                  {dayTx.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={t.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                          {t.type === 'entrada' ? '↑' : '↓'}
                        </span>
                        <span>{t.description}</span>
                        <span className="text-xs text-muted-foreground">{t.category}</span>
                      </div>
                      <span className={cn(
                        'font-medium',
                        t.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {t.type === 'entrada' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dayFixed.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Contas Fixas (venc. dia {dayNum})</p>
                <div className="space-y-1">
                  {dayFixed.map((fe) => {
                    const isPaid = paidIds.has(fe.id)
                    return (
                      <div key={fe.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={isPaid ? 'text-green-600' : 'text-orange-600'}>
                            {isPaid ? '✓' : '○'}
                          </span>
                          <span>{fe.name}</span>
                          <span className="text-xs text-muted-foreground">{fe.category}</span>
                        </div>
                        <span className={cn('font-medium', isPaid ? 'text-green-600' : 'text-orange-600')}>
                          {formatCurrency(fe.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {daySavings.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Porquinho</p>
                <div className="space-y-1">
                  {daySavings.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-pink-500" />
                        <span>{s.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.type === 'deposito' ? 'Depósito' : 'Saque'}
                        </span>
                      </div>
                      <span className={cn(
                        'font-medium',
                        s.type === 'deposito' ? 'text-pink-600' : 'text-pink-400'
                      )}>
                        {s.type === 'deposito' ? '+' : '-'}{formatCurrency(s.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
