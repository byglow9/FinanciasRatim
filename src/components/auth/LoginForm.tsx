import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Eye, EyeOff, Lock, Mail, PiggyBank } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Mensagem fixa e generica: o texto cru do provedor de autenticacao nunca vai para a tela.
const AUTH_FAILED_MESSAGE = 'E-mail ou senha incorretos.'

// Campo moderno: 56px, fundo preenchido, rotulo sempre visivel dentro do campo, icone a esquerda
// e anel de foco na cor de acao (o foco e desenhado no contorno, nao no input).
const fieldShell =
  'relative h-14 rounded-btn border-2 border-transparent bg-surface-2 transition-colors focus-within:border-action focus-within:ring-4 focus-within:ring-action/20'
const fieldInvalid = 'border-danger-ink focus-within:border-danger-ink focus-within:ring-danger-ink/20'
const fieldLabel =
  'pointer-events-none absolute left-12 top-2 text-xs font-bold leading-none text-muted-foreground'
const fieldInput =
  'h-full rounded-btn border-0 bg-transparent pb-1 pl-12 pr-4 pt-6 focus-visible:ring-0 focus-visible:ring-offset-0'
const fieldIcon = 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground'
const fieldError = 'mt-1 px-1 text-xs font-bold text-danger-ink'

export function LoginForm() {
  const { signIn, accessError } = useAuth()
  const [authFailed, setAuthFailed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    shouldFocusError: true,
  })

  const onSubmit = async (data: LoginFormData) => {
    setAuthFailed(false)
    try {
      await signIn(data.email, data.password)
    } catch {
      setAuthFailed(true)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-[22px] bg-card px-4 py-6">
        <div className="grid justify-items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-action">
            <PiggyBank className="size-7" aria-hidden="true" />
          </span>
          <h1 className="font-display text-[28px] font-bold leading-[1.2]">Financias Ratimbum</h1>
          <p className="text-base font-normal text-muted-foreground">Entre para gerenciar suas finanças</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Entrar"
          aria-busy={isSubmitting}
          className="mt-4 space-y-4"
        >
          <div>
            <div className={cn(fieldShell, errors.email && fieldInvalid)}>
              <Mail className={fieldIcon} aria-hidden="true" />
              <Label htmlFor="email" className={fieldLabel}>
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="voce@email.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                readOnly={isSubmitting}
                className={fieldInput}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p id="email-error" role="alert" className={fieldError}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className={cn(fieldShell, errors.password && fieldInvalid)}>
              <Lock className={fieldIcon} aria-hidden="true" />
              <Label htmlFor="password" className={fieldLabel}>
                Senha
              </Label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                readOnly={isSubmitting}
                className={cn(fieldInput, 'pr-14')}
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p id="password-error" role="alert" className={fieldError}>
                {errors.password.message}
              </p>
            )}
          </div>

          {authFailed && (
            <Notice tone="danger" icon={AlertCircle} title={AUTH_FAILED_MESSAGE} />
          )}
          {accessError && (
            <Notice tone="danger" icon={AlertCircle} title={accessError} />
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="h-14 w-full bg-action text-action-text hover:bg-action/90"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
