import { Link } from 'react-router-dom'
import { ChevronRight, CreditCard } from 'lucide-react'
import { Progress, type ProgressTone } from '@/components/ui/progress'
import { useCycle } from '@/contexts/CycleContext'
import { useCards } from '@/hooks/useCards'
import { moneyOrDash } from '@/lib/cardLabels'
import { duePartsOf, openBillMonth } from '@shared/core/cardBills.js'
import { cardLimitView } from '@shared/core/cards.js'
import { dayMonth } from '@shared/core/format.js'

/**
 * Resumo do cartao na Home (D-10, D-11): fatura atual, vencimento e porcentagem usada do limite,
 * com toque para /cartoes. Escondido quando o perfil nao tem cartao. Usa so useCards (cartao e
 * configuracao): nenhuma leitura de compras aqui, para poupar a cota de leituras (T-06-37).
 */
export function HomeCardSummary() {
  const { viewPerson, now } = useCycle()
  const { cards, loading, error } = useCards()
  const mine = cards.filter((c) => c.person === viewPerson)

  if (loading || error || mine.length === 0) return null

  return (
    <section aria-labelledby="home-cards-title" className="rounded-[22px] bg-card p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 id="home-cards-title" className="flex-1 text-base font-bold">
          Cartão de crédito
        </h2>
      </div>

      <ul className="mt-2">
        {mine.map((card) => {
          const limit = cardLimitView(card)
          const closingDay = card.settings?.closingDay ?? null
          const dueDay = card.settings?.dueDay ?? null
          const openMonth = closingDay !== null ? openBillMonth(now, closingDay) : null
          const due = openMonth && dueDay !== null ? duePartsOf(openMonth, closingDay, dueDay) : null
          const tone: ProgressTone = limit.state ?? 'neutral'
          return (
            <li key={card.id} className="border-b border-border py-1 last:border-b-0">
              <Link
                to="/cartoes"
                className="block min-h-11 rounded-xl py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-base font-bold" title={card.displayName}>
                    {card.displayName}
                  </p>
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="text-xs font-normal text-muted-foreground">Fatura atual</span>
                  <span className="text-base font-bold">{moneyOrDash(card.balanceCents)}</span>
                </div>
                {due ? (
                  <p className="text-xs font-normal text-muted-foreground">
                    Vence dia {due.day} ({dayMonth(due)})
                  </p>
                ) : null}
                {limit.usedCents !== null && limit.limitCents !== null ? (
                  <>
                    <Progress
                      className="mt-2"
                      value={limit.usedCents}
                      max={limit.limitCents}
                      tone={tone}
                      label={`${card.displayName}: ${limit.usedPct}% do limite usado`}
                    />
                    <p className="mt-1 text-xs font-normal text-muted-foreground">{limit.usedPct}% do limite usado</p>
                  </>
                ) : null}
              </Link>
              {due ? null : (
                <Link
                  to="/configuracoes#contas"
                  className="inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4"
                >
                  Informe o fechamento e o vencimento
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
