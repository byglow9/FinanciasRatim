import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PUSH_STATES, iphoneSteps } from '@shared/core/pushState.js'
import { Button } from '@/components/ui/button'
import { usePushState } from '@/hooks/usePushState'
import { disablePush, enablePush, getPrimeState, primePush, subscribePrime, type PushReason } from '@/lib/push/messaging'
import { sendTestPush } from '@/services/push.service'

const REASON_TEXT: Record<PushReason, string> = {
  'nao-configurado': 'Avisos ainda não configurados neste app.',
  'nao-suportado': 'Este navegador não recebe avisos.',
  'permissao-negada': 'Permissão negada. Libere as notificações nas configurações do aparelho.',
  atualizando: 'O app está se atualizando. Tente de novo em instantes.',
  falhou: 'Não foi possível ativar os avisos. Confira a conexão e tente de novo.',
}
const TEST_SENT = 'Aviso de teste enviado.'
const TEST_FAILED = 'Não foi possível enviar o teste.'
const DISABLE_FAILED = 'Não foi possível desativar os avisos.'

interface PushDeviceSectionProps {
  readOnly: boolean
}

/**
 * Estado dos avisos neste aparelho (PUSH-01): texto do estado vindo do núcleo e a ação certa para cada um.
 * O botão de ativar vive só aqui, em Configurações (D-08): o pedido de permissão sai apenas do toque.
 */
export function PushDeviceSection({ readOnly }: PushDeviceSectionProps) {
  const { state, copy, refresh } = usePushState()
  const prime = useSyncExternalStore(subscribePrime, getPrimeState)
  const [pushBusy, setPushBusy] = useState<'ativar' | 'testar' | 'desativar' | null>(null)
  const lock = useRef(false)
  const [message, setMessage] = useState<string | null>(null)

  // O preparo do worker acontece ao abrir o cartão; o pedido de permissão só sai no toque.
  useEffect(() => {
    void primePush()
  }, [])

  // Com versão em espera o toque é o consentimento para ativá-la; sem ela, espera o preparo terminar.
  const canActivate = prime.status !== 'preparando' && (prime.status !== 'atualizando' || prime.waiting)
  // O estado já diz quando o aparelho não recebe avisos; aqui só entra o aviso de atualização do app.
  const updating = prime.status === 'atualizando' ? REASON_TEXT.atualizando : null
  const notice = message === REASON_TEXT.atualizando && prime.status === 'pronto' ? null : (message ?? updating)

  const activate = async () => {
    if (readOnly || lock.current) return
    lock.current = true
    setPushBusy('ativar')
    setMessage(null)
    try {
      const result = await enablePush()
      setMessage(result.ok ? null : REASON_TEXT[result.reason])
      refresh()
    } finally {
      lock.current = false
      setPushBusy(null)
    }
  }

  const test = async () => {
    if (readOnly || lock.current) return
    lock.current = true
    setPushBusy('testar')
    setMessage(null)
    try {
      await sendTestPush()
      setMessage(TEST_SENT)
    } catch {
      setMessage(TEST_FAILED)
    } finally {
      lock.current = false
      setPushBusy(null)
    }
  }

  const deactivate = async () => {
    if (readOnly || lock.current) return
    lock.current = true
    setPushBusy('desativar')
    setMessage(null)
    try {
      const result = await disablePush()
      if (!result.ok) setMessage(DISABLE_FAILED)
      refresh()
    } finally {
      lock.current = false
      setPushBusy(null)
    }
  }

  const showActivate = copy.action === 'ativar' || copy.action === 'reativar'
  const showTest = state === PUSH_STATES.ATIVO

  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-surface-2 p-4">
        <p className="text-base font-bold">{copy.title}</p>
        <p className="text-xs font-normal text-muted-foreground">{copy.body}</p>
        {copy.action === 'passos-iphone' ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs font-normal">
            {iphoneSteps().map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
      </div>
      {showActivate || showTest ? (
        <div className="flex flex-wrap gap-2">
          {showActivate ? (
            <Button
              type="button"
              size="sm"
              className="min-w-36 flex-1"
              onClick={() => void activate()}
              disabled={readOnly || pushBusy !== null || !canActivate}
              aria-busy={pushBusy === 'ativar'}
            >
              {copy.action === 'reativar' ? 'Reativar avisos' : 'Ativar avisos'}
            </Button>
          ) : null}
          {showTest ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-w-36 flex-1"
              onClick={() => void test()}
              disabled={readOnly || pushBusy !== null}
              aria-busy={pushBusy === 'testar'}
            >
              Testar aviso
            </Button>
          ) : null}
          {showTest ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-w-36 flex-1"
              onClick={() => void deactivate()}
              disabled={readOnly || pushBusy !== null}
              aria-busy={pushBusy === 'desativar'}
            >
              Desativar avisos
            </Button>
          ) : null}
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="text-xs font-normal text-muted-foreground">
          {notice}
        </p>
      ) : null}
    </div>
  )
}
