import { CategoryPieChart } from './CategoryPieChart'
import type { Transaction } from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { categoryDisplayName } from '@shared/core/categories.js'

interface IncomeBreakdownProps {
  transactions: Transaction[]
  personName: string
}

export function IncomeBreakdown({ transactions, personName }: IncomeBreakdownProps) {
  const { categoryDefs } = useArea()
  const incomeData = transactions
    .filter((t) => t.type === 'entrada')
    .reduce<Record<string, number>>((acc, t) => {
      const name = categoryDisplayName(t, categoryDefs)
      acc[name] = (acc[name] ?? 0) + t.amount
      return acc
    }, {})

  const pieData = Object.entries(incomeData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <CategoryPieChart
      data={pieData}
      title={`Receitas por Categoria — ${personName}`}
      emptyMessage="Nenhuma receita registrada neste mes"
    />
  )
}
