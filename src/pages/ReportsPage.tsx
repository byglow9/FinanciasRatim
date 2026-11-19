import { useRef, useState, type KeyboardEvent } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleTransactions } from '@/hooks/useCycleTransactions'
import { useCycleBills } from '@/hooks/useCycleBills'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Notice } from '@/components/ui/notice'
import {
  SummaryCards,
  CategoryPieChart,
  ComparisonBarChart,
  MonthlyEvolutionChart,
  IncomeBreakdown,
  EmptyState,
} from '@/components/reports'
import { cn } from '@/lib/utils'
import type { PersonType } from '@/types'
import { billsSummary } from '@shared/core/billGroups.js'
import { cycleLabel, shortRange } from '@shared/core/format.js'

type ReportTab = 'visao-geral' | 'categorias' | 'evolucao' | 'comparacao'

const TABS: { value: ReportTab; label: string }[] = [
  { value: 'visao-geral', label: 'Visão geral' },
  { value: 'categorias', label: 'Categorias' },
  { value: 'evolucao', label: 'Evolução' },
  { value: 'comparacao', label: 'Comparação' },
]

const ROUND =
  'inline-flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Abas em pílula (variante A do sketch 016): quatro rótulos de 12/700 que cabem a 360px sem
// quebrar linha. Setas, Home e End movem o foco e ativam a aba.
function ReportTabs({ value, onChange }: { value: ReportTab; onChange: (tab: ReportTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const active = TABS.findIndex((t) => t.value === value)

  function move(index: number) {
    onChange(TABS[index].value)
    refs.current[index]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = TABS.length - 1
    let target: number | null = null
    if (event.key === 'ArrowRight') target = active >= last ? 0 : active + 1
    else if (event.key === 'ArrowLeft') target = active <= 0 ? last : active - 1
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = last
    if (target === null) return
    event.preventDefault()
    move(target)
  }

  return (
    <div
      role="tablist"
      aria-label="Seções do relatório"
      onKeyDown={onKeyDown}
      className="grid grid-cols-4 gap-0.5 rounded-full bg-card p-0.5"
    >
      {TABS.map((tab, index) => {
        const selected = index === active
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="tab"
            id={`relatorios-aba-${tab.value}`}
            aria-selected={selected}
            aria-controls="relatorios-painel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              'h-11 min-w-0 whitespace-nowrap rounded-full px-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'bg-surface-2 text-foreground' : 'text-muted-foreground'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('visao-geral')
  const { currentArea, settings } = useArea()
  const { shift, isCurrent } = useCycle()

  const person: PersonType = currentArea === 'porquinho' ? 'ele' : currentArea
  const personName = settings.tabNames[person === 'ele' ? 'area1' : 'area2']

  const { cycle, transactions, totalsCents, loading, error, refetch } = useCycleTransactions(person)
  const bills = useCycleBills(person)

  const label = cycleLabel(cycle) as string
  const range = shortRange(cycle.startParts, cycle.endParts) as string

  const fixas =
    bills.loading || bills.error
      ? null
      : (() => {
          const s = billsSummary(bills.items)
          return { paidCount: s.paidCount, count: s.count, pendingCents: s.pendingCents }
        })()

  const empty = !loading && !error && transactions.length === 0

  return (
    <div className="space-y-4">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h1 className="font-display text-[28px] font-bold leading-tight">Relatórios</h1>
        <Chip>{personName}</Chip>
      </div>

      <div role="group" aria-label="Ciclo" className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
        <button type="button" aria-label="Ciclo anterior" onClick={() => shift(-1)} className={ROUND}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div aria-live="polite" className="grid min-w-0 text-center">
          <b className="truncate font-display text-base font-bold">{label}</b>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {isCurrent ? `Ciclo atual · ${range}` : range}
          </span>
        </div>
        <button
          type="button"
          aria-label="Próximo ciclo"
          disabled={isCurrent}
          onClick={() => shift(1)}
          className={cn(ROUND, 'disabled:opacity-40')}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <ReportTabs value={activeTab} onChange={setActiveTab} />

      <div role="tabpanel" id="relatorios-painel" aria-labelledby={`relatorios-aba-${activeTab}`} className="space-y-4">
        {activeTab === 'evolucao' && <MonthlyEvolutionChart person={person} personName={personName} />}

        {activeTab === 'comparacao' && (
          <ComparisonBarChart area1Name={settings.tabNames.area1} area2Name={settings.tabNames.area2} />
        )}

        {(activeTab === 'visao-geral' || activeTab === 'categorias') &&
          (error ? (
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
            <div role="status" aria-busy="true" className="space-y-2">
              <span className="sr-only">Carregando os relatórios</span>
              {[0, 1, 2].map((i) => (
                <div key={i} aria-hidden="true" className="anim-pulse h-24 rounded-[22px] bg-card" />
              ))}
            </div>
          ) : empty ? (
            <div className="rounded-[22px] bg-card p-4">
              <EmptyState
                title="Sem lançamentos neste ciclo"
                description="Quando houver gastos ou receitas, os gráficos aparecem aqui."
              />
            </div>
          ) : activeTab === 'visao-geral' ? (
            <>
              <SummaryCards
                entradasCents={totalsCents.entradas}
                saidasCents={totalsCents.saidas}
                saldoCents={totalsCents.saldo}
                fixas={fixas}
              />
              <IncomeBreakdown transactions={transactions} personName={personName} periodLabel={label} />
            </>
          ) : (
            <CategoryPieChart
              transactions={transactions}
              kind="saida"
              title="Gasto por categoria"
              periodLabel={label}
              emptyMessage="Nenhum gasto registrado neste ciclo."
            />
          ))}
      </div>
    </div>
  )
}
