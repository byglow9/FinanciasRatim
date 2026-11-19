import { useState } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useCycleSeries } from '@/hooks/useCycleSeries'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { MONTH_SHORT, formatMoney, shortDate } from '@shared/core/format.js'
import { EmptyState } from './EmptyState'

// Cores de cada pessoa (tokens --color-ele e --color-ela da paleta Moeda).
const ELE_COLOR = '#14532d'
const ELA_COLOR = '#c2410c'
const TICK = { fontSize: 12, fill: '#77746a' }

type Kind = 'saidas' | 'entradas'
const KINDS: { value: Kind; label: string }[] = [
  { value: 'saidas', label: 'Gastos' },
  { value: 'entradas', label: 'Receitas' },
]

type Period = '3' | '6' | '12'
const PERIODS: { value: Period; label: string }[] = [
  { value: '3', label: '3 ciclos' },
  { value: '6', label: '6 ciclos' },
  { value: '12', label: '12 ciclos' },
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

interface ComparisonBarChartProps {
  area1Name: string
  area2Name: string
}

// Comparação entre as duas pessoas por ciclo. Cada pessoa tem a sua série (uma consulta por janela
// larga cada); o nome vem das configurações, nunca fixo. O mesmo dado aparece em tabela de texto.
export function ComparisonBarChart({ area1Name, area2Name }: ComparisonBarChartProps) {
  const [period, setPeriod] = useState<Period>('6')
  const [kind, setKind] = useState<Kind>('saidas')
  const ele = useCycleSeries('ele', Number(period))
  const ela = useCycleSeries('ela', Number(period))

  const loading = ele.loading || ela.loading
  const error = ele.error ?? ela.error
  const retry = () => {
    void ele.refetch()
    void ela.refetch()
  }

  const pick = (p: (typeof ele.series)[number]) => (kind === 'saidas' ? p.saidasCents : p.entradasCents)
  const data = ele.series.map((p, i) => ({
    key: p.key,
    label: shortCycle(p.cycle),
    ele: pick(p),
    ela: ela.series[i] ? pick(ela.series[i]) : 0,
  }))

  const hasData = data.some((d) => d.ele > 0 || d.ela > 0)
  const totals = data.reduce((acc, d) => ({ ele: acc.ele + d.ele, ela: acc.ela + d.ela }), { ele: 0, ela: 0 })
  const kindLabel = kind === 'saidas' ? 'Gastos' : 'Receitas'

  const summary = data
    .map(
      (d) =>
        `${d.label}: ${area1Name} ${formatMoney(d.ele, { decimals: 'always' })}, ${area2Name} ${formatMoney(d.ela, { decimals: 'always' })}`
    )
    .join('; ')

  return (
    <section className="space-y-3 rounded-[22px] bg-card p-4">
      <h2 className="font-display text-base font-bold">
        {kindLabel} por ciclo — {area1Name} e {area2Name}
      </h2>
      <SegmentedControl value={kind} onChange={setKind} options={KINDS} ariaLabel="Tipo de valor" />
      <SegmentedControl value={period} onChange={setPeriod} options={PERIODS} ariaLabel="Quantidade de ciclos" />

      {error ? (
        <Notice
          tone="danger"
          icon={AlertCircle}
          title="Não foi possível carregar os relatórios."
          action={
            <Button type="button" variant="outline" onClick={retry}>
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
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ELE_COLOR }} />
              {area1Name} <b className="font-bold">{formatMoney(totals.ele, { decimals: 'always' })}</b>
            </li>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ELA_COLOR }} />
              {area2Name} <b className="font-bold">{formatMoney(totals.ela, { decimals: 'always' })}</b>
            </li>
          </ul>

          <div
            role="img"
            aria-label={`Barras de ${kindLabel.toLowerCase()} de ${area1Name} e ${area2Name} nos últimos ${period} ciclos. ${summary}`}
            className="h-[200px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} accessibilityLayer={false}>
                <CartesianGrid stroke="#e6e0d1" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: '#b9b2a0' }} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} width={40} tickFormatter={axisMoney} />
                <Bar dataKey="ele" name={area1Name} fill={ELE_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="ela" name={area2Name} fill={ELA_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              Ver valores por ciclo
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <table className="w-full border-collapse text-xs font-normal">
              <caption className="sr-only">
                {kindLabel} de {area1Name} e {area2Name} por ciclo
              </caption>
              <thead>
                <tr className="text-muted-foreground">
                  <th scope="col" className="py-1.5 text-left font-normal">Ciclo</th>
                  <th scope="col" className="py-1.5 text-right font-normal">{area1Name}</th>
                  <th scope="col" className="py-1.5 text-right font-normal">{area2Name}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.key} className="border-t border-border">
                    <th scope="row" className="py-1.5 text-left font-bold">{d.label}</th>
                    <td className="py-1.5 text-right">{formatMoney(d.ele)}</td>
                    <td className="py-1.5 text-right">{formatMoney(d.ela)}</td>
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
