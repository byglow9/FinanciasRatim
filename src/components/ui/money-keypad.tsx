import * as React from "react"
import { Delete } from "lucide-react"
import { applyKeypad, formatMoneyParts, displayTier } from '@shared/core/format.js'
import { cn } from "@/lib/utils"

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'] as const

interface MoneyKeypadProps {
  valueCents: number
  onChange: (cents: number) => void
  enableHardwareKeys?: boolean
}

/** Campo de texto, selecao ou conteudo editavel: o teclado fisico nao pode roubar a digitacao. */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

/**
 * Teclado numerico em centavos (T-03-32): tudo passa por applyKeypad, que
 * limita a 8 digitos e so aceita inteiros. Nao ha campo numerico livre.
 */
export function MoneyKeypad({ valueCents, onChange, enableHardwareKeys = false }: MoneyKeypadProps) {
  const valueRef = React.useRef(valueCents)
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    valueRef.current = valueCents
    onChangeRef.current = onChange
  })

  React.useEffect(() => {
    if (!enableHardwareKeys) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTextTarget(e.target)) return
      let key: string | null = null
      if (/^[0-9]$/.test(e.key)) key = e.key
      else if (e.key === "Backspace") key = "backspace"
      if (key === null) return
      e.preventDefault()
      onChangeRef.current(applyKeypad(valueRef.current, key))
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [enableHardwareKeys])

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key === "backspace" ? "Apagar" : undefined}
          onClick={() => onChange(applyKeypad(valueCents, key))}
          className="flex h-14 items-center justify-center rounded-2xl bg-card font-display text-[28px] font-bold leading-none transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-track [@media(max-height:639px)]:h-12"
        >
          {key === "backspace" ? <Delete className="h-6 w-6" aria-hidden="true" /> : key}
        </button>
      ))}
    </div>
  )
}

interface MoneyValueProps {
  cents: number
  tone?: "default" | "danger"
}

/**
 * Valor em reais com ajuste automatico por contagem de caracteres (sem medir
 * DOM): ate 11 caracteres em 56px, depois 28px. Os centavos ficam em muted.
 */
export function MoneyValue({ cents, tone = "default" }: MoneyValueProps) {
  const parts = formatMoneyParts(cents)
  const body = `${parts.currency} ${parts.integer}${parts.decimals}`
  const tier = displayTier(body)
  const spoken = `${parts.negative ? "menos " : ""}${parts.currency} ${parts.integer}${
    parts.decimals === ",00" ? "" : parts.decimals
  }`
  const big = tier === "display"
  return (
    <span role="img" aria-label={spoken} className="num-display inline-flex items-baseline font-bold">
      <span
        aria-hidden="true"
        className={cn(
          big ? "text-[56px] leading-[1.1]" : "text-[28px] leading-[1.2]",
          tone === "danger" ? "text-danger-ink" : "text-foreground"
        )}
      >
        {parts.negative ? "−" : ""}
        {parts.currency}&nbsp;{parts.integer}
      </span>
      <span aria-hidden="true" className="text-[28px] leading-[1.2] text-muted-foreground">
        {parts.decimals}
      </span>
    </span>
  )
}
