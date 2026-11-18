import * as React from "react"
import { cn } from "@/lib/utils"

export type ProgressTone = "ok" | "warn" | "over" | "neutral"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  tone?: ProgressTone
  /** Nome acessível da barra (vira aria-label). */
  label?: string
}

const FILL_BY_TONE: Record<ProgressTone, string> = {
  ok: "bg-brand",
  warn: "bg-warn",
  over: "bg-danger",
  neutral: "bg-muted-foreground",
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, tone = "ok", label, ...props }, ref) => {
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
          "relative h-2 w-full overflow-hidden rounded-full bg-track",
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
