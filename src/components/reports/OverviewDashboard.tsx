import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, PiggyBank, Target, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getTransactions, getAccumulatedBalance } from '@/services/transactions.service'
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { PersonType, Transaction, Goal } from '@/types'

interface OverviewDashboardProps {
  person: PersonType
  personName?: string
  transactions: Transaction[]
  goals: Goal[]
  savingsBalance: number
  piggyName: string
}

interface MiniEvolution {
  month: string
  saldo: number
  saldoAcumulado: number
}

export function OverviewDashboard({
  person,
  transactions,
  goals,
  savingsBalance,
  piggyName,
}: OverviewDashboardProps) {
  const [evolutionData, setEvolutionData] = useState<MiniEvolution[]>([])
  const [loadingEvolution, setLoadingEvolution] = useState(true)

  useEffect(() => {
    const fetchEvolution = async () => {
      setLoadingEvolution(true)
      try {
        const months = Array.from({ length: 4 }, (_, i) =>
          subMonths(new Date(), 3 - i)
        )

        const results = await Promise.all(
          months.map(async (m) => {
            const [txs, accumulated] = await Promise.all([
              getTransactions(person, m),
              getAccumulatedBalance(person, m),
            ])
            const entradas = txs
              .filter((t) => t.type === 'entrada')
              .reduce((sum, t) => sum + t.amount, 0)
            const saidas = txs
              .filter((t) => t.type === 'saida')
              .reduce((sum, t) => sum + t.amount, 0)

            return {
              month: format(m, 'MMM', { locale: ptBR }),
              saldo: entradas - saidas,
              saldoAcumulado: accumulated,
            }
          })
        )
        setEvolutionData(results)
      } finally {
        setLoadingEvolution(false)
      }
    }

    fetchEvolution()
  }, [person])

  const categoryData = transactions
    .filter((t) => t.type === 'saida')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount
      return acc
    }, {})

  const topCategories = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  const totalExpenses = topCategories.reduce((sum, c) => sum + c.value, 0)

  // Top 3 receitas
  const incomeData = transactions
    .filter((t) => t.type === 'entrada')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount
      return acc
    }, {})

  const topIncomes = Object.entries(incomeData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  const totalIncomes = topIncomes.reduce((sum, c) => sum + c.value, 0)

  const personGoals = goals.filter((g) => g.person === person)
  const totalGoalsTarget = personGoals.reduce((sum, g) => sum + g.targetAmount, 0)
  const totalGoalsCurrent = personGoals.reduce((sum, g) => sum + g.currentAmount, 0)
  const goalsProgress = totalGoalsTarget > 0 ? (totalGoalsCurrent / totalGoalsTarget) * 100 : 0

  const currentAccumulatedBalance = evolutionData.length > 0
    ? evolutionData[evolutionData.length - 1].saldoAcumulado
    : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Evolucao do Saldo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvolution ? (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={evolutionData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined ? formatCurrency(value) : ''
                  }
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Mensal"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="saldoAcumulado"
                  name="Total"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Top 3 Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCategories.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum gasto registrado
            </div>
          ) : (
            <div className="space-y-3">
              {topCategories.map((cat, i) => {
                const percentage = totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        {cat.name}
                      </span>
                      <span className="font-medium">{formatCurrency(cat.value)}</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Top 3 Receitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topIncomes.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma receita registrada
            </div>
          ) : (
            <div className="space-y-3">
              {topIncomes.map((cat, i) => {
                const percentage = totalIncomes > 0 ? (cat.value / totalIncomes) * 100 : 0
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        {cat.name}
                      </span>
                      <span className="font-medium">{formatCurrency(cat.value)}</span>
                    </div>
                    <Progress value={percentage} className="h-1.5 [&>div]:bg-green-500" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            Progresso das Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personGoals.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma meta cadastrada
            </div>
          ) : (
            <div className="space-y-3 h-[120px] flex flex-col justify-center">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {personGoals.length} {personGoals.length === 1 ? 'meta' : 'metas'}
                </span>
                <span className="font-medium">{goalsProgress.toFixed(0)}% concluido</span>
              </div>
              <Progress value={goalsProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(totalGoalsCurrent)}</span>
                <span>{formatCurrency(totalGoalsTarget)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Landmark className="h-4 w-4 text-purple-500" />
            Saldo Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[120px]">
            {loadingEvolution ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <p className={cn(
                  'text-2xl font-bold',
                  currentAccumulatedBalance >= 0 ? 'text-purple-500' : 'text-red-500'
                )}>
                  {formatCurrency(currentAccumulatedBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Patrimonio acumulado</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-pink-500" />
            {piggyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[120px]">
            <p className={cn(
              'text-2xl font-bold',
              savingsBalance >= 0 ? 'text-pink-500' : 'text-red-500'
            )}>
              {formatCurrency(savingsBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Saldo atual</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
