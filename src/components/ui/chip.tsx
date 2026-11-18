import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ChipTone = "neutral" | "ok" | "selected" | "muted"

interface ChipProps {
  tone?: ChipTone
  icon?: LucideIcon
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

const TONE: Record<ChipTone, string> = {
  neutral: "border border-border bg-surface-2 text-foreground",
  ok: "bg-[#dcfce7] text-ok-ink",
  selected: "bg-primary text-primary-foreground",
  muted: "text-muted-foreground",
}

/**
 * Rotulo curto (12/700). Sem onClick e um span estatico; com onClick e um botao
 * com alvo de 44px e aria-disabled (continua focavel, mas nao dispara).
 */
export function Chip({ tone = "neutral", icon: Icon, onClick, disabled, children, className }: ChipProps) {
  const base = cn(
    "inline-flex items-center gap-1 rounded-chip px-3 text-xs font-bold",
    TONE[tone],
    className
  )
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
    </>
  )

  if (!onClick) {
    return <span className={cn(base, "py-1")}>{content}</span>
  }

  return (
    <button
      type="button"
      aria-disabled={disabled ? true : undefined}
      onClick={() => {
        if (!disabled) onClick()
      }}
      className={cn(
        base,
        "min-h-11 justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        disabled && "cursor-not-allowed"
      )}
    >
      {content}
    </button>
  )
}


export type { ChipTone }
