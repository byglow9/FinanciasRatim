import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, Receipt, Landmark, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SummaryCardsProps {
  entradas: number
  saidas: number
  saldo: number
  saldoAcumulado?: number
  contasFixas: {
    pagas: number
    total: number
  }
}

export function SummaryCards({ entradas, saidas, saldo, saldoAcumulado, contasFixas }: SummaryCardsProps) {
  const taxaEconomia = entradas > 0 ? ((saldo / entradas) * 100) : 0

  const cards = [
    {
      title: 'Entradas',
      value: entradas,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Saidas',
      value: saidas,
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Saldo Mensal',
      value: saldo,
      icon: Wallet,
      color: saldo >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: saldo >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Saldo Total',
      value: saldoAcumulado ?? 0,
      icon: Landmark,
      color: (saldoAcumulado ?? 0) >= 0 ? 'text-purple-500' : 'text-red-500',
      bgColor: (saldoAcumulado ?? 0) >= 0 ? 'bg-purple-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Contas Fixas',
      value: null,
      displayValue: `${contasFixas.pagas}/${contasFixas.total}`,
      subtitle: 'pagas',
      icon: Receipt,
      color: contasFixas.pagas === contasFixas.total ? 'text-green-500' : 'text-amber-500',
      bgColor: contasFixas.pagas === contasFixas.total ? 'bg-green-500/10' : 'bg-amber-500/10',
    },
    {
      title: 'Taxa Economia',
      value: null,
      displayValue: `${taxaEconomia.toFixed(0)}%`,
      subtitle: 'do mes',
      icon: Percent,
      color: taxaEconomia >= 20 ? 'text-green-500' : taxaEconomia >= 0 ? 'text-amber-500' : 'text-red-500',
      bgColor: taxaEconomia >= 20 ? 'bg-green-500/10' : taxaEconomia >= 0 ? 'bg-amber-500/10' : 'bg-red-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn('rounded-full p-1.5 sm:p-2', card.bgColor)}>
                <card.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', card.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{card.title}</p>
                <p className={cn('text-sm sm:text-lg font-semibold truncate', card.color)}>
                  {card.displayValue ?? formatCurrency(card.value ?? 0)}
                </p>
                {card.subtitle && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
