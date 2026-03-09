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
import type { Transaction, FixedExpense, FixedExpensePayment, SavingsTransaction, GoalContribution, Goal } from '@/types'
import { formatCurrency, formatTime } from '@/lib/utils'
import { PiggyBank, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayEvent {
  type: 'transaction-entrada' | 'transaction-saida' | 'fixed' | 'savings' | 'goal'
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
  contributions: GoalContribution[]
  goals: Goal[]
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function MonthCalendar({ month, transactions, fixedExpenses, payments, savings, contributions, goals }: MonthCalendarProps) {
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

  // Map goal IDs to names
  const goalMap = new Map(goals.map((g) => [g.id, g.name]))

  // Get events for a given day
  function getEventsForDay(day: Date): DayEvent[] {
    const events: DayEvent[] = []

    // Transactions: group by type (entrada/saida separately)
    const dayTx = transactions.filter((t) => isSameDay(t.date, day))
    if (dayTx.length > 0) {
      const entradas = dayTx.filter(t => t.type === 'entrada')
      const saidas = dayTx.filter(t => t.type === 'saida')
      const totalEntradas = entradas.reduce((sum, t) => sum + t.amount, 0)
      const totalSaidas = saidas.reduce((sum, t) => sum + t.amount, 0)

      if (totalEntradas > 0) {
        events.push({ type: 'transaction-entrada', label: 'Entradas', amount: totalEntradas })
      }
      if (totalSaidas > 0) {
        events.push({ type: 'transaction-saida', label: 'Saídas', amount: totalSaidas })
      }
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

    // Goal contributions
    const dayContribs = contributions.filter((c) => isSameDay(c.date, day))
    if (dayContribs.length > 0) {
      const total = dayContribs.reduce((sum, c) => sum + c.amount, 0)
      events.push({ type: 'goal', label: 'Metas', amount: total })
    }

    return events
  }

  // Determine detail events for selected day
  function getDetailForDay(day: Date) {
    const dayTx = transactions.filter((t) => isSameDay(t.date, day))
    const dayNum = getDate(day)
    const dayFixed = fixedExpenses.filter((fe) => fe.dueDay === dayNum)
    const daySavings = savings.filter((s) => isSameDay(s.date, day))
    const dayContribs = contributions.filter((c) => isSameDay(c.date, day))
    return { dayTx, dayFixed, daySavings, dayContribs }
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
      <div className="grid grid-cols-7 gap-px sm:gap-1">
        {cells.map((day, idx) => {
          const inMonth = isSameMonth(day, month)
          const isSelected = selectedDay && isSameDay(day, selectedDay)
          const events = getEventsForDay(day)
          const entradaEvent = events.find((e) => e.type === 'transaction-entrada')
          const saidaEvent = events.find((e) => e.type === 'transaction-saida')
          const fixedEvents = events.filter((e) => e.type === 'fixed')
          const savingsEvent = events.find((e) => e.type === 'savings')
          const goalEvent = events.find((e) => e.type === 'goal')

          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={cn(
                'min-h-[52px] sm:min-h-[80px] p-0.5 sm:p-1 rounded border cursor-pointer transition-colors',
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

              {/* Mobile: colored dots */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {entradaEvent && (
                  <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-green-400" />
                )}
                {saidaEvent && (
                  <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-red-400" />
                )}
                {fixedEvents.slice(0, 2).map((fe, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      fe.paid ? 'bg-green-400' : 'bg-orange-400'
                    )}
                  />
                ))}
                {savingsEvent && (
                  <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-pink-400" />
                )}
                {goalEvent && (
                  <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-purple-400" />
                )}
              </div>

              {/* Desktop: text badges */}
              <div className="hidden sm:block space-y-0.5">
                {/* Entrada badge */}
                {entradaEvent && entradaEvent.amount !== undefined && (
                  <div className="text-[10px] rounded px-1 py-0.5 font-medium truncate bg-green-200 text-green-800">
                    +{formatCurrency(entradaEvent.amount)}
                  </div>
                )}
                {/* Saida badge */}
                {saidaEvent && saidaEvent.amount !== undefined && (
                  <div className="text-[10px] rounded px-1 py-0.5 font-medium truncate bg-red-200 text-red-800">
                    -{formatCurrency(saidaEvent.amount)}
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

                {/* Goal contribution */}
                {goalEvent && (
                  <div className="flex items-center gap-0.5 text-[10px] text-purple-600">
                    <Target className="h-3 w-3" />
                    <span className="truncate">+{goalEvent.amount !== undefined && formatCurrency(goalEvent.amount)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (() => {
        const { dayTx, dayFixed, daySavings, dayContribs } = getDetailForDay(selectedDay)
        const dayNum = getDate(selectedDay)
        const hasAny = dayTx.length > 0 || dayFixed.length > 0 || daySavings.length > 0 || dayContribs.length > 0
        return (
          <div className="border rounded-lg p-4 space-y-4 bg-card">
            <h3 className="font-semibold">
              {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
            </h3>

            {!hasAny && (
              <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
            )}

            {dayTx.length > 0 && (() => {
              const saldoDia = dayTx.reduce((sum, t) => {
                return t.type === 'entrada' ? sum + t.amount : sum - t.amount
              }, 0)
              return (
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
                          <span className="text-xs text-muted-foreground">{formatTime(t.date)}</span>
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
                  {/* Resumo do dia */}
                  <div className="mt-3 pt-3 border-t flex justify-between text-sm font-medium">
                    <span>Saldo do dia:</span>
                    <span className={saldoDia >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {saldoDia >= 0 ? '+' : ''}{formatCurrency(saldoDia)}
                    </span>
                  </div>
                </div>
              )
            })()}

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
                        <span className="text-xs text-muted-foreground">{formatTime(s.date)}</span>
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

            {dayContribs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Contribuições para Metas</p>
                <div className="space-y-1">
                  {dayContribs.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span>{goalMap.get(c.goalId) || 'Meta'}</span>
                        {c.description && (
                          <span className="text-xs text-muted-foreground">{c.description}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatTime(c.date)}</span>
                      </div>
                      <span className="font-medium text-purple-600">
                        +{formatCurrency(c.amount)}
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
