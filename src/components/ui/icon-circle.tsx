import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface IconCircleProps {
  icon: LucideIcon
  size?: 44 | 48
  className?: string
}

/** Circulo de 44px (ou 48px) com icone Lucide decorativo. */
function IconCircle({ icon: Icon, size = 44, className }: IconCircleProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2",
        size === 48 ? "h-12 w-12" : "h-11 w-11",
        className
      )}
    >
      <Icon className={size === 48 ? "h-[22px] w-[22px]" : "h-5 w-5"} aria-hidden="true" />
    </span>
  )
}

export { IconCircle }
