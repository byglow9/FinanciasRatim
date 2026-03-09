import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { getTransactions } from '@/services/transactions.service'
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from './EmptyState'

interface MonthlyData {
  month: string
  ele: number
  ela: number
}

interface ComparisonBarChartProps {
  area1Name: string
  area2Name: string
  type?: 'saida' | 'entrada'
}

export function ComparisonBarChart({
  area1Name,
  area2Name,
  type = 'saida',
}: ComparisonBarChartProps) {
  const [period, setPeriod] = useState<string>('3')
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'saida' | 'entrada'>(type)

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
            const [eleTx, elaTx] = await Promise.all([
              getTransactions('ele', m),
              getTransactions('ela', m),
            ])
            return {
              month: format(m, 'MMM', { locale: ptBR }),
              ele: eleTx
                .filter((t) => t.type === viewType)
                .reduce((sum, t) => sum + t.amount, 0),
              ela: elaTx
                .filter((t) => t.type === viewType)
                .reduce((sum, t) => sum + t.amount, 0),
            }
          })
        )
        setMonthlyData(results)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period, viewType])

  const totals = monthlyData.reduce(
    (acc, m) => ({
      ele: acc.ele + m.ele,
      ela: acc.ela + m.ela,
    }),
    { ele: 0, ela: 0 }
  )

  const hasData = monthlyData.some((m) => m.ele > 0 || m.ela > 0)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">
          {viewType === 'saida' ? 'Gastos' : 'Receitas'} por Mes — {area1Name} vs {area2Name}
        </CardTitle>
        <div className="flex gap-2">
          <Select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as 'saida' | 'entrada')}
            className="w-[120px]"
          >
            <option value="saida">Gastos</option>
            <option value="entrada">Receitas</option>
          </Select>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-[110px]"
          >
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : !hasData ? (
          <EmptyState
            title="Sem dados"
            description={`Nenhuma ${viewType === 'saida' ? 'saida' : 'entrada'} registrada no periodo`}
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthlyData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
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
                <Bar dataKey="ele" name={area1Name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ela" name={area2Name} fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{area1Name}</p>
                <p className="text-lg font-semibold text-blue-500">
                  {formatCurrency(totals.ele)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{area2Name}</p>
                <p className="text-lg font-semibold text-pink-500">
                  {formatCurrency(totals.ela)}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
