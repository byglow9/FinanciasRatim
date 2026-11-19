import { useId } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { IconCircle } from '@/components/ui/icon-circle'
import { Progress } from '@/components/ui/progress'
import { iconComponent } from '@/lib/categoryIcons'
import { BillRow } from '@/components/fixed-expenses/BillRow'
import type { BillGroup, CategorizedBillItem } from '@shared/core/billGroups.js'
import { categoryDisplayName, categoryIcon } from '@shared/core/categories.js'
import { formatMoney } from '@shared/core/format.js'

interface BillGroupCardProps {
  group: BillGroup
  togglePaid: (item: CategorizedBillItem) => Promise<boolean>
  /** Chaves `billId-ano-mês` com gravação em andamento. */
  pendingKeys: ReadonlySet<string>
  onSelect: (item: CategorizedBillItem) => void
}

/**
 * Cartão de uma categoria: ícone, nome, "X de Y pagas", subtotal e barra de progresso, sempre sobre
 * TODOS os itens do grupo (o filtro só esconde linhas), e abaixo as linhas na ordem do núcleo.
 */
export function BillGroupCard({ group, togglePaid, pendingKeys, onSelect }: BillGroupCardProps) {
  const { categoryDefs } = useArea()
  const titleId = useId()

  const first = group.allItems[0]
  const name = (first ? categoryDisplayName(first, categoryDefs) : '') || group.label
  const Icon = iconComponent(categoryIcon(group.def ?? { id: '' }))
  const legend = `${group.paidCount} de ${group.totalCount} ${group.totalCount === 1 ? 'paga' : 'pagas'}`

  return (
    <section aria-labelledby={titleId} className="rounded-[22px] bg-card p-3">
      <div className="flex items-center gap-3">
        <IconCircle icon={Icon} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} title={name} className="truncate text-base font-bold">
            {name}
          </h2>
          <p className="text-xs font-normal text-muted-foreground">{legend}</p>
        </div>
        <p className="num-display shrink-0 text-base font-bold">{formatMoney(group.subtotalCents)}</p>
      </div>

      <Progress
        className="mt-3"
        tone="ok"
        value={group.paidCount}
        max={group.totalCount}
        label={`Pagas em ${name}`}
      />

      <ul className="mt-3 space-y-2">
        {group.items.map((item) => {
          const key = `${item.billId}-${item.occurrence.year}-${item.occurrence.month}`
          return (
            <BillRow
              key={key}
              item={item}
              togglePaid={togglePaid}
              busy={pendingKeys.has(key)}
              onSelect={onSelect}
            />
          )
        })}
      </ul>
    </section>
  )
}
