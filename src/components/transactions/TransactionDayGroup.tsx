import { TransactionRow } from '@/components/transactions/TransactionRow'
import type { Transaction } from '@/types'
import { dayHeading } from '@shared/core/dayKey.js'
import { formatMoney } from '@shared/core/format.js'

interface TransactionDayGroupProps {
  /** Chave YYYY-MM-DD do dia (fuso de Sao Paulo). */
  dayKey: string
  todayKey: string
  items: Transaction[]
  netCents: number
  onSelect: (transaction: Transaction) => void
}

/** Total do dia com sinal: menos (U+2212) quando negativo, mais quando positivo. */
function netText(netCents: number): string {
  const text = formatMoney(netCents, { decimals: 'always' })
  return netCents > 0 ? `+${text}` : text
}

/**
 * Um dia da lista: cabecalho de 32px com o titulo do dia e o total liquido do dia,
 * seguido das linhas de transacao.
 */
export function TransactionDayGroup({ dayKey, todayKey, items, netCents, onSelect }: TransactionDayGroupProps) {
  const heading = dayHeading(dayKey, todayKey)
  return (
    <section aria-label={heading}>
      <h2 className="flex min-h-8 items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
        <span className="min-w-0 truncate">{heading}</span>
        <span className="num-display shrink-0">{netText(netCents)}</span>
      </h2>
      <div className="space-y-2">
        {items.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}
