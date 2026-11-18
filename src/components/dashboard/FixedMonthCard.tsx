import { Link } from 'react-router-dom'
import { Check, Repeat } from 'lucide-react'
import { Chip } from '@/components/ui/chip'
import type { BillItem, BudgetView } from '@shared/core/budget.js'

// Máximo de contas na Home (UI-SPEC S2); o resto fica em "Ver todas".
const MAX_BILLS = 4

const LINK_44 = 'inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4'

interface FixedMonthCardProps {
  bills: BudgetView['bills']
  onMarkPaid: (item: BillItem) => void
  readOnly?: boolean
}

/**
 * Contas fixas do mês (CENT-01, CENT-06): lista as que a BudgetView entrega, não pagas primeiro.
 * Marcar como pago é manual e não muda o Pode gastar, porque as fixas já estão descontadas (REV-03).
 */
export function FixedMonthCard({ bills, onMarkPaid, readOnly = false }: FixedMonthCardProps) {
  const shown = bills.items.slice(0, MAX_BILLS)

  return (
    <section id="fx" className="mt-4 scroll-mt-4 rounded-[22px] bg-card p-4" aria-labelledby="fx-title">
      <div className="flex items-center gap-2">
        <Repeat className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 id="fx-title" data-section-title tabIndex={-1} className="flex-1 text-base font-bold focus:outline-none">
          Contas fixas do mês
        </h2>
        <Link to="/contas-fixas" className={LINK_44}>
          Gerenciar contas fixas
        </Link>
      </div>

      {bills.items.length === 0 ? (
        <div className="mt-2">
          <p className="text-base font-bold">Nenhuma conta fixa neste ciclo</p>
          <p className="text-xs font-normal text-muted-foreground">
            Cadastre aluguel, internet e outras contas que se repetem todo mês.
          </p>
          <Link
            to="/contas-fixas"
            className="mt-3 inline-flex h-11 min-w-[120px] items-center justify-center rounded-xl bg-primary px-4 text-base font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Nova conta fixa
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-2">
            {shown.map((item) => (
              <li
                key={`${item.billId}-${item.occurrence.year}-${item.occurrence.month}`}
                className="flex min-h-14 items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-bold" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground">dia {item.occurrence.day}</p>
                </div>
                {item.paid ? (
                  <Chip tone="ok" icon={Check}>
                    pago
                  </Chip>
                ) : (
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onMarkPaid(item)}
                    className="h-11 min-w-[120px] shrink-0 rounded-xl bg-primary px-4 text-base font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    Marcar pago
                  </button>
                )}
              </li>
            ))}
          </ul>
          {bills.items.length > MAX_BILLS ? (
            <Link to="/contas-fixas" className={LINK_44}>
              Ver todas ({bills.items.length})
            </Link>
          ) : null}
        </>
      )}
    </section>
  )
}
