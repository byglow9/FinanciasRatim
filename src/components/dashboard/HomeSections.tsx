import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useToast } from '@/components/ui/toast'
import { LimitsList } from '@/components/limits/LimitRow'
import { FixedMonthCard } from '@/components/dashboard/FixedMonthCard'
import { MonthInOneCard } from '@/components/dashboard/MonthInOneCard'
import { markAsPaid } from '@/services/fixedExpenses.service'
import type { BillItem, BudgetView } from '@shared/core/budget.js'
import type { Cycle } from '@shared/core/cycle.js'
import { fromCents } from '@shared/core/ledger.js'

interface HomeSectionsProps {
  view: BudgetView | null
  cycle: Cycle
  loading: boolean
  refetch: () => Promise<void>
  /** Id da linha de limite (`cat-{id}`) que abre expandida, vindo do hash da URL. */
  expandId?: string
}

/**
 * As três seções da Home sobre a BudgetView (D-19, D-24): O mês em uma conta, Limites do mês
 * (todas as linhas e o Gasto geral, D-04) e Contas fixas do mês. Só exibe o que o núcleo
 * entrega; o único gesto é o "Marcar pago" manual, que nunca cria lançamento (CENT-06, REV-03).
 */
export function HomeSections({ view, cycle, loading, refetch, expandId }: HomeSectionsProps) {
  const { categoryDefs } = useArea()
  const { bumpData } = useCycle()
  const { readOnly, guard } = useReadOnly()
  const { show } = useToast()
  // WR-07: chaves `billId-ano-mes` em gravacao. Declarado ANTES do retorno antecipado (regra dos hooks).
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(() => new Set())

  if (!view) {
    // Carregando: blocos neutros, nunca número nem "R$ 0". Sem view e sem carregar, o erro é da página.
    if (!loading) return null
    return (
      <div className="space-y-4" aria-hidden="true">
        {[176, 288, 144].map((h) => (
          <div key={h} className="anim-pulse rounded-[22px] bg-card" style={{ height: h }} />
        ))}
      </div>
    )
  }

  const onMarkPaid = async (item: BillItem) => {
    if (guard('editar')) return
    const key = `${item.billId}-${item.occurrence.year}-${item.occurrence.month}`
    if (pendingKeys.has(key)) return
    setPendingKeys((prev) => new Set(prev).add(key))
    try {
      await markAsPaid(item.billId, item.occurrence.month, item.occurrence.year, fromCents(item.plannedCents))
      await refetch()
      bumpData()
      show(`Marcado como pago: ${item.name}`, { detail: 'O Pode gastar não muda.' })
    } catch {
      show('Não foi possível marcar como pago. Tente de novo.')
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      <MonthInOneCard monthInOne={view.monthInOne} income={view.income} cycleEnd={cycle.endParts} />
      <LimitsList
        id="lm"
        rows={view.spend.rows}
        generalCents={view.spend.generalCents}
        generalByCategory={view.spend.generalByCategory}
        categoryDefs={categoryDefs}
        expandId={expandId}
        showEditLink
        neutralOk={view.verdictSuppressed}
      />
      <FixedMonthCard
        bills={view.bills}
        readOnly={readOnly}
        pendingKeys={pendingKeys}
        onMarkPaid={(item) => void onMarkPaid(item)}
      />
    </div>
  )
}
