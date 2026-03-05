import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PiggyBank } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(data.email, data.password)
      } else {
        await signIn(data.email, data.password)
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential')) {
          setError('Email ou senha incorretos')
        } else if (err.message.includes('auth/email-already-in-use')) {
          setError('Email ja esta em uso')
        } else {
          setError('Erro ao fazer login. Tente novamente.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <PiggyBank className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Financas do Casal</CardTitle>
          <CardDescription>
            {isSignUp ? 'Crie sua conta para comecar' : 'Entre para gerenciar suas financas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : isSignUp ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <p>
                Ja tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:underline"
                >
                  Fazer login
                </button>
              </p>
            ) : (
              <p>
                Nao tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:underline"
                >
                  Criar conta
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
