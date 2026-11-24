import { CreditCard } from 'lucide-react'
import { IconCircle } from '@/components/ui/icon-circle'
import { Progress, type ProgressTone } from '@/components/ui/progress'
import { moneyOrDash as money } from '@/lib/cardLabels'
import type { Card } from '@/services/cards.service'
import type { cardLimitView } from '@shared/core/cards.js'
import { shortDate } from '@shared/core/format.js'
import { zonedParts } from '@shared/core/time.js'

export type CardLimit = ReturnType<typeof cardLimitView>

/** MASTERCARD vira Mastercard; texto simples, sem logotipo. */
function title(text: string | null): string {
  if (!text) return ''
  const lower = text.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function toneFor(state: 'ok' | 'warn' | 'over' | null): ProgressTone {
  return state ?? 'neutral'
}

function lastRead(date: Date | null): string {
  if (!date) return 'Última leitura do banco indisponível'
  const p = zonedParts(date)
  const hh = String(p.hour).padStart(2, '0')
  const mm = String(p.minute).padStart(2, '0')
  return `Última leitura do banco: ${shortDate(p)}, ${hh}:${mm}`
}

/**
 * Cartao de credito com limite total, disponivel, quanto ja foi usado e a fatura atual. So exibe
 * o que o limite de useCardView (cardLimitView) entrega. Sem promessa de tempo real: o MeuPluggy
 * atualiza cerca de 1 vez por dia (D-05).
 */
export function CardLimitCard({ card, limit: view }: { card: Card & { displayName?: string }; limit: CardLimit }) {
  const name = card.displayName || card.name || 'Cartão de crédito'
  const kind = [title(card.brand), title(card.level)].filter(Boolean).join(' ')

  return (
    <section aria-label={name} className="rounded-card bg-card p-4">
      <div className="flex items-center gap-3">
        <IconCircle icon={CreditCard} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-snug" title={name}>
            {name}
          </h2>
          {kind ? <p className="text-xs font-normal text-muted-foreground">{kind}</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-normal text-muted-foreground">Fatura atual</p>
        <p className="text-[28px] font-bold leading-tight">{money(view.billCents)}</p>
      </div>

      {view.usedCents !== null && view.limitCents !== null ? (
        <Progress
          className="mt-4"
          value={view.usedCents}
          max={view.limitCents}
          tone={toneFor(view.state)}
          label={`${name}: ${view.usedPct}% do limite usado`}
        />
      ) : null}

      <dl className="mt-3 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-base font-normal text-muted-foreground">Limite total</dt>
          <dd className="text-base font-bold">{money(view.limitCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-base font-normal text-muted-foreground">Disponível</dt>
          <dd className="text-base font-bold">{money(view.availableCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-base font-normal text-muted-foreground">Usado</dt>
          <dd className="text-base font-bold">
            {money(view.usedCents)}
            {view.usedPct !== null ? <span className="font-normal text-muted-foreground"> · {view.usedPct}%</span> : null}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs font-normal text-muted-foreground">
        {lastRead(card.syncedAt)}. O MeuPluggy atualiza cerca de 1 vez por dia.
      </p>
    </section>
  )
}
