import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import type { Goal, PersonType } from '@/types'
import { parseBRL } from '@shared/core/format.js'
import { fromCents } from '@shared/core/ledger.js'
import { zonedParts, zonedTimeToInstant } from '@shared/core/time.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const NAME_MAX = 40

/**
 * Dados gravados pelo formulário: tudo da meta, menos id, data de criação e valor guardado. O
 * `currentAmount` nunca sai daqui: só o aporte o altera, senão a edição apagaria aportes feitos
 * em paralelo no outro celular (CR-01).
 */
export type GoalFormData = Omit<Goal, 'id' | 'createdAt' | 'currentAmount' | 'deadline'> & {
  /** Nulo quando o prazo foi limpo: na edição apaga o prazo antigo (WR-11). */
  deadline: Date | null
}

interface GoalFormProps {
  open: boolean
  onClose: () => void
  person: PersonType
  /** Meta em edição; nulo para criar uma nova. */
  goal: Goal | null
  /** Grava; se lançar, o Sheet continua aberto com aviso. */
  onSave: (data: GoalFormData, id: string | null) => Promise<void>
}

type Field = 'name' | 'target' | 'deadline'
type FieldErrors = Partial<Record<Field, string>>

/** Centavos como texto pt-BR para o campo: 18630 vira "186,30". */
function amountText(reais: number): string {
  const cents = Math.round(reais * 100)
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`
}

/** Prazo da meta como yyyy-mm-dd (dia de calendário de São Paulo) para o campo de data. */
function dateText(deadline: Date | undefined): string {
  if (!deadline) return ''
  const p = zonedParts(deadline)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Lê yyyy-mm-dd e devolve o instante do meio-dia em São Paulo; nulo se o dia não existe. */
function parseDeadline(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const instant = zonedTimeToInstant(y, mo, d, 12)
  const p = zonedParts(instant)
  return p.year === y && p.month === mo && p.day === d ? instant : null
}

/**
 * Sheet de criar e editar meta (D-03). Valor alvo por parseBRL em centavos inteiros, validação por
 * campo com mensagem sob o campo, aria-invalid e foco no primeiro erro. Todo texto entra como texto React.
 */
export function GoalForm({ open, onClose, person, goal, onSave }: GoalFormProps) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)
  const deadlineRef = useRef<HTMLInputElement>(null)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(goal?.name ?? '')
      setTarget(goal ? amountText(goal.targetAmount) : '')
      setDeadline(dateText(goal?.deadline))
      setErrors({})
      setFailed(false)
      setSaving(false)
    }
  }

  const clearFeedback = () => {
    setErrors({})
    setFailed(false)
  }

  const save = async () => {
    if (saving) return
    const errs: FieldErrors = {}
    const cleanName = name.trim()
    if (!cleanName) errs.name = 'Informe o nome da meta'
    else if (cleanName.length > NAME_MAX) errs.name = `Use até ${NAME_MAX} letras no nome`

    const cents = parseBRL(target)
    if (cents === null || cents <= 0) errs.target = 'Informe um valor maior que zero'

    let deadlineDate: Date | undefined
    if (deadline.trim()) {
      const parsed = parseDeadline(deadline.trim())
      if (parsed) deadlineDate = parsed
      else errs.deadline = 'Informe uma data válida'
    }

    const first: Field | null = errs.name ? 'name' : errs.target ? 'target' : errs.deadline ? 'deadline' : null
    if (first || cents === null) {
      setErrors(errs)
      setFailed(false)
      if (first === 'name') nameRef.current?.focus()
      else if (first === 'target') targetRef.current?.focus()
      else if (first === 'deadline') deadlineRef.current?.focus()
      return
    }

    const data: GoalFormData = {
      name: cleanName,
      targetAmount: fromCents(cents),
      deadline: deadlineDate ?? null,
      person: goal?.person ?? person,
    }

    setSaving(true)
    clearFeedback()
    try {
      await onSave(data, goal?.id ?? null)
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={goal ? 'Editar meta' : 'Nova meta'}>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div>
          <Label htmlFor="goal-name">Nome</Label>
          <Input
            id="goal-name"
            ref={nameRef}
            data-autofocus=""
            className="mt-1"
            placeholder="Ex.: Viagem de férias"
            maxLength={NAME_MAX + 10}
            value={name}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => {
              setName(e.target.value)
              clearFeedback()
            }}
          />
          {errors.name ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="goal-target">Valor alvo</Label>
          <Input
            id="goal-target"
            ref={targetRef}
            className="mt-1"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={target}
            aria-invalid={errors.target ? true : undefined}
            onChange={(e) => {
              setTarget(e.target.value)
              clearFeedback()
            }}
          />
          {errors.target ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.target}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
          <Input
            id="goal-deadline"
            ref={deadlineRef}
            className="mt-1"
            type="date"
            value={deadline}
            aria-invalid={errors.deadline ? true : undefined}
            onChange={(e) => {
              setDeadline(e.target.value)
              clearFeedback()
            }}
          />
          {errors.deadline ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.deadline}
            </p>
          ) : null}
        </div>

        {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

        <Button type="submit" size="lg" className="w-full" disabled={saving} aria-busy={saving}>
          Salvar meta
        </Button>
      </form>
    </Sheet>
  )
}
