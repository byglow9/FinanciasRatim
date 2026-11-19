import { useMemo } from 'react'
import { useArea } from '@/contexts/AreaContext'
import type { Transaction } from '@/types'
import { categoryDisplayName } from '@shared/core/categories.js'
import { formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'

// Paleta Moeda das fontes de entrada.
const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)', 'var(--color-chart-7)', 'var(--color-chart-8)']

interface IncomeBreakdownProps {
  transactions: Transaction[]
  personName: string
  periodLabel: string
}

// Composição das entradas do ciclo: barra única dividida por categoria e a mesma informação em
// lista de texto. O nome da categoria vem de categoryDisplayName; os valores, de centavos inteiros.
export function IncomeBreakdown({ transactions, personName, periodLabel }: IncomeBreakdownProps) {
  const { categoryDefs } = useArea()

  const parts = useMemo(() => {
    const sums = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'entrada') continue
      const name = categoryDisplayName(t, categoryDefs) || 'Sem categoria'
      sums.set(name, (sums.get(name) ?? 0) + toCents(t.amount))
    }
    return [...sums.entries()]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, 'pt-BR'))
  }, [transactions, categoryDefs])

  const total = parts.reduce((sum, p) => sum + p.cents, 0)

  if (parts.length === 0 || total <= 0) {
    return (
      <section className="rounded-[22px] bg-card p-4">
        <h2 className="font-display text-base font-bold">Composição das entradas</h2>
        <p className="mt-2 text-xs font-normal text-muted-foreground">Nenhuma entrada registrada neste ciclo.</p>
      </section>
    )
  }

  const summary = parts
    .map((p) => `${p.name} ${Math.round((p.cents / total) * 100)}%, ${formatMoney(p.cents, { decimals: 'always' })}`)
    .join('; ')

  return (
    <section className="rounded-[22px] bg-card p-4">
      <h2 className="font-display text-base font-bold">Composição das entradas</h2>

      <div
        role="img"
        aria-label={`Barra da composição das entradas de ${personName} em ${periodLabel}: ${summary}`}
        className="mt-3 flex h-4 overflow-hidden rounded-lg bg-track"
      >
        {parts.map((p, index) => (
          <span
            key={p.name}
            className="h-full"
            style={{ width: `${(p.cents / total) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }}
          />
        ))}
      </div>

      <ul aria-label="Valores das entradas" className="mt-3">
        {parts.map((p, index) => (
          <li
            key={p.name}
            className="grid min-h-8 grid-cols-[10px_1fr_auto_auto] items-center gap-2 border-t border-border text-xs font-normal first:border-t-0"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="min-w-0 truncate">{p.name}</span>
            <span className="min-w-8 text-right text-muted-foreground">{Math.round((p.cents / total) * 100)}%</span>
            <b className="font-bold">{formatMoney(p.cents, { decimals: 'always' })}</b>
          </li>
        ))}
        <li className="grid min-h-8 grid-cols-[10px_1fr_auto] items-center gap-2 border-t border-border text-xs font-normal">
          <span aria-hidden="true" />
          <span>Total de entradas</span>
          <b className="font-bold">{formatMoney(total, { decimals: 'always' })}</b>
        </li>
      </ul>
    </section>
  )
}
