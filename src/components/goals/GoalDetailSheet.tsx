import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Progress } from '@/components/ui/progress'
import { Sheet } from '@/components/ui/sheet'
import { useGoalContributions } from '@/hooks/useGoalContributions'
import { formatDate } from '@/lib/utils'
import type { Goal } from '@/types'
import { formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'

const RECENT_LIMIT = 8

interface GoalDetailSheetProps {
  open: boolean
  onClose: () => void
  /** Meta mostrada; nula enquanto o Sheet termina a animação de saída. */
  goal: Goal | null
}

const exact = (cents: number) => formatMoney(cents, { decimals: 'always' })

/**
 * Detalhe da meta em Sheet (D-03): nome, progresso, quanto falta, prazo e os aportes recentes
 * com data, descrição e valor. Só leitura: as ações ficam no Sheet de ações da página. Os aportes
 * são buscados a cada abertura. Todo texto entra como texto React.
 */
export function GoalDetailSheet({ open, onClose, goal }: GoalDetailSheetProps) {
  const { contributions, loading, error, refetch } = useGoalContributions(goal?.id ?? null)

  // Aportes feitos depois da última abertura entram na lista.
  useEffect(() => {
    if (open) void refetch()
  }, [open, refetch, goal?.currentAmount])

  const targetCents = goal ? toCents(goal.targetAmount) : 0
  const currentCents = goal ? toCents(goal.currentAmount) : 0
  const percentage = targetCents > 0 ? Math.min(100, Math.round((currentCents / targetCents) * 100)) : 0
  const isComplete = percentage >= 100
  const recent = contributions.slice(0, RECENT_LIMIT)

  return (
    <Sheet open={open} onClose={onClose} title={goal?.name ?? 'Meta'}>
      {goal ? (
        <div className="mt-3 space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="num-display text-base font-bold">
                {exact(currentCents)} <span className="text-xs font-normal text-muted-foreground">de {exact(targetCents)}</span>
              </p>
              <p className="num-display shrink-0 text-base font-bold">{percentage}%</p>
            </div>
            <Progress
              className="mt-2"
              size="md"
              tone="ok"
              value={percentage}
              label={`${goal.name}: ${percentage}% do alvo`}
            />
            <p className="mt-2 text-xs font-normal text-muted-foreground">
              {isComplete ? 'Concluída' : `Falta ${exact(Math.max(0, targetCents - currentCents))}`}
              {' · '}
              {goal.deadline ? `Prazo ${formatDate(goal.deadline)}` : 'Sem prazo'}
            </p>
          </div>

          <section aria-labelledby="goal-detail-recent">
            <h3 id="goal-detail-recent" className="text-xs font-bold text-muted-foreground">
              Aportes recentes
            </h3>
            {error ? (
              <div className="mt-2">
                <Notice
                  tone="danger"
                  title="Não foi possível carregar os aportes."
                  action={
                    <Button type="button" variant="outline" onClick={() => void refetch()}>
                      Tentar de novo
                    </Button>
                  }
                >
                  Confira a conexão e tente de novo.
                </Notice>
              </div>
            ) : loading && contributions.length === 0 ? (
              <div role="status" className="mt-2 space-y-2">
                <span className="sr-only">Carregando os aportes</span>
                {[0, 1].map((i) => (
                  <div key={i} aria-hidden="true" className="anim-pulse h-12 rounded-2xl bg-surface-2" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="mt-2 text-xs font-normal text-muted-foreground">Nenhum aporte ainda.</p>
            ) : (
              <ul className="mt-1">
                {recent.map((c) => (
                  <li key={c.id} className="flex min-h-12 items-center justify-between gap-3">
                    <span className="num-display shrink-0 text-base font-bold text-ok-ink">
                      +{exact(toCents(c.amount))}
                    </span>
                    <span className="min-w-0 truncate text-right text-xs font-normal text-muted-foreground">
                      {c.description ? `${c.description} · ` : ''}
                      {formatDate(c.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Sheet>
  )
}
