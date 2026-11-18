import { Link, useLocation } from 'react-router-dom'
import { Check, CircleAlert, CreditCard, Settings, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleBudget } from '@/hooks/useCycleBudget'
import { useHashReveal } from '@/hooks/useSectionReveal'
import { LimitsList } from '@/components/limits/LimitRow'
import { Chip } from '@/components/ui/chip'
import { Notice } from '@/components/ui/notice'
import type { BudgetView } from '@shared/core/budget.js'
import { formatMoney } from '@shared/core/format.js'

/**
 * Id da linha pedida pelo hash (`#cat-{id}`, vindo de um aviso do sino). Sem estado: sai da URL a
 * cada renderização. Valor inválido ou de outro tipo vira nulo (T-03-81); o hash nunca vira seletor.
 */
function expandIdFromHash(hash: string): string | undefined {
  if (!hash.startsWith('#cat-')) return undefined
  try {
    const decoded = decodeURIComponent(hash.slice(1))
    return decoded.length > 4 ? decoded : undefined
  } catch {
    return undefined
  }
}

interface TotalProps {
  icon: LucideIcon
  label: string
  value: number
  tone: string
}

function Total({ icon: Icon, label, value, tone }: TotalProps) {
  return (
    <div className="rounded-card bg-card p-4">
      <p className={`flex items-center gap-1 text-xs font-bold ${tone}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-2 font-display text-[28px] font-bold leading-[1.2] ${tone}`}>{value}</p>
    </div>
  )
}

/** Totais por estado (S4 item 1): só as contagens que a BudgetView já entrega. */
function Totals({ counts }: { counts: BudgetView['counts'] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Total icon={Check} label="Em dia" value={counts.ok} tone="text-ok-ink" />
      <Total icon={TriangleAlert} label="Atenção" value={counts.warn} tone="text-warn-ink" />
      <Total icon={CircleAlert} label="Passaram" value={counts.over} tone="text-danger-ink" />
    </div>
  )
}

/** Esqueleto de Cartões: só texto e chip, sem dado falso (o cartão real é da Fase 6). */
function CardsSkeleton() {
  return (
    <section aria-labelledby="central-cartoes" className="rounded-card bg-card p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 id="central-cartoes" className="flex-1 text-base font-bold">
          Cartões
        </h2>
        <Chip tone="muted">em breve</Chip>
      </div>
      <p className="mt-2 text-xs font-normal text-muted-foreground">
        Fatura, fechamento e parcelas chegam junto com o suporte a cartão de crédito.
      </p>
    </section>
  )
}

interface PersonLineProps {
  name: string
  cents: number
}

function PersonLine({ name, cents }: PersonLineProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="min-w-0 truncate text-base font-normal">{name}</span>
      <span className={`shrink-0 text-base font-bold ${cents < 0 ? 'text-danger-ink' : 'text-foreground'}`}>
        {formatMoney(cents)}
      </span>
    </div>
  )
}

interface TogetherProps {
  eleName: string
  elaName: string
  ele: { view: BudgetView | null; cycleKey: string; loading: boolean; failed: boolean }
  ela: { view: BudgetView | null; cycleKey: string; loading: boolean; failed: boolean }
}

/**
 * "Os dois juntos" (D-01): o Pode gastar de cada pessoa no próprio ciclo e a soma dos dois. A soma
 * é a única conta da página. Só leitura; sem as duas visões não mostra valor algum.
 */
