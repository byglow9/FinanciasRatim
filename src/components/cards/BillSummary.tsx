import { Link } from 'react-router-dom'
import { CalendarClock, TriangleAlert } from 'lucide-react'
import { BillStatusChip } from '@/components/cards/BillStatusChip'
import { Notice } from '@/components/ui/notice'
import { billMonthLabel, dueText, moneyOrDash } from '@/lib/cardLabels'
import {
  cardBillStatus,
  closingPartsOf,
  duePartsOf,
  openBillMonth,
  type CardBill,
} from '@shared/core/cardBills.js'
import { dayMonth, formatMoney } from '@shared/core/format.js'

interface BillSummaryProps {
  /** Fatura atual do banco (balance da conta CREDIT, D-08); nulo se o banco nao entregou. */
  balanceCents: number | null
  /** Fatura aberta agrupada pelo nucleo; nula quando nao ha compra nela. */
  bill: CardBill | null
  closingDay: number | null
  dueDay: number | null
  /** Fatura do banco menos a soma das compras listadas (useCardView); nulo se desconhecida. */
  mismatchCents: number | null
  now: Date
}

function mismatchText(diff: number): string {
  const value = formatMoney(Math.abs(diff), { decimals: 'always' })
  if (diff > 0) {
    return `O banco informa ${value} a mais do que a soma das compras listadas. Pode haver compras anteriores à importação, que ainda não aparecem aqui.`
  }
  return `A soma das compras listadas está ${value} acima da fatura do banco. Pode haver compras ainda não mostradas pelo banco ou lançadas por você e ainda não casadas com o banco.`
}

/**
 * Fatura atual do cartao: valor do banco em destaque, status, fechamento e vencimento com os dias
 * para vencer. Sem as duas datas do dono nao ha status, so um aviso com o caminho para informa-las
 * (D-04, D-09). Quando a fatura do banco difere da soma das compras listadas, a diferenca aparece
 * em vez de ficar escondida (D-12).
 */
export function BillSummary({ balanceCents, bill, closingDay, dueDay, mismatchCents, now }: BillSummaryProps) {
  const hasDates = closingDay !== null && dueDay !== null
  const openMonth = hasDates ? openBillMonth(now, closingDay) : null
  const closeParts = openMonth ? closingPartsOf(openMonth, closingDay) : null
  const dueParts = openMonth ? duePartsOf(openMonth, closingDay, dueDay) : null
  const status = openMonth
    ? (bill?.status ??
      cardBillStatus({ billMonth: openMonth, totalCents: 0, now, closingDay, dueDay }).status)
    : null

  return (
    <section aria-label="Fatura atual" className="space-y-3 rounded-card bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-normal text-muted-foreground">
            Fatura atual{openMonth ? ` · ${billMonthLabel(openMonth)}` : ''}
          </p>
          <p className="text-[28px] font-bold leading-tight">{moneyOrDash(balanceCents)}</p>
        </div>
        <BillStatusChip status={status} className="shrink-0" />
      </div>

      {closeParts && dueParts ? (
        <div>
          <dl className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-base font-normal text-muted-foreground">Fecha dia {closeParts.day}</dt>
              <dd className="text-base font-bold">{dayMonth(closeParts)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-base font-normal text-muted-foreground">Vence dia {dueParts.day}</dt>
              <dd className="text-base font-bold">{dayMonth(dueParts)}</dd>
            </div>
          </dl>
          <p className="mt-2 flex items-center gap-2 text-xs font-normal text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {status === 'paga' ? 'Fatura paga' : dueText(dueParts, now)}
          </p>
        </div>
      ) : (
        <Notice
          tone="warn"
          icon={CalendarClock}
          title="Falta o fechamento e o vencimento"
          action={
            <Link
              to="/configuracoes#contas"
              className="inline-flex min-h-11 items-center text-base font-bold underline underline-offset-4"
            >
              Informar em Configurações
            </Link>
          }
        >
          Sem as duas datas a fatura aparece sem status. O banco não informa essas datas para este cartão.
        </Notice>
      )}

      {mismatchCents !== null && mismatchCents !== 0 ? (
        <Notice tone="warn" icon={TriangleAlert} title="A fatura do banco difere das compras listadas">
          {mismatchText(mismatchCents)}
        </Notice>
      ) : null}
    </section>
  )
}
