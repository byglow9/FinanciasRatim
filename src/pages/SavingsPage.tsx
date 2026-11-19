import { useMemo, useState } from 'react'
import { PiggyBank as PiggyIcon, Plus } from 'lucide-react'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useSavings } from '@/hooks/useSavings'
import { PiggyBank } from '@/components/savings/PiggyBank'
import { SavingsForm } from '@/components/savings/SavingsForm'
import { SavingsHistory } from '@/components/savings/SavingsHistory'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { RowActionsSheet } from '@/components/ui/row-actions-sheet'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useToast } from '@/components/ui/toast'
import type { SavingsTransaction } from '@/types'
import { dayMonth, formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'
import { zonedParts } from '@shared/core/time.js'

type SavingsFilter = 'all' | 'deposito' | 'saque'

const KIND_LABEL: Record<SavingsTransaction['type'], string> = { deposito: 'Depósito', saque: 'Saque' }

export function SavingsPage() {
  const { transactions, loading, error, add, remove, refetch } = useSavings()
  const { readOnly, guard } = useReadOnly()
  const { show } = useToast()

  const [filter, setFilter] = useState<SavingsFilter>('all')
  // O Sheet de ações fica montado enquanto a animação de saída roda, então a linha escolhida
  // continua guardada depois de fechar.
  const [selected, setSelected] = useState<SavingsTransaction | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  // Depois da primeira carga, regravar e recarregar não troca a lista por blocos de carregamento.
  const [loadedOnce, setLoadedOnce] = useState(false)
  if (!loading && !loadedOnce) setLoadedOnce(true)
  const showLoading = loading && !loadedOnce

  // Totais em centavos inteiros: guardado, retirado e o saldo que sai dos dois.
  const { depositsCents, withdrawalsCents } = useMemo(() => {
    let deposits = 0
    let withdrawals = 0
    for (const t of transactions) {
      if (t.type === 'deposito') deposits += toCents(t.amount)
      else withdrawals += toCents(t.amount)
    }
    return { depositsCents: deposits, withdrawalsCents: withdrawals }
  }, [transactions])

  const visible = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  )

  const openNew = () => {
    if (guard('editar')) return
    setFormOpen(true)
  }

  const select = (transaction: SavingsTransaction) => {
    setSelected(transaction)
    setSheetOpen(true)
  }

  const handleSubmit = async (data: Omit<SavingsTransaction, 'id' | 'createdAt'>) => {
    await add(data)
    show('Movimentação salva')
  }

  const handleDelete = async (transaction: SavingsTransaction) => {
    if (guard('editar')) return
    await remove(transaction.id)
    show('Movimentação apagada')
  }

  const amountText = selected ? formatMoney(toCents(selected.amount), { decimals: 'always' }) : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight">Porquinho</h1>
        <Button
          size="circle"
          aria-label="Nova movimentação"
          aria-disabled={readOnly ? true : undefined}
          onClick={openNew}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <Notice
          tone="danger"
          title="Não foi possível carregar o Porquinho."
          action={
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      ) : showLoading ? (
        <div role="status" className="space-y-2">
          <span className="sr-only">Carregando o Porquinho</span>
          <div aria-hidden="true" className="anim-pulse h-[120px] rounded-[22px] bg-card" />
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="anim-pulse h-14 rounded-2xl bg-card" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <PiggyIcon className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-bold">Nenhuma movimentação ainda.</p>
          <p className="text-xs font-normal text-muted-foreground">
            Guarde um valor para começar o Porquinho.
          </p>
          <Button type="button" onClick={openNew}>
            Guardar o primeiro valor
          </Button>
        </div>
      ) : (
        <>
          <PiggyBank
            balanceCents={depositsCents - withdrawalsCents}
            depositsCents={depositsCents}
            withdrawalsCents={withdrawalsCents}
          />
          <SegmentedControl<SavingsFilter>
            ariaLabel="Filtrar movimentações"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tudo' },
              { value: 'deposito', label: 'Guardados' },
              { value: 'saque', label: 'Retirados' },
            ]}
          />
          <SavingsHistory transactions={visible} onSelect={select} />
        </>
      )}

      <SavingsForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit} />

      <RowActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={selected?.description ?? ''}
        subtitle={
          selected ? `${KIND_LABEL[selected.type]} · ${dayMonth(zonedParts(selected.date))}` : undefined
        }
        value={amountText}
        readOnly={readOnly}
        onBlocked={() => guard('editar')}
        actions={[]}
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
