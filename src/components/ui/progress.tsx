import * as React from "react"
import { cn } from "@/lib/utils"

export type ProgressTone = "ok" | "warn" | "over" | "neutral" | "ele" | "ela"
export type ProgressSize = "sm" | "md"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  tone?: ProgressTone
  /** Altura da barra: sm (8px, padrao) ou md (12px, Casal). */
  size?: ProgressSize
  /** Nome acessível da barra (vira aria-label). */
  label?: string
}

const FILL_BY_TONE: Record<ProgressTone, string> = {
  ok: "bg-brand",
  warn: "bg-warn",
  over: "bg-danger",
  neutral: "bg-muted-foreground",
  ele: "bg-ele",
  ela: "bg-ela",
}

const HEIGHT_BY_SIZE: Record<ProgressSize, string> = {
  sm: "h-2",
  md: "h-3",
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, tone = "ok", size = "sm", label, ...props }, ref) => {
    const safeMax = max > 0 ? max : 100
    const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), safeMax)
    const percentage = Math.min((clamped / safeMax) * 100, 100)

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-track",
          HEIGHT_BY_SIZE[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[400ms] ease-out",
            FILL_BY_TONE[tone]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
