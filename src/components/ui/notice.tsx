import * as React from "react"
import { X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type NoticeTone = "neutral" | "warn" | "danger" | "info"

interface NoticeProps {
  tone?: NoticeTone
  icon?: LucideIcon
  title?: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  onDismiss?: () => void
  dismissLabel?: string
  className?: string
}

const ICON_TONE: Record<NoticeTone, string> = {
  neutral: "text-foreground",
  info: "text-foreground",
  warn: "text-warn-ink",
  danger: "text-danger-ink",
}

/**
 * Faixa informativa (UI-SPEC "Notice"): fundo de cartao, raio 16, icone a esquerda,
 * titulo 16/700 e texto 12/400 muted. Conteudo sempre como texto React.
 */
export function Notice({
  tone = "neutral",
  icon: Icon,
  title,
  children,
  action,
  onDismiss,
  dismissLabel = "Dispensar aviso",
  className,
}: NoticeProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-2xl bg-card p-3", className)}
    >
      {Icon ? (
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_TONE[tone])} aria-hidden="true" />
      ) : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="text-base font-bold leading-snug">{title}</p> : null}
        {children ? (
          <div className="text-xs font-normal text-muted-foreground">{children}</div>
        ) : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}


export type { NoticeTone }
