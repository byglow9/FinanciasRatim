import { cn } from '@/lib/utils'
import { displayTier, formatMoney } from '@shared/core/format.js'

interface CoupleHeadlineProps {
  /** Totais dos dois somados, em centavos inteiros. */
  together: { inCents: number; outCents: number; balanceCents: number }
  mode: 'ciclo' | 'mes'
}

// Tamanho do valor dos cartoes por contagem de caracteres, sem o sinal: ate 8 e Heading 28; de 9 em
// diante cai para Number 16 (mesma regra por contagem, sem medir DOM).
function cardTier(text: string): 'heading' | 'number' {
  const body = text.startsWith('−') || text.startsWith('-') ? text.slice(1) : text
  return body.length <= 8 ? 'heading' : 'number'
}

/**
 * "Juntos" do Casal (D-17): saldo somado dos dois em destaque (Display 56 com ajuste automatico) e o
 * par de cartoes de entradas e saidas juntos. So exibe o que o nucleo (coupleSummary) entrega.
 */
export function CoupleHeadline({ together, mode }: CoupleHeadlineProps) {
  const balanceText = formatMoney(together.balanceCents)
  const inText = formatMoney(together.inCents)
  const outText = formatMoney(together.outCents)
  const negative = together.balanceCents < 0
  const tier = displayTier(balanceText)
  const when = mode === 'ciclo' ? 'neste ciclo' : 'neste mês'

  return (
    <section aria-labelledby="couple-together-title" className="space-y-3">
      <div className="text-center">
        <h2 id="couple-together-title" className="text-xs font-bold text-muted-foreground">
          {`Juntos ${when}`}
        </h2>
        <p
          className={cn(
            'font-display font-bold tabular-nums tracking-[-0.02em]',
            tier === 'display' ? 'text-[56px] leading-[1.1]' : 'text-[28px] leading-[1.2]',
            negative ? 'text-danger-ink' : 'text-foreground'
          )}
          aria-label={`Saldo somado dos dois: ${balanceText}`}
        >
          {balanceText}
        </p>
        <p className="text-xs font-normal text-muted-foreground">saldo somado dos dois</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-[22px] bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">Entradas juntos</p>
          <p
            className={cn(
              'font-display font-bold tabular-nums text-ok-ink',
              cardTier(inText) === 'heading' ? 'text-[28px] leading-[1.2]' : 'text-[16px] leading-[1.2]'
            )}
          >
            {inText}
          </p>
        </div>
        <div className="min-w-0 rounded-[22px] bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">Saídas juntos</p>
          <p
            className={cn(
              'font-display font-bold tabular-nums text-foreground',
              cardTier(outText) === 'heading' ? 'text-[28px] leading-[1.2]' : 'text-[16px] leading-[1.2]'
            )}
          >
            {outText}
          </p>
        </div>
      </div>
    </section>
  )
}
