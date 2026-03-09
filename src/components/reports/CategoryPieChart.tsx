import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { DEFAULT_CATEGORIES } from '@/types'

const COLORS = DEFAULT_CATEGORIES.map((c) => c.color ?? '#64748b')

interface CategoryData {
  name: string
  value: number
}

interface CategoryPieChartProps {
  data: CategoryData[]
  title: string
  emptyMessage?: string
}

export function CategoryPieChart({
  data,
  title,
  emptyMessage = 'Nenhum dado registrado neste mes',
}: CategoryPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="Sem dados" description={emptyMessage} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6">
          <div className="relative w-full lg:w-1/2">
            <div className="h-[200px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      value !== undefined ? formatCurrency(value) : ''
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                <p className="text-sm sm:text-lg font-semibold">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 space-y-1 sm:space-y-2 max-h-[200px] sm:max-h-[280px] overflow-y-auto">
            {data.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1)
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs sm:text-sm truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs sm:text-sm font-medium">{formatCurrency(item.value)}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground ml-1 sm:ml-2">({percentage}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
