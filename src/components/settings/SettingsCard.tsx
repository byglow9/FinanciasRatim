import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconCircle } from '@/components/ui/icon-circle'

interface SettingsCardProps {
  // Âncora do cartão (#ciclo, #aparencia...): a página rola até aqui e foca o título.
  id: string
  icon: LucideIcon
  title: string
  subtitle?: string
  /** Controle opcional à direita do cabeçalho (ex.: botão de ícone de 44px com aria-label). */
  action?: ReactNode
  children?: ReactNode
}

/**
 * Contêiner de cada cartão de Configurações (UI-SPEC S5): ícone de 44px, título focável
 * (a página foca `[data-section-title]` ao entrar com hash) e legenda. Só texto React.
 */
export function SettingsCard({ id, icon, title, subtitle, action, children }: SettingsCardProps) {
  return (
    <section id={id} className="scroll-mt-4 rounded-card bg-card p-4">
      <header className="flex items-center gap-3">
        <IconCircle icon={icon} />
        <div className="min-w-0 flex-1">
          <h2
            data-section-title
            tabIndex={-1}
            className="font-sans text-base font-bold leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs font-normal text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children ? <div className="mt-3 space-y-2">{children}</div> : null}
    </section>
  )
}
