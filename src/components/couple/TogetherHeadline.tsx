import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'
import type { CoupleBudget } from '@shared/core/couple.js'
import { displayTier, formatMoney } from '@shared/core/format.js'

interface TogetherHeadlineProps {
  budget: CoupleBudget
  /** Nomes vindos de settings.tabNames. */
  firstName: string
  secondName: string
  /** Rotulo do ciclo de cada pessoa. */
  firstCycle: string
  secondCycle: string
}

// Tamanho do valor dos cartoes por contagem de caracteres, sem o sinal (mesma regra do CoupleHeadline).
function cardTier(text: string): 'heading' | 'number' {
  const body = text.startsWith('−') || text.startsWith('-') ? text.slice(1) : text
  return body.length <= 8 ? 'heading' : 'number'
}

/**
 * "Pode gastar juntos" (CASAL-01, D-15, D-16): soma do Pode gastar de cada um no proprio ciclo,
 * com o gasto e a sobra somados. Cada numero diz o escopo. So exibe o que o nucleo entrega.
 */
export function TogetherHeadline({ budget, firstName, secondName, firstCycle, secondCycle }: TogetherHeadlineProps) {
  const safeText = formatMoney(budget.safeTogetherCents)
  const spentText = formatMoney(budget.spentTogetherCents)
  const sobraText = formatMoney(budget.sobraTogetherCents)
  const negative = budget.safeTogetherCents < 0
  const tier = displayTier(safeText)
  const missing: string[] = []
  if (budget.noIncome.first) missing.push(firstName)
  if (budget.noIncome.second) missing.push(secondName)

  return (
    <section aria-labelledby="couple-safe-title" className="space-y-3">
      <div className="text-center">
        <h2 id="couple-safe-title" className="text-xs font-bold text-muted-foreground">
          Pode gastar juntos
        </h2>
        <p
          className={cn(
            'font-display font-bold tabular-nums tracking-[-0.02em]',
            tier === 'display' ? 'text-[56px] leading-[1.1]' : 'text-[28px] leading-[1.2]',
            negative ? 'text-danger-ink' : 'text-foreground'
          )}
          aria-label={`Pode gastar juntos: ${safeText}`}
        >
          {safeText}
        </p>
        <p className="truncate text-xs font-normal text-muted-foreground">
          {`soma do Pode gastar de ${firstName} e ${secondName}`}
        </p>
        <p className="text-xs font-normal text-muted-foreground">
          {`${firstName}: ${firstCycle} · ${secondName}: ${secondCycle}`}
        </p>
        {missing.map((name) => (
          <p key={name} className="text-xs font-bold text-warn-ink">
            {`Sem renda informada em ${name}`}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-[22px] bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">Gasto juntos</p>
          <p
            className={cn(
              'font-display font-bold tabular-nums text-foreground',
              cardTier(spentText) === 'heading' ? 'text-[28px] leading-[1.2]' : 'text-[16px] leading-[1.2]'
            )}
          >
            {spentText}
          </p>
          <p className="text-xs font-normal text-muted-foreground">dia a dia, no ciclo de cada um</p>
        </div>
        <div className="min-w-0 rounded-[22px] bg-card p-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-muted-foreground">Sobra juntos</p>
            {budget.sobraProjected ? <Chip>estimativa</Chip> : null}
          </div>
          <p
            className={cn(
              'font-display font-bold tabular-nums',
              cardTier(sobraText) === 'heading' ? 'text-[28px] leading-[1.2]' : 'text-[16px] leading-[1.2]',
              budget.sobraTogetherCents < 0 ? 'text-danger-ink' : 'text-ok-ink'
            )}
          >
            {sobraText}
          </p>
          <p className="text-xs font-normal text-muted-foreground">no ciclo de cada um</p>
        </div>
      </div>
    </section>
  )
}