function Together({ eleName, elaName, ele, ela }: TogetherProps) {
  if (ele.failed || ela.failed) return null

  const eleView = ele.view
  const elaView = ela.view
  const differentCycles = ele.cycleKey !== ela.cycleKey

  return (
    <section aria-labelledby="central-juntos" className="rounded-card bg-card p-4">
      <h2 id="central-juntos" className="flex items-center gap-2 text-base font-bold">
        <Users className="h-5 w-5 shrink-0" aria-hidden="true" />
        Os dois juntos
      </h2>
      {eleView !== null && elaView !== null ? (
        <div className="mt-2">
          <PersonLine name={eleName} cents={eleView.safeCents} />
          <PersonLine name={elaName} cents={elaView.safeCents} />
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-3">
            <span className="text-base font-bold">Somado</span>
            <span
              className={`shrink-0 font-display text-[28px] font-bold leading-[1.2] ${
                eleView.safeCents + elaView.safeCents < 0 ? 'text-danger-ink' : 'text-foreground'
              }`}
            >
              {formatMoney(eleView.safeCents + elaView.safeCents)}
            </span>
          </div>
          {differentCycles && <p className="mt-1 text-xs font-normal text-muted-foreground">Cada um no seu ciclo</p>}
        </div>
      ) : (
        ele.loading || ela.loading ? (
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="anim-pulse h-6 rounded-chip bg-surface-2" />
            <div className="anim-pulse h-6 rounded-chip bg-surface-2" />
            <div className="anim-pulse h-9 rounded-chip bg-surface-2" />
          </div>
        ) : null
      )}
    </section>
  )
}

/**
 * Central de Limites e Cartões (S4, D-21): só exibe o estado de cada limite e seus lançamentos.
 * O ajuste é em Configurações; nada aqui edita limite nem bloqueia gasto (D-09).
 */
export function LimitsPage() {
  const { categoryDefs, settings } = useArea()
  const { viewPerson } = useCycle()
  const { hash } = useLocation()

  // Cada pessoa no próprio ciclo, com o mesmo deslocamento; o perfil atual reaproveita a sua consulta.
  const eleBudget = useCycleBudget('ele')
  const elaBudget = useCycleBudget('ela')
  const { view, loading, error, refetch } = viewPerson === 'ele' ? eleBudget : elaBudget

  const expandId = expandIdFromHash(hash)
  // Só rola depois que a view carregou: antes disso a linha ainda não existe.
  useHashReveal(undefined, view !== null)

  const together = (
    <Together
      eleName={settings.tabNames.area1}
      elaName={settings.tabNames.area2}
      ele={{ view: eleBudget.view, cycleKey: eleBudget.cycle.key, loading: eleBudget.loading, failed: eleBudget.error !== null }}
      ela={{ view: elaBudget.view, cycleKey: elaBudget.cycle.key, loading: elaBudget.loading, failed: elaBudget.error !== null }}
    />
  )

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px] lg:max-w-[960px]">
      <header>
        <h1 data-section-title tabIndex={-1} className="font-display text-[28px] font-bold leading-tight focus-visible:outline-none">
          Central de Limites
        </h1>
        <p className="mt-1 text-xs font-normal text-muted-foreground">Passar do limite só avisa. Nada é bloqueado.</p>
      </header>

      {view === null && loading && (
        <div aria-busy="true">
          <p className="sr-only" role="status">
            Carregando seus números
          </p>
          <div className="space-y-4" aria-hidden="true">
            {[96, 288].map((h) => (
              <div key={h} className="anim-pulse rounded-card bg-card" style={{ height: h }} />
            ))}
          </div>
        </div>
      )}

      {view === null && !loading && error !== null && (
        <Notice
          tone="danger"
          icon={CircleAlert}
          title="Não foi possível carregar seus números."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tentar de novo
            </button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      )}

      {view !== null && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            <Totals counts={view.counts} />
            <LimitsList
              rows={view.spend.rows}
              generalCents={view.spend.generalCents}
              generalByCategory={view.spend.generalByCategory}
              categoryDefs={categoryDefs}
              neutralOk={view.verdictSuppressed}
              expandId={expandId}
            />
            <Link
              to="/configuracoes#categorias"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-input text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              Ajustar em Configurações
            </Link>
          </div>
          <div className="space-y-4">
            <CardsSkeleton />
            {together}
          </div>
        </div>
      )}
    </div>
  )
}
