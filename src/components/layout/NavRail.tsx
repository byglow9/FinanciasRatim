import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Calendar,
  ChartPie,
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

// Dock flutuante da casca nova (S1, IDEN-07, D-20): pilula rolavel so de icones com os 8 destinos e
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

// Mascara de 24px so do lado que tem conteudo escondido.
function fadeStyle(fade: { left: boolean; right: boolean }): CSSProperties | undefined {
  if (!fade.left && !fade.right) return undefined
  const start = fade.left ? 'transparent 0, #000 24px' : '#000 0'
  const end = fade.right ? '#000 calc(100% - 24px), transparent 100%' : '#000 100%'
  const mask = `linear-gradient(to right, ${start}, ${end})`
  return { maskImage: mask, WebkitMaskImage: mask }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
        readOnly ? 'bg-track text-muted-foreground' : 'bg-brand text-white'
      )}
    >
      <Plus className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

export function NavRail() {
  const location = useLocation()
  const { currentArea, setCurrentArea, lastPerson } = useArea()
  const navRef = useRef<HTMLElement>(null)
  // Sem JavaScript a mascara da direita fica ligada (como no mockup); o estado real vem do scroll.
  const [fade, setFade] = useState({ left: false, right: true })

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

  // Fade de borda: scroll e resize passivos. A primeira medida entra por requestAnimationFrame
  // para nao atualizar estado de forma sincrona dentro do efeito.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const update = () => {
      const left = nav.scrollLeft > 0
      const right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1
      setFade((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
    }
    const frame = window.requestAnimationFrame(update)
    nav.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      nav.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // A cada mudanca de rota o item ativo rola para o centro da pilula.
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    active?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [pathname])

  return (
    <div className="fixed inset-x-3 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[560px] items-center gap-2">
      <nav
        ref={navRef}
        aria-label="Navegação principal"
        style={fadeStyle(fade)}
        className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-full border border-border bg-surface-2 p-2 shadow-float"
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
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                active
                  ? 'bg-action text-action-text'
                  : 'text-muted-foreground hover:bg-card'
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
