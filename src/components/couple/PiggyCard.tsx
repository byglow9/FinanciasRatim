import { Link } from 'react-router-dom'
import { ChevronRight, PiggyBank } from 'lucide-react'
import { formatMoney } from '@shared/core/format.js'

interface PiggyCardProps {
  label: string
  /** Saldo em centavos inteiros; nulo enquanto carrega ou quando falhou (nunca R$ 0 falso). */
  balanceCents: number | null
  failed?: boolean
}

/**
 * Cartao do Porquinho (D-17): atalho para /porquinho com o saldo atual. Leitura apenas.
 */
export function PiggyCard({ label, balanceCents, failed = false }: PiggyCardProps) {
  return (
    <Link
      to="/porquinho"
      className="flex min-h-[72px] items-center gap-3 rounded-[22px] bg-card p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pig-bg"
      >
        <PiggyBank className="h-6 w-6 text-pig-ink" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-muted-foreground" title={label}>
          {label}
        </span>
        {balanceCents !== null ? (
          <span className="block font-display text-[28px] font-bold leading-[1.2] tabular-nums tracking-[-0.02em]">
            {formatMoney(balanceCents)}
          </span>
        ) : failed ? (
          <span className="block text-xs font-normal text-muted-foreground">Saldo indisponível agora</span>
        ) : (
          <span role="status" className="block">
            <span className="sr-only">Carregando o saldo</span>
            <span aria-hidden="true" className="anim-pulse mt-1 block h-7 w-32 rounded-full bg-track" />
          </span>
        )}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  )
}
