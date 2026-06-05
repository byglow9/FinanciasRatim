import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PiggyBank } from 'lucide-react'
import { useState } from 'react'

const loginSchema = z.object({
  credential: z.string().min(1, 'Usuario obrigatorio'),
  password: z.string().min(1, 'Senha obrigatoria'),
})

type LoginFormData = z.infer<typeof loginSchema>

type Mode = 'login' | 'signup'

export function LoginForm() {
  const { signIn, signUp } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('login')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    try {
      if (mode === 'signup') {
        const emailResult = z.string().email().safeParse(data.credential)
        if (!emailResult.success) {
          throw new Error('Use um e-mail valido para criar conta')
        }
        if (data.password.length < 6) {
          throw new Error('A senha precisa ter ao menos 6 caracteres')
        }
        await signUp(emailResult.data, data.password)
      } else {
        await signIn(data.credential, data.password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    }
  }

  const toggleMode = () => {
    setError(null)
    reset()
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
  }

  const isSignup = mode === 'signup'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <PiggyBank className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Financias Ratimbum</CardTitle>
          <CardDescription>
            {isSignup ? 'Crie sua conta para comecar' : 'Entre para gerenciar suas financas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credential">{isSignup ? 'E-mail' : 'Usuario ou e-mail'}</Label>
              <Input
                id="credential"
                type={isSignup ? 'email' : 'text'}
                placeholder={isSignup ? 'seu@email.com' : 'seu usuario'}
                autoComplete={isSignup ? 'email' : 'username'}
                {...register('credential')}
              />
              {errors.credential && (
                <p className="text-sm text-destructive">{errors.credential.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? isSignup
                  ? 'Criando conta...'
                  : 'Entrando...'
                : isSignup
                  ? 'Criar conta'
                  : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? 'Ja tem uma conta?' : 'Nao tem conta?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? 'Entrar' : 'Criar conta'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
