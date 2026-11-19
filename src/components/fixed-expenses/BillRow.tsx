import { useCycle } from '@/contexts/CycleContext'
import { useReadOnly } from '@/hooks/useReadOnly'
import { SquareCheck } from '@/components/ui/square-check'
import type { CategorizedBillItem } from '@shared/core/billGroups.js'
import { formatMoney } from '@shared/core/format.js'

interface BillRowProps {
  item: CategorizedBillItem
  /** Marca ou desmarca a ocorrência; verdadeiro quando a mudança foi gravada. */
  togglePaid: (item: CategorizedBillItem) => Promise<boolean>
  /** Gravação em andamento para esta ocorrência (chave billId-ano-mês). */
  busy: boolean
  /** Abre o Sheet de ações da página. */
  onSelect: (item: CategorizedBillItem) => void
}

/**
 * Linha de uma conta fixa: caixa quadrada de 44px à esquerda e, no resto, um botão que abre as
 * ações. Marcar e desmarcar são diretos, sem aviso e sem Desfazer (D-05). A ordem das linhas vem
 * só de groupBillsByCategory: nada aqui reordena por pago. Todo texto entra como texto React.
 */
export function BillRow({ item, togglePaid, busy, onSelect }: BillRowProps) {
  const { guard } = useReadOnly()
  const { bumpData } = useCycle()

  const handleToggle = async () => {
    if (guard('editar')) return
    const saved = await togglePaid(item)
    // WR-03: o gatilho mora na tela, nunca no hook, para os avisos de limite rodarem de novo.
    if (saved) bumpData()
  }

  return (
    <li className="grid grid-cols-[44px_1fr] items-center rounded-2xl bg-surface-2 py-1 pr-3 pl-1">
      <SquareCheck
        checked={item.paid}
        busy={busy}
        label={`Marcar ${item.name} como paga`}
        onChange={() => void handleToggle()}
      />
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex min-h-12 min-w-0 items-center gap-2 rounded-xl pl-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span
          title={item.name}
          className={
            item.paid
              ? 'min-w-0 flex-1 truncate text-base font-bold text-muted-foreground line-through'
              : 'min-w-0 flex-1 truncate text-base font-bold'
          }
        >
          {item.name}
        </span>
        <span className="num-display shrink-0 text-base font-bold">{formatMoney(item.costCents)}</span>
      </button>
    </li>
  )
}
