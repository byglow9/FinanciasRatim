import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SquareCheckProps {
  checked: boolean
  onChange: () => void
  /** Nome acessivel, ex.: "Marcar Aluguel como paga". */
  label: string
  disabled?: boolean
  /** Gravacao em andamento: continua focavel, mas o clique e ignorado. */
  busy?: boolean
  className?: string
}

/**
 * Caixa de marcar quadrada (D-04): visual 28px, raio 8, borda 2, dentro de area de toque de 44px.
 * Alternador (aria-pressed). Desabilitada ou ocupada continua focavel e ignora o clique.
 * Sem toast e sem confirmacao: a tela marca e desmarca direto (D-05).
 */
export function SquareCheck({ checked, onChange, label, disabled, busy, className }: SquareCheckProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      aria-disabled={disabled ? true : undefined}
      aria-busy={busy ? true : undefined}
      onClick={() => {
        if (disabled || busy) return
        onChange()
      }}
      className={cn(
        "group flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        (disabled || busy) && "cursor-not-allowed",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-colors duration-150 ease-in-out",
          checked
            ? "border-action bg-action text-action-text"
            : "border-input bg-inset group-hover:border-action"
        )}
      >
        {checked ? <Check className="h-[18px] w-[18px]" strokeWidth={3} aria-hidden="true" /> : null}
      </span>
    </button>
  )
}
