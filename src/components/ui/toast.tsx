import * as React from "react"
import { createPortal } from "react-dom"
import { X, type LucideIcon } from "lucide-react"

const DEFAULT_DURATION_MS = 5000
const EXIT_MS = 200

interface ToastOptions {
  icon?: LucideIcon
  durationMs?: number
}

interface ToastItem {
  id: number
  message: string
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
      className={`pointer-events-auto flex items-center gap-3 rounded-2xl bg-primary py-3 pl-4 pr-1 text-primary-foreground transition-opacity duration-200 anim-toast-in ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      <p className="min-w-0 flex-1 text-base font-bold">{item.message}</p>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={onDismiss}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary-foreground"
      >
        <X className="h-5 w-5" aria-hidden="true" />
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
          className="pointer-events-none fixed left-4 right-4 top-[calc(16px+env(safe-area-inset-top))] z-[10001] mx-auto max-w-md"
        >
          {current ? (
            <ToastView key={current.id} item={current} leaving={leaving} onDismiss={dismiss} />
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
