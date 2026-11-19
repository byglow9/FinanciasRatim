import { useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import type { Transaction } from '@/types'
import { activeCategoryNames, categoryDisplayName, resolveCategoryId } from '@shared/core/categories.js'
import { dayKeyOf } from '@shared/core/dayKey.js'
import { parseBRL } from '@shared/core/format.js'
import { fromCents, toCents } from '@shared/core/ledger.js'
import { zonedTimeToInstant } from '@shared/core/time.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'

type Field = 'description' | 'amount' | 'category' | 'date'
type FieldErrors = Partial<Record<Field, string>>

/** Campos gravados na edicao: pessoa, id e criacao nunca mudam. */
export type TransactionEdit = Partial<Omit<Transaction, 'id' | 'createdAt'>>

interface TransactionEditSheetProps {
  open: boolean
  onClose: () => void
  transaction: Transaction | null
  /** Grava a edicao; se lancar, o Sheet continua aberto com aviso. */
  onSave: (id: string, data: TransactionEdit) => Promise<void>
}

/** Centavos como texto pt-BR para o campo: 18630 vira "186,30". */
function amountText(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`
}

/**
 * Sheet de edicao de uma transacao (D-03, P-11). Criar usa o LaunchSheet do dock; aqui so edita.
 * Valor lido por parseBRL em centavos inteiros, data pelo fuso de Sao Paulo, categoria atual
 * mantida na lista mesmo arquivada. Todo texto entra como texto React.
 */
export function TransactionEditSheet({ open, onClose, transaction, onSave }: TransactionEditSheetProps) {
  const { categoryDefs } = useArea()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'saida' | 'entrada'>('saida')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const descriptionRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  // Recomeça o formulario a cada abertura (ajuste durante a renderizacao, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && transaction) {
      setDescription(transaction.description)
      setAmount(amountText(toCents(transaction.amount)))
      setType(transaction.type)
      setCategory(categoryDisplayName(transaction, categoryDefs))
      setDate(dayKeyOf(transaction.date))
      setErrors({})
      setFailed(false)
      setSaving(false)
    }
  }

  // A categoria atual continua como opcao mesmo arquivada ou sem definicao (D-08).
  const activeNames: string[] = activeCategoryNames(categoryDefs)
  const currentCategory = transaction ? categoryDisplayName(transaction, categoryDefs) : ''
  const categories =
    currentCategory && !activeNames.includes(currentCategory) ? [currentCategory, ...activeNames] : activeNames

  const clearFeedback = () => {
    setErrors({})
    setFailed(false)
  }

  const focusFirst = (found: FieldErrors) => {
    if (found.description) descriptionRef.current?.focus()
    else if (found.amount) amountRef.current?.focus()
    else if (found.category) categoryRef.current?.querySelector<HTMLElement>('select, button')?.focus()
    else if (found.date) dateRef.current?.focus()
  }

  const save = async () => {
    if (!transaction || saving) return
    const found: FieldErrors = {}

    const trimmed = description.trim()
    if (!trimmed) found.description = 'Informe a descrição.'

    const cents = parseBRL(amount)
    if (cents === null || cents <= 0) found.amount = 'Informe um valor maior que zero, como 25,90.'

    if (!category) found.category = 'Escolha uma categoria.'

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (!dateMatch) found.date = 'Informe a data.'

    if (Object.keys(found).length > 0 || cents === null || !dateMatch) {
      setErrors(found)
      setFailed(false)
      focusFirst(found)
      return
    }

    // Dia nao mudou: mantem o instante original, para nao reordenar o dia. Mudou: meio-dia de Sao Paulo.
    const nextDate =
      date === dayKeyOf(transaction.date)
        ? transaction.date
        : zonedTimeToInstant(Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3]), 12)

    // category (texto) e categoryId (resolvido pelas definicoes) seguem juntos durante a transicao (D-07).
    const categoryId = resolveCategoryId(category, categoryDefs)
    const data: TransactionEdit = {
      description: trimmed,
      amount: fromCents(cents),
      type,
      category,
      ...(categoryId ? { categoryId } : {}),
      date: nextDate,
    }

    setSaving(true)
    clearFeedback()
    try {
      await onSave(transaction.id, data)
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar transação">
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div>
          <Label htmlFor="tx-description">Descrição</Label>
          <Input
            id="tx-description"
            ref={descriptionRef}
            data-autofocus=""
            className="mt-1"
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
          <Label htmlFor="tx-amount">Valor</Label>
          <Input
            id="tx-amount"
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
          <span className="text-base font-bold leading-snug">Tipo</span>
          <div className="mt-1">
            <SegmentedControl
              ariaLabel="Tipo da transação"
              value={type}
              onChange={(next) => {
                setType(next)
                clearFeedback()
              }}
              options={[
                { value: 'saida', label: 'Saída', icon: ArrowUpRight },
                { value: 'entrada', label: 'Entrada', icon: ArrowDownLeft },
              ]}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="tx-category">Categoria</Label>
          <div ref={categoryRef} className="mt-1">
            <Select
              id="tx-category"
              value={category}
              aria-invalid={errors.category ? true : undefined}
              onChange={(e) => {
                setCategory(e.target.value)
                clearFeedback()
              }}
            >
              <option value="">Selecione...</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
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

        <div>
          <Label htmlFor="tx-date">Data</Label>
          <Input
            id="tx-date"
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

        {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

        <Button type="submit" size="lg" className="w-full" disabled={saving} aria-busy={saving}>
          Salvar transação
        </Button>
      </form>
    </Sheet>
  )
}
