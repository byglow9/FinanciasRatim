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
      <div className="flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visao geral das financas</p>
        </div>
        <MonthSelector selectedDate={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {upcomingExpenses.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2 pt-3 px-4">
            <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
            <CardTitle className="text-sm font-semibold text-orange-700">
              Contas proximas do vencimento
            </CardTitle>
            <Badge className="ml-auto bg-orange-200 text-orange-800 hover:bg-orange-200">
              {upcomingExpenses.length}
            </Badge>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="divide-y divide-orange-100">
              {upcomingExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-orange-900">{e.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-orange-500">dia {e.dueDay}</span>
                    <span className="text-sm font-semibold text-orange-800">
                      {formatCurrency(e.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="px-3 pt-3 pb-0 sm:px-6 sm:pt-6">
            <CardTitle className="text-base">{settings.tabNames.area1}</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-3 gap-1 sm:gap-3">
              <div className="text-center">
                <TrendingUp className="hidden sm:block h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">Entradas</p>
                <p className="text-[10px] sm:text-sm font-bold text-green-600 leading-tight">
                  {formatCurrency(ele.totals.entradas)}
                </p>
              </div>
              <div className="text-center">
                <TrendingDown className="hidden sm:block h-4 w-4 text-red-600 mx-auto mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">Saidas</p>
                <p className="text-[10px] sm:text-sm font-bold text-red-600 leading-tight">
                  {formatCurrency(ele.totals.saidas)}
                </p>
              </div>
              <div className="text-center">
                <Wallet className="hidden sm:block h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">Saldo</p>
                <p
                  className={`text-[10px] sm:text-sm font-bold leading-tight ${ele.totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(ele.totals.saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 pt-3 pb-0 sm:px-6 sm:pt-6">
            <CardTitle className="text-base">{settings.tabNames.area2}</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-3 gap-1 sm:gap-3">
              <div className="text-center">
                <TrendingUp className="hidden sm:block h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">Entradas</p>
                <p className="text-[10px] sm:text-sm font-bold text-green-600 leading-tight">
                  {formatCurrency(ela.totals.entradas)}
                </p>
              </div>
              <div className="text-center">
                <TrendingDown className="hidden sm:block h-4 w-4 text-red-600 mx-auto mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">Saidas</p>
                <p className="text-[10px] sm:text-sm font-bold text-red-600 leading-tight">
                  {formatCurrency(ela.totals.saidas)}
                </p>
              </div>
              <div className="text-center">
                <Wallet className="hidden sm:block h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">Saldo</p>
                <p
                  className={`text-[10px] sm:text-sm font-bold leading-tight ${ela.totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}
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
