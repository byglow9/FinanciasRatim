import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { IconCircle } from '@/components/ui/icon-circle'
import { iconComponent } from '@/lib/categoryIcons'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'
import { categoryDisplayName, categoryIcon } from '@shared/core/categories.js'
import { groupKeyOf } from '@shared/core/categoryOrder.js'
import { formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'

interface TransactionRowProps {
  transaction: Transaction
  onSelect: (transaction: Transaction) => void
}

/** Valor com sinal: saida com menos (U+2212), entrada com mais; sempre com centavos. */
function signedAmount(transaction: Pick<Transaction, 'type' | 'amount'>): string {
  const cents = toCents(transaction.amount)
  return transaction.type === 'entrada'
    ? `+${formatMoney(cents, { decimals: 'always' })}`
    : formatMoney(-cents, { decimals: 'always' })
}

/**
 * Linha de uma transacao: icone da categoria, descricao, categoria e valor com sinal.
 * Tocar abre as acoes (Editar e Apagar) no Sheet da pagina. Todo texto entra como texto React.
 */
export function TransactionRow({ transaction, onSelect }: TransactionRowProps) {
  const { categoryDefs } = useArea()
  const entrada = transaction.type === 'entrada'
  const def = groupKeyOf(transaction, categoryDefs).def ?? { id: '' }
  const Icon = iconComponent(categoryIcon(def))
  const DirectionIcon = entrada ? ArrowDownLeft : ArrowUpRight
  const categoryName = categoryDisplayName(transaction, categoryDefs)
  const description = transaction.description

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <IconCircle icon={Icon} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold" title={description}>
          {description}
        </span>
        <span className="block truncate text-xs font-normal text-muted-foreground">{categoryName}</span>
      </span>
      <span
        className={cn(
          'num-display flex shrink-0 items-center gap-1 text-base font-bold',
          entrada ? 'text-ok-ink' : 'text-foreground'
        )}
      >
        <DirectionIcon className="h-4 w-4" aria-hidden="true" />
        {signedAmount(transaction)}
      </span>
    </button>
  )
}
