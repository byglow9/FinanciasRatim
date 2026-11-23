import { useState } from 'react'
import { Palette } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { useToast } from '@/components/ui/toast'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { ThemeGroup } from '@/components/settings/ThemeGroup'
import type { Settings } from '@/types'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const NAME_MAX = 30

type TabNames = Settings['tabNames']

const FIELDS: { key: keyof TabNames; id: string; label: string }[] = [
  { key: 'area1', id: 'tab-name-1', label: 'Aba 1' },
  { key: 'area2', id: 'tab-name-2', label: 'Aba 2' },
  { key: 'piggy', id: 'tab-name-piggy', label: 'Poupança' },
]

/**
 * Cartão "Aparência" (UI-SPEC S3, D-08): tema do aparelho (Automático, Claro, Escuro) e nomes das abas.
 * O tema é por aparelho e não segue o modo somente leitura; os nomes das abas continuam dado do casal.
 */
export function AppearanceCard() {
  const { settings, updateTabNames, readOnly } = useArea()
  const { show } = useToast()

  const [names, setNames] = useState<TabNames>(settings.tabNames)
  // Ressincroniza quando as configurações chegam do servidor depois da montagem.
  const [source, setSource] = useState<TabNames>(settings.tabNames)
  if (source !== settings.tabNames) {
    setSource(settings.tabNames)
    setNames(settings.tabNames)
  }

  const [error, setError] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (readOnly || saving) return
    const clean: TabNames = {
      area1: names.area1.trim(),
      area2: names.area2.trim(),
      piggy: names.piggy.trim(),
    }
    if (!clean.area1 || !clean.area2 || !clean.piggy) {
      setError('Informe um nome para cada aba.')
      return
    }
    setError(null)
    setFailed(false)
    setSaving(true)
    try {
      await updateTabNames(clean)
      setNames(clean)
      show('Salvo')
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard id="aparencia" icon={Palette} title="Aparência" subtitle="Tema e nomes das abas">
      <ThemeGroup />
      <h3 className="text-base font-bold">Nomes das abas</h3>
      {FIELDS.map((field) => (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={field.id}>{field.label}</Label>
          <Input
            id={field.id}
            value={names[field.key]}
            maxLength={NAME_MAX}
            disabled={readOnly}
            onChange={(e) => {
              setNames((prev) => ({ ...prev, [field.key]: e.target.value }))
              setError(null)
            }}
          />
        </div>
      ))}
      {error ? (
        <p role="alert" className="text-xs font-normal text-danger-ink">
          {error}
        </p>
      ) : null}
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
        Salvar nomes das abas
      </Button>
    </SettingsCard>
  )
}
