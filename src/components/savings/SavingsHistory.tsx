import { ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { SavingsTransaction } from '@/types'

interface SavingsHistoryProps {
  transactions: SavingsTransaction[]
  onDelete: (id: string) => void
  loading?: boolean
}

export function SavingsHistory({ transactions, onDelete, loading }: SavingsHistoryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Carregando...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Nenhuma movimentacao encontrada
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {t.type === 'deposito' ? (
              <ArrowDownCircle className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{t.description}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {t.person} · {formatDate(t.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={cn(
                'font-semibold text-sm',
                t.type === 'deposito' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {t.type === 'deposito' ? '+' : '-'}{formatCurrency(t.amount)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(t.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
