import { Check } from 'lucide-react'
import { useCycle } from '@/contexts/CycleContext'
import { useReadOnly } from '@/hooks/useReadOnly'
import { Chip } from '@/components/ui/chip'
import { SquareCheck } from '@/components/ui/square-check'
import { cn } from '@/lib/utils'
import { billStatus, billSupportText } from '@shared/core/billGroups.js'
import type { BillStatus, CategorizedBillItem } from '@shared/core/billGroups.js'
import type { DateParts } from '@shared/core/cycle.js'
import { formatMoney } from '@shared/core/format.js'

interface BillRowProps {
  item: CategorizedBillItem
  /** Hoje em São Paulo: o estado da conta sai da comparação de datas de calendário. */
  todayParts: DateParts
  /** Marca ou desmarca a ocorrência; verdadeiro quando a mudança foi gravada. */
  togglePaid: (item: CategorizedBillItem) => Promise<boolean>
  /** Gravação em andamento para esta ocorrência (chave billId-ano-mês). */
  busy: boolean
  /** Abre o Sheet de ações da página. */
  onSelect: (item: CategorizedBillItem) => void
}

// Linha tingida por estado (D-15): vencida em vermelho claro; hoje e em breve em laranja claro.
const ROW_TINT: Record<BillStatus, string> = {
  paid: 'bg-surface-2',
  pending: 'bg-surface-2',
  overdue: 'bg-bill-od-bg',
  today: 'bg-bill-soon-bg',
  soon: 'bg-bill-soon-bg',
}

const SUPPORT_TONE: Record<BillStatus, string> = {
  paid: 'text-muted-foreground',
  pending: 'text-muted-foreground',
  overdue: 'text-rhythm-4-fg',
  today: 'text-rhythm-3-fg',
  soon: 'text-rhythm-3-fg',
}

/** Chip de estado com texto, para o estado nunca depender só de cor. */
function StatusChip({ status }: { status: BillStatus }) {
  if (status === 'paid') {
    return (
      <Chip tone="ok" icon={Check}>
        pago
      </Chip>
    )
  }
  if (status === 'pending') return null
  const overdue = status === 'overdue'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-chip px-3 py-1 text-xs font-bold',
        overdue ? 'bg-rhythm-4-bg text-rhythm-4-fg' : 'bg-rhythm-3-bg text-rhythm-3-fg'
      )}
    >
      {overdue ? 'vencida' : status === 'today' ? 'hoje' : 'em breve'}
    </span>
  )
}

/**
 * Linha de uma conta fixa: caixa quadrada de 44px à esquerda e, no resto, um botão que abre as
 * ações. Marcar e desmarcar são diretos, sem aviso e sem Desfazer (D-05). A ordem das linhas vem
 * só de groupBillsByCategory: nada aqui reordena por pago. Todo texto entra como texto React.
 */
export function BillRow({ item, todayParts, togglePaid, busy, onSelect }: BillRowProps) {
  const { guard } = useReadOnly()
  const { bumpData } = useCycle()

  const status = billStatus(item.occurrence, item.paid, todayParts)
  const support = billSupportText(item.occurrence, status, todayParts)

  const handleToggle = async () => {
    if (guard('editar')) return
    const saved = await togglePaid(item)
    // WR-03: o gatilho mora na tela, nunca no hook, para os avisos de limite rodarem de novo.
    if (saved) bumpData()
  }

  return (
    <li className={cn('grid grid-cols-[44px_1fr] items-center rounded-2xl py-1 pr-3 pl-1', ROW_TINT[status])}>
      <SquareCheck
        checked={item.paid}
        busy={busy}
        label={`Marcar ${item.name} como paga`}
        onChange={() => void handleToggle()}
      />
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl py-1 pl-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            title={item.name}
            className={cn(
              'min-w-0 flex-1 truncate text-base font-bold',
              item.paid && 'text-muted-foreground line-through'
            )}
          >
            {item.name}
          </span>
          <StatusChip status={status} />
          <span className="num-display shrink-0 text-base font-bold">{formatMoney(item.costCents)}</span>
        </span>
        <span className={cn('inline-flex items-center gap-1 text-xs font-normal', SUPPORT_TONE[status])}>
          {status === 'paid' ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
          {support}
        </span>
      </button>
    </li>
  )
}
