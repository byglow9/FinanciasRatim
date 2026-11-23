import { useRef, useState, type KeyboardEvent } from 'react'
import { AlertCircle } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleTransactions } from '@/hooks/useCycleTransactions'
import { useCycleBills } from '@/hooks/useCycleBills'
import { useCycleSeries } from '@/hooks/useCycleSeries'
import { useSavings } from '@/hooks/useSavings'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Notice } from '@/components/ui/notice'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'
import {
  SummaryCards,
  CategoryPieChart,
  ComparisonBarChart,
  MonthlyEvolutionChart,
  IncomeBreakdown,
  OverviewDashboard,
  EmptyState,
} from '@/components/reports'
import { cn } from '@/lib/utils'
import type { PersonType, Transaction } from '@/types'
import type { Cycle } from '@shared/core/cycle.js'
import { billsSummary } from '@shared/core/billGroups.js'
import { cycleLabel, shortRange } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'

type ReportTab = 'visao-geral' | 'categorias' | 'evolucao' | 'comparacao'

const TABS: { value: ReportTab; label: string }[] = [
  { value: 'visao-geral', label: 'Visão geral' },
  { value: 'categorias', label: 'Categorias' },
  { value: 'evolucao', label: 'Evolução' },
  { value: 'comparacao', label: 'Comparação' },
]

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
      className="flex gap-0.5 rounded-full bg-inset p-0.5"
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
              'h-11 flex-auto whitespace-nowrap rounded-full px-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'bg-card text-foreground' : 'text-muted-foreground'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

interface OverviewTabProps {
  person: PersonType
  personName: string
  transactions: Transaction[]
  cycle: Cycle
  label: string
  entradasCents: number
  saidasCents: number
  saldoCents: number
  fixas: { paidCount: number; count: number; pendingCents: number } | null
}

// Visão geral: só aqui roda a consulta da série dos últimos ciclos (uma por janela larga).
function OverviewTab({ person, personName, transactions, cycle, label, entradasCents, saidasCents, saldoCents, fixas }: OverviewTabProps) {
  const { settings } = useArea()
  const { series, loading, error, refetch } = useCycleSeries(person, 4)
  const savings = useSavings()
  // Nulo enquanto carrega ou se falhou: nunca um R$ 0 falso (mesmo padrão do PiggyCard, WR-07).
  const savingsCents = savings.loading || savings.error ? null : toCents(savings.balance)

  return (
    <>
      <SummaryCards entradasCents={entradasCents} saidasCents={saidasCents} saldoCents={saldoCents} fixas={fixas} />
      <OverviewDashboard
        transactions={transactions}
        cycle={cycle}
        savingsCents={savingsCents}
        savingsFailed={savings.error !== null}
        piggyName={settings.tabNames.piggy}
        series={series}
        seriesLoading={loading}
        seriesError={error}
        onRetrySeries={() => void refetch()}
      />
      <IncomeBreakdown transactions={transactions} personName={personName} periodLabel={label} />
    </>
  )
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('visao-geral')
  const { currentArea, settings } = useArea()
  const { isCurrent } = useCycle()

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

      {/* O ciclo vem só do seletor do topo; aqui fica apenas a legenda do período mostrado. */}
      <p aria-live="polite" className="text-xs font-normal text-muted-foreground">
        {label} · {isCurrent ? `ciclo atual, ${range}` : range}
      </p>

      <ReportTabs value={activeTab} onChange={setActiveTab} />

      <div role="tabpanel" id="relatorios-painel" aria-labelledby={`relatorios-aba-${activeTab}`} className="space-y-4">
        {activeTab === 'evolucao' && <MonthlyEvolutionChart person={person} personName={personName} />}

        {activeTab === 'comparacao' && (
          <ComparisonBarChart area1Name={settings.tabNames.area1} area2Name={settings.tabNames.area2} />
        )}

        {(activeTab === 'visao-geral' || activeTab === 'categorias') &&
          (error ? (
            <>
              <VintemEmpty pose="surpreso" />
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
            </>
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
            <OverviewTab
              person={person}
              personName={personName}
              transactions={transactions}
              cycle={cycle}
              label={label}
              entradasCents={totalsCents.entradas}
              saidasCents={totalsCents.saidas}
              saldoCents={totalsCents.saldo}
              fixas={fixas}
            />
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
