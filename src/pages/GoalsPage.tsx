import { useState } from 'react'
import { History, Pencil, PiggyBank, Plus, Target } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useGoals } from '@/hooks/useGoals'
import { useReadOnly } from '@/hooks/useReadOnly'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalDetailSheet } from '@/components/goals/GoalDetailSheet'
import { GoalForm, type GoalFormData } from '@/components/goals/GoalForm'
import { ContributionForm } from '@/components/goals/ContributionForm'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { RowActionsSheet } from '@/components/ui/row-actions-sheet'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { Goal, PersonType } from '@/types'
import { formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'

export function GoalsPage() {
  const { currentArea } = useArea()
  const { readOnly, guard } = useReadOnly()
  const { show } = useToast()

  // Porquinho nao tem metas proprias: a tela mostra as de "ele".
  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea
  const { goals, loading, error, add, update, remove, contribute, refetch } = useGoals(person)

  // O Sheet de acoes fica montado enquanto a animacao de saida roda, entao a meta escolhida
  // continua guardada (por id) depois de fechar.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [contributionOpen, setContributionOpen] = useState(false)
  const [contributingId, setContributingId] = useState<string | null>(null)

  // Meta viva: depois de aportar ou editar, o Sheet que esta saindo ja mostra o valor novo.
  const current = selectedId ? (goals.find((g) => g.id === selectedId) ?? null) : null
  const contributing = contributingId ? (goals.find((g) => g.id === contributingId) ?? null) : null

  // Perfil do parceiro: o Sheet de acoes so teria linhas bloqueadas, entao o toque abre o detalhe (leitura).
  const select = (goal: Goal) => {
    setSelectedId(goal.id)
    if (readOnly) setDetailOpen(true)
    else setSheetOpen(true)
  }

  const openDetail = (goal: Goal) => {
    setSelectedId(goal.id)
    setSheetOpen(false)
    setDetailOpen(true)
  }

  const openNew = () => {
    if (guard('editar')) return
    setEditing(null)
    setFormOpen(true)
  }

  const openContribution = (goal: Goal) => {
    if (guard('editar')) return
    setSheetOpen(false)
    setContributingId(goal.id)
    setContributionOpen(true)
  }

  const openEdit = (goal: Goal) => {
    if (guard('editar')) return
    setSheetOpen(false)
    setEditing(goal)
    setFormOpen(true)
  }

  const handleSave = async (data: GoalFormData, id: string | null) => {
    if (id) await update(id, data)
    else await add({ ...data, currentAmount: 0 })
    show('Meta salva')
  }

  const handleContribute = async (amount: number, description?: string) => {
    if (!contributing) return
    await contribute(contributing.id, amount, description)
    show('Aporte salvo')
  }

  const handleDelete = async (goal: Goal) => {
    if (guard('editar')) return
    await remove(goal.id)
    show('Meta apagada')
  }

  const showLoading = loading && goals.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight">Metas</h1>
        <Button
          type="button"
          size="circle"
          aria-label="Nova meta"
          aria-disabled={readOnly ? true : undefined}
          className={cn(readOnly && 'cursor-not-allowed opacity-60')}
          onClick={openNew}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <Notice
          tone="danger"
          title="Não foi possível carregar as metas."
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
          <span className="sr-only">Carregando as metas</span>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="anim-pulse h-[140px] rounded-[22px] bg-card" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Target className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-bold">Nenhuma meta ainda</p>
          <p className="text-xs font-normal text-muted-foreground">
            Crie uma meta e acompanhe os aportes do casal.
          </p>
          <Button type="button" onClick={openNew}>
            Criar a primeira meta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onOpen={select}
              onContribute={openContribution}
              readOnly={readOnly}
              onBlocked={() => guard('editar')}
            />
          ))}
        </div>
      )}

      <GoalForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        person={person}
        goal={editing}
        onSave={handleSave}
      />

      <ContributionForm
        open={contributionOpen}
        onClose={() => setContributionOpen(false)}
        goal={contributing}
        onSave={handleContribute}
      />

      <GoalDetailSheet open={detailOpen} onClose={() => setDetailOpen(false)} goal={current} />

      <RowActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={current?.name ?? ''}
        subtitle={
          current
            ? `${formatMoney(toCents(current.currentAmount), { decimals: 'always' })} de ${formatMoney(toCents(current.targetAmount), { decimals: 'always' })}`
            : undefined
        }
        readOnly={readOnly}
        onBlocked={() => guard('editar')}
        actions={
          current
            ? [
                ...(current.currentAmount < current.targetAmount
                  ? [
                      {
                        id: 'contribute',
                        label: 'Aportar',
                        icon: PiggyBank,
                        onSelect: () => openContribution(current),
                      },
                    ]
                  : []),
                { id: 'detail', label: 'Ver aportes', icon: History, onSelect: () => openDetail(current) },
                { id: 'edit', label: 'Editar', icon: Pencil, onSelect: () => openEdit(current) },
              ]
            : []
        }
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
