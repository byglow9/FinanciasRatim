import { useAuth } from '@/contexts/AuthContext'
import { useArea } from '@/contexts/AreaContext'
import { AreaSelector } from '@/components/shared/AreaSelector'
import { Button } from '@/components/ui/button'
import { LogOut, Settings, PiggyBank } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/transacoes', label: 'Transacoes' },
  { href: '/contas-fixas', label: 'Contas Fixas' },
  { href: '/metas', label: 'Metas' },
  { href: '/relatorios', label: 'Relatorios' },
]

export function Header() {
  const { signOut, user } = useAuth()
  const { currentArea } = useArea()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <PiggyBank className="h-6 w-6 text-primary" />
              <span className="font-semibold hidden sm:inline">Financas</span>
            </Link>
          </div>

          <div className="flex-1 flex justify-center">
            <AreaSelector />
          </div>

          <div className="flex items-center gap-2">
            <Link to="/configuracoes">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {currentArea !== 'porquinho' && (
          <nav className="flex gap-1 pb-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
