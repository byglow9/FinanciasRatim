import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import type { Transaction } from '@/types'
import type { Cycle } from '@shared/core/cycle.js'
import type { CyclePoint } from '@shared/core/series.js'
import { categoryDisplayName } from '@shared/core/categories.js'
import { MONTH_SHORT, formatMoney, plural, shortDate } from '@shared/core/format.js'
import { toCents, weeklySpendForCycle } from '@shared/core/ledger.js'

// Paleta Moeda: verde para saldo positivo, vermelho para negativo, barras de gasto em âmbar.
const OK_COLOR = 'var(--color-brand)'
const DANGER_COLOR = 'var(--color-danger)'
const OUT_COLOR = 'var(--color-warn)'

interface OverviewDashboardProps {
  transactions: Transaction[]
  cycle: Cycle
  savingsBalance: number
  piggyName: string
  // Série dos últimos ciclos (a página faz a consulta por janela larga com useCycleSeries).
  series: CyclePoint[]
  seriesLoading: boolean
  seriesError: Error | null
  onRetrySeries: () => void
}

// Rótulo curto do ciclo: o mês quando começa no dia 1; senão o dia e o mês de início.
function shortCycle(cycle: Cycle): string {
  const p = cycle.startParts
  return p.day === 1 ? MONTH_SHORT[p.month - 1] : (shortDate(p) as string)
}

// Visão geral do ciclo escolhido: gasto máximo por semana, saldo dos últimos ciclos, três maiores
// gastos e o saldo do Porquinho. Tudo em centavos inteiros e com o texto na própria tela.
export function OverviewDashboard({
  transactions,
  cycle,
  savingsBalance,
  piggyName,
  series,
  seriesLoading,
  seriesError,
  onRetrySeries,
}: OverviewDashboardProps) {
  const { categoryDefs } = useArea()
  const { now, isCurrent } = useCycle()

  const topCategories = useMemo(() => {
    const sums = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'saida') continue
      const name = categoryDisplayName(t, categoryDefs) || 'Sem categoria'
      sums.set(name, (sums.get(name) ?? 0) + toCents(t.amount))
    }
    return [...sums.entries()]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 3)
  }, [transactions, categoryDefs])

  const topMax = topCategories.reduce((max, c) => Math.max(max, c.cents), 0)

  // Gasto semanal pelo núcleo (D-12, FUND-06): janela exata do ciclo escolhido, relógio injetado.
  const weekly = weeklySpendForCycle({ transactions, cycle, now })
  const weeklyCents = toCents(weekly.maxWeeklySpend)

  const evoMax = series.reduce((max, p) => Math.max(max, Math.abs(p.saldoCents)), 0)
  const evoSummary = series
    .map((p) => `${shortCycle(p.cycle)}: ${formatMoney(p.saldoCents, { decimals: 'always' })}`)
    .join('; ')

  return (
    <div className="space-y-4">
      {isCurrent && (
        <section className="rounded-[22px] bg-card p-4">
          <h2 className="font-display text-base font-bold">Gasto máximo por semana</h2>
          <p
            className={
              weeklyCents < 0
                ? 'font-display text-[28px] font-bold leading-tight text-danger-ink'
                : 'font-display text-[28px] font-bold leading-tight'
            }
          >
            {formatMoney(weeklyCents, { decimals: 'always' })}
          </p>
          <p className="text-xs font-normal text-muted-foreground">
            Saldo do ciclo dividido em {plural(weekly.weeksRemaining, 'semana restante', 'semanas restantes')}
          </p>
        </section>
      )}

      <section className="rounded-[22px] bg-card p-4">
        <h2 className="font-display text-base font-bold">Saldo dos últimos ciclos</h2>
        {seriesError ? (
          <div className="mt-2">
            <Notice
              tone="danger"
              icon={AlertCircle}
              title="Não foi possível carregar os relatórios."
              action={
                <Button type="button" variant="outline" onClick={onRetrySeries}>
                  Tentar de novo
                </Button>
              }
            >
              Confira a conexão e tente de novo.
            </Notice>
          </div>
        ) : seriesLoading ? (
          <div role="status" aria-busy="true" className="mt-2">
            <span className="sr-only">Carregando os relatórios</span>
            <div aria-hidden="true" className="anim-pulse h-[96px] rounded-2xl bg-surface-2" />
          </div>
        ) : (
          <ul aria-label={`Saldo dos últimos ciclos. ${evoSummary}`} className="mt-2">
            {series.map((p) => {
              const width = evoMax > 0 ? Math.max(2, (Math.abs(p.saldoCents) / evoMax) * 100) : 0
              return (
                <li
                  key={p.key}
                  className="grid min-h-8 grid-cols-[40px_1fr_auto] items-center gap-2 border-t border-border text-xs font-normal first:border-t-0"
                >
                  <span className={p.key === cycle.key ? 'font-bold' : 'text-muted-foreground'}>{shortCycle(p.cycle)}</span>
                  <span aria-hidden="true" className="block h-2 rounded-full bg-track">
                    <span
                      className="block h-2 rounded-full"
                      style={{ width: `${width}%`, backgroundColor: p.saldoCents < 0 ? DANGER_COLOR : OK_COLOR }}
                    />
                  </span>
                  <b className="font-bold">{formatMoney(p.saldoCents, { decimals: 'always' })}</b>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[22px] bg-card p-4">
        <h2 className="font-display text-base font-bold">Três maiores gastos</h2>
        {topCategories.length === 0 ? (
          <p className="mt-2 text-xs font-normal text-muted-foreground">Nenhum gasto registrado neste ciclo.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {topCategories.map((c, index) => (
              <li key={c.name} className="text-xs font-normal">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {index + 1}. {c.name}
                  </span>
                  <b className="shrink-0 font-bold">{formatMoney(c.cents, { decimals: 'always' })}</b>
                </div>
                <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-track">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${topMax > 0 ? (c.cents / topMax) * 100 : 0}%`, backgroundColor: OUT_COLOR }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-[22px] bg-card p-4">
        <h2 className="font-display text-base font-bold">{piggyName}</h2>
        <p className="font-display text-base font-bold">{formatMoney(toCents(savingsBalance), { decimals: 'always' })}</p>
        <p className="text-xs font-normal text-muted-foreground">Saldo atual</p>
      </section>
    </div>
  )
}
