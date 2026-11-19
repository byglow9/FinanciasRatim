import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
}

// Estado vazio de Relatórios: ícone, título 16/700 e apoio 12/400, sempre em português.
export function EmptyState({
  title = 'Sem lançamentos neste ciclo',
  description = 'Quando houver gastos ou receitas, os gráficos aparecem aqui.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      {icon ?? <BarChart3 className="size-7 text-muted-foreground" aria-hidden="true" />}
      <p className="text-base font-bold">{title}</p>
      <p className="max-w-xs text-xs font-normal text-muted-foreground">{description}</p>
    </div>
  )
}
