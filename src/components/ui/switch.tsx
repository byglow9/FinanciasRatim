import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  ariaLabel?: string
}

/** Interruptor: alvo de toque de 44px, trilho 44x24 e bolinha que desliza. */
function Switch({ checked, onCheckedChange, id, disabled, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="group inline-flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
          checked ? "bg-action" : "bg-track"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-card shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  )
}

export { Switch }
