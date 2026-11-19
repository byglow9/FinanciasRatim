import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { SearchField } from '@/components/ui/search-field'
import { iconComponent } from '@/lib/categoryIcons'
import { cn } from '@/lib/utils'
import { DEFAULT_EVENT_CATEGORY_COLORS } from '@/types'
import { CATEGORY_ICON_GROUPS, CATEGORY_ICONS } from '@shared/core/categories.js'

// Nome em português de cada ícone permitido (leitor de tela e busca). A ordem e os grupos vêm de
// CATEGORY_ICON_GROUPS, a tabela única do núcleo; aqui só entra o rótulo.
const ICON_LABELS: Record<string, string> = {
  'house': 'Casa',
  'sofa': 'Sofá',
  'bed-double': 'Quarto',
  'bath': 'Banheiro',
  'washing-machine': 'Lavanderia',
  'hammer': 'Reforma',
  'lightbulb': 'Lâmpada',
  'utensils': 'Alimentação',
  'shopping-cart': 'Carrinho',
  'coffee': 'Café',
  'pizza': 'Pizza',
  'apple': 'Fruta',
  'wine': 'Vinho',
  'car': 'Carro',
  'bus': 'Ônibus',
  'train-front': 'Trem',
  'bike': 'Bicicleta',
  'fuel': 'Combustível',
  'plane': 'Avião',
  'car-taxi-front': 'Táxi',
  'heart-pulse': 'Saúde',
  'stethoscope': 'Consulta',
  'pill': 'Remédio',
  'hospital': 'Hospital',
  'dumbbell': 'Academia',
  'smile': 'Dentista',
  'party-popper': 'Lazer',
  'clapperboard': 'Cinema',
  'music': 'Música',
  'gamepad-2': 'Jogos',
  'ticket': 'Ingresso',
  'tv': 'Streaming',
  'tree-palm': 'Viagem',
  'cigarette': 'Cigarro',
  'cannabis': 'Folha',
  'shopping-bag': 'Sacola',
  'shirt': 'Roupa',
  'gem': 'Joia',
  'gift': 'Presente',
  'store': 'Loja',
  'sparkles': 'Beleza',
  'graduation-cap': 'Educação',
  'book-open': 'Livro',
  'backpack': 'Mochila',
  'languages': 'Idiomas',
  'briefcase': 'Trabalho',
  'laptop': 'Computador',
  'wrench': 'Serviços',
  'smartphone': 'Celular',
  'wifi': 'Internet',
  'users': 'Família',
  'baby': 'Bebê',
  'heart': 'Coração',
  'cake': 'Aniversário',
  'paw-print': 'Pets',
  'dog': 'Cachorro',
  'cat': 'Gato',
  'fish': 'Peixe',
  'receipt': 'Recibo',
  'credit-card': 'Cartão',
  'wallet': 'Carteira',
  'zap': 'Energia',
  'droplets': 'Água',
  'flame': 'Gás',
  'shield-check': 'Seguro',
  'trending-up': 'Investimento',
  'banknote': 'Dinheiro',
  'piggy-bank': 'Poupança',
  'coins': 'Moedas',
  'chart-line': 'Gráfico',
  'landmark': 'Banco',
  'bitcoin': 'Criptomoeda',
  'target': 'Meta',
  'hand-coins': 'Rendimento',
  'circle-dollar-sign': 'Cifrão',
  'tag': 'Etiqueta',
  'layout-grid': 'Geral',
  'star': 'Estrela',
  'map-pin': 'Local',
}

// Termos extras de busca (sem acento) além do nome: achar "tabaco" ou "maconha" sem rotular o ícone assim.
const ICON_KEYWORDS: Record<string, string> = {
  cigarette: 'tabaco fumo cigarro vicio',
  cannabis: 'maconha erva planta folha cannabis vicio',
}

