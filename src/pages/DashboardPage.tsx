import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useSavings } from '@/hooks/useSavings'
import { useArea } from '@/contexts/AreaContext'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Landmark,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const { settings } = useArea()

  const ele = useTransactions('ele', selectedMonth)
  const ela = useTransactions('ela', selectedMonth)
  const savings = useSavings()

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
      <div className="flex items-center justify-center sm:justify-between gap-4">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visao geral das financas</p>
        </div>
        <MonthSelector selectedDate={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="px-3 pt-3 pb-1 sm:px-6 sm:pt-6 sm:pb-0">
            <CardTitle className="text-base">{settings.tabNames.area1}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="text-center">
                <TrendingUp className="hidden sm:block h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
                <p className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(ele.totals.entradas)}
                </p>
              </div>
              <div className="text-center">
                <TrendingDown className="hidden sm:block h-4 w-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saidas</p>
                <p className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(ele.totals.saidas)}
                </p>
              </div>
              <div className="text-center">
                <Wallet className="hidden sm:block h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Mensal</p>
                <p className={`text-xs sm:text-sm font-bold ${ele.totals.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(ele.totals.saldo)}
                </p>
              </div>
              <div className="text-center">
                <Landmark className="hidden sm:block h-4 w-4 text-purple-600 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                <p className={`text-xs sm:text-sm font-bold ${ele.totals.saldoAcumulado >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(ele.totals.saldoAcumulado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 pt-3 pb-1 sm:px-6 sm:pt-6 sm:pb-0">
            <CardTitle className="text-base">{settings.tabNames.area2}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="text-center">
                <TrendingUp className="hidden sm:block h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
                <p className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(ela.totals.entradas)}
                </p>
              </div>
              <div className="text-center">
                <TrendingDown className="hidden sm:block h-4 w-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saidas</p>
                <p className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(ela.totals.saidas)}
                </p>
              </div>
              <div className="text-center">
                <Wallet className="hidden sm:block h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Mensal</p>
                <p className={`text-xs sm:text-sm font-bold ${ela.totals.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(ela.totals.saldo)}
                </p>
              </div>
              <div className="text-center">
                <Landmark className="hidden sm:block h-4 w-4 text-purple-600 mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                <p className={`text-xs sm:text-sm font-bold ${ela.totals.saldoAcumulado >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(ela.totals.saldoAcumulado)}
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
