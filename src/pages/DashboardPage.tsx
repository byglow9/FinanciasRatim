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
import { HomeSections } from '@/components/dashboard/HomeSections'
import { MoneyValue } from '@/components/ui/money-keypad'
import { arcToneFor } from '@/lib/rhythm'
import { perDayReais, plural, shortDate } from '@shared/core/format.js'

/**
 * Home (D-19, D-24): o "Pode gastar" do perfil atual no arco, por dia, ritmo, atalhos e as
 * seções do HomeSections. Só exibe a BudgetView do núcleo: nenhuma fórmula de orçamento aqui.
 */
export function DashboardPage() {
  const { viewPerson } = useCycle()
  const { view, cycle, loading, refetch } = useCycleBudget(viewPerson)
  const { open } = useLaunch()
  const { readOnly } = useReadOnly()
  const reveal = useSectionReveal()

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
      <StaleNotice placement="top" />
      <LimitAlertNotice />

      <div className="mt-2 text-center">
        <ArcGauge
          restPct={view?.restPct ?? null}
          tone={view?.verdictSuppressed ? 'neutral' : arcToneFor(view?.rhythmLevel ?? null)}
          loading={loading}
        />
        {view && (
          <>
            <p className="mt-2 text-base font-bold text-muted-foreground">Pode gastar</p>
            <div>
              <MoneyValue
                cents={view.safeCents}
                tone={view.safeCents < 0 && !view.verdictSuppressed ? 'danger' : 'default'}
              />
            </div>
            <p className="text-xs font-normal text-muted-foreground">
              {view.safeCents <= 0
                ? 'Sem folga neste ciclo'
                : `R$ ${perDayReais(view.perDayCents)} por dia · ${plural(view.daysLeft, 'dia', 'dias')} até ${shortDate(cycle.endParts)}`}
            </p>
            <div className="mt-2">
              <RhythmPill level={view.rhythmLevel} suppressed={view.verdictSuppressed} />
            </div>
          </>
        )}
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
