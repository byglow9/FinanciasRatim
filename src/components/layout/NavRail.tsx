import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Calendar,
  ChartPie,
  CreditCard,
  Flag,
  House,
  PiggyBank,
  Plus,
  Receipt,
  Repeat,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useLaunch } from '@/contexts/LaunchContext'
import { cn } from '@/lib/utils'

// Dock flutuante da casca nova (S1, IDEN-07, D-20): pilula rolavel so de icones com os 9 destinos e
// o botao + de lancamento ao lado. Uma so navegacao: o Header, a BottomNav e o AreaSelector sairam.

interface Destination {
  href: string
  label: string
  icon: LucideIcon
}

const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Início', icon: House },
  { href: '/transacoes', label: 'Transações', icon: Receipt },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/contas-fixas', label: 'Contas fixas', icon: Repeat },
  { href: '/cartoes', label: 'Cartões', icon: CreditCard },
  { href: '/metas', label: 'Metas', icon: Flag },
  { href: '/relatorios', label: 'Relatórios', icon: ChartPie },
  { href: '/casal', label: 'Casal', icon: Users },
  { href: '/porquinho', label: 'Porquinho', icon: PiggyBank },
]

// Inicio so casa no caminho exato; os demais destinos casam por prefixo de segmento.
function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Portada de themes/dock.js (sketch 012): so rola se o item nao estiver inteiramente visivel e
// alinha ao inicio (com 6px de folga), entao o item da esquerda nunca fica cortado.
function center(nav: HTMLElement, el: HTMLElement, smooth: boolean): void {
  const l = el.offsetLeft - 6
  const r = el.offsetLeft + el.offsetWidth + 6
  const v0 = nav.scrollLeft
  const v1 = v0 + nav.clientWidth
  if (l >= v0 && r <= v1) return
  nav.scrollTo({ left: Math.max(0, l), behavior: smooth ? 'smooth' : 'auto' })
}

function LaunchFab() {
  const { readOnly } = useArea()
  const { open } = useLaunch()

  // Em somente leitura o botao segue focavel e o clique ainda chama open: a guarda do
  // LaunchProvider mostra o toast.
  return (
    <button
      type="button"
      aria-label="Novo lançamento"
      title="Novo lançamento"
      aria-disabled={readOnly ? 'true' : undefined}
      onClick={() => open('gasto')}
      className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-float transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        readOnly ? 'bg-track text-muted-foreground' : 'bg-fab text-fab-fg'
      )}
    >
      <Plus className="size-7" strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

export function NavRail() {
  const location = useLocation()
  const { currentArea, setCurrentArea, lastPerson } = useArea()
  const navRef = useRef<HTMLElement>(null)
  // Porquinho derivado da rota: entrar em /porquinho liga a area, qualquer outra rota devolve o
  // ultimo perfil de pessoa (D-02: a Home nunca mostra Pode gastar no Porquinho).
  const pathname = location.pathname
  useEffect(() => {
    if (pathname === '/porquinho') {
      if (currentArea !== 'porquinho') setCurrentArea('porquinho')
    } else if (currentArea === 'porquinho') {
      setCurrentArea(lastPerson)
    }
  }, [pathname, currentArea, lastPerson, setCurrentArea])

  // A cada mudanca de rota (e ao montar) o item ativo e alinhado ao inicio, so se nao estiver visivel.
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (nav && active) center(nav, active, !prefersReducedMotion())
  }, [pathname])

  return (
    <div className="fixed inset-x-3 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[560px] items-center gap-2">
      <nav
        ref={navRef}
        aria-label="Navegação principal"
        className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain rounded-full bg-dock p-1.5 shadow-float snap-x snap-mandatory scroll-px-1.5"
      >
        {DESTINATIONS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname)
          return (
            <Link
              key={href}
              to={href}
              aria-label={label}
              title={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-12 w-12 shrink-0 snap-start items-center justify-center rounded-full transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dock-fg focus-visible:ring-offset-2 focus-visible:ring-offset-dock',
                active
                  ? 'bg-dock-active text-dock-active-fg'
                  : 'text-dock-fg hover:bg-dock-fg/15'
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
            </Link>
          )
        })}
      </nav>
      <LaunchFab />
    </div>
  )
}
