import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import { newContributionId } from '@/services/goalContributions.service'
import type { Goal } from '@/types'
import { formatMoney, parseBRL } from '@shared/core/format.js'
import { fromCents, toCents } from '@shared/core/ledger.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const DESCRIPTION_MAX = 40

interface ContributionFormProps {
  open: boolean
  onClose: () => void
  /** Meta que recebe o aporte; nula enquanto o Sheet termina a animação de saída. */
  goal: Goal | null
  /** Grava o aporte em reais com o id gerado nesta abertura; se lançar, o Sheet continua aberto com aviso. */
  onSave: (amount: number, description: string | undefined, id: string) => Promise<void>
}

type Field = 'amount' | 'description'
type FieldErrors = Partial<Record<Field, string>>

/**
 * Sheet de aporte (D-03). Valor por parseBRL em centavos inteiros, descrição opcional, validação por
 * campo com mensagem sob o campo, aria-invalid e foco no primeiro erro. Todo texto entra como texto React.
 */
export function ContributionForm({ open, onClose, goal, onSave }: ContributionFormProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  // Id do aporte gerado no cliente UMA vez por abertura e reaproveitado em toda nova tentativa (WR-12):
  // se a primeira gravação chegou ao servidor, repetir não duplica o aporte.
  const [contributionId, setContributionId] = useState('')

  const amountRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLInputElement>(null)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setContributionId(newContributionId())
      setAmount('')
      setDescription('')
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
    const cents = parseBRL(amount)
    if (cents === null || cents <= 0) errs.amount = 'Informe um valor maior que zero'
    const cleanDescription = description.trim()
    if (cleanDescription.length > DESCRIPTION_MAX) {
      errs.description = `Use até ${DESCRIPTION_MAX} letras na descrição`
    }

    if (errs.amount || errs.description || cents === null) {
      setErrors(errs)
      setFailed(false)
      if (errs.amount) amountRef.current?.focus()
      else descriptionRef.current?.focus()
      return
    }

    setSaving(true)
    clearFeedback()
    try {
      await onSave(fromCents(cents), cleanDescription || undefined, contributionId)
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    onClose()
  }

  const remainingCents = goal ? Math.max(0, toCents(goal.targetAmount) - toCents(goal.currentAmount)) : 0

  return (
    <Sheet open={open} onClose={onClose} title="Novo aporte">
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {goal ? (
          <div>
            <p title={goal.name} className="truncate text-base font-bold">
              {goal.name}
            </p>
            <p className="text-xs font-normal text-muted-foreground">
              Faltam {formatMoney(remainingCents, { decimals: 'always' })} para a meta
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="contribution-amount">Valor</Label>
          <Input
            id="contribution-amount"
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
          <Label htmlFor="contribution-description">Descrição (opcional)</Label>
          <Input
            id="contribution-description"
            ref={descriptionRef}
            className="mt-1"
            placeholder="Ex.: Bônus do trabalho"
            maxLength={DESCRIPTION_MAX + 10}
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

        {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

        <Button type="submit" size="lg" className="w-full" disabled={saving} aria-busy={saving}>
          Salvar aporte
        </Button>
      </form>
    </Sheet>
  )
}
