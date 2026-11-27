import { useMemo, useState } from 'react'
import { Check, Pencil, Plus } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleBills } from '@/hooks/useCycleBills'
import { useVintem } from '@/contexts/VintemContext'
import type { BillItem } from '@shared/core/budget.js'
import { useReadOnly } from '@/hooks/useReadOnly'
import { BillFormSheet, type BillFormData } from '@/components/fixed-expenses/BillFormSheet'
import { BillGroupCard } from '@/components/fixed-expenses/BillGroupCard'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { KpiTrio } from '@/components/ui/kpi-trio'
import { RowActionsSheet } from '@/components/ui/row-actions-sheet'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useToast } from '@/components/ui/toast'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'
import type { FixedExpense, PersonType } from '@/types'
import { billsSummary, groupBillsByCategory } from '@shared/core/billGroups.js'
import type { BillFilter, CategorizedBillItem } from '@shared/core/billGroups.js'
import { categoryDisplayName } from '@shared/core/categories.js'
import { compactMoney, formatMoney, plural } from '@shared/core/format.js'
import { zonedParts } from '@shared/core/time.js'

const itemKey = (item: CategorizedBillItem) => `${item.billId}-${item.occurrence.year}-${item.occurrence.month}`

export function FixedExpensesPage() {
  const { currentArea, categoryDefs } = useArea()
  const { now, bumpData } = useCycle()
  const { readOnly, guard } = useReadOnly()
  const { show } = useToast()

  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea
  const { items, expenses, loading, error, refetch, add, update, remove, togglePaid, pendingKeys } = useCycleBills(person)

  const { onBillPaid } = useVintem()

  // Marcar (nunca desmarcar) faz o porco comentar.
  const toggleAndSpeak = async (item: BillItem): Promise<boolean> => {
    const saved = await togglePaid(item)
    if (saved && !item.paid) onBillPaid({ name: item.name, valorCents: item.plannedCents })
    return saved
  }

  // O Sheet de ações fica montado enquanto a animação de saída roda, então a linha escolhida
  // continua guardada depois de fechar.
  const [selected, setSelected] = useState<CategorizedBillItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<BillFilter>('all')
  const [editing, setEditing] = useState<FixedExpense | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // Hoje em São Paulo: o estado de cada conta vem da comparação de datas de calendário.
  const todayParts = useMemo(() => zonedParts(now), [now])

  // O núcleo do ciclo não guarda categoria: acrescenta a da conta de origem a cada ocorrência.
  const categorized = useMemo<CategorizedBillItem[]>(() => {
    const byId = new Map(expenses.map((e) => [e.id, e]))
    return items.map((item) => {
      const expense = byId.get(item.billId)
      return { ...item, categoryId: expense?.categoryId, category: expense?.category }
    })
  }, [items, expenses])

  // A ordem dos grupos e das linhas vem só do núcleo; o filtro só esconde linhas e nunca reordena.
  const groups = useMemo(
    () => groupBillsByCategory(categorized, categoryDefs, filter),
    [categorized, categoryDefs, filter]
  )

  // Os três cartões são do ciclo inteiro, da mesma origem da Home; o filtro não os altera.
  const summary = useMemo(() => billsSummary(items), [items])
  const pendingCount = summary.count - summary.paidCount

  const select = (item: CategorizedBillItem) => {
    setSelected(item)
    setSheetOpen(true)
  }

  // Item vivo: depois de marcar, o Sheet que está saindo já mostra o estado novo.
  const current = selected ? (categorized.find((i) => itemKey(i) === itemKey(selected)) ?? selected) : null

  const toggleFromSheet = async (item: CategorizedBillItem) => {
    setSheetOpen(false)
    if (await toggleAndSpeak(item)) bumpData()
  }

  const openNew = () => {
    if (guard('editar')) return
    setEditing(null)
    setFormOpen(true)
  }

  const handleEdit = (item: CategorizedBillItem) => {
    if (guard('editar')) return
    setSheetOpen(false)
    setEditing(expenses.find((e) => e.id === item.billId) ?? null)
    setFormOpen(true)
  }

  const handleSave = async (data: BillFormData, id: string | null) => {
    if (id) await update(id, data)
    else await add(data)
    // WR-03: o gatilho mora na página, nunca no hook, para os avisos de limite rodarem de novo.
    bumpData()
    show(id ? 'Conta atualizada' : 'Conta cadastrada')
  }

  const handleDelete = async (item: CategorizedBillItem) => {
    if (guard('editar')) return
    await remove(item.billId)
    // WR-03: o gatilho mora na página, nunca no hook, para os avisos de limite rodarem de novo.
    bumpData()
    show('Conta apagada')
  }

  const exact = (cents: number) => formatMoney(cents, { decimals: 'always' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight">Contas fixas</h1>
        <button
          type="button"
          aria-label="Nova conta fixa"
          aria-disabled={readOnly ? true : undefined}
          onClick={openNew}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-action px-4 text-base font-bold text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Nova
        </button>
      </div>

      {!error && !loading ? (
        <KpiTrio
          variant="cards"
          items={[
            {
              id: 'total',
              label: 'Total mensal',
              display: compactMoney(summary.totalCents),
              exact: exact(summary.totalCents),
              support: plural(summary.count, 'conta', 'contas'),
            },
            {
              id: 'paid',
              label: 'Pagas',
              display: compactMoney(summary.paidCents),
              exact: exact(summary.paidCents),
              tone: 'ok',
              support: `${summary.paidCount} de ${summary.count}`,
            },
            {
              id: 'pending',
              label: 'Pendentes',
              display: compactMoney(summary.pendingCents),
              exact: exact(summary.pendingCents),
              support: plural(pendingCount, 'conta', 'contas'),
            },
          ]}
        />
      ) : null}

      {!error && !loading && summary.count > 0 ? (
        <SegmentedControl<BillFilter>
          ariaLabel="Filtrar contas"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'paid', label: 'Pagas' },
          ]}
        />
      ) : null}

      {error ? (
        <>
          <VintemEmpty pose="surpreso" />
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
        </>
      ) : loading ? (
        <div role="status" className="space-y-2">
          <span className="sr-only">Carregando as contas fixas</span>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="anim-pulse h-[120px] rounded-[22px] bg-card" />
          ))}
        </div>
      ) : summary.count === 0 ? (
        <div className="space-y-2">
          <VintemEmpty pose="neutro" />
          <p className="text-base font-bold">Nenhuma conta fixa neste ciclo</p>
          <p className="text-xs font-normal text-muted-foreground">
            Cadastre aluguel, internet e outras contas que se repetem todo mês.
          </p>
          <Button type="button" variant="outline" onClick={openNew}>
            Cadastrar a primeira
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="space-y-2">
          <p className="text-base font-bold">
            {filter === 'pending' ? 'Nenhuma conta pendente' : 'Nenhuma conta paga ainda'}
          </p>
          <Button type="button" variant="outline" onClick={() => setFilter('all')}>
            Ver todas
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <BillGroupCard
              key={group.key}
              group={group}
              todayParts={todayParts}
              togglePaid={toggleAndSpeak}
              pendingKeys={pendingKeys}
              onSelect={select}
            />
          ))}
        </div>
      )}

      <BillFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        person={person}
        bill={editing}
        onSave={handleSave}
      />

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
          { id: 'edit', label: 'Editar', icon: Pencil, onSelect: () => (current ? handleEdit(current) : undefined) },
        ]}
        deletion={
          current
            ? {
                question: `Apagar ${current.name}? Esta ação não pode ser desfeita.`,
                onConfirm: () => handleDelete(current),
              }
            : undefined
        }
      />
    </div>
  )
}
