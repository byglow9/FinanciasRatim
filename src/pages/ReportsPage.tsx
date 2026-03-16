import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useTransactions } from '@/hooks/useTransactions'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { useGoals } from '@/hooks/useGoals'
import { useSavings } from '@/hooks/useSavings'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  SummaryCards,
  CategoryPieChart,
  ComparisonBarChart,
  MonthlyEvolutionChart,
  IncomeBreakdown,
  OverviewDashboard,
} from '@/components/reports'
import type { PersonType } from '@/types'

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState('visao-geral')
  const { currentArea, settings } = useArea()

  const person: PersonType =
    currentArea === 'porquinho' ? 'ele' : (currentArea as PersonType)

  const personName =
    currentArea === 'porquinho'
      ? 'Ele'
      : settings.tabNames[currentArea === 'ele' ? 'area1' : 'area2']

  const { transactions, totals } = useTransactions(person, selectedMonth)
  const { totals: fixedTotals } = useFixedExpenses(person, selectedMonth)
  const { goals } = useGoals()
  const { balance: savingsBalance } = useSavings()

  const categoryData = transactions
    .filter((t) => t.type === 'saida')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount
      return acc
    }, {})

  const pieData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center sm:justify-between gap-4">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold">Relatorios</h1>
          <p className="text-muted-foreground">Analise suas financas</p>
        </div>
        <MonthSelector selectedDate={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <SummaryCards
        entradas={totals.entradas}
        saidas={totals.saidas}
        saldo={totals.saldo}
        saldoAcumulado={totals.saldoAcumulado}
        contasFixas={{ pagas: fixedTotals.paidCount, total: fixedTotals.activeCount }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral" className="text-xs sm:text-sm">
            Visao Geral
          </TabsTrigger>
          <TabsTrigger value="categoria" className="text-xs sm:text-sm">
            Gastos
          </TabsTrigger>
          <TabsTrigger value="receitas" className="text-xs sm:text-sm">
            Receitas
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="text-xs sm:text-sm">
            Evolucao
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="text-xs sm:text-sm">
            Comparativo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-4">
          <OverviewDashboard
            person={person}
            personName={personName}
            transactions={transactions}
            goals={goals}
            savingsBalance={savingsBalance}
            piggyName={settings.tabNames.piggy}
          />
        </TabsContent>

        <TabsContent value="categoria" className="mt-4">
          <CategoryPieChart
            data={pieData}
            title={`Gastos por Categoria — ${personName}`}
            emptyMessage="Nenhum gasto registrado neste mes"
          />
        </TabsContent>

        <TabsContent value="receitas" className="mt-4">
          <IncomeBreakdown transactions={transactions} personName={personName} />
        </TabsContent>

        <TabsContent value="evolucao" className="mt-4">
          <MonthlyEvolutionChart person={person} personName={personName} />
        </TabsContent>

        <TabsContent value="comparativo" className="mt-4">
          <ComparisonBarChart
            area1Name={settings.tabNames.area1}
            area2Name={settings.tabNames.area2}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
