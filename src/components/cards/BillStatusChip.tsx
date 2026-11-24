import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'
import { BILL_STATUS_LABEL } from '@/lib/cardLabels'
import type { CardBillStatus } from '@shared/core/cardBills.js'

const TONE_CLASS = {
  neutral: undefined,
  ok: undefined,
  warn: 'border-0 bg-warn-bg text-warn-ink',
  danger: 'border-0 bg-danger-bg text-danger-ink',
} as const

/**
 * Status da fatura em texto curto (aberta, fechada, paga, atrasada ou futura). A cor reforca,
 * mas o rotulo sempre aparece. Sem status (datas do dono ausentes) nada e exibido (D-04, D-09).
 */
export function BillStatusChip({ status, className }: { status: CardBillStatus | null; className?: string }) {
  if (!status) return null
  const { label, tone } = BILL_STATUS_LABEL[status]
  return (
    <Chip tone={tone === 'ok' ? 'ok' : 'neutral'} className={cn(TONE_CLASS[tone], className)}>
      {label}
    </Chip>
  )
}
