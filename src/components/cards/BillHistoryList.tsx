import { ChevronRight } from 'lucide-react'
import { BillStatusChip } from '@/components/cards/BillStatusChip'
import { Progress } from '@/components/ui/progress'
import { billMonthLabel, moneyOrDash } from '@/lib/cardLabels'
import type { CardBill } from '@shared/core/cardBills.js'
import { plural } from '@shared/core/format.js'

interface BillHistoryListProps {
  bills: CardBill[]
  /** Quando passada, cada linha vira um botao que abre a fatura (ligado no plano 06-12). */
  onOpen?: (billMonth: string) => void
}

/**
 * Quanto foi gasto em cada fatura, mes a mes (D-10): todas as faturas que existem, sem limite de
 * meses (D-13), da mais nova para a mais antiga, com a barra proporcional a maior delas.
 */
export function BillHistoryList({ bills, onOpen }: BillHistoryListProps) {
  const ordered = [...bills].sort((a, b) => b.billMonth.localeCompare(a.billMonth))
  const biggest = ordered.reduce((max, b) => Math.max(max, b.totalCents), 0)

  return (
    <section aria-labelledby="bill-history-title" className="rounded-card bg-card p-4">
      <h2 id="bill-history-title" className="text-base font-bold">
        Faturas mês a mês
      </h2>

      {ordered.length === 0 ? (
        <p className="mt-2 text-xs font-normal text-muted-foreground">Ainda não há faturas para mostrar</p>
      ) : (
        <ul className="mt-2">
          {ordered.map((bill) => {
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-base font-bold">{billMonthLabel(bill.billMonth)}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <BillStatusChip status={bill.status} />
                    <span className="text-base font-bold">{moneyOrDash(bill.totalCents)}</span>
                    {onOpen ? <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                  </span>
                </div>
                <Progress
                  className="mt-2"
                  tone="neutral"
                  value={Math.max(bill.totalCents, 0)}
                  max={biggest > 0 ? biggest : 100}
                  label={`Fatura de ${billMonthLabel(bill.billMonth)}`}
                />
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  {plural(bill.count, 'compra', 'compras')}
                </p>
              </>
            )
            return (
              <li key={bill.billMonth} className="border-b border-border last:border-b-0">
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(bill.billMonth)}
                    aria-label={`Abrir a fatura de ${billMonthLabel(bill.billMonth)}`}
                    className="block min-h-11 w-full py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="min-h-11 py-3">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
