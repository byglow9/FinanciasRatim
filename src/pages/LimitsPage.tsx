import { Link, useLocation } from 'react-router-dom'
import { CircleAlert, Settings } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleBudget } from '@/hooks/useCycleBudget'
import { useHashReveal } from '@/hooks/useSectionReveal'
import { LimitsList } from '@/components/limits/LimitRow'
import { Notice } from '@/components/ui/notice'

/**
 * Id da linha pedida pelo hash (`#cat-{id}`, vindo de um aviso do sino). Sem estado: sai da URL a
 * cada renderização. Valor inválido ou de outro tipo vira nulo (T-03-81); o hash nunca vira seletor.
 */
function expandIdFromHash(hash: string): string | undefined {
  if (!hash.startsWith('#cat-')) return undefined
  try {
    const decoded = decodeURIComponent(hash.slice(1))
    return decoded.length > 4 ? decoded : undefined
  } catch {
    return undefined
  }
}

/**
 * Central de Limites e Cartões (S4, D-21): só exibe o estado de cada limite e seus lançamentos.
 * O ajuste é em Configurações; nada aqui edita limite nem bloqueia gasto (D-09).
 */
export function LimitsPage() {
  const { categoryDefs } = useArea()
  const { viewPerson } = useCycle()
  const { hash } = useLocation()
  const { view, loading, error, refetch } = useCycleBudget(viewPerson)

  const expandId = expandIdFromHash(hash)
  // Só rola depois que a view carregou: antes disso a linha ainda não existe.
  useHashReveal(undefined, view !== null)

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
      <header>
        <h1 data-section-title tabIndex={-1} className="font-display text-[28px] font-bold leading-tight focus-visible:outline-none">
          Central de Limites
        </h1>
        <p className="mt-1 text-xs font-normal text-muted-foreground">Passar do limite só avisa. Nada é bloqueado.</p>
      </header>

      {view === null && loading && (
        <div aria-busy="true">
          <p className="sr-only" role="status">
            Carregando seus números
          </p>
          <div className="space-y-4" aria-hidden="true">
            {[96, 288].map((h) => (
              <div key={h} className="anim-pulse rounded-card bg-card" style={{ height: h }} />
            ))}
          </div>
        </div>
      )}

      {view === null && !loading && error !== null && (
        <Notice
          tone="danger"
          icon={CircleAlert}
          title="Não foi possível carregar seus números."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tentar de novo
            </button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      )}

      {view !== null && (
        <>
          <LimitsList
            rows={view.spend.rows}
            generalCents={view.spend.generalCents}
            generalByCategory={view.spend.generalByCategory}
            categoryDefs={categoryDefs}
            neutralOk={view.verdictSuppressed}
            expandId={expandId}
          />
          <Link
            to="/configuracoes#categorias"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-input text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
            Ajustar em Configurações
          </Link>
        </>
      )}
    </div>
  )
}
