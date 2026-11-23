import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginForm } from './LoginForm'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { markOnboardingSeen, readOnboardingSeen } from '@/lib/onboarding'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  // Pular ou Entrar encerram o onboarding nesta sessao mesmo se o armazenamento recusar a gravacao.
  const [dismissed, setDismissed] = useState(false)

  // Quem ja tem sessao nunca ve o onboarding: a marca e gravada em silencio, fora da renderizacao (P-05).
  useEffect(() => {
    if (!loading && user && !readOnboardingSeen()) markOnboardingSeen()
  }, [loading, user])

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    // Portao do onboarding: depois do carregamento da sessao e antes do Login (D-17).
    if (!dismissed && !readOnboardingSeen()) {
      return <Onboarding mode="first" onFinish={() => setDismissed(true)} />
    }
    return <LoginForm />
  }

  return <>{children}</>
}
