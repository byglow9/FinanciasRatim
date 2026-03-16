import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { getTransactions, getAccumulatedBalance } from '@/services/transactions.service'
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from './EmptyState'
import type { PersonType } from '@/types'

interface MonthlyEvolution {
  month: string
  entradas: number
  saidas: number
  saldo: number
  saldoAcumulado: number
}

interface MonthlyEvolutionChartProps {
  person: PersonType
  personName: string
}

export function MonthlyEvolutionChart({ person, personName }: MonthlyEvolutionChartProps) {
  const [period, setPeriod] = useState<string>('6')
  const [data, setData] = useState<MonthlyEvolution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const monthCount = parseInt(period)
        const months = Array.from({ length: monthCount }, (_, i) =>
          subMonths(new Date(), monthCount - 1 - i)
        )

        const results = await Promise.all(
          months.map(async (m) => {
            const [transactions, accumulated] = await Promise.all([
              getTransactions(person, m),
              getAccumulatedBalance(person, m),
            ])
            const entradas = transactions
              .filter((t) => t.type === 'entrada')
              .reduce((sum, t) => sum + t.amount, 0)
            const saidas = transactions
              .filter((t) => t.type === 'saida')
              .reduce((sum, t) => sum + t.amount, 0)

            return {
              month: format(m, 'MMM', { locale: ptBR }),
              entradas,
              saidas,
              saldo: entradas - saidas,
              saldoAcumulado: accumulated,
            }
          })
        )
        setData(results)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period, person])

  const hasData = data.some((m) => m.entradas > 0 || m.saidas > 0)

  return (
    <Card>
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
        <CardTitle className="text-sm sm:text-base">Evolucao Mensal — {personName}</CardTitle>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-full sm:w-[110px]"
        >
          <option value="3">3 meses</option>
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : !hasData ? (
          <EmptyState
            title="Sem dados"
            description="Nenhuma transacao registrada no periodo"
          />
        ) : (
          <div className="h-[220px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" className="capitalize" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} width={50} />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined ? formatCurrency(value) : ''
                  }
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  name="Saidas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo Mensal"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="saldoAcumulado"
                  name="Saldo Total"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
