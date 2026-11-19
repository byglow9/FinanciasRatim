import { useRef, useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Sheet } from '@/components/ui/sheet'
import type { PersonType, SavingsTransaction } from '@/types'
import { dayKeyOf } from '@shared/core/dayKey.js'
import { parseBRL } from '@shared/core/format.js'
import { fromCents } from '@shared/core/ledger.js'
import { zonedTimeToInstant } from '@shared/core/time.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'

type SavingsType = SavingsTransaction['type']
type Field = 'amount' | 'description' | 'date'
type FieldErrors = Partial<Record<Field, string>>

/** Dados gravados: tipo, valor em reais, descrição, pessoa e o instante (meio-dia em São Paulo). */
export type SavingsFormData = Omit<SavingsTransaction, 'id' | 'createdAt'>

interface SavingsFormProps {
  open: boolean
  onClose: () => void
  /** Grava; se lançar, o Sheet continua aberto com aviso. */
  onSave: (data: SavingsFormData) => Promise<void>
}

interface Draft {
  type: SavingsType
  amount: string
  description: string
  person: PersonType
  /** AAAA-MM-DD, como o campo de data entrega. */
  date: string
}

type Validation =
  | { ok: true; amountCents: number; description: string; instant: Date }
  | { ok: false; errors: FieldErrors; first: Field }

/** Dia, mês e ano de um texto AAAA-MM-DD que existe no calendário; senão nulo. */
function parseDay(text: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim())
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null
  return { y, m, d }
}

/** Validação por campo: valor por parseBRL (centavos inteiros), descrição e data de calendário. */
function validate(draft: Draft): Validation {
  const errors: FieldErrors = {}

  const amountText = draft.amount.trim()
  const amountCents = parseBRL(amountText)
  if (amountText === '' || amountCents === 0) {
    errors.amount = 'Informe um valor maior que zero'
  } else if (amountCents === null) {
    errors.amount = 'Use um valor como 1.234,56'
  }

  const description = draft.description.trim()
  if (!description) errors.description = 'Escreva uma descrição'

  const day = parseDay(draft.date)
  if (!day) errors.date = 'Informe uma data válida'

  const first: Field | null = errors.amount ? 'amount' : errors.description ? 'description' : errors.date ? 'date' : null
  if (first || amountCents === null || !day) {
    return { ok: false, errors, first: first ?? 'amount' }
  }
  return { ok: true, amountCents, description, instant: zonedTimeToInstant(day.y, day.m, day.d, 12) }
}

/**
 * Sheet de nova movimentação do Porquinho (D-03, sketch 014): Guardar ou Retirar, valor aceito com
 * vírgula e milhar, descrição, data e responsável. Validação por campo com mensagem sob o campo,
 * aria-invalid e foco no primeiro erro. Todo texto entra como texto React.
 */
export function SavingsForm({ open, onClose, onSave }: SavingsFormProps) {
  const { settings, lastPerson } = useArea()
  const { user } = useAuth()
  // Responsável padrão: quem está logada, nunca um "Ele" fixo (WR-09).
  const defaultPerson: PersonType = user?.person ?? lastPerson

  const [type, setType] = useState<SavingsType>('deposito')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [person, setPerson] = useState<PersonType>(defaultPerson)
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setType('deposito')
      setAmount('')
      setDescription('')
      setPerson(defaultPerson)
      setDate(dayKeyOf(new Date()))
      setErrors({})
      setFailed(false)
      setSaving(false)
    }
  }

  const clearFeedback = () => {
    setErrors({})
    setFailed(false)
  }

  const focusField = (field: Field) => {
    const target = field === 'amount' ? amountRef : field === 'description' ? descriptionRef : dateRef
    target.current?.focus()
  }

  const save = async () => {
    if (saving) return
    const result = validate({ type, amount, description, person, date })
    if (!result.ok) {
      setErrors(result.errors)
      setFailed(false)
      focusField(result.first)
      return
    }

    setSaving(true)
    clearFeedback()
    try {
      await onSave({
        type,
        amount: fromCents(result.amountCents),
        description: result.description,
        person,
        date: result.instant,
      })
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nova movimentação">
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <SegmentedControl<SavingsType>
          ariaLabel="Tipo de movimentação"
          value={type}
          onChange={(next) => {
            setType(next)
            setFailed(false)
          }}
          options={[
            { value: 'deposito', label: 'Guardar' },
            { value: 'saque', label: 'Retirar' },
          ]}
        />

        <div>
          <Label htmlFor="savings-amount">Valor (R$)</Label>
          <Input
            id="savings-amount"
            ref={amountRef}
            data-autofocus=""
            className="mt-1"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            aria-invalid={errors.amount ? true : undefined}
            onChange={(e) => {
              setAmount(e.target.value)
              clearFeedback()
            }}
          />
          {errors.amount ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.amount}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="savings-description">Descrição</Label>
          <Input
            id="savings-description"
            ref={descriptionRef}
            className="mt-1"
            maxLength={60}
            placeholder="Ex.: Sobra da semana"
            value={description}
            aria-invalid={errors.description ? true : undefined}
            onChange={(e) => {
              setDescription(e.target.value)
              clearFeedback()
            }}
          />
          {errors.description ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.description}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="savings-date">Data</Label>
          <Input
            id="savings-date"
            ref={dateRef}
            className="mt-1"
            type="date"
            value={date}
            aria-invalid={errors.date ? true : undefined}
            onChange={(e) => {
              setDate(e.target.value)
              clearFeedback()
            }}
          />
          {errors.date ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.date}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-base font-bold leading-snug">Responsável</p>
          <div className="mt-1">
            <SegmentedControl<PersonType>
              ariaLabel="Responsável"
              value={person}
              onChange={setPerson}
              options={[
                { value: 'ele', label: settings.tabNames.area1 },
                { value: 'ela', label: settings.tabNames.area2 },
              ]}
            />
          </div>
        </div>

        {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

        <Button type="submit" size="lg" className="w-full" disabled={saving} aria-busy={saving}>
          {type === 'deposito' ? 'Guardar' : 'Retirar'}
        </Button>
      </form>
    </Sheet>
  )
}
