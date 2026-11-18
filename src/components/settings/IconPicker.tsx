import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { iconComponent } from '@/lib/categoryIcons'
import { cn } from '@/lib/utils'
import { DEFAULT_EVENT_CATEGORY_COLORS } from '@/types'
import { CATEGORY_ICONS } from '@shared/core/categories.js'

const COLUMNS = 6

// Nome em português de cada ícone permitido (leitor de tela). A ordem de exibição vem de
// CATEGORY_ICONS, a tabela única do núcleo; aqui só entra o rótulo.
const ICON_LABELS: Record<string, string> = {
  'shopping-cart': 'Carrinho',
  'utensils': 'Alimentação',
  'car': 'Carro',
  'house': 'Casa',
  'heart-pulse': 'Saúde',
  'party-popper': 'Lazer',
  'graduation-cap': 'Educação',
  'shirt': 'Roupa',
  'wrench': 'Serviços',
  'banknote': 'Dinheiro',
  'trending-up': 'Investimento',
  'tag': 'Etiqueta',
  'credit-card': 'Cartão',
  'wallet': 'Carteira',
  'landmark': 'Banco',
  'layout-grid': 'Geral',
}

// Nome em português de cada cor da paleta existente (mesma ordem de DEFAULT_EVENT_CATEGORY_COLORS).
const COLOR_LABELS = ['Laranja', 'Azul', 'Roxo', 'Vermelho', 'Verde', 'Ciano', 'Rosa', 'Âmbar', 'Esmeralda', 'Índigo']

interface IconPickerProps {
  // Nome do ícone escolhido (um de CATEGORY_ICONS).
  value: string
  onChange: (icon: string) => void
  disabled?: boolean
}

/**
 * Seletor de ícone (UI-SPEC S5): radiogroup de 6 colunas com os 16 ícones permitidos.
 * Setas movem a escolha (esquerda e direita um ícone, cima e baixo uma linha); só o ícone
 * escolhido entra na ordem de Tab.
 */
export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const icons: string[] = CATEGORY_ICONS
  const found = icons.indexOf(value)
  const current = found >= 0 ? found : 0

  const move = (index: number) => {
    const next = Math.max(0, Math.min(icons.length - 1, index))
    onChange(icons[next])
    buttons.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    let target: number | null = null
    if (e.key === 'ArrowRight') target = current + 1
    else if (e.key === 'ArrowLeft') target = current - 1
    else if (e.key === 'ArrowDown') target = current + COLUMNS
    else if (e.key === 'ArrowUp') target = current - COLUMNS
    else if (e.key === 'Home') target = 0
    else if (e.key === 'End') target = icons.length - 1
    if (target === null) return
    e.preventDefault()
    move(target)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Ícone"
      onKeyDown={onKeyDown}
      className="mt-2 grid grid-cols-6 justify-items-center gap-1"
    >
      {icons.map((name, index) => {
        const selected = index === found
        const Icon = iconComponent(name)
        return (
          <button
            key={name}
            ref={(el) => {
              buttons.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={ICON_LABELS[name] ?? name}
            tabIndex={index === current ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(name)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'bg-action text-action-text' : 'bg-card text-foreground'
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

interface ColorPaletteProps {
  // Cor escolhida (hexadecimal de DEFAULT_EVENT_CATEGORY_COLORS), ou vazio.
  value: string
  onChange: (color: string) => void
  disabled?: boolean
  ariaLabel?: string
}

/**
 * Paleta de cores (UI-SPEC S5): bolinhas de 32px com área de toque de 44px, a partir de
 * DEFAULT_EVENT_CATEGORY_COLORS. A escolhida ganha um anel. Radiogroup com setas.
 */
export function ColorPalette({ value, onChange, disabled, ariaLabel = 'Cor' }: ColorPaletteProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const colors = DEFAULT_EVENT_CATEGORY_COLORS
  const found = colors.indexOf(value)
  const current = found >= 0 ? found : 0

  const move = (index: number) => {
    const next = (index + colors.length) % colors.length
    onChange(colors[next])
    buttons.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    let target: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = current + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = current - 1
    if (target === null) return
    e.preventDefault()
    move(target)
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown} className="mt-1 flex flex-wrap gap-x-1">
      {colors.map((color, index) => {
        const selected = index === found
        return (
          <button
            key={color}
            ref={(el) => {
              buttons.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLOR_LABELS[index] ?? `Cor ${index + 1}`}
            tabIndex={index === current ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(color)}
            className="group flex h-11 w-11 items-center justify-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              aria-hidden="true"
              style={{ backgroundColor: color }}
              className={cn(
                'h-8 w-8 rounded-full ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ring',
                selected && 'ring-2 ring-foreground group-focus-visible:ring-foreground'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
