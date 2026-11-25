import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'
import type { CardBillItem } from '@shared/core/cardBills.js'
import { formatMoney } from '@shared/core/format.js'

// Codigo ISO 4217. Intl.NumberFormat lanca com codigo mal formado e derrubaria a folha (T-06-41).
const CURRENCY_CODE = /^[A-Z]{3}$/

/** Valor original da compra internacional ("US$ 5,00"); null quando o codigo ou o valor nao servem. */
function originalValue(currency: Transaction['currency']): string | null {
  const code: unknown = currency?.code
  const cents: unknown = currency?.originalCents
  if (typeof code !== 'string' || !CURRENCY_CODE.test(code)) return null
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(cents / 100)
}

// Parcela so onde ha dado (CARD-05, D-06). A leitura pelo texto ainda e para reavaliar com uma compra
// parcelada real (D-07), por isso ela sempre sai marcada como estimada.
function installmentOf(value: Transaction['installment']): NonNullable<Transaction['installment']> | null {
  if (!value || !Number.isInteger(value.n) || !Number.isInteger(value.total)) return null
  return value
}

/**
 * Linha de uma compra (ou estorno) dentro da fatura: descricao, marcas textuais, valor em reais e,
 * na compra internacional, o valor original na moeda (D-08, D-10). So exibe o item do nucleo; todo
 * texto entra como texto React.
 */
export function BillPurchaseRow({ item }: { item: CardBillItem }) {
  const tx = item.tx as Partial<Transaction> | null | undefined
  const refund = item.cardKind === 'refund'
  const installment = installmentOf(tx?.installment)
  const original = originalValue(tx?.currency)
  const pending = item.cardStatus === 'pending'
  const manual = item.origin === 'manual'
  const hasMarks = refund || pending || manual || installment !== null
  // Estorno e credito: sinal de mais, como a entrada em Transacoes.
  const amount = refund
    ? `+${formatMoney(Math.abs(item.amountCents), { decimals: 'always' })}`
    : formatMoney(item.amountCents, { decimals: 'always' })

  return (
    <li className="flex min-h-11 items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="break-words text-base font-bold leading-snug">
          {item.description || (refund ? 'Estorno no cartão' : 'Compra no cartão')}
        </p>
        {hasMarks ? (
          <p className="mt-1 flex flex-wrap items-center gap-1">
            {refund ? <Chip tone="ok">Estorno</Chip> : null}
            {pending ? <Chip>Pendente</Chip> : null}
            {manual ? <Chip>Lançada por você</Chip> : null}
            {installment ? (
              <Chip>
                Parcela {installment.n}/{installment.total}
              </Chip>
            ) : null}
            {installment?.source === 'inferred' ? <Chip tone="muted">estimada</Chip> : null}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('num-display text-base font-bold', refund && 'text-ok-ink')}>{amount}</p>
        {original ? <p className="text-xs font-normal text-muted-foreground">{original}</p> : null}
      </div>
    </li>
  )
}
