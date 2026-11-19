import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { cn } from '@/lib/utils'
import type { SavingsTransaction } from '@/types'
import { dayKeyOf } from '@shared/core/dayKey.js'
import { MONTH_LONG, dayMonth, formatMoney, plural } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'
import { zonedParts } from '@shared/core/time.js'

interface SavingsHistoryProps {
  /** Movimentações já filtradas, da mais recente para a mais antiga. */
  transactions: SavingsTransaction[]
  onSelect: (transaction: SavingsTransaction) => void
}

interface MonthGroup {
  /** Chave AAAA-MM do mês (fuso de São Paulo). */
  key: string
  items: SavingsTransaction[]
  netCents: number
}

/** Agrupa por mês de São Paulo, mantendo a ordem de entrada (a lista já vem do mais novo ao mais antigo). */
function groupByMonth(transactions: SavingsTransaction[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  const index = new Map<string, MonthGroup>()
  for (const t of transactions) {
    const key = dayKeyOf(t.date).slice(0, 7)
    let group = index.get(key)
    if (!group) {
      group = { key, items: [], netCents: 0 }
      index.set(key, group)
      groups.push(group)
    }
    group.items.push(t)
    group.netCents += (t.type === 'deposito' ? 1 : -1) * toCents(t.amount)
  }
  return groups
}

/** "Novembro de 2026" a partir de "2026-11". */
function monthTitle(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return `${MONTH_LONG[month - 1]} de ${year}`
}

/** Valor com sinal: menos (U+2212) para saque e mais para depósito; sempre com centavos. */
function signedAmount(t: SavingsTransaction): string {
  const text = formatMoney(toCents(t.amount), { decimals: 'always' })
  return t.type === 'deposito' ? `+${text}` : `−${text}`
}

/** Saldo líquido do mês com sinal. */
function netText(netCents: number): string {
  const text = formatMoney(netCents, { decimals: 'always' })
  return netCents > 0 ? `+${text}` : text
}

/**
 * Histórico do Porquinho (variante B do sketch 014): grupos por mês, cada movimentação é uma linha
 * tocável de 64px que abre o Sheet de ações da página. Todo texto entra como texto React.
 */
export function SavingsHistory({ transactions, onSelect }: SavingsHistoryProps) {
  const { settings } = useArea()

  if (transactions.length === 0) {
    return <p className="text-base font-bold">Nada neste filtro.</p>
  }

  const personName = (t: SavingsTransaction) =>
    t.person === 'ele' ? settings.tabNames.area1 : settings.tabNames.area2

  return (
    <div className="space-y-4">
      {groupByMonth(transactions).map((group) => {
        const titleId = `savings-month-${group.key}`
        return (
          <section key={group.key} aria-labelledby={titleId}>
            <div className="flex min-h-8 items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
              <h2 id={titleId} className="min-w-0 truncate">
                {monthTitle(group.key)}
              </h2>
              <span className="num-display shrink-0 font-normal">
                {`${plural(group.items.length, 'movimentação', 'movimentações')} · ${netText(group.netCents)}`}
              </span>
            </div>
            <ul className="divide-y divide-track rounded-[22px] bg-card px-3 py-1">
              {group.items.map((t) => {
                const deposit = t.type === 'deposito'
                const kind = deposit ? 'Depósito' : 'Saque'
                const when = dayMonth(zonedParts(t.date))
                const amountText = formatMoney(toCents(t.amount), { decimals: 'always' })
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(t)}
                      aria-label={`${kind} de ${amountText}, ${t.description}, ${when}. Abrir opções`}
                      className="flex min-h-16 w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2',
                          deposit ? 'text-ok-ink' : 'text-danger-ink'
                        )}
                      >
                        {deposit ? (
                          <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold" title={t.description}>
                          {t.description}
                        </span>
                        <span className="block truncate text-xs font-normal text-muted-foreground">
                          {`${kind} · ${personName(t)} · ${when}`}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'num-display shrink-0 whitespace-nowrap text-base font-bold',
                          deposit ? 'text-ok-ink' : 'text-foreground'
                        )}
                      >
                        {signedAmount(t)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
