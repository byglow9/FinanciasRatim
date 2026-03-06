import { useState, useEffect } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useTransactions } from '@/hooks/useTransactions'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { getTransactions } from '@/services/transactions.service'
import { subMonths } from 'date-fns'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'
import type { PersonType } from '@/types'
import { DEFAULT_CATEGORIES } from '@/types'

const COLORS = DEFAULT_CATEGORIES.map((c) => c.color ?? '#64748b')

interface MonthlyComparison {
  month: string
  ele: number
  ela: number
}

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState('categoria')
  const [monthlyData, setMonthlyData] = useState<MonthlyComparison[]>([])
  const [loadingComparativo, setLoadingComparativo] = useState(true)
  const { currentArea, settings } = useArea()

  const person: PersonType =
    currentArea === 'porquinho' ? 'ele' : (currentArea as PersonType)

  const { transactions } = useTransactions(person, selectedMonth)

  const categoryData = transactions
    .filter((t) => t.type === 'saida')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount
      return acc
    }, {})

  const pieData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  useEffect(() => {
    const fetchComparativo = async () => {
      setLoadingComparativo(true)
      try {
        const months = [subMonths(new Date(), 2), subMonths(new Date(), 1), new Date()]
        const results = await Promise.all(
          months.map(async (m) => {
            const [eleTx, elaTx] = await Promise.all([
              getTransactions('ele', m),
              getTransactions('ela', m),
            ])
            return {
              month: format(m, 'MMM', { locale: ptBR }),
              ele: eleTx
                .filter((t) => t.type === 'saida')
                .reduce((sum, t) => sum + t.amount, 0),
              ela: elaTx
                .filter((t) => t.type === 'saida')
                .reduce((sum, t) => sum + t.amount, 0),
            }
          })
        )
        setMonthlyData(results)
      } finally {
        setLoadingComparativo(false)
      }
    }

    fetchComparativo()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatorios</h1>
          <p className="text-muted-foreground">Analise seus gastos</p>
        </div>
        <MonthSelector selectedDate={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="categoria">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Gastos por Categoria — {currentArea === 'porquinho' ? 'Ele' : settings.tabNames[currentArea === 'ele' ? 'area1' : 'area2']}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Nenhum gasto registrado neste mes
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparativo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Gastos por Mes — {settings.tabNames.area1} vs {settings.tabNames.area2}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingComparativo ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Carregando...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" className="capitalize" />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend />
                    <Bar
                      dataKey="ele"
                      name={settings.tabNames.area1}
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="ela"
                      name={settings.tabNames.area2}
                      fill="#ec4899"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
