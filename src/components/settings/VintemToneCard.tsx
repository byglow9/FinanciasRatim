import { useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Chip } from '@/components/ui/chip'
import { useToast } from '@/components/ui/toast'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { cn } from '@/lib/utils'
import { DEFAULT_VINTEM_TONE, vintemToneOf, type VintemTone } from '@/types'

interface ToneOption {
  value: VintemTone
  name: string
  description: string
}

const OPTIONS: ToneOption[] = [
  { value: 'suave', name: 'Suave', description: 'Acolhe e incentiva. Sem palavrão.' },
  { value: 'direto', name: 'Direto', description: 'Só informa, sem enfeite.' },
  {
    value: 'sem-filtro',
    name: 'Sem filtro',
    description: 'Zoa, xinga e solta palavrão. Sem atacar quem você é.',
  },
]

/**
 * Cartão "Vintém" (UI-SPEC S6, MASC-05): tom das falas, um só para o casal (documento de
 * configurações). Escolher salva na hora e confirma com aviso.
 */
export function VintemToneCard() {
  const { settings, updateVintemTone } = useArea()
  const { show } = useToast()

  // Seleção otimista enquanto a gravação não termina; null = vale o que está no documento.
  const [pending, setPending] = useState<VintemTone | null>(null)
  const selected = pending ?? vintemToneOf(settings)

  const choose = async (option: ToneOption) => {
    if (option.value === selected) return
    setPending(option.value)
    try {
      await updateVintemTone(option.value)
      show(`Tom do Vintém: ${option.name}`)
    } finally {
      setPending(null)
    }
  }

  return (
    <SettingsCard id="vintem" icon={MessageCircle} title="Vintém" subtitle="Tom das falas">
      <div role="radiogroup" aria-label="Tom do Vintém" className="space-y-2">
        {OPTIONS.map((option) => {
          const checked = option.value === selected
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => void choose(option).catch(() => undefined)}
              className={cn(
                'flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                checked ? 'border-2 border-action' : 'border-2 border-transparent'
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-base font-bold">{option.name}</span>
                  {option.value === DEFAULT_VINTEM_TONE ? <Chip tone="muted">padrão</Chip> : null}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {option.description}
                </span>
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
    </SettingsCard>
  )
}
