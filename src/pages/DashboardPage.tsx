import { Link } from 'react-router-dom'
import { CircleAlert, PiggyBank } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useLaunch } from '@/contexts/LaunchContext'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useCycleBudget } from '@/hooks/useCycleBudget'
import { useSectionReveal } from '@/hooks/useSectionReveal'
import { ArcGauge } from '@/components/dashboard/ArcGauge'
import { RhythmPill } from '@/components/dashboard/RhythmPill'
import { ShortcutRow } from '@/components/dashboard/ShortcutRow'
import { StaleNotice } from '@/components/dashboard/StaleNotice'
import { LimitAlertNotice } from '@/components/dashboard/LimitAlertNotice'
import { CentralSummaryCard } from '@/components/dashboard/CentralSummaryCard'
import { HomeSections } from '@/components/dashboard/HomeSections'
import { MoneyValue } from '@/components/ui/money-keypad'
import { Notice } from '@/components/ui/notice'
import { Button } from '@/components/ui/button'
import { arcToneFor } from '@/lib/rhythm'
import { formatMoney, perDayReais, plural, shortDate } from '@shared/core/format.js'

const NO_COUNTS = { ok: 0, warn: 0, over: 0, total: 0 }

const LINK_BUTTON =
  'mt-3 inline-flex h-12 items-center justify-center rounded-btn bg-primary px-4 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/**
 * Home (D-19, D-24): o "Pode gastar" do perfil atual no arco, por dia, ritmo, atalhos e as
 * seções do HomeSections. Só exibe a BudgetView do núcleo: nenhuma fórmula de orçamento aqui.
 * Sem view não há número: carregando e erro nunca mostram valor (T-03-75).
 */
export function DashboardPage() {
  const { currentArea } = useArea()
  const { viewPerson } = useCycle()
  // Porquinho nunca tem Pode gastar (D-02): nem consulta o ciclo.
  const isPiggy = currentArea === 'porquinho'
  const { view, cycle, loading, error, refetch } = useCycleBudget(viewPerson, { enabled: !isPiggy })
  const { open } = useLaunch()
  const { readOnly } = useReadOnly()
  const reveal = useSectionReveal()

  if (isPiggy) {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
        <Notice icon={PiggyBank} title="Na aba Porquinho não há Pode gastar nem limite.">
          <Link
            to="/limites"
            className="inline-flex min-h-11 items-center text-xs font-bold text-foreground underline underline-offset-4"
          >
            Abrir Central de Limites
          </Link>
        </Notice>
        <CentralSummaryCard counts={NO_COUNTS} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
        <Notice
          tone="danger"
          icon={CircleAlert}
          title="Não foi possível carregar seus números."
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      </div>
    )
  }

  const noIncome = view !== null && !view.income.hasIncome
  const suppressed = view?.verdictSuppressed === true
  const past = view?.isPast === true
  const negative = view !== null && view.safeCents < 0

  // A região viva repete só o número que o hero já mostra; vazia sem número.
  // Valor por dia em reais inteiros, arredondado para baixo pelo núcleo (nunca promete mais).
  const perDay = view ? formatMoney(perDayReais(view.perDayCents) * 100) : ''
  let live = ''
  if (view && !noIncome) {
    live = past
      ? `${negative ? 'Passou no ciclo' : 'Sobrou no ciclo'}: ${formatMoney(Math.abs(view.safeCents))}`
      : view.safeCents <= 0
        ? `Pode gastar agora: ${formatMoney(view.safeCents)}. Sem folga neste ciclo`
        : `Pode gastar agora: ${formatMoney(view.safeCents)}, ${perDay} por dia`
  }

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
      <StaleNotice placement="top" />
      <LimitAlertNotice />

      <div className="mt-2 text-center">
        <ArcGauge
          restPct={view && !noIncome ? view.restPct : null}
          tone={suppressed ? 'neutral' : arcToneFor(view?.rhythmLevel ?? null)}
          loading={loading}
        />

        {view === null && (
          <div aria-hidden="true" className="mt-2 flex flex-col items-center gap-2">
            <div className="anim-pulse h-5 w-24 rounded-xl bg-card" />
            <div className="anim-pulse h-14 w-56 rounded-xl bg-card" />
            <div className="anim-pulse h-4 w-40 rounded-xl bg-card" />
          </div>
        )}
        {view === null && <span className="sr-only">Carregando seus números</span>}

        {view && noIncome && (
          <div className="mx-auto mt-2 max-w-[360px] rounded-[22px] bg-card p-4 text-center">
            <p className="text-base font-bold">Falta saber quanto entra</p>
            <p className="text-xs font-normal text-muted-foreground">
              Informe sua renda esperada para ver quanto pode gastar neste ciclo.
            </p>
            <Link to="/configuracoes#ciclo" className={LINK_BUTTON}>
              Informar renda esperada
            </Link>
          </div>
        )}

        {view && !noIncome && (
          <>
            <p className="mt-2 text-base font-bold text-muted-foreground">
              {past ? (negative ? 'Passou no ciclo' : 'Sobrou no ciclo') : 'Pode gastar'}
            </p>
            <div>
              <MoneyValue cents={view.safeCents} tone={negative && !suppressed ? 'danger' : 'default'} />
            </div>
            <p className="text-xs font-normal text-muted-foreground">
              {past
                ? `Ciclo encerrado em ${shortDate(cycle.endParts)}`
                : view.safeCents <= 0
                  ? 'Sem folga neste ciclo'
                  : `${perDay} por dia · ${plural(view.daysLeft, 'dia', 'dias')} até ${shortDate(cycle.endParts)}`}
            </p>
            {!past && (
              <div className="mt-2">
                <RhythmPill level={view.rhythmLevel} suppressed={suppressed} />
              </div>
            )}
          </>
        )}

        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </div>

      <StaleNotice placement="below" />

      <ShortcutRow
        onNewExpense={() => open('gasto')}
        onNewIncome={() => open('receita')}
        onFixed={() => reveal('fx')}
        onLimits={() => reveal('lm')}
        readOnly={readOnly}
      />

      <HomeSections view={view} cycle={cycle} loading={loading} refetch={refetch} />
    </div>
  )
}
