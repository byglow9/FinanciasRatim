import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { AlertsBell } from '@/components/layout/AlertsBell'
import { CycleSelector } from '@/components/layout/CycleSelector'
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher'

// Barra superior da casca nova (S1): ciclo a esquerda; sino, engrenagem das Configuracoes (D-20) e
// perfil a direita. Nao e fixa (rola com a pagina). O conteiner e `relative` porque o painel do
// sino se ancora nele, nao no botao. Montada pelo AppShell no Plano 18.
export function TopBar() {
  const { currentArea } = useArea()

  return (
    <header>
      <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-between gap-2 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="min-w-0 flex-1">
          {/* No Porquinho nao ha ciclo nem limite (D-02). */}
          {currentArea !== 'porquinho' && <CycleSelector />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AlertsBell />
          <Link
            to="/configuracoes"
            aria-label="Configurações"
            title="Configurações"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  )
}
