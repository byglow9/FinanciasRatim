import { useState } from 'react'
import type { FixedExpense } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Check, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDate } from 'date-fns'

interface FixedExpenseListProps {
  expenses: FixedExpense[]
  onEdit: (expense: FixedExpense) => void
  onDelete: (id: string) => void
  onTogglePaid: (id: string, amount: number) => void
  isExpensePaid: (id: string) => boolean
  loading?: boolean
}

export function FixedExpenseList({
  expenses,
  onEdit,
  onDelete,
  onTogglePaid,
  isExpensePaid,
  loading,
}: FixedExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const today = getDate(new Date())

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  const getStatus = (expense: FixedExpense) => {
    const isPaid = isExpensePaid(expense.id)
    if (isPaid) return 'paid'
    if (expense.dueDay < today) return 'overdue'
    if (expense.dueDay <= today + 3) return 'due-soon'
    return 'pending'
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma conta fixa cadastrada
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => {
        const status = getStatus(expense)
        const isPaid = status === 'paid'

        return (
          <div
            key={expense.id}
            className={cn(
              'p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
              isPaid && 'opacity-60'
            )}
          >
            {/* Desktop layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button
                  variant={isPaid ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    'shrink-0',
                    isPaid && 'bg-green-600 hover:bg-green-700'
                  )}
                  onClick={() => onTogglePaid(expense.id, expense.amount)}
                >
                  <Check className="h-4 w-4" />
                </Button>

                <div className="min-w-0">
                  <p className={cn('font-medium truncate', isPaid && 'line-through')}>
                    {expense.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {expense.category}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Dia {expense.dueDay}</span>
                    </div>
                    {status === 'overdue' && !isPaid && (
                      <Badge variant="destructive" className="text-xs">
                        Vencida
                      </Badge>
                    )}
                    {status === 'due-soon' && !isPaid && (
                      <Badge variant="warning" className="text-xs">
                        Vence em breve
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="font-semibold">
                  {formatCurrency(expense.amount)}
                </span>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(expense)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(expense.id)}
                    disabled={deletingId === expense.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile layout */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Button
                    variant={isPaid ? 'default' : 'outline'}
                    size="icon"
                    className={cn(
                      'shrink-0 h-8 w-8',
                      isPaid && 'bg-green-600 hover:bg-green-700'
                    )}
                    onClick={() => onTogglePaid(expense.id, expense.amount)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <p className={cn('font-medium truncate text-sm', isPaid && 'line-through')}>
                    {expense.name}
                  </p>
                </div>
                <span className="font-semibold text-sm shrink-0">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {expense.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Dia {expense.dueDay}</span>
                  </div>
                  {status === 'overdue' && !isPaid && (
                    <Badge variant="destructive" className="text-xs">
                      Vencida
                    </Badge>
                  )}
                  {status === 'due-soon' && !isPaid && (
                    <Badge variant="warning" className="text-xs">
                      Vence em breve
                    </Badge>
                  )}
                </div>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(expense)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(expense.id)}
                    disabled={deletingId === expense.id}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
