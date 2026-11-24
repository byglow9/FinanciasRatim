import { moneyOrDash, billMonthLabel } from '@/lib/cardLabels'
import type { CardBill } from '@shared/core/cardBills.js'

/** Resultado de futureInstallments do nucleo (parcelas a vir por mes de fatura e o total a sair). */
export interface UpcomingInstallments {
  byMonth: Record<string, { cents: number; items: { name: string; n: number; total: number; cents: number; source: string }[] }>
  aSairCents: number
}

interface UpcomingBillsProps {
  /** Faturas depois da aberta, ja agrupadas pelo nucleo. */
  nextBills: CardBill[]
  upcoming: UpcomingInstallments
}

/**
 * Proximas faturas e parcelas a vir (CENT-03, D-03): por mes de fatura, o que ja esta lancado e as
 * parcelas projetadas pelo nucleo. A marca "estimada" aparece so na parcela lida do texto; a da
 * Pluggy vem sem marca. Sem parcela detectada, nada e prometido (CARD-05, D-06).
 */
export function UpcomingBills({ nextBills, upcoming }: UpcomingBillsProps) {
  const months = [...new Set([...nextBills.map((b) => b.billMonth), ...Object.keys(upcoming.byMonth)])].sort()
  const hasInstallments = months.some((m) => (upcoming.byMonth[m]?.items.length ?? 0) > 0)

  return (
    <section aria-labelledby="upcoming-title" className="rounded-card bg-card p-4">
      <h2 id="upcoming-title" className="text-base font-bold">
        Próximas faturas
      </h2>

      {hasInstallments ? (
        <div className="mt-2">
          <p className="text-xs font-normal text-muted-foreground">A sair nas próximas faturas</p>
          <p className="text-base font-bold">{moneyOrDash(upcoming.aSairCents)}</p>
          <p className="text-xs font-normal text-muted-foreground">A parcela do mês já conta nos seus limites.</p>
        </div>
      ) : (
        <p className="mt-2 text-xs font-normal text-muted-foreground">Nenhuma compra parcelada detectada</p>
      )}

      {months.length > 0 ? (
        <ul className="mt-2">
          {months.map((month) => {
            const bill = nextBills.find((b) => b.billMonth === month) ?? null
            const projected = upcoming.byMonth[month]
            return (
              <li key={month} className="border-b border-border py-3 last:border-b-0">
                <p className="text-base font-bold">{billMonthLabel(month)}</p>
                {bill ? (
                  <p className="flex items-baseline justify-between gap-3 text-xs font-normal text-muted-foreground">
                    <span>Já lançado</span>
                    <span className="text-base font-bold text-foreground">{moneyOrDash(bill.totalCents)}</span>
                  </p>
                ) : null}
                {projected && projected.items.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {projected.items.map((item) => (
                      <li
                        key={`${item.name}-${item.n}-${item.cents}`}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="min-w-0 truncate text-xs font-normal text-muted-foreground" title={item.name}>
                          <span className="capitalize">{item.name}</span>, {item.n}/{item.total}
                          {item.source === 'inferred' ? ' · estimada' : ''}
                        </span>
                        <span className="shrink-0 text-base font-bold">{moneyOrDash(item.cents)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
