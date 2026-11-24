import { useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useLaunch } from '@/contexts/LaunchContext'
import { useCycleTransactions } from '@/hooks/useCycleTransactions'
import { useReadOnly } from '@/hooks/useReadOnly'
import { TransactionEditSheet, type TransactionEdit } from '@/components/transactions/TransactionEditSheet'
import { TransactionDayGroup } from '@/components/transactions/TransactionDayGroup'
import { TransactionFilters, type TypeFilter } from '@/components/transactions/TransactionFilters'
import { TransactionTotals } from '@/components/transactions/TransactionTotals'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { RowActionsSheet } from '@/components/ui/row-actions-sheet'
import { useToast } from '@/components/ui/toast'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'
import type { PersonType, Transaction } from '@/types'
import { categoryDisplayName } from '@shared/core/categories.js'
import { dayKeyOf, transactionDayGroups } from '@shared/core/dayKey.js'
import { categoriesPresent, filterTransactions } from '@shared/core/txFilter.js'
import { dayMonth, formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'
import { zonedParts } from '@shared/core/time.js'

export function TransactionsPage() {
  const { currentArea, categoryDefs } = useArea()
  const { now, bumpData, dataVersion } = useCycle()
  const { open: openLaunch } = useLaunch()
  const { readOnly, guard } = useReadOnly()
  const { show } = useToast()

  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea
  const { cycle, transactions, loading, error, update, remove, refetch, totalsCents, cardSpendCents, loadAccumulated } =
    useCycleTransactions(person)

  // O Sheet de acoes fica montado enquanto a animacao de saida roda, entao a linha escolhida
  // continua guardada mesmo depois de fechar.
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [categoryKey, setCategoryKey] = useState<string | null>(null)

  const todayKey = dayKeyOf(now)
  const categories = useMemo(() => categoriesPresent(transactions, categoryDefs), [transactions, categoryDefs])
  // Categoria que sumiu do ciclo (troca de pessoa ou de ciclo) deixa de filtrar.
  const activeCategory = categories.some((c) => c.key === categoryKey) ? categoryKey : null
  const filtered = useMemo(
    () =>
      filterTransactions(
        transactions,
        {
          type: type === 'all' ? undefined : type,
          categoryId: activeCategory ?? undefined,
          query,
        },
        categoryDefs
      ),
    [transactions, type, activeCategory, query, categoryDefs]
  )
  // Os totais do cartao sao do ciclo inteiro; so a lista segue o filtro.
  const groups = useMemo(() => transactionDayGroups(filtered), [filtered])

  const clearFilters = () => {
    setQuery('')
    setType('all')
    setCategoryKey(null)
  }

  const select = (transaction: Transaction) => {
    setSelected(transaction)
    setSheetOpen(true)
  }

  const handleEdit = (transaction: Transaction) => {
    if (guard('editar')) return
    setSheetOpen(false)
    setEditing(transaction)
    setEditOpen(true)
  }

  const handleSave = async (id: string, data: TransactionEdit) => {
    await update(id, data)
    // WR-03: o gatilho mora na pagina, nunca no hook.
    bumpData()
    show('Transação atualizada')
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

      {!error && !loading ? (
        <TransactionTotals
          key={`${person}:${cycle.key}`}
          totalsCents={totalsCents}
          cardSpendCents={cardSpendCents}
          loadAccumulated={loadAccumulated}
          dataVersion={dataVersion}
        />
      ) : null}

      {!error && !loading && transactions.length > 0 ? (
        <TransactionFilters
          query={query}
          onQueryChange={setQuery}
          type={type}
          onTypeChange={setType}
          categoryKey={activeCategory}
          onCategoryChange={setCategoryKey}
          categories={categories}
        />
      ) : null}

      {error ? (
        <>
          <VintemEmpty pose="surpreso" />
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
        </>
      ) : loading ? (
        <div role="status" className="space-y-2">
          <span className="sr-only">Carregando transações</span>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="anim-pulse h-[68px] rounded-[22px] bg-card" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="space-y-2">
          <VintemEmpty pose="neutro" />
          <p className="text-base font-bold">Nenhuma transação neste ciclo</p>
          <p className="text-xs font-normal text-muted-foreground">
            Lance um gasto ou uma receita para ele aparecer aqui.
          </p>
          <Button type="button" variant="outline" onClick={() => openLaunch('gasto')}>
            Novo lançamento
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="space-y-2">
          <VintemEmpty pose="neutro" />
          <p className="text-base font-bold">Nada encontrado</p>
          <p className="text-xs font-normal text-muted-foreground">Tente outra palavra ou limpe os filtros.</p>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
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

      <TransactionEditSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        transaction={editing}
        onSave={handleSave}
      />

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
        actions={[{ id: 'edit', label: 'Editar', icon: Pencil, onSelect: () => (selected ? handleEdit(selected) : undefined) }]}
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
