import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  ariaLabel: string
  size?: "sm" | "md"
  /**
   * Em telas estreitas as abas inativas mostram so o icone (com aria-label e title), para a aba ativa
   * manter o rotulo sem cortar nem vazar. Exige `icon` em todas as opcoes.
   */
  collapseInactive?: boolean
}

/**
 * Controle segmentado em pilula (tablist). Setas, Home e End movem o foco e
 * ativam a aba (ativacao automatica); so a aba ativa e tabulavel.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  collapseInactive = false,
}: SegmentedControlProps<T>) {
  const tabs = React.useRef<(HTMLButtonElement | null)[]>([])
  const found = options.findIndex((o) => o.value === value)
  const activeIndex = found >= 0 ? found : 0

  const move = (index: number) => {
    const next = options[index]
    if (!next) return
    onChange(next.value)
    tabs.current[index]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1
    let target: number | null = null
    if (e.key === "ArrowRight") target = activeIndex >= last ? 0 : activeIndex + 1
    else if (e.key === "ArrowLeft") target = activeIndex <= 0 ? last : activeIndex - 1
    else if (e.key === "Home") target = 0
    else if (e.key === "End") target = last
    if (target === null) return
    e.preventDefault()
    move(target)
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("rounded-full bg-inset p-1", size === "sm" ? "inline-flex" : "flex")}
    >
      {options.map((option, index) => {
        const selected = index === activeIndex
        const Icon = option.icon
        const iconOnly = collapseInactive && !selected && Icon !== undefined
        return (
          <button
            key={option.value}
            ref={(el) => {
              tabs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            aria-label={iconOnly ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-full text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              iconOnly ? "w-11 shrink-0 px-0" : size === "sm" ? "px-3" : "flex-1 px-4",
              selected
                ? "bg-card text-foreground shadow-[0_1px_4px_rgba(0,0,0,.08)]"
                : "text-muted-foreground"
            )}
          >
            {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
            {iconOnly ? null : option.label}
          </button>
        )
      })}
    </div>
  )
}
