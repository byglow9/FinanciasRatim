import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useToast } from '@/components/ui/toast'
import { LimitsList } from '@/components/limits/LimitRow'
import { CentralSummaryCard } from '@/components/dashboard/CentralSummaryCard'
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
}

/**
 * As quatro seções da Home sobre a BudgetView (D-19, D-24): O mês em uma conta, Limites do mês
 * (com o Gasto geral, D-04), resumo da Central e Contas fixas do mês. Só exibe o que o núcleo
 * entrega; o único gesto é o "Marcar pago" manual, que nunca cria lançamento (CENT-06, REV-03).
 */
export function HomeSections({ view, cycle, refetch }: HomeSectionsProps) {
  const { categoryDefs } = useArea()
  const { bumpData } = useCycle()
  const { readOnly, guard } = useReadOnly()
  const { show } = useToast()

  if (!view) return null

  const onMarkPaid = async (item: BillItem) => {
    if (guard('editar')) return
    try {
      await markAsPaid(item.billId, item.occurrence.month, item.occurrence.year, fromCents(item.plannedCents))
      await refetch()
      bumpData()
      show(`Marcado como pago: ${item.name}. O Pode gastar não muda, porque as fixas já estão descontadas.`)
    } catch {
      show('Não foi possível marcar como pago. Tente de novo.')
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
        max={6}
        showEditLink
        neutralOk={view.verdictSuppressed}
      />
      <CentralSummaryCard counts={view.counts} />
      <FixedMonthCard bills={view.bills} readOnly={readOnly} onMarkPaid={(item) => void onMarkPaid(item)} />
    </div>
  )
}
