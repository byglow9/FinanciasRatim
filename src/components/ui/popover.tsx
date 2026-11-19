import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PopoverProps {
  /** Icone do gatilho redondo de 44px. */
  icon: LucideIcon
  /** Nome acessivel do gatilho. */
  label: string
  children: React.ReactNode
  panelClassName?: string
  className?: string
}

/**
 * Painel flutuante de legenda e ajuda (D-11). O gatilho e redondo, de 44px; o painel abre
 * abaixo, fecha com clique fora e com Esc devolvendo o foco ao gatilho (mesmo padrao do
 * CycleSelector). Os listeners existem so enquanto aberto.
 */
export function Popover({ icon: Icon, label, children, panelClassName, className }: PopoverProps) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelId = React.useId()

  React.useEffect(() => {
    if (!open) return
    function onMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={label}
          className={cn(
            "absolute right-0 top-full z-30 mt-2 w-[min(272px,calc(100vw-32px))] rounded-[20px] border border-border bg-surface-2 p-4 shadow-float",
            panelClassName
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
