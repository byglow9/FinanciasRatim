import { useState } from 'react'
import { CircleCheck, Download, EllipsisVertical, Share, SquarePlus, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { usePwaInstall, type PwaPlatform } from '@/hooks/usePwaInstall'

interface Step {
  /** Texto antes da palavra que ganha o icone. */
  before: string
  /** Palavra nomeada pelo icone (a instrucao nunca depende so do icone). */
  word?: string
  icon?: LucideIcon
  /** Texto depois da palavra. */
  after?: string
}

// Plano 05-23: exportados para a cena de adicionar do onboarding usar os mesmos textos e opcoes (os
// literais continuam neste arquivo, que a guarda do 05-11 le).
// eslint-disable-next-line react-refresh/only-export-components
export const DEVICE_OPTIONS: { value: PwaPlatform; label: string }[] = [
  { value: 'android', label: 'Android' },
  { value: 'iphone', label: 'iPhone' },
]

// Textos do contrato (UI-SPEC S4): "Adicionar à tela inicial", nunca "instalar", salvo a citacao do menu do Chrome.
const STEPS: Record<PwaPlatform, Step[]> = {
  android: [
    {
      before: 'Toque no ',
      word: 'menu',
      icon: EllipsisVertical,
      after: ' no canto superior direito do Chrome.',
    },
    { before: 'Escolha Adicionar à tela inicial (ou Instalar app).' },
    { before: 'Confirme em Adicionar. O ícone do Coinc aparece na sua tela.' },
  ],
  iphone: [
    { before: 'Abra o Coinc no Safari. Em outros navegadores essa opção pode não aparecer.' },
    {
      before: 'Toque em ',
      word: 'Compartilhar',
      icon: Share,
      after: ' na barra do Safari.',
    },
    {
      before: 'Role e escolha ',
      word: 'Adicionar à Tela de Início',
      icon: SquarePlus,
      after: ', depois toque em Adicionar.',
    },
  ],
}

export const ADDED_TEXT = 'Adicionado. Procure o ícone do Coinc na tela inicial.'
export const ALREADY_APP_TEXT = 'Você já está usando o Coinc como app.'

interface InstallStepsProps {
  /** Chamado depois que o navegador confirma a adição (usado pelo onboarding). */
  onDone?: () => void
}

/**
 * Passos para adicionar o Coinc à tela inicial (D-11, D-12): usado na folha de Ajustes e na 3ª tela do
 * onboarding. O botão nativo só existe quando o navegador entregou o evento; os passos ficam sempre à vista.
 */
export function InstallSteps({ onDone }: InstallStepsProps) {
  const { canPrompt, prompt, isStandalone, platform } = usePwaInstall()
  // Escolha manual do usuario; sem ela vale a plataforma do aparelho.
  const [picked, setPicked] = useState<PwaPlatform | null>(null)
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)
  const device = picked ?? platform

  if (isStandalone) {
    return <Notice tone="info" icon={CircleCheck} title={ALREADY_APP_TEXT} />
  }

  // Só no toque do usuário: o evento nunca é disparado sozinho (T-05-11-01).
  const addNow = async () => {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await prompt()
      if (outcome === 'accepted') {
        setAdded(true)
        onDone?.()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {canPrompt ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 w-full gap-2"
          disabled={busy}
          onClick={() => void addNow()}
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          Adicionar agora
        </Button>
      ) : null}

      {added ? <Notice tone="info" icon={CircleCheck} title={ADDED_TEXT} /> : null}

      <SegmentedControl
        ariaLabel="Aparelho"
        value={device}
        onChange={setPicked}
        options={DEVICE_OPTIONS}
      />

      <ol className="space-y-3">
        {STEPS[device].map((step, index) => {
          const Icon = step.icon
          return (
            <li key={`${device}-${index}`} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base font-bold"
              >
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 pt-1 text-base font-normal leading-normal">
                {step.before}
                {step.word}
                {Icon ? (
                  <Icon
                    className="mx-1 inline-block h-5 w-5 align-text-bottom"
                    aria-hidden="true"
                  />
                ) : null}
                {step.after}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
