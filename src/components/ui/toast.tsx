import * as React from "react"
import { createPortal } from "react-dom"
import { X, type LucideIcon } from "lucide-react"

const DEFAULT_DURATION_MS = 3000
const EXIT_MS = 200

interface ToastOptions {
  icon?: LucideIcon
  /** Apoio opcional, curto, numa segunda linha de 12px. */
  detail?: string
  durationMs?: number
}

interface ToastItem {
  id: number
  message: string
  detail?: string
  icon?: LucideIcon
  durationMs: number
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

interface ToastViewProps {
  item: ToastItem
  leaving: boolean
  onDismiss: () => void
}

/** Um aviso: temporizador com pausa em hover e foco. Remontado a cada item (key). */
function ToastView({ item, leaving, onDismiss }: ToastViewProps) {
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const paused = hovered || focused
  const remaining = React.useRef(item.durationMs)

  React.useEffect(() => {
    if (paused || leaving) return
    const startedAt = Date.now()
    const timer = setTimeout(onDismiss, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [paused, leaving, onDismiss])

  const Icon = item.icon

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`pointer-events-auto flex w-fit max-w-full items-center gap-2 rounded-2xl bg-action pl-3 text-action-text shadow-float transition-opacity duration-200 anim-toast-in ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      <div className="min-w-0 flex-1 py-1">
        <p className="line-clamp-2 text-base font-bold leading-snug">{item.message}</p>
        {item.detail ? <p className="line-clamp-2 text-xs font-normal">{item.detail}</p> : null}
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={onDismiss}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full opacity-80 focus:outline-none focus:ring-2 focus:ring-primary-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  // Fila FIFO: o primeiro item e o que aparece; o seguinte so entra depois que ele sai.
  const [queue, setQueue] = React.useState<ToastItem[]>([])
  const [leaving, setLeaving] = React.useState(false)
  const nextId = React.useRef(1)

  const show = React.useCallback((message: string, options?: ToastOptions) => {
    const id = nextId.current++
    setQueue((q) => [
      ...q,
      {
        id,
        message,
        icon: options?.icon,
        detail: options?.detail,
        durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
      },
    ])
  }, [])

  const dismiss = React.useCallback(() => {
    setLeaving(true)
  }, [])

  // Terminada a saida, tira o primeiro da fila e libera o proximo.
  React.useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => {
      setQueue((q) => q.slice(1))
      setLeaving(false)
    }, EXIT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  const value = React.useMemo(() => ({ show }), [show])
  const current = queue[0]

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[10001] flex justify-center px-[5%]"
        >
          {current ? (
            <div className="max-w-md">
              <ToastView key={current.id} item={current} leaving={leaving} onDismiss={dismiss} />
            </div>
          ) : null}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast precisa estar dentro de um ToastProvider")
  }
  return context
}

export { ToastProvider }
