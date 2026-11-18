import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'
import type { BudgetView } from '@shared/core/budget.js'
import type { DateParts } from '@shared/core/cycle.js'
import { formatMoney, shortDate } from '@shared/core/format.js'

interface MonthInOneCardProps {
  monthInOne: BudgetView['monthInOne']
  income: BudgetView['income']
  cycleEnd: DateParts
}

interface LineProps {
  label: string
  caption: ReactNode
  children: ReactNode
  last?: boolean
}

// Uma linha do cartão: rótulo 16/400 com legenda 12/400 à esquerda, valor à direita.
function Line({ label, caption, children, last }: LineProps) {
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 py-3',
        last ? 'border-t-2 border-border' : 'border-b border-border'
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-normal">{label}</p>
        <p className="text-xs font-normal text-muted-foreground">{caption}</p>
      </div>
      {children}
    </li>
  )
}

/**
 * "O mês em uma conta" (LIM-05, LIM-06): só exibe a linha pronta da BudgetView,
 * sem calcular nada. A projeção da Sobra leva o chip "estimativa" no ciclo atual.
 */
export function MonthInOneCard({ monthInOne, income, cycleEnd }: MonthInOneCardProps) {
  const { entra, fixos, diaADia, sobra } = monthInOne
  const negative = sobra.cents < 0

  return (
    <section className="mt-4 rounded-[22px] bg-card p-4" aria-labelledby="month-in-one-title">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 id="month-in-one-title" className="flex-1 text-base font-bold">
          O mês em uma conta
        </h2>
        {sobra.projected ? <Chip>estimativa</Chip> : null}
      </div>

      <ul className="mt-2">
        <Line
          label="Entra"
          caption={
            income.hasIncome ? (
              `já entrou ${formatMoney(entra.receivedCents)} · esperado ${formatMoney(entra.expectedCents)}`
            ) : (
              <Link
                to="/configuracoes#ciclo"
                className="inline-flex min-h-11 items-center text-xs font-bold text-foreground underline underline-offset-4"
              >
                Defina a renda
              </Link>
            )
          }
        >
          <span className="shrink-0 text-base font-bold text-ok-ink">
            {income.hasIncome ? `+${formatMoney(entra.effectiveCents)}` : formatMoney(0)}
          </span>
        </Line>

        <Line label="Fixos" caption={`${fixos.paidCount} de ${fixos.totalCount} pagos`}>
          <span className="shrink-0 text-base font-bold">{`−${formatMoney(fixos.totalCents)}`}</span>
        </Line>

        <Line label="Dia a dia" caption="tudo que não é fixo">
          <span className="shrink-0 text-base font-bold">{`−${formatMoney(diaADia.spentCents)}`}</span>
        </Line>

        <Line
          label="Sobra"
          caption={sobra.projected ? `projeção até ${shortDate(cycleEnd)}` : 'resultado do ciclo'}
          last
        >
          <span
            className={cn(
              'shrink-0 font-display text-[28px] font-bold leading-[1.2]',
              negative ? 'text-danger-ink' : 'text-foreground'
            )}
          >
            {formatMoney(sobra.cents)}
          </span>
        </Line>
      </ul>
    </section>
  )
}
