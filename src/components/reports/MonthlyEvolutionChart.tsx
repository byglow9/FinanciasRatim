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
import { getTransactions } from '@/services/transactions.service'
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from './EmptyState'
import type { PersonType } from '@/types'

interface MonthlyEvolution {
  month: string
  entradas: number
  saidas: number
  saldo: number
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
            const transactions = await getTransactions(person, m)
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
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Evolucao Mensal — {personName}</CardTitle>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-[110px]"
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" className="capitalize" />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? formatCurrency(value) : ''
                }
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="entradas"
                name="Entradas"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="saidas"
                name="Saidas"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
