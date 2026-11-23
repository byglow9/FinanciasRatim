import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useArea } from '@/contexts/AreaContext'
import type { Transaction } from '@/types'
import { categoryDisplayName } from '@shared/core/categories.js'
import { formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'
import { EmptyState } from './EmptyState'

// Paleta Moeda para as fatias, na ordem da maior para a menor.
const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)', 'var(--color-chart-7)', 'var(--color-chart-8)']

interface CategoryPieChartProps {
  transactions: Transaction[]
  kind?: 'saida' | 'entrada'
  title: string
  // Nome do ciclo, para o nome acessível do gráfico.
  periodLabel: string
  emptyMessage?: string
}

interface Slice {
  name: string
  cents: number
}

// Gasto (ou receita) por categoria do ciclo escolhido. O nome vem de categoryDisplayName, o valor
// em centavos inteiros e o gráfico tem o mesmo dado em lista de texto logo abaixo.
export function CategoryPieChart({
  transactions,
  kind = 'saida',
  title,
  periodLabel,
  emptyMessage = 'Quando houver gastos ou receitas, os gráficos aparecem aqui.',
}: CategoryPieChartProps) {
  const { categoryDefs } = useArea()

  const slices = useMemo<Slice[]>(() => {
    const sums = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== kind) continue
      const name = categoryDisplayName(t, categoryDefs) || 'Sem categoria'
      sums.set(name, (sums.get(name) ?? 0) + toCents(t.amount))
    }
    return [...sums.entries()]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, 'pt-BR'))
  }, [transactions, kind, categoryDefs])

  const total = slices.reduce((sum, s) => sum + s.cents, 0)

  if (slices.length === 0) {
    return (
      <section className="rounded-[22px] bg-card p-4">
        <h2 className="font-display text-base font-bold">{title}</h2>
        <EmptyState title="Sem lançamentos neste ciclo" description={emptyMessage} />
      </section>
    )
  }

  const summary = slices
    .map((s) => `${s.name} ${Math.round((s.cents / total) * 100)}%, ${formatMoney(s.cents, { decimals: 'always' })}`)
    .join('; ')

  return (
    <section className="rounded-[22px] bg-card p-4">
      <h2 className="font-display text-base font-bold">{title}</h2>

      <div
        role="img"
        aria-label={`Rosca: ${title} em ${periodLabel}. ${summary}`}
        className="relative mx-auto mt-3 h-[190px] w-full max-w-[260px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Pie
              data={slices}
              dataKey="cents"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={0}
              stroke="var(--color-card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s, index) => (
                <Cell key={s.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-normal text-muted-foreground">Total</span>
          <span className="font-display text-base font-bold">{formatMoney(total, { decimals: 'always' })}</span>
        </div>
      </div>

      <ul aria-label="Valores por categoria" className="mt-3">
        {slices.map((s, index) => (
          <li
            key={s.name}
            className="grid min-h-8 grid-cols-[10px_1fr_auto_auto] items-center gap-2 border-t border-border text-xs font-normal first:border-t-0"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="min-w-0 truncate">{s.name}</span>
            <span className="min-w-8 text-right text-muted-foreground">{Math.round((s.cents / total) * 100)}%</span>
            <b className="font-bold">{formatMoney(s.cents, { decimals: 'always' })}</b>
          </li>
        ))}
        <li className="grid min-h-8 grid-cols-[10px_1fr_auto] items-center gap-2 border-t border-border text-xs font-normal">
          <span aria-hidden="true" />
          <span>Total</span>
          <b className="font-bold">{formatMoney(total, { decimals: 'always' })}</b>
        </li>
      </ul>
    </section>
  )
}
