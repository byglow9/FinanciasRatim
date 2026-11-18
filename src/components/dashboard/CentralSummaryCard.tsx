import { Link } from 'react-router-dom'
import { ChevronRight, Scale } from 'lucide-react'
import type { BudgetView } from '@shared/core/budget.js'

interface CentralSummaryCardProps {
  counts: BudgetView['counts']
}

/** Contagens não zeradas, da mais grave para a mais leve, no singular ou no plural. */
function summary(counts: BudgetView['counts']): string {
  if (counts.total === 0) return 'Nenhum limite definido ainda'
  const parts: string[] = []
  if (counts.over > 0) {
    parts.push(counts.over === 1 ? '1 passou do limite' : `${counts.over} passaram do limite`)
  }
  if (counts.warn > 0) parts.push(`${counts.warn} em atenção`)
  if (counts.ok > 0) parts.push(`${counts.ok} em dia`)
  return parts.join(' · ')
}

/**
 * Resumo da Central de Limites na Home (CENT-01): o cartão inteiro é o link para /limites.
 * Só exibe as contagens que a BudgetView já entrega.
 */
export function CentralSummaryCard({ counts }: CentralSummaryCardProps) {
  return (
    <Link
      to="/limites"
      className="mt-4 block min-h-14 rounded-[22px] bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-2">
        <Scale className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-base font-bold">Central de Limites</span>
        <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
      </span>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">{summary(counts)}</span>
    </Link>
  )
}
