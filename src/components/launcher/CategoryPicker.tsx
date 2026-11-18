import * as React from "react"
import type { CategoryDef } from "@/types"
import { iconComponent } from "@/lib/categoryIcons"
import { categoryIcon } from "@shared/core/categories.js"
import { cn } from "@/lib/utils"

interface CategoryPickerProps {
  categories: CategoryDef[]
  // Id da categoria escolhida.
  value: string | null
  onChange: (id: string) => void
}

/**
 * Seletor de categoria em radiogroup (UI-SPEC S3): coluna de 64px, circulo de 48px com o
 * icone do nucleo e o nome em uma linha. Setas, Home e End movem e escolhem; so a opcao
 * escolhida (ou a primeira, sem escolha) e tabulavel.
 */
export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const options = React.useRef<(HTMLButtonElement | null)[]>([])
  const found = categories.findIndex((c) => c.id === value)
  const activeIndex = found >= 0 ? found : 0

  const move = (index: number) => {
    const next = categories[index]
    if (!next) return
    onChange(next.id)
    options.current[index]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = categories.length - 1
    let target: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowDown") target = activeIndex >= last ? 0 : activeIndex + 1
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") target = activeIndex <= 0 ? last : activeIndex - 1
    else if (e.key === "Home") target = 0
    else if (e.key === "End") target = last
    if (target === null) return
    e.preventDefault()
    move(target)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Categoria"
      onKeyDown={onKeyDown}
      className="no-scrollbar flex gap-3 overflow-x-auto py-1 [@media(max-height:700px)]:py-0"
    >
      {categories.map((def, index) => {
        const selected = index === activeIndex && found >= 0
        const Icon = iconComponent(categoryIcon(def))
        return (
          <button
            key={def.id}
            ref={(el) => {
              options.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(def.id)}
            className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full [@media(max-height:700px)]:h-11 [@media(max-height:700px)]:w-11",
                selected ? "bg-action text-action-text" : "bg-card text-foreground"
              )}
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
            </span>
            <span
              className={cn(
                "w-full truncate text-center text-xs font-bold",
                selected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {def.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
