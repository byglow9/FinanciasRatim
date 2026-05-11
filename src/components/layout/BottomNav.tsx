import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutGrid,
  ArrowLeftRight,
  Receipt,
  Calendar,
  Target,
  BarChart3,
  StickyNote,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { href: '/contas-fixas', label: 'Contas', icon: Receipt },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/anotacoes', label: 'Notas', icon: StickyNote },
]

export function BottomNav() {
  const location = useLocation()

  // Calcular índice ativo para a linha indicadora
  const activeIndex = navItems.findIndex(item => item.href === location.pathname)
  const validIndex = activeIndex >= 0 ? activeIndex : 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t md:hidden">
      {/* Linha indicadora animada */}
      <div
        className="absolute top-0 h-0.5 bg-primary transition-all duration-300 ease-out"
        style={{
          width: `calc(100% / ${navItems.length})`,
          transform: `translateX(${validIndex * 100}%)`
        }}
      />
      <div className="grid grid-cols-7">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
