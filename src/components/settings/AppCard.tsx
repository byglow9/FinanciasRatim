import { useState } from 'react'
import { ChevronRight, Smartphone } from 'lucide-react'
import { InstallSteps } from '@/components/onboarding/InstallSteps'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Sheet } from '@/components/ui/sheet'
import { usePwaInstall } from '@/hooks/usePwaInstall'

/**
 * Cartão "Aplicativo" (UI-SPEC S3, IDEN-03, P-02): caminho para quem pulou o onboarding chegar aos passos de
 * adicionar o Coinc à tela inicial. Não depende de rede, de área nem de somente leitura (preferência do aparelho).
 */
export function AppCard() {
  const { isStandalone } = usePwaInstall()
  const [open, setOpen] = useState(false)

  return (
    <SettingsCard id="aplicativo" icon={Smartphone} title="Aplicativo" subtitle="Coinc na tela inicial">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">Adicionar à tela inicial</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {isStandalone ? 'Já está na tela inicial' : 'Passo a passo para Android e iPhone'}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Adicionar à tela inicial">
        <div className="mt-4">
          <InstallSteps />
        </div>
      </Sheet>
    </SettingsCard>
  )
}
