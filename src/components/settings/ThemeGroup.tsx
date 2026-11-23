import { useRef, type KeyboardEvent } from 'react'
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import type { ThemePref } from '@shared/core/theme.js'

interface ThemeOption {
  value: ThemePref
  name: string
  description: string
  icon: LucideIcon
}

const OPTIONS: ThemeOption[] = [
  { value: 'auto', name: 'Automático', description: 'Segue o tema do celular', icon: Monitor },
  { value: 'claro', name: 'Claro', description: 'Sempre claro', icon: Sun },
  { value: 'escuro', name: 'Escuro', description: 'Sempre escuro', icon: Moon },
]

/**
 * Grupo "Tema" do cartão Aparência (UI-SPEC S3, D-08, D-09): Automático, Claro e Escuro.
 * É preferência do aparelho, não dado do casal: aplica na hora, sem botão de salvar, sem aviso e sem rede,
 * e por isso nunca fica desabilitado em somente leitura (P-13).
 * Radiogroup: setas, Home e End movem e ativam; só a opção marcada é tabulável.
 */
export function ThemeGroup() {
  const { pref, setPref } = useTheme()
  const rows = useRef<(HTMLButtonElement | null)[]>([])

  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === pref)
  )

  const choose = (index: number) => {
    const option = OPTIONS[index]
    if (option) setPref(option.value)
  }

  const move = (index: number) => {
    rows.current[index]?.focus()
    choose(index)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = OPTIONS.length - 1
    let target: number | null = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') target = activeIndex >= last ? 0 : activeIndex + 1
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') target = activeIndex <= 0 ? last : activeIndex - 1
    else if (e.key === 'Home') target = 0
    else if (e.key === 'End') target = last
    if (target === null) return
    e.preventDefault()
    move(target)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold">Tema</h3>
      <div role="radiogroup" aria-label="Tema do aplicativo" onKeyDown={onKeyDown} className="space-y-2">
        {OPTIONS.map((option, index) => {
          const checked = option.value === pref
          const Icon = option.icon
          return (
            <button
              key={option.value}
              ref={(el) => {
                rows.current[index] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => choose(index)}
              className={cn(
                'flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                checked ? 'border-2 border-action' : 'border-2 border-transparent'
              )}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{option.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">{option.description}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  checked ? 'bg-action text-action-text' : 'border-2 border-input'
                )}
              >
                {checked ? <Check className="h-4 w-4" /> : null}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs font-normal text-muted-foreground">Vale só neste aparelho.</p>
    </div>
  )
}
