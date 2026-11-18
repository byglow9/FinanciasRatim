import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldRowProps {
  label: string
  value: string
  onClick: () => void
  disabled?: boolean
  // Legenda sob a linha (ex.: "Volte ao seu perfil para editar").
  hint?: string
}

/**
 * Linha de campo tocável (UI-SPEC S5): rótulo à esquerda, valor e chevron à direita.
 * Desabilitada de verdade (não só visual) quando `disabled`.
 */
export function FieldRow({ label, value, onClick, disabled, hint }: FieldRowProps) {
  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className="text-base font-normal">{label}</span>
        <span className="flex shrink-0 items-center gap-1 text-base font-bold">
          {value}
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </span>
      </button>
      {hint ? <p className="mt-1 text-xs font-normal text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