/** Minúsculas e sem acento, para a busca achar "cafe" em "Café". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

// Nome em português de cada cor da paleta existente (mesma ordem de DEFAULT_EVENT_CATEGORY_COLORS).
const COLOR_LABELS = ['Laranja', 'Azul', 'Roxo', 'Vermelho', 'Verde', 'Ciano', 'Rosa', 'Âmbar', 'Esmeralda', 'Índigo']

interface IconPickerProps {
  // Nome do ícone escolhido (um de CATEGORY_ICONS).
  value: string
  onChange: (icon: string) => void
  disabled?: boolean
}

/**
 * Seletor de ícone (UI-SPEC S5): busca por nome e radiogroup de 6 colunas com os ícones permitidos,
 * por grupo (Casa, Comida, Transporte...), numa área que rola. Setas movem a escolha (esquerda e direita
 * um ícone, cima e baixo uma linha); só o ícone escolhido entra na ordem de Tab.
 */
export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map())
  const scroller = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = fold(query.trim())
    return CATEGORY_ICON_GROUPS.map((group) => ({
      ...group,
      icons: group.icons.filter(
        (name) =>
          q === '' ||
          fold(ICON_LABELS[name] ?? name).includes(q) ||
          fold(ICON_KEYWORDS[name] ?? '').includes(q) ||
          fold(group.label).includes(q)
      ),
    })).filter((group) => group.icons.length > 0)
  }, [query])
  const icons: string[] = groups.flatMap((g) => g.icons)
  const valid = (CATEGORY_ICONS as string[]).includes(value)
  const found = valid ? icons.indexOf(value) : -1
  const current = found >= 0 ? found : 0

  // O ícone escolhido aparece à vista ao abrir.
  useEffect(() => {
    buttons.current.get(value)?.scrollIntoView({ block: 'nearest' })
    // Só na abertura: escolher outro ícone não rola a lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusAt = (index: number) => {
    const next = Math.max(0, Math.min(icons.length - 1, index))
    onChange(icons[next])
    buttons.current.get(icons[next])?.focus()
  }

  // Cima e baixo: o ícone da linha vizinha mais próximo na horizontal (os grupos quebram a grade).
  const vertical = (direction: 1 | -1): number | null => {
    const from = buttons.current.get(icons[current])?.getBoundingClientRect()
    if (!from) return null
    let best: { index: number; score: number } | null = null
    icons.forEach((name, index) => {
      const rect = buttons.current.get(name)?.getBoundingClientRect()
      if (!rect) return
      const dy = (rect.top - from.top) * direction
      if (dy < 4) return
      const score = dy * 1000 + Math.abs(rect.left - from.left)
      if (best === null || score < best.score) best = { index, score }
    })
    return (best as { index: number } | null)?.index ?? null
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || icons.length === 0) return
    let target: number | null = null
    if (e.key === 'ArrowRight') target = current + 1
    else if (e.key === 'ArrowLeft') target = current - 1
    else if (e.key === 'ArrowDown') target = vertical(1)
    else if (e.key === 'ArrowUp') target = vertical(-1)
    else if (e.key === 'Home') target = 0
    else if (e.key === 'End') target = icons.length - 1
    if (target === null) return
    e.preventDefault()
    focusAt(target)
  }

  return (
    <div className="mt-2 space-y-2">
      <SearchField value={query} onChange={setQuery} ariaLabel="Buscar ícone" placeholder="Buscar ícone" />
      <div ref={scroller} className="max-h-[min(40dvh,264px)] overflow-y-auto overscroll-contain pr-1">
        <div role="radiogroup" aria-label="Ícone" onKeyDown={onKeyDown} className="space-y-2">
          {icons.length === 0 ? (
            <p className="py-3 text-xs font-normal text-muted-foreground">Nenhum ícone com esse nome.</p>
          ) : null}
          {groups.map((group) => (
            <div key={group.id} role="presentation">
              <p className="px-1 pb-1 text-xs font-bold text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-6 justify-items-center gap-1">
                {group.icons.map((name) => {
                  const selected = name === value
                  const Icon = iconComponent(name)
                  return (
                    <button
                      key={name}
                      ref={(el) => {
                        if (el) buttons.current.set(name, el)
                        else buttons.current.delete(name)
                      }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={ICON_LABELS[name] ?? name}
                      title={ICON_LABELS[name] ?? name}
                      tabIndex={name === icons[current] ? 0 : -1}
                      disabled={disabled}
                      onClick={() => onChange(name)}
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                        selected ? 'bg-action text-action-text' : 'bg-surface-2 text-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
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
