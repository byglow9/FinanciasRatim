import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useSavings } from '@/hooks/useSavings'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { useArea } from '@/contexts/AreaContext'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getDate } from 'date-fns'

export function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const { settings } = useArea()

  const ele = useTransactions('ele', selectedMonth)
  const ela = useTransactions('ela', selectedMonth)
  const eleFixed = useFixedExpenses('ele', selectedMonth)
  const elaFixed = useFixedExpenses('ela', selectedMonth)
  const savings = useSavings()

  const today = getDate(new Date())

  const upcomingExpenses = [
    ...eleFixed.expenses.filter((e) => {
      if (!e.isActive) return false
      if (eleFixed.isExpensePaid(e.id)) return false
      const daysUntilDue = e.dueDay - today
      return daysUntilDue >= 0 && daysUntilDue <= settings.daysBeforeDueDate
    }),
    ...elaFixed.expenses.filter((e) => {
      if (!e.isActive) return false
      if (elaFixed.isExpensePaid(e.id)) return false
      const daysUntilDue = e.dueDay - today
      return daysUntilDue >= 0 && daysUntilDue <= settings.daysBeforeDueDate
    }),
  ]

  const chartData = [
    {
      name: 'Entradas',
      [settings.tabNames.area1]: ele.totals.entradas,
      [settings.tabNames.area2]: ela.totals.entradas,
    },
    {
      name: 'Saidas',
      [settings.tabNames.area1]: ele.totals.saidas,
      [settings.tabNames.area2]: ela.totals.saidas,
    },
    {
      name: 'Saldo',
      [settings.tabNames.area1]: Math.max(0, ele.totals.saldo),
      [settings.tabNames.area2]: Math.max(0, ela.totals.saldo),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visao geral das financas</p>
        </div>
        <MonthSelector selectedDate={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {upcomingExpenses.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base text-orange-700">
                Contas proximas do vencimento
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {upcomingExpenses.map((e) => (
                <Badge
                  key={e.id}
                  variant="outline"
                  className="border-orange-300 text-orange-700"
                >
                  {e.name} — vence dia {e.dueDay} ({formatCurrency(e.amount)})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{settings.tabNames.area1}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(ele.totals.entradas)}
                </p>
              </div>
              <div className="text-center">
                <TrendingDown className="h-4 w-4 text-red-600 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Saidas</p>
                <p className="text-sm font-bold text-red-600">
                  {formatCurrency(ele.totals.saidas)}
                </p>
              </div>
              <div className="text-center">
                <Wallet className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p
                  className={`text-sm font-bold ${ele.totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(ele.totals.saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{settings.tabNames.area2}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(ela.totals.entradas)}
                </p>
              </div>
              <div className="text-center">
                <TrendingDown className="h-4 w-4 text-red-600 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Saidas</p>
                <p className="text-sm font-bold text-red-600">
                  {formatCurrency(ela.totals.saidas)}
                </p>
              </div>
              <div className="text-center">
                <Wallet className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p
                  className={`text-sm font-bold ${ela.totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(ela.totals.saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <PiggyBank className="h-5 w-5 text-pink-500" />
          <CardTitle className="text-base">{settings.tabNames.piggy}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-pink-600">
            {formatCurrency(savings.balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Saldo atual da poupanca</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Comparativo: {settings.tabNames.area1} vs {settings.tabNames.area2}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Bar dataKey={settings.tabNames.area1} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey={settings.tabNames.area2} fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
