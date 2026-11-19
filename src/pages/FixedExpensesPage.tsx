import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleBills } from '@/hooks/useCycleBills'
import { useReadOnly } from '@/hooks/useReadOnly'
import { BillGroupCard } from '@/components/fixed-expenses/BillGroupCard'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { RowActionsSheet } from '@/components/ui/row-actions-sheet'
import type { PersonType } from '@/types'
import { groupBillsByCategory } from '@shared/core/billGroups.js'
import type { CategorizedBillItem } from '@shared/core/billGroups.js'
import { categoryDisplayName } from '@shared/core/categories.js'
import { formatMoney } from '@shared/core/format.js'

const itemKey = (item: CategorizedBillItem) => `${item.billId}-${item.occurrence.year}-${item.occurrence.month}`

export function FixedExpensesPage() {
  const { currentArea, categoryDefs } = useArea()
  const { bumpData } = useCycle()
  const { readOnly, guard } = useReadOnly()

  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea
  const { items, expenses, loading, error, refetch, togglePaid, pendingKeys } = useCycleBills(person)

  // O Sheet de ações fica montado enquanto a animação de saída roda, então a linha escolhida
  // continua guardada depois de fechar.
  const [selected, setSelected] = useState<CategorizedBillItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // O núcleo do ciclo não guarda categoria: acrescenta a da conta de origem a cada ocorrência.
  const categorized = useMemo<CategorizedBillItem[]>(() => {
    const byId = new Map(expenses.map((e) => [e.id, e]))
    return items.map((item) => {
      const expense = byId.get(item.billId)
      return { ...item, categoryId: expense?.categoryId, category: expense?.category }
    })
  }, [items, expenses])

  // A ordem dos grupos e das linhas vem só do núcleo; nada aqui reordena por pago.
  const groups = useMemo(() => groupBillsByCategory(categorized, categoryDefs, 'all'), [categorized, categoryDefs])

  const select = (item: CategorizedBillItem) => {
    setSelected(item)
    setSheetOpen(true)
  }

  // Item vivo: depois de marcar, o Sheet que está saindo já mostra o estado novo.
  const current = selected ? (categorized.find((i) => itemKey(i) === itemKey(selected)) ?? selected) : null

  const toggleFromSheet = async (item: CategorizedBillItem) => {
    setSheetOpen(false)
    if (await togglePaid(item)) bumpData()
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-bold leading-tight">Contas fixas</h1>

      {error ? (
        <Notice
          tone="danger"
          title="Não foi possível carregar as contas fixas."
          action={
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      ) : loading ? (
        <div role="status" className="space-y-2">
          <span className="sr-only">Carregando as contas fixas</span>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="anim-pulse h-[120px] rounded-[22px] bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <BillGroupCard
              key={group.key}
              group={group}
              togglePaid={togglePaid}
              pendingKeys={pendingKeys}
              onSelect={select}
            />
          ))}
        </div>
      )}

      <RowActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={current?.name ?? ''}
        subtitle={
          current
            ? `${categoryDisplayName(current, categoryDefs)} · dia ${current.occurrence.day}`
            : undefined
        }
        value={current ? formatMoney(current.costCents, { decimals: 'always' }) : undefined}
        readOnly={readOnly}
        onBlocked={() => guard('editar')}
        actions={[
          {
            id: 'toggle',
            label: current?.paid ? 'Desmarcar paga' : 'Marcar como paga',
            icon: Check,
            onSelect: () => (current ? toggleFromSheet(current) : undefined),
          },
        ]}
      />
    </div>
  )
}
