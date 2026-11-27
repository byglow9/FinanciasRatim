import { useMemo, useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCoupleBudget } from '@/hooks/useCoupleBudget'
import { useCoupleData, type CoupleMode } from '@/hooks/useCoupleData'
import { useSavings } from '@/hooks/useSavings'
import { CoupleHeadline } from '@/components/couple/CoupleHeadline'
import { CoupleLimits } from '@/components/couple/CoupleLimits'
import { DualBars } from '@/components/couple/DualBars'
import { PiggyCard } from '@/components/couple/PiggyCard'
import { SplitBar } from '@/components/couple/SplitBar'
import { TogetherHeadline } from '@/components/couple/TogetherHeadline'
import { TopCategoryRows } from '@/components/couple/TopCategoryRows'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'
import { coupleSummary } from '@shared/core/couple.js'
import { toCents } from '@shared/core/ledger.js'

/**
 * Casal (UX-06, D-17, sketch 010 Mistura A+B): leitura dos dois no mesmo periodo. A janela e unica
 * para os dois (premissa P-02): no modo Ciclo, o ciclo do perfil visto; no modo Mes, o mes-calendario,
 * ambos com o mesmo deslocamento do topo. A aba nao edita nada. Nomes vem de settings.tabNames.
 */
export function CouplePage() {
  const [mode, setMode] = useState<CoupleMode>('ciclo')
  const { settings, categoryDefs } = useArea()
  const { viewPerson } = useCycle()
  const { first, second, loading, error, refetch, periodLabel, sameSalaryDay } = useCoupleData(mode)

  const budget = useCoupleBudget()

  const savings = useSavings()
  const savingsCents = savings.loading || savings.error ? null : toCents(savings.balance)

  const viewName = viewPerson === 'ele' ? settings.tabNames.area1 : settings.tabNames.area2

  const summary = useMemo(
    () => (first && second ? coupleSummary({ first, second, defs: categoryDefs }) : null),
    [first, second, categoryDefs]
  )
  const isEmpty = first !== null && second !== null && first.length === 0 && second.length === 0

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-bold leading-tight">Casal</h1>

      {budget.error ? (
        <Notice
          tone="danger"
          title="Não foi possível carregar o Pode gastar juntos."
          action={
            <Button type="button" variant="outline" onClick={() => void budget.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      ) : budget.loading || !budget.first || !budget.second ? (
        <div role="status" className="space-y-2">
          <span className="sr-only">Carregando o Pode gastar juntos</span>
          {[176, 96, 144].map((h) => (
            <div key={h} aria-hidden="true" className="anim-pulse rounded-[22px] bg-card" style={{ height: h }} />
          ))}
        </div>
      ) : (
        <>
          <TogetherHeadline
            budget={budget.summary}
            firstName={settings.tabNames.area1}
            secondName={settings.tabNames.area2}
            firstCycle={budget.cycleLabels.first}
            secondCycle={budget.cycleLabels.second}
          />
          <CoupleLimits
            rows={budget.summary.rows}
            firstName={settings.tabNames.area1}
            secondName={settings.tabNames.area2}
          />
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Comparação</h2>
        <div className="w-40 shrink-0">
          <SegmentedControl<CoupleMode>
            ariaLabel="Período do casal"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'ciclo', label: 'Ciclo' },
              { value: 'mes', label: 'Mês' },
            ]}
          />
        </div>
      </div>

      <div className="text-xs font-normal text-muted-foreground">
        <p>{periodLabel}</p>
        {mode === 'ciclo' && !sameSalaryDay ? (
          <p className="truncate" title={viewName}>{`Recorte do ciclo de ${viewName}`}</p>
        ) : null}
      </div>

      {error ? (
        <>
          <VintemEmpty pose="surpreso" />
          <Notice
            tone="danger"
            title="Não foi possível carregar os números do casal."
            action={
              <Button type="button" variant="outline" onClick={() => void refetch()}>
                Tentar de novo
              </Button>
            }
          >
            Confira a conexão e tente de novo.
          </Notice>
        </>
      ) : loading || !summary ? (
        <div role="status" className="space-y-2">
          <span className="sr-only">Carregando o casal</span>
          {[176, 288, 144].map((h) => (
            <div key={h} aria-hidden="true" className="anim-pulse rounded-[22px] bg-card" style={{ height: h }} />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="space-y-2">
          <VintemEmpty pose="neutro" />
          <p className="text-base font-bold">Sem lançamentos neste período</p>
          <p className="text-xs font-normal text-muted-foreground">
            Quando vocês lançarem gastos ou receitas, a comparação aparece aqui.
          </p>
        </div>
      ) : (
        <>
          <CoupleHeadline together={summary.together} mode={mode} />
          <SplitBar
            firstName={settings.tabNames.area1}
            secondName={settings.tabNames.area2}
            firstOutCents={summary.first.outCents}
            secondOutCents={summary.second.outCents}
            mode={mode}
          />
          <DualBars
            firstName={settings.tabNames.area1}
            secondName={settings.tabNames.area2}
            first={summary.first}
            second={summary.second}
            scaleMaxCents={summary.scaleMaxCents}
          />
          <TopCategoryRows
            firstName={settings.tabNames.area1}
            secondName={settings.tabNames.area2}
            first={first ?? []}
            second={second ?? []}
          />
        </>
      )}

      <PiggyCard label={settings.tabNames.piggy} balanceCents={savingsCents} failed={savings.error !== null} />
    </div>
  )
}
