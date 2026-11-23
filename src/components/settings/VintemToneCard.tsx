import { useRef, useState, type KeyboardEvent } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Chip } from '@/components/ui/chip'
import { Notice } from '@/components/ui/notice'
import { VintemInlineRow } from '@/components/vintem/VintemInlineRow'
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

// Exemplos aprovados do UI-SPEC (S6): textos fixos, sem sorteio e sem dado do usuario. A previa nunca
// consulta o banco de frases.
const TONE_EXAMPLES: Record<VintemTone, string> = {
  suave: 'Está perto do limite de Lazer, vale segurar.',
  direto: 'Lazer chegou a 82% do limite. Restam R$ 90.',
  'sem-filtro': 'Quarto delivery da semana, caralho. Seu fogão é enfeite?',
}

// A previa nao e uma fala de verdade: dispensar nao faz nada.
const keepPreview = () => {}

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar o tom. Confira a conexão e tente de novo.'

/**
 * Cartão "Vintém" (UI-SPEC S6, MASC-05): tom das falas, um só para o casal (documento de
 * configurações). Escolher salva na hora, confirma com aviso e, se falhar, reverte a seleção.
 * Radiogroup: setas, Home e End movem e ativam; só a opção ativa é tabulável.
 */
export function VintemToneCard() {
  const { settings, updateVintemTone, readOnly } = useArea()
  const { show } = useToast()

  const stored = vintemToneOf(settings)
  const [selected, setSelected] = useState<VintemTone>(stored)
  // Ressincroniza quando o documento chega depois da montagem (comparação na renderização).
  const [source, setSource] = useState<VintemTone>(stored)
  // Muda a cada troca do tom exibido: o balao da previa ganha um novo pop.
  const [pop, setPop] = useState(0)
  if (source !== stored) {
    setSource(stored)
    setSelected(stored)
    setPop((n) => n + 1)
  }

  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const rows = useRef<(HTMLButtonElement | null)[]>([])

  const choose = async (index: number) => {
    const option = OPTIONS[index]
    if (!option || readOnly || saving || option.value === selected) return
    const previous = selected
    setSelected(option.value)
    setPop((n) => n + 1)
    setFailed(false)
    setSaving(true)
    try {
      await updateVintemTone(option.value)
      show(`Tom do Vintém: ${option.name}`)
    } catch {
      setSelected(previous)
      setPop((n) => n + 1)
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === selected)
  )

  const move = (index: number) => {
    rows.current[index]?.focus()
    void choose(index)
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
    <SettingsCard id="vintem" icon={MessageCircle} title="Vintém" subtitle="Tom das falas">
      <div
        role="radiogroup"
        aria-label="Tom do Vintém"
        onKeyDown={onKeyDown}
        className="space-y-2"
      >
        {OPTIONS.map((option, index) => {
          const checked = option.value === selected
          return (
            <button
              key={option.value}
              ref={(el) => {
                rows.current[index] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={readOnly ? 'true' : undefined}
              tabIndex={checked ? 0 : -1}
              onClick={() => void choose(index)}
              className={cn(
                'flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                checked ? 'border-2 border-action' : 'border-2 border-transparent',
                readOnly && 'cursor-not-allowed'
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
      <p className="text-xs font-bold text-muted-foreground">Exemplo</p>
      <VintemInlineRow
        state="neutro"
        text={TONE_EXAMPLES[selected]}
        popKey={pop}
        onDismiss={keepPreview}
      />
      {readOnly ? <p className="text-xs font-normal text-muted-foreground">{READ_ONLY_HINT}</p> : null}
      {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}
    </SettingsCard>
  )
}
