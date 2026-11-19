import { useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useLaunch } from '@/contexts/LaunchContext'
import { useCycleTransactions } from '@/hooks/useCycleTransactions'
import { useReadOnly } from '@/hooks/useReadOnly'
import { TransactionDayGroup } from '@/components/transactions/TransactionDayGroup'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { RowActionsSheet } from '@/components/ui/row-actions-sheet'
import { useToast } from '@/components/ui/toast'
import type { PersonType, Transaction } from '@/types'
import { categoryDisplayName } from '@shared/core/categories.js'
import { dayKeyOf, transactionDayGroups } from '@shared/core/dayKey.js'
import { dayMonth, formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'
import { zonedParts } from '@shared/core/time.js'

export function TransactionsPage() {
  const { currentArea, categoryDefs } = useArea()
  const { now, bumpData } = useCycle()
  const { open: openLaunch } = useLaunch()
  const { readOnly, guard } = useReadOnly()
  const { show } = useToast()

  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea
  const { transactions, loading, error, remove, refetch } = useCycleTransactions(person)

  // O Sheet de acoes fica montado enquanto a animacao de saida roda, entao a linha escolhida
  // continua guardada mesmo depois de fechar.
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const todayKey = dayKeyOf(now)
  const groups = useMemo(() => transactionDayGroups(transactions), [transactions])

  const select = (transaction: Transaction) => {
    setSelected(transaction)
    setSheetOpen(true)
  }

  const handleEdit = () => {
    if (guard('editar')) return
    // O Sheet de edicao entra na Task 3; por ora so fecha o de acoes.
    setSheetOpen(false)
  }

  const handleDelete = async (transaction: Transaction) => {
    if (guard('editar')) return
    await remove(transaction.id)
    // WR-03: o gatilho mora na pagina, nunca no hook, para os avisos de limite rodarem de novo.
    bumpData()
    show('Transação apagada')
  }

  const amountText = selected ? formatMoney(toCents(selected.amount), { decimals: 'always' }) : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight">Transações</h1>
        <Button size="circle" aria-label="Nova transação" onClick={() => openLaunch('gasto')}>
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <Notice
          tone="danger"
          title="Não foi possível carregar as transações."
          action={
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      ) : loading ? (
        <p className="text-xs font-normal text-muted-foreground">Carregando transações</p>
      ) : groups.length === 0 ? (
        <p className="text-base font-bold">Nenhuma transação neste ciclo</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <TransactionDayGroup
              key={group.key}
              dayKey={group.key}
              todayKey={todayKey}
              items={group.items}
              netCents={group.netCents}
              onSelect={select}
            />
          ))}
        </div>
      )}

      <RowActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={selected?.description ?? ''}
        subtitle={
          selected
            ? `${categoryDisplayName(selected, categoryDefs)} · ${dayMonth(zonedParts(selected.date))}`
            : undefined
        }
        value={amountText}
        readOnly={readOnly}
        onBlocked={() => guard('editar')}
        actions={[{ id: 'edit', label: 'Editar', icon: Pencil, onSelect: handleEdit }]}
        deletion={
          selected
            ? {
                question: `Apagar ${selected.description}, ${amountText}? Esta ação não pode ser desfeita.`,
                onConfirm: () => handleDelete(selected),
              }
            : undefined
        }
      />
    </div>
  )
}
