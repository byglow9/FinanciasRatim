import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { DayPicker } from '@/components/settings/DayPicker'
import { useReadOnly } from '@/hooks/useReadOnly'
import { saveCardSettings } from '@/services/cards.service'
import type { CardWithSettings } from '@/hooks/useCards'

// Mesmo limite do servico (validateCardSettingsPatch): o campo corta antes de chegar la.
const NICKNAME_MAX = 24
const SAVE_FAILED = 'Não foi possível salvar. Tente de novo.'

interface CardSettingsSheetProps {
  /** Cartao em edicao com a configuracao atual; null mantem a folha fechada. */
  card: CardWithSettings | null
  onClose: () => void
}

interface FormProps {
  card: CardWithSettings
  onClose: () => void
}

function CardSettingsForm({ card, onClose }: FormProps) {
  const { guard } = useReadOnly()
  const { show } = useToast()
  const nicknameId = useId()
  const closingLabelId = useId()
  const dueLabelId = useId()

  const [nickname, setNickname] = useState(card.settings?.nickname ?? '')
  const [closingDay, setClosingDay] = useState<number | null>(card.settings?.closingDay ?? null)
  const [dueDay, setDueDay] = useState<number | null>(card.settings?.dueDay ?? null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const missingDate = closingDay === null || dueDay === null

  const save = async () => {
    if (guard('editar')) return
    if (saving) return
    setSaving(true)
    setFailed(false)
    try {
      // A validacao de verdade (dia de 1 a 31, apelido ate 24) e do servico.
      await saveCardSettings(card.id, { nickname, closingDay, dueDay })
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    onClose()
    show('Salvo')
  }

  return (
    <div className="mt-2 space-y-4">
      <p className="text-xs font-normal text-muted-foreground">
        O MeuPluggy não entrega o fechamento nem o vencimento da fatura. Informe os dias como aparecem no app do banco:
        o Coinc calcula a fatura por eles.
      </p>

      <div className="space-y-1">
        <label htmlFor={nicknameId} className="text-base font-bold leading-snug">
          Apelido
        </label>
        <Input
          id={nicknameId}
          type="text"
          value={nickname}
          maxLength={NICKNAME_MAX}
          placeholder={card.name || 'Cartão de crédito'}
          autoComplete="off"
          onChange={(e) => {
            setNickname(e.target.value)
            setFailed(false)
          }}
        />
        <p className="text-xs font-normal text-muted-foreground">Até {NICKNAME_MAX} caracteres.</p>
      </div>

      <div role="group" aria-labelledby={closingLabelId}>
        <p id={closingLabelId} className="text-base font-bold leading-snug">
          Dia do fechamento{closingDay !== null ? `: dia ${closingDay}` : ''}
        </p>
        <DayPicker
          value={closingDay ?? 0}
          onChange={(day) => {
            setClosingDay(day)
            setFailed(false)
          }}
        />
      </div>

      <div role="group" aria-labelledby={dueLabelId}>
        <p id={dueLabelId} className="text-base font-bold leading-snug">
          Dia do vencimento{dueDay !== null ? `: dia ${dueDay}` : ''}
        </p>
        <DayPicker
          value={dueDay ?? 0}
          onChange={(day) => {
            setDueDay(day)
            setFailed(false)
          }}
        />
      </div>

      {missingDate ? (
        <Notice tone="warn">
          Sem o fechamento e o vencimento, a fatura aparece sem status. Informe os dois dias para o Coinc calcular.
        </Notice>
      ) : null}
      {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

      <Button type="button" size="lg" className="w-full" onClick={() => void save()} disabled={saving} aria-busy={saving}>
        Salvar cartão
      </Button>
    </div>
  )
}

/**
 * Folha de edicao do cartao (CARD-08, D-06, D-09): apelido, dia de fechamento e dia de vencimento.
 * A gravacao passa por saveCardSettings (validacao e dono no servico) e so acontece fora do modo
 * somente leitura. Erro de gravacao nao fecha a folha.
 */
export function CardSettingsSheet({ card, onClose }: CardSettingsSheetProps) {
  return (
    <Sheet open={card !== null} onClose={onClose} title={card ? card.displayName : 'Cartão'}>
      {card ? <CardSettingsForm key={card.id} card={card} onClose={onClose} /> : null}
    </Sheet>
  )
}
