import { useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Transaction } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDayHeader(date: Date): string {
  if (isToday(date)) return 'Hoje'
  if (isYesterday(date)) return 'Ontem'
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
}

interface TransactionListProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  loading?: boolean
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  loading,
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
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

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma transacao encontrada
      </div>
    )
  }

  // Agrupa transações por dia
  const groups: { dateKey: string; date: Date; items: Transaction[] }[] = []
  for (const t of transactions) {
    const key = format(t.date, 'yyyy-MM-dd')
    const existing = groups.find((g) => g.dateKey === key)
    if (existing) {
      existing.items.push(t)
    } else {
      groups.push({ dateKey: key, date: t.date, items: [t] })
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.dateKey} className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground capitalize">
              {formatDayHeader(group.date)}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {group.items.map((transaction) => (
        <div
          key={transaction.id}
          className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          {/* Desktop layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={cn(
                  'p-2 rounded-full shrink-0',
                  transaction.type === 'entrada'
                    ? 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                )}
              >
                {transaction.type === 'entrada' ? (
                  <ArrowUpCircle className="h-5 w-5" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{transaction.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                  <span>{formatDateTime(transaction.date)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span
                className={cn(
                  'font-semibold',
                  transaction.type === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {transaction.type === 'entrada' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(transaction)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(transaction.id)}
                  disabled={deletingId === transaction.id}
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
                <div
                  className={cn(
                    'p-1.5 rounded-full shrink-0',
                    transaction.type === 'entrada'
                      ? 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                  )}
                >
                  {transaction.type === 'entrada' ? (
                    <ArrowUpCircle className="h-4 w-4" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4" />
                  )}
                </div>
                <p className="font-medium truncate text-sm">{transaction.description}</p>
              </div>
              <span
                className={cn(
                  'font-semibold text-sm shrink-0',
                  transaction.type === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {transaction.type === 'entrada' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {transaction.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDateTime(transaction.date)}</span>
              </div>
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(transaction)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDelete(transaction.id)}
                  disabled={deletingId === transaction.id}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
          ))}
        </div>
      ))}
    </div>
  )
}
