import { ArrowDownLeft, ArrowUpRight, Gauge, Repeat, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShortcutRowProps {
  onNewExpense: () => void
  onNewIncome: () => void
  onFixed: () => void
  onLimits: () => void
  /** Perfil do parceiro: lançar fica esmaecido, mas o toque ainda chega ao handler (toast). */
  readOnly?: boolean
}

interface ShortcutProps {
  label: string
  icon: LucideIcon
  tone: string
  onClick: () => void
  dimmed?: boolean
}

function Shortcut({ label, icon: Icon, tone, onClick, dimmed }: ShortcutProps) {
  return (
    <button
      type="button"
      aria-disabled={dimmed ? 'true' : undefined}
      onClick={onClick}
      className="group flex min-h-20 min-w-[72px] flex-col items-center gap-2 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-card transition-colors hover:bg-track active:bg-track group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2"
      >
        <Icon className={cn('h-[22px] w-[22px]', dimmed ? 'text-muted-foreground' : tone)} />
      </span>
      <span className={cn('text-xs font-bold', dimmed && 'text-muted-foreground')}>{label}</span>
    </button>
  )
}

/**
 * Quatro atalhos redondos da Home (LIM-09). Em somente leitura, Novo gasto e Nova receita
 * ficam aria-disabled e continuam clicáveis: o handler mostra o toast pela guarda do lançamento.
 */
export function ShortcutRow({ onNewExpense, onNewIncome, onFixed, onLimits, readOnly = false }: ShortcutRowProps) {
  return (
    <div className="mt-6 grid grid-cols-4 gap-2">
      <Shortcut label="Novo gasto" icon={ArrowUpRight} tone="text-danger-ink" onClick={onNewExpense} dimmed={readOnly} />
      <Shortcut label="Nova receita" icon={ArrowDownLeft} tone="text-ok-ink" onClick={onNewIncome} dimmed={readOnly} />
      <Shortcut label="Contas fixas" icon={Repeat} tone="text-foreground" onClick={onFixed} />
      <Shortcut label="Limites" icon={Gauge} tone="text-foreground" onClick={onLimits} />
    </div>
  )
}
