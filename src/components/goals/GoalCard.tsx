import { Check, CircleCheck, Plus, Target } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn, formatDate } from '@/lib/utils'
import type { Goal } from '@/types'
import { formatMoney } from '@shared/core/format.js'
import { goalProgress } from '@shared/core/goals.js'
import { toCents } from '@shared/core/ledger.js'

interface GoalCardProps {
  goal: Goal
  /** Toque no topo do cartão: abre o Sheet de ações da meta. */
  onOpen: (goal: Goal) => void
  /** Botão Aportar do cartão (só aparece em meta não concluída). */
  onContribute: (goal: Goal) => void
  /** Perfil do parceiro: o Aportar fica aria-disabled e o toque chama onBlocked. */
  readOnly?: boolean
  onBlocked?: () => void
}

const money = (reais: number) => formatMoney(toCents(reais), { decimals: 'always' })

/**
 * Cartão da meta (sketch 015, variante A). O topo é um botão inteiro de 56px que abre as ações
 * (aportar, editar, apagar); embaixo ficam a barra, os valores e o botão Aportar. Meta concluída
 * mostra o texto "Concluída" além da cor. Todo texto entra como texto React, nome truncado com title.
 */
export function GoalCard({ goal, onOpen, onContribute, readOnly, onBlocked }: GoalCardProps) {
  // Conclusao decidida em centavos (WR-02): 99,5% nao esconde o Aportar nem o quanto falta.
  const { complete: isComplete, percent: percentage, remainingCents } = goalProgress(goal.currentAmount, goal.targetAmount)
  const Icon = isComplete ? CircleCheck : Target

  return (
    <article className="rounded-[22px] bg-card p-4">
      <button
        type="button"
        onClick={() => onOpen(goal)}
        aria-label={`Opções da meta ${goal.name}, ${percentage}%`}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="block min-w-0 flex-1">
          <span title={goal.name} className="block truncate text-base font-bold">
            {goal.name}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {goal.deadline ? `Prazo ${formatDate(goal.deadline)}` : 'Sem prazo'}
          </span>
        </span>
        <span className="num-display shrink-0 text-base font-bold">{percentage}%</span>
      </button>

      <Progress
        className="mt-3"
        size="md"
        tone="ok"
        value={percentage}
        label={`${goal.name}: ${percentage}% do alvo`}
      />

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="num-display text-base font-bold">{money(goal.currentAmount)}</span>
        <span className="text-xs font-normal text-muted-foreground">de {money(goal.targetAmount)}</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {isComplete ? 'Meta atingida' : `Faltam ${formatMoney(remainingCents, { decimals: 'always' })}`}
        </span>
      </div>

      {isComplete ? (
        <p className="mt-3 flex min-h-12 items-center gap-1.5 text-base font-bold text-ok-ink">
          <Check className="h-5 w-5" aria-hidden="true" />
          Concluída
        </p>
      ) : (
        <button
          type="button"
          aria-label={`Aportar em ${goal.name}`}
          aria-disabled={readOnly ? true : undefined}
          onClick={() => (readOnly ? onBlocked?.() : onContribute(goal))}
          className={cn(
            'mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-action text-base font-bold text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            readOnly && 'cursor-not-allowed opacity-60'
          )}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Aportar
        </button>
      )}
    </article>
  )
}
