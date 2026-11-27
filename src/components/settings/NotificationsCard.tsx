import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { DEFAULT_PUSH_PREFS, type PushPrefs } from '@shared/core/pushPrefs.js'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { PushDeviceSection } from '@/components/settings/PushDeviceSection'
import { QuietHoursFields } from '@/components/settings/QuietHoursFields'
import { PUSH_SERVER_ENABLED, getPushPrefs, savePushPrefs } from '@/services/push.service'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const LOAD_FAILED = 'Não foi possível carregar os avisos.'
const IN_APP_HINT = 'Dentro do app, os alertas de limite continuam sempre ligados.'
const DAYS_MAX = 30

/** Cópia mutável dos padrões do núcleo (D-06, D-21): tipos ligados e silêncio desligado. */
function defaultPrefs(): PushPrefs {
  return { types: { ...DEFAULT_PUSH_PREFS.types }, quiet: { ...DEFAULT_PUSH_PREFS.quiet } }
}

/** Inteiro de 0 a 30 escrito só com dígitos; qualquer outra coisa vale null. */
function parseDays(text: string): number | null {
  const clean = text.trim()
  if (!/^\d{1,2}$/.test(clean)) return null
  const n = Number(clean)
  return n >= 0 && n <= DAYS_MAX ? n : null
}

interface SwitchRowProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}

/** Linha de interruptor com alvo de toque de 44 px e dica opcional embaixo do rótulo. */
function SwitchRow({ id, label, hint, checked, onChange, disabled }: SwitchRowProps) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface-2 py-1 pl-4 pr-2">
      <span className="min-w-0 flex-1">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        {hint ? <span className="block text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

/**
 * Cartão "Notificações" (PUSH-01, PUSH-03, D-08, D-21): estado dos avisos neste aparelho, os seis tipos
 * (80%, 100%, vencimento, contas fixas, compromissos e espontâneo) e o horário de silêncio. O vencimento é o
 * interruptor legado e continua em settings (vale também para o sino do app); o resto vai ao servidor. Os dias
 * de antecedência valem só para o sino: no celular os estágios são fixos (07.1, D-21, D-24). O botão de ativar
 * vive só aqui.
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

  // Sem servidor (modo local) os padrões valem e o aviso de carga aparece desde o início.
  const [prefs, setPrefs] = useState<PushPrefs>(defaultPrefs)
  const [prefsReady, setPrefsReady] = useState(!PUSH_SERVER_ENABLED)
  const [loadFailed, setLoadFailed] = useState(!PUSH_SERVER_ENABLED)

  useEffect(() => {
    if (!PUSH_SERVER_ENABLED) return
    let cancelled = false
    getPushPrefs().then(
      (loaded) => {
        if (cancelled) return
        setPrefs(loaded)
        setPrefsReady(true)
      },
      () => {
        if (cancelled) return
        setLoadFailed(true)
        setPrefsReady(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const [error, setError] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const setType = (key: keyof PushPrefs['types'], value: boolean) =>
    setPrefs((prev) => ({ ...prev, types: { ...prev.types, [key]: value } }))

  const locked = readOnly || !prefsReady
  const quietInvalid = prefs.quiet.enabled && prefs.quiet.from === prefs.quiet.to

  const save = async () => {
    if (readOnly || saving) return
    const parsed = parseDays(days)
    if (parsed === null) {
      setError('Informe um número inteiro de 0 a 30.')
      return
    }
    if (quietInvalid) return
    setError(null)
    setFailed(false)
    setSaving(true)
    try {
      if (PUSH_SERVER_ENABLED) setPrefs(await savePushPrefs(prefs))
      await updateNotifications({ notificationsEnabled: enabled, daysBeforeDueDate: parsed })
      setLoadFailed(false)
      show('Salvo')
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard id="notificacoes" icon={Bell} title="Notificações" subtitle="Avisos no celular e no app">
      <PushDeviceSection readOnly={readOnly} />
      {loadFailed ? (
        <p role="alert" className="text-xs font-normal text-danger-ink">
          {LOAD_FAILED}
        </p>
      ) : null}
      <SwitchRow
        id="push-limite80"
        label="Limite chegando a 80%"
        checked={prefs.types.limite80}
        onChange={(v) => setType('limite80', v)}
        disabled={locked}
      />
      <SwitchRow
        id="push-limite100"
        label="Limite estourado (100%)"
        checked={prefs.types.limite100}
        onChange={(v) => setType('limite100', v)}
        disabled={locked}
      />
      <SwitchRow
        id="notifications-enabled"
        label="Avisos de vencimento"
        hint="Vale para o sino do app e para o aviso de fatura no celular."
        checked={enabled}
        onChange={setEnabled}
        disabled={readOnly}
      />
      <div className="space-y-1">
        <Label htmlFor="days-before-due">Dias de antecedência</Label>
        <p id="days-before-due-hint" className="text-xs font-normal text-muted-foreground">
          Só para o sino do app. No celular, a fatura avisa dois dias antes, um dia antes e no dia, se não estiver
          paga.
        </p>
        <Input
          id="days-before-due"
          aria-describedby="days-before-due-hint"
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
      <SwitchRow
        id="push-conta"
        label="Contas fixas"
        hint="Dois dias antes, um dia antes e no dia, se não estiver paga."
        checked={prefs.types.conta}
        onChange={(v) => setType('conta', v)}
        disabled={locked}
      />
      <SwitchRow
        id="push-compromisso"
        label="Compromissos da agenda"
        hint="Dois dias antes, um dia antes e no dia."
        checked={prefs.types.compromisso}
        onChange={(v) => setType('compromisso', v)}
        disabled={locked}
      />
      <SwitchRow
        id="push-espontanea"
        label="OINC espontâneo"
        hint="Algumas por dia, em horários sorteados."
        checked={prefs.types.espontanea}
        onChange={(v) => setType('espontanea', v)}
        disabled={locked}
      />
      <QuietHoursFields
        value={prefs.quiet}
        onChange={(quiet) => setPrefs((prev) => ({ ...prev, quiet }))}
        disabled={locked}
      />
      <p className="text-xs font-normal text-muted-foreground">{IN_APP_HINT}</p>
      {readOnly ? <p className="text-xs font-normal text-muted-foreground">{READ_ONLY_HINT}</p> : null}
      {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => void save()}
        disabled={readOnly || saving || !prefsReady || quietInvalid}
        aria-busy={saving}
      >
        Salvar avisos
      </Button>
    </SettingsCard>
  )
}
