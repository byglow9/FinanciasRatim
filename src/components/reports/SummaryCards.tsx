import { formatMoney } from '@shared/core/format.js'
import { cn } from '@/lib/utils'

interface FixedSummary {
  paidCount: number
  count: number
  pendingCents: number
}

interface SummaryCardsProps {
  entradasCents: number
  saidasCents: number
  saldoCents: number
  // Contas fixas do ciclo; nulo enquanto carregam ou quando a consulta falhou (o cartao some).
  fixas: FixedSummary | null
}

// Resumo do ciclo (variante A do sketch 016): saldo em destaque e entradas e saídas lado a lado.
// Todo valor chega em centavos inteiros e sai formatado pelo núcleo.
export function SummaryCards({ entradasCents, saidasCents, saldoCents, fixas }: SummaryCardsProps) {
  return (
    <section aria-label="Resumo do ciclo" className="space-y-2">
      <div className="rounded-[22px] bg-card p-4">
        <p className="text-xs font-normal text-muted-foreground">Saldo do ciclo</p>
        <p
          className={cn(
            'font-display text-[28px] font-bold leading-tight',
            saldoCents < 0 ? 'text-danger-ink' : 'text-foreground'
          )}
        >
          {formatMoney(saldoCents, { decimals: 'always' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-[22px] bg-card p-4">
          <p className="text-xs font-normal text-muted-foreground">Entradas</p>
          <p className="truncate font-display text-base font-bold text-ok-ink">
            {formatMoney(entradasCents, { decimals: 'always' })}
          </p>
        </div>
        <div className="min-w-0 rounded-[22px] bg-card p-4">
          <p className="text-xs font-normal text-muted-foreground">Saídas</p>
          <p className="truncate font-display text-base font-bold">
            {formatMoney(saidasCents, { decimals: 'always' })}
          </p>
        </div>
      </div>

      {fixas && (
        <div className="rounded-[22px] bg-card p-4">
          <p className="text-xs font-normal text-muted-foreground">Contas fixas do ciclo</p>
          <p className="font-display text-base font-bold">
            {fixas.count === 0
              ? 'Nenhuma conta neste ciclo'
              : `${fixas.paidCount} de ${fixas.count} pagas`}
          </p>
          {fixas.count > 0 && (
            <p className="text-xs font-normal text-muted-foreground">
              {fixas.pendingCents > 0
                ? `Faltam ${formatMoney(fixas.pendingCents, { decimals: 'always' })}`
                : 'Tudo pago'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
