import { useRef, useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import type { FixedExpense, PersonType } from '@/types'
import { validateBillDraft } from '@shared/core/billGroups.js'
import type { BillField } from '@shared/core/billGroups.js'
import { activeCategoryNames, categoryDisplayName, resolveCategoryId } from '@shared/core/categories.js'
import { fromCents, toCents } from '@shared/core/ledger.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'

/** Dados gravados: pessoa, valor em reais, dia, categoria (texto e id) e conta ativa. */
export type BillFormData = Omit<FixedExpense, 'id' | 'createdAt'>

interface BillFormSheetProps {
  open: boolean
  onClose: () => void
  person: PersonType
  /** Conta em edição; nulo para cadastrar uma nova. */
  bill: FixedExpense | null
  /** Grava; se lançar, o Sheet continua aberto com aviso. */
  onSave: (data: BillFormData, id: string | null) => Promise<void>
}

type FieldErrors = Partial<Record<BillField, string>>

/** Centavos como texto pt-BR para o campo: 18630 vira "186,30". */
function amountText(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`
}

/**
 * Sheet de cadastro e edição de conta fixa (D-15). Validação por campo em validateBillDraft (valor
 * por parseBRL em centavos, dia de 1 a 31), mensagem sob o campo, aria-invalid e foco no primeiro
 * erro. A categoria atual continua na lista mesmo arquivada. Todo texto entra como texto React.
 */
export function BillFormSheet({ open, onClose, person, bill, onSave }: BillFormSheetProps) {
  const { categoryDefs } = useArea()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('')
  const [category, setCategory] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(bill?.name ?? '')
      setAmount(bill ? amountText(toCents(bill.amount)) : '')
      setDay(bill ? String(bill.dueDay) : '')
      setCategory(bill ? categoryDisplayName(bill, categoryDefs) : '')
      setErrors({})
      setFailed(false)
      setSaving(false)
    }
  }

  // A categoria atual continua como opção mesmo arquivada ou sem definição (D-08).
  const activeNames: string[] = activeCategoryNames(categoryDefs)
  const currentCategory = bill ? categoryDisplayName(bill, categoryDefs) : ''
  const categories =
    currentCategory && !activeNames.includes(currentCategory) ? [currentCategory, ...activeNames] : activeNames

  const clearFeedback = () => {
    setErrors({})
    setFailed(false)
  }

  const focusField = (field: BillField | null) => {
    if (field === 'name') nameRef.current?.focus()
    else if (field === 'amount') amountRef.current?.focus()
    else if (field === 'day') dayRef.current?.focus()
    else if (field === 'category') {
      const root = categoryRef.current
      const target = root?.querySelector<HTMLElement>('button') ?? root?.querySelector<HTMLElement>('select')
      target?.focus()
    }
  }

  const save = async () => {
    if (saving) return
    const result = validateBillDraft({ name, amount, day, category }, categories)
    if (!result.ok || result.value === null) {
      setErrors(result.errors)
      setFailed(false)
      focusField(result.firstInvalid)
      return
    }

    const { value } = result
    // category (texto) e categoryId (resolvido pelas definições) seguem juntos durante a transição (D-07).
    const categoryId = resolveCategoryId(value.category, categoryDefs)
    const data: BillFormData = {
      person,
      name: value.name,
      amount: fromCents(value.amountCents),
      dueDay: value.day,
      category: value.category,
      ...(categoryId ? { categoryId } : {}),
      isActive: true,
    }

    setSaving(true)
    clearFeedback()
    try {
      await onSave(data, bill?.id ?? null)
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={bill ? 'Editar conta fixa' : 'Nova conta fixa'}>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div>
          <Label htmlFor="bill-name">Nome</Label>
          <Input
            id="bill-name"
            ref={nameRef}
            data-autofocus=""
            className="mt-1"
            placeholder="Aluguel, internet, luz"
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
          <Label htmlFor="bill-amount">Valor</Label>
          <Input
            id="bill-amount"
            ref={amountRef}
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
          <Label htmlFor="bill-day">Dia do vencimento</Label>
          <Input
            id="bill-day"
            ref={dayRef}
            className="mt-1"
            type="text"
            inputMode="numeric"
            placeholder="1 a 31"
            value={day}
            aria-invalid={errors.day ? true : undefined}
            onChange={(e) => {
              setDay(e.target.value)
              clearFeedback()
            }}
          />
          {errors.day ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.day}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="bill-category">Categoria</Label>
          <div ref={categoryRef} className="mt-1">
            <Select
              id="bill-category"
              value={category}
              aria-invalid={errors.category ? true : undefined}
              onChange={(e) => {
                setCategory(e.target.value)
                clearFeedback()
              }}
            >
              <option value="">Selecione...</option>
              {categories.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </Select>
          </div>
          {errors.category ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.category}
            </p>
          ) : null}
        </div>

        {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

        <Button type="submit" size="lg" className="w-full" disabled={saving} aria-busy={saving}>
          {bill ? 'Salvar conta' : 'Cadastrar conta'}
        </Button>
      </form>
    </Sheet>
  )
}
