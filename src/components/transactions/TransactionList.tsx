import { useState } from 'react'
import type { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                'p-2 rounded-full shrink-0',
                transaction.type === 'entrada'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
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
                <span>{formatDate(transaction.date)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span
              className={cn(
                'font-semibold',
                transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'
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
      ))}
    </div>
  )
}
