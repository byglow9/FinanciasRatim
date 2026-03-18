import type { ReactNode } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6 max-w-4xl">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
