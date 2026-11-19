import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute("aria-hidden") !== "true" && el.tabIndex !== -1
  )
}

/**
 * Bottom sheet acessivel (UI-SPEC S3): portal no body, escuro, foco preso,
 * Esc e clique no escuro fecham, foco volta a quem abriu, sem arrastar.
 * Para escolher o foco inicial, marque um elemento do conteudo com data-autofocus.
 */
function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const titleId = React.useId()
  const panelRef = React.useRef<HTMLDivElement>(null)
  // Fica montado enquanto a animacao de saida roda.
  const [mounted, setMounted] = React.useState(open)
  if (open && !mounted) setMounted(true)
  const exiting = mounted && !open

  // Em ref: um onClose inline do pai nao pode reexecutar o efeito e roubar o foco.
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => {
    onCloseRef.current = onClose
  })

  // Trava a rolagem do corpo e restaura o valor anterior.
  React.useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Foco inicial, trap de foco, Esc e retorno do foco.
  React.useEffect(() => {
    if (!open) return
    const origin = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const preferred = panel?.querySelector<HTMLElement>("[data-autofocus]")
    if (preferred) preferred.focus()
    else panel?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== "Tab" || !panel) return
      const items = focusableIn(panel)
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      const inside = !!active && panel.contains(active)
      if (e.shiftKey && (!inside || active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      if (origin && origin.isConnected) origin.focus()
    }
  }, [open])

  // Rede de seguranca: se o animationend nao chegar, desmonta mesmo assim.
  React.useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => setMounted(false), 400)
    return () => clearTimeout(timer)
  }, [exiting])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={() => onClose()}
        className={cn(
          "fixed inset-0 z-[9999] bg-[rgba(0,0,0,.35)]",
          exiting ? "anim-overlay-out" : "anim-overlay-in"
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (exiting && e.target === e.currentTarget) setMounted(false)
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[10000] max-h-[92dvh] overflow-y-auto rounded-t-[28px] bg-popover p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,.25)] focus:outline-none md:mx-auto md:w-[min(480px,100%)]",
          exiting ? "anim-sheet-out" : "anim-sheet-in",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-sans text-base font-bold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => onClose()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body
  )
}

export { Sheet }
