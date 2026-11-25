import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { Bell } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { enablePush, getPrimeState, primePush, subscribePrime, type PushReason } from '@/lib/push/messaging'
import { sendTestPush } from '@/services/push.service'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const DAYS_MAX = 30

const ENABLED_TEXT = 'Avisos ativados neste aparelho.'
const REASON_TEXT: Record<PushReason, string> = {
  'nao-configurado': 'Avisos ainda não configurados neste app.',
  'nao-suportado': 'Este navegador não recebe avisos.',
  'permissao-negada': 'Permissão negada. Libere as notificações nas configurações do aparelho.',
  atualizando: 'O app está se atualizando. Tente de novo em instantes.',
  falhou: 'Não foi possível ativar os avisos. Confira a conexão e tente de novo.',
}
const TEST_SENT = 'Aviso de teste enviado.'
const TEST_FAILED = 'Não foi possível enviar o teste.'

/** Inteiro de 0 a 30 escrito só com dígitos; qualquer outra coisa vale null. */
function parseDays(text: string): number | null {
  const clean = text.trim()
  if (!/^\d{1,2}$/.test(clean)) return null
  const n = Number(clean)
  return n >= 0 && n <= DAYS_MAX ? n : null
}

/**
 * Cartão "Notificações" (UI-SPEC S5, cartão 6): avisos de vencimento e dias de antecedência.
 * Os avisos de limite não têm interruptor: ficam sempre ligados em 80% e 100% (PR-13).
 */
export function NotificationsCard() {
  const { settings, updateNotifications, readOnly } = useArea()
  const { show } = useToast()

  const [enabled, setEnabled] = useState(settings.notificationsEnabled)
  const [days, setDays] = useState(String(settings.daysBeforeDueDate))
  // Ressincroniza quando as configurações chegam do servidor depois da montagem.
  const [source, setSource] = useState({
    enabled: settings.notificationsEnabled,
    days: settings.daysBeforeDueDate,
  })
  if (source.enabled !== settings.notificationsEnabled || source.days !== settings.daysBeforeDueDate) {
    setSource({ enabled: settings.notificationsEnabled, days: settings.daysBeforeDueDate })
    setEnabled(settings.notificationsEnabled)
    setDays(String(settings.daysBeforeDueDate))
  }

  const [error, setError] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const prime = useSyncExternalStore(subscribePrime, getPrimeState)
  const [pushBusy, setPushBusy] = useState<'ativar' | 'testar' | null>(null)
  const pushLock = useRef(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  // O preparo do worker acontece ao abrir o cartao; o pedido de permissao so sai no toque.
  useEffect(() => {
    void primePush()
  }, [])

  const activate = async () => {
    if (readOnly || pushLock.current) return
    pushLock.current = true
    setPushBusy('ativar')
    setPushMessage(null)
    try {
      const result = await enablePush()
      setPushMessage(result.ok ? ENABLED_TEXT : REASON_TEXT[result.reason])
    } finally {
      pushLock.current = false
      setPushBusy(null)
    }
  }

  const test = async () => {
    if (readOnly || pushLock.current) return
    pushLock.current = true
    setPushBusy('testar')
    setPushMessage(null)
    try {
      await sendTestPush()
      setPushMessage(TEST_SENT)
    } catch {
      setPushMessage(TEST_FAILED)
    } finally {
      pushLock.current = false
      setPushBusy(null)
    }
  }

  const save = async () => {
    if (readOnly || saving) return
    const parsed = parseDays(days)
    if (parsed === null) {
      setError('Informe um número inteiro de 0 a 30.')
      return
    }
    setError(null)
    setFailed(false)
    setSaving(true)
    try {
      await updateNotifications({ notificationsEnabled: enabled, daysBeforeDueDate: parsed })
      show('Salvo')
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard id="notificacoes" icon={Bell} title="Notificações" subtitle="Vencimentos e limites">
      <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface-2 py-1 pl-4 pr-2">
        <Label htmlFor="notifications-enabled" className="font-normal">
          Avisos de vencimento
        </Label>
        <Switch
          id="notifications-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={readOnly}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="days-before-due">Dias de antecedência</Label>
        <Input
          id="days-before-due"
          inputMode="numeric"
          value={days}
          maxLength={2}
          disabled={readOnly}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setDays(e.target.value)
            setError(null)
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs font-normal text-danger-ink">
          {error}
        </p>
      ) : null}
      <p className="text-xs font-normal text-muted-foreground">
        Avisos de limite: sempre ligados, em 80% e em 100%.
      </p>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            onClick={() => void activate()}
            disabled={readOnly || pushBusy !== null || prime.status === 'preparando'}
            aria-busy={pushBusy === 'ativar'}
          >
            Ativar avisos
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => void test()}
            disabled={readOnly || pushBusy !== null}
            aria-busy={pushBusy === 'testar'}
          >
            Testar aviso
          </Button>
        </div>
        {pushMessage ? (
          <p role="status" className="text-xs font-normal text-muted-foreground">
            {pushMessage}
          </p>
        ) : null}
      </div>
      {readOnly ? <p className="text-xs font-normal text-muted-foreground">{READ_ONLY_HINT}</p> : null}
      {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => void save()}
        disabled={readOnly || saving}
        aria-busy={saving}
      >
        Salvar avisos
      </Button>
    </SettingsCard>
  )
}
