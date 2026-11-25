import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { NavRail } from '@/components/layout/NavRail'
import { ReadOnlyBanner } from '@/components/dashboard/ReadOnlyBanner'
import { LaunchSheet } from '@/components/launcher/LaunchSheet'
import { usePushRefresh } from '@/hooks/usePushRefresh'

interface AppShellProps {
  children: ReactNode
}

// Casca da Fase 3 (S1): barra superior (nao fixa), faixa de somente leitura, conteudo com folga
// para o dock flutuante, o proprio dock e o sheet de lancamento. Vive dentro dos providers de
// ProtectedRoute, CycleProvider, LimitAlertsProvider e LaunchProvider.
export function AppShell({ children }: AppShellProps) {
  usePushRefresh()
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto w-full max-w-[560px] px-4">
        <ReadOnlyBanner />
      </div>
      <main className="container mx-auto max-w-4xl px-4 py-6 pb-[calc(112px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <NavRail />
      <LaunchSheet />
    </div>
  )
}
