import { PiggyBank as PiggyIcon } from 'lucide-react'
import { IconCircle } from '@/components/ui/icon-circle'
import { cn } from '@/lib/utils'
import { displayTier, formatMoney } from '@shared/core/format.js'

interface PiggyBankProps {
  /** Total guardado menos total retirado, em centavos inteiros. */
  balanceCents: number
  /** Soma dos depósitos, em centavos inteiros. */
  depositsCents: number
  /** Soma dos saques, em centavos inteiros. */
  withdrawalsCents: number
}

/** Quanto do total guardado continua no cofre, de 0 a 100 (inteiro). Sem depósito não há o que dividir. */
function keptPercent(balanceCents: number, depositsCents: number): number {
  if (depositsCents <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((balanceCents / depositsCents) * 100)))
}

/**
 * Cartão do cofre (variante B do sketch 014): saldo em destaque (Display 56 com ajuste automático por
 * displayTier) e uma barra que divide o total guardado entre "No cofre" e "Retirado". Tokens Moeda,
 * sem degradê. Todo texto entra como texto React.
 */
export function PiggyBank({ balanceCents, depositsCents, withdrawalsCents }: PiggyBankProps) {
  const balanceText = formatMoney(balanceCents, { decimals: 'always' })
  const tier = displayTier(balanceText)
  const kept = keptPercent(balanceCents, depositsCents)
  const gone = 100 - kept

  return (
    <section aria-labelledby="piggy-title" className="rounded-[22px] bg-card p-4">
      <div className="flex items-center gap-3">
        <IconCircle icon={PiggyIcon} size={48} />
        <h2 id="piggy-title" className="text-xs font-bold text-muted-foreground">
          Saldo do cofre
        </h2>
      </div>

      <p
        className={cn(
          'font-display font-bold tabular-nums tracking-[-0.03em] whitespace-nowrap',
          tier === 'display' ? 'text-[56px] leading-[1.1]' : 'text-[28px] leading-[1.2]',
          balanceCents < 0 ? 'text-danger-ink' : 'text-foreground'
        )}
      >
        {balanceText}
      </p>
      <p className="text-xs font-normal text-muted-foreground">
        {`Total guardado ${formatMoney(depositsCents, { decimals: 'always' })}`}
      </p>

      <div
        role="img"
        aria-label={`Do total guardado, ${kept}% está no cofre e ${gone}% foi retirado`}
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-track"
      >
        <span className="block h-full bg-brand" style={{ width: `${kept}%` }} />
        <span className="block h-full bg-warn" style={{ width: `${gone}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-brand" />
            {`No cofre · ${kept}%`}
          </p>
          <p className="num-display truncate text-base font-bold">
            {formatMoney(balanceCents, { decimals: 'always' })}
          </p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warn" />
            {`Retirado · ${gone}%`}
          </p>
          <p className="num-display truncate text-base font-bold">
            {formatMoney(withdrawalsCents, { decimals: 'always' })}
          </p>
        </div>
      </div>
    </section>
  )
}
