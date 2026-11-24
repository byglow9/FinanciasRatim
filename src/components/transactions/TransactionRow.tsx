import { ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Chip } from '@/components/ui/chip'
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

/** Marcas textuais do cartao: o dono ve a compra sem confundir com saida de dinheiro da conta (CARD-06). */
function cardMarks(transaction: Pick<Transaction, 'cardKind' | 'cardStatus'>): { label: string; tone: 'neutral' | 'muted' }[] {
  if (transaction.cardKind === 'purchase') {
    const marks: { label: string; tone: 'neutral' | 'muted' }[] = [{ label: 'Cartão', tone: 'neutral' }]
    if (transaction.cardStatus === 'pending') marks.push({ label: 'Pendente', tone: 'muted' })
    return marks
  }
  if (transaction.cardKind === 'payment') return [{ label: 'Pagamento de fatura', tone: 'neutral' }]
  if (transaction.cardKind === 'refund') return [{ label: 'Estorno no cartão', tone: 'neutral' }]
  return []
}

/**
 * Linha de uma transacao: icone da categoria, descricao, categoria, marcas do cartao e valor com sinal.
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
  const marks = cardMarks(transaction)

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
        {marks.length > 0 ? (
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {marks.map((mark) => (
              <Chip key={mark.label} tone={mark.tone} icon={mark.label === 'Cartão' ? CreditCard : undefined}>
                {mark.label}
              </Chip>
            ))}
          </span>
        ) : null}
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
