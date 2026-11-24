import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CoincWordmark } from '@/components/brand/CoincWordmark'
import { Vintem } from '@/components/vintem/Vintem'
import { VintemSay } from '@/components/vintem/VintemSay'
import { clearLegacyOrigin, hasLegacyOrigin } from '@/lib/legacyOrigin'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Falas fixas e genericas do Vintem (sketch 029): o texto cru do provedor de autenticacao, o e-mail
// digitado e o parametro de origem nunca vao para a tela. Uma unica fala para credencial errada
// (nao revela se a conta existe).
const SAY_CREDENTIALS = 'Hmm, e-mail ou senha não batem. Confere aí?'
// Sem rede a tentativa nem comeca: a falha de rede nao pode virar "credencial errada".
const SAY_OFFLINE = 'Sem internet por aqui. Liga o Wi-Fi ou os dados e tenta de novo.'
const SAY_NEW_ADDRESS = 'O Coinc mudou de endereço. Entre de novo por aqui. Seus dados continuam salvos.'
const SAY_ID = 'login-say'

// Campo em pilula (S29-06): 56px, fundo de cartao, rotulo sempre visivel dentro do campo, icone a
// esquerda e anel de foco na cor de acao (o foco e desenhado no contorno, nao no input).
const fieldShell =
  'relative h-14 rounded-full border-[1.5px] border-input bg-card transition-colors focus-within:border-action focus-within:ring-4 focus-within:ring-action/20'
const fieldInvalid = 'border-danger-ink focus-within:border-danger-ink focus-within:ring-danger-ink/20'
// Tom do campo quando a fala do Vintem avisa: erro (credencial, conta sem acesso) ou aviso (sem conexao).
const fieldDanger = 'border-danger bg-danger-bg text-danger-ink focus-within:border-danger focus-within:ring-danger/20'
const fieldWarn = 'border-warn bg-warn-bg text-warn-ink focus-within:border-warn focus-within:ring-warn/20'
const fieldLabel = 'pointer-events-none absolute left-12 top-2 text-xs font-bold leading-none'
const fieldInput =
  'h-full rounded-btn border-0 bg-transparent pb-1 pl-12 pr-4 pt-6 focus-visible:ring-0 focus-visible:ring-offset-0'
const fieldIcon = 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2'
const fieldError = 'mt-1 px-1 text-xs font-bold text-danger-ink'

export function LoginForm() {
  const { signIn, accessError } = useAuth()
  const [authFailed, setAuthFailed] = useState(false)
  const [offline, setOffline] = useState(false)
  // Lido uma vez ao montar: a marca vem do boot (redirect do site antigo) e sobrevive ao onboarding.
  const [legacyOrigin, setLegacyOrigin] = useState(() => hasLegacyOrigin())
  const [showPassword, setShowPassword] = useState(false)

  // Digitar em qualquer campo apaga credencial errada, sem conexao e endereco novo (este nao volta
  // mais nesta montagem). A conta sem acesso so some pelo contexto.
  const clearSay = () => {
    setAuthFailed(false)
    setOffline(false)
    setLegacyOrigin(false)
  }

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
    setOffline(false)
    setLegacyOrigin(false)
    if (navigator.onLine === false) {
      setOffline(true)
      return
    }
    try {
      await signIn(data.email, data.password)
      clearLegacyOrigin()
    } catch {
      setAuthFailed(true)
    }
  }

  // A fala e derivada no render (sem efeito) e nunca altera a altura de nada no fluxo do formulario.
  // Prioridade: conta sem acesso, credencial errada, sem conexao, endereco novo; uma por vez.
  const say = accessError
    ? { text: accessError, tone: 'padrao' as const, live: 'alert' as const }
    : authFailed
      ? { text: SAY_CREDENTIALS, tone: 'padrao' as const, live: 'alert' as const }
      : offline
        ? { text: SAY_OFFLINE, tone: 'aviso' as const, live: 'alert' as const }
        : legacyOrigin
          ? { text: SAY_NEW_ADDRESS, tone: 'padrao' as const, live: 'status' as const }
          : null
  const credentialError = Boolean(accessError) || authFailed
  const vintemState = credentialError ? 'triste' : offline ? 'dormindo' : 'neutro'
  const tone = credentialError ? fieldDanger : offline ? fieldWarn : null
  // Com o campo em tom de erro o rotulo e o icone herdam a cor do tom.
  const inherit = tone ? 'text-current' : 'text-muted-foreground'
  const describedBy = (errorId: string, hasError: boolean) =>
    [hasError ? errorId : null, say ? SAY_ID : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-[max(22px,env(safe-area-inset-bottom))] pt-[max(30px,env(safe-area-inset-top))]">
        {/* Espaco reservado no topo: uma fala de tres linhas nunca sai da tela a 360 px. */}
        <div aria-hidden="true" className="min-h-24 flex-[0.65]" />

        <div className="entrada-stage">
          <div aria-hidden="true" className="entrada-halo" />
          <div aria-hidden="true" className="entrada-vintem">
            <Vintem look="entrada" state={vintemState} size="stage" follow decorative className="h-auto w-full" />
          </div>
          {say ? <VintemSay key={say.text} id={SAY_ID} text={say.text} tone={say.tone} live={say.live} /> : null}
        </div>

        <CoincWordmark className="mb-[30px] mt-1" />

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Entrar" aria-busy={isSubmitting} className="space-y-3">
          <div>
            <div className={cn(fieldShell, errors.email && fieldInvalid, tone)}>
              <Mail className={cn(fieldIcon, inherit)} aria-hidden="true" />
              <Label htmlFor="email" className={cn(fieldLabel, inherit)}>
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
                aria-invalid={errors.email || credentialError ? 'true' : 'false'}
                aria-describedby={describedBy('email-error', Boolean(errors.email))}
                readOnly={isSubmitting}
                className={cn(fieldInput, tone && 'text-inherit')}
                {...register('email', { onChange: clearSay })}
              />
            </div>
            {errors.email && (
              <p id="email-error" role="alert" className={fieldError}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className={cn(fieldShell, errors.password && fieldInvalid, tone)}>
              <Lock className={cn(fieldIcon, inherit)} aria-hidden="true" />
              <Label htmlFor="password" className={cn(fieldLabel, inherit)}>
                Senha
              </Label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={errors.password || credentialError ? 'true' : 'false'}
                aria-describedby={describedBy('password-error', Boolean(errors.password))}
                readOnly={isSubmitting}
                className={cn(fieldInput, 'pr-14', tone && 'text-inherit')}
                {...register('password', { onChange: clearSay })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className={cn('absolute right-0.5 top-1/2 -translate-y-1/2', inherit)}
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

          <Button
            type="submit"
            size="circleLg"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="h-14 w-full rounded-full bg-action text-action-text hover:bg-action/90"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div aria-hidden="true" className="min-h-2 flex-1" />
        <p className="text-center text-xs font-normal text-muted-foreground">Acesso só para quem foi convidado.</p>
      </div>
    </div>
  )
}
