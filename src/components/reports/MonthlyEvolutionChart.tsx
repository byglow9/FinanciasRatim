import { useState } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useCycleSeries } from '@/hooks/useCycleSeries'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { PersonType } from '@/types'
import { MONTH_SHORT, formatMoney, shortDate } from '@shared/core/format.js'
import { EmptyState } from './EmptyState'

// Paleta Moeda: entradas no verde, saídas no âmbar.
const IN_COLOR = '#16a34a'
const OUT_COLOR = '#d97706'
const TICK = { fontSize: 12, fill: '#77746a' }

type Period = '3' | '6' | '12'
const PERIODS: { value: Period; label: string }[] = [
  { value: '3', label: '3' },
  { value: '6', label: '6' },
  { value: '12', label: '12' },
]

// Rótulo curto do eixo: o mês quando o ciclo começa no dia 1; senão o dia e o mês de início.
function shortCycle(cycle: { startParts: { day: number; month: number; year: number } }): string {
  const p = cycle.startParts
  return p.day === 1 ? MONTH_SHORT[p.month - 1] : (shortDate(p) as string)
}

// Marca do eixo vertical: reais inteiros abaixo de mil e milhares com "k" a partir daí.
function axisMoney(cents: number): string {
  const reais = Math.round(cents / 100)
  if (reais < 1000) return String(reais)
  return `${Math.round(reais / 100) / 10}k`.replace('.', ',')
}

interface MonthlyEvolutionChartProps {
  person: PersonType
  personName: string
}

// Evolução de entradas e saídas dos últimos ciclos (o ciclo escolhido no topo é o último). Uma
// consulta por janela larga (useCycleSeries); o mesmo dado aparece em tabela de texto.
export function MonthlyEvolutionChart({ person, personName }: MonthlyEvolutionChartProps) {
  const [period, setPeriod] = useState<Period>('6')
  const { series, loading, error, refetch } = useCycleSeries(person, Number(period))

  const hasData = series.some((p) => p.entradasCents > 0 || p.saidasCents > 0)

  const data = series.map((p) => ({
    key: p.key,
    label: shortCycle(p.cycle),
    entradas: p.entradasCents,
    saidas: p.saidasCents,
    saldo: p.saldoCents,
  }))

  const summary = data
    .map(
      (d) =>
        `${d.label}: entradas ${formatMoney(d.entradas, { decimals: 'always' })}, saídas ${formatMoney(d.saidas, { decimals: 'always' })}`
    )
    .join('; ')

  return (
    <section className="space-y-3 rounded-[22px] bg-card p-4">
      <h2 className="font-display text-base font-bold">Evolução por ciclo — {personName}</h2>
      <p className="text-xs font-normal text-muted-foreground">Quantidade de ciclos</p>
      <SegmentedControl
        value={period}
        onChange={setPeriod}
        options={PERIODS}
        ariaLabel="Quantidade de ciclos"
      />

      {error ? (
        <Notice
          tone="danger"
          icon={AlertCircle}
          title="Não foi possível carregar os relatórios."
          action={
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      ) : loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Carregando os relatórios</span>
          <div aria-hidden="true" className="anim-pulse h-[180px] rounded-2xl bg-surface-2" />
        </div>
      ) : !hasData ? (
        <EmptyState
          title="Sem lançamentos neste período"
          description="Quando houver gastos ou receitas, os gráficos aparecem aqui."
        />
      ) : (
        <>
          <ul className="flex flex-wrap gap-3 text-xs font-normal" aria-label="Legenda">
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: IN_COLOR }} />
              Entradas
            </li>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OUT_COLOR }} />
              Saídas
            </li>
          </ul>

          <div
            role="img"
            aria-label={`Barras de entradas e saídas dos últimos ${period} ciclos de ${personName}. ${summary}`}
            className="h-[200px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} accessibilityLayer={false}>
                <CartesianGrid stroke="#e6e0d1" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: '#b9b2a0' }} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} width={40} tickFormatter={axisMoney} />
                <Bar dataKey="entradas" name="Entradas" fill={IN_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="saidas" name="Saídas" fill={OUT_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              Ver valores por ciclo
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <table className="w-full border-collapse text-xs font-normal">
              <caption className="sr-only">Entradas, saídas e saldo por ciclo</caption>
              <thead>
                <tr className="text-muted-foreground">
                  <th scope="col" className="py-1.5 text-left font-normal">Ciclo</th>
                  <th scope="col" className="py-1.5 text-right font-normal">Entradas</th>
                  <th scope="col" className="py-1.5 text-right font-normal">Saídas</th>
                  <th scope="col" className="py-1.5 text-right font-normal">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.key} className="border-t border-border">
                    <th scope="row" className="py-1.5 text-left font-bold">{d.label}</th>
                    <td className="py-1.5 text-right">{formatMoney(d.entradas)}</td>
                    <td className="py-1.5 text-right">{formatMoney(d.saidas)}</td>
                    <td className="py-1.5 text-right">{formatMoney(d.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  )
}
