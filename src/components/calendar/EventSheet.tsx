import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Collapsible } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import type { EventDraft } from '@/hooks/useCalendarActions'
import type { AgendaEvent, EventCategory } from '@/types'
import { cn } from '@/lib/utils'
import { MONTH_LONG } from '@shared/core/format.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const DELETE_FAILED = 'Não foi possível apagar. Confira a conexão e tente de novo.'
const TITLE_REQUIRED = 'Escreva o título do evento'
const TITLE_TOO_LONG = 'Use até 60 caracteres'
const TITLE_MAX = 60

interface EventSheetProps {
  open: boolean
  onClose: () => void
  /** Evento em edição; nulo para criar um novo. */
  event: AgendaEvent | null
  /** Dia do evento novo (e do contexto do Sheet). */
  date: Date
  /** Categorias de evento do usuário, cada uma com a sua cor (hex). */
  categories: EventCategory[]
  /** Grava; se lançar, o Sheet continua aberto com aviso. Devolve false quando o perfil bloqueou. */
  onSave: (event: AgendaEvent | null, draft: EventDraft) => Promise<boolean | void>
  /** Apaga pelo id; se lançar, o Sheet continua aberto com aviso. Devolve false quando o perfil bloqueou. */
  onDelete: (id: string) => Promise<boolean | void>
  /** Perfil do parceiro: salvar e apagar ficam aria-disabled (focáveis) e o toque chama onBlocked. */
  readOnly?: boolean
  onBlocked?: () => void
}

/** "18 de novembro" a partir de uma data local. */
function dayLabel(date: Date): string {
  return `${date.getDate()} de ${MONTH_LONG[date.getMonth()].toLowerCase()}`
}

/** Meio-dia local: a data do evento não escorrega de dia por causa do fuso. */
function noon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
}

/** Texto aparado, ou undefined quando fica vazio. */
function optional(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Sheet de evento (UI-SPEC S3, D-10, D-11): "Título", "Categoria" em chips com a cor de cada categoria de
 * evento do usuário (nunca uma lista fixa) e "Mais detalhes" (hora, local e notas) em Collapsible.
 * Apagar troca o conteúdo do mesmo Sheet pela confirmação em duas etapas, sem a janela nativa do
 * navegador (D-03). Todo texto entra como texto React.
 */
export function EventSheet({
  open,
  onClose,
  event,
  date,
  categories,
  onSave,
  onDelete,
  readOnly,
  onBlocked,
}: EventSheetProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTitle(event?.title ?? '')
      setCategoryId(event?.categoryId ?? '')
      setTime(event?.time ?? '')
      setLocation(event?.location ?? '')
      setNotes(event?.notes ?? '')
      setDetailsOpen(!!(event && (event.time || event.location || event.notes)))
      setError('')
      setFailed(false)
      setSaving(false)
      setConfirming(false)
      setDeleting(false)
      setDeleteFailed(false)
    }
  }

  // O foco vai para "Manter" (a opção segura) quando o conteúdo troca pela confirmação.
  useEffect(() => {
    if (confirming) keepRef.current?.focus()
  }, [confirming])

  const eventDate = event?.date ?? date

  const clearFeedback = () => {
    setError('')
    setFailed(false)
  }

  const toggleCategory = (id: string) => {
    if (readOnly) {
      onBlocked?.()
      return
    }
    setCategoryId((current) => (current === id ? '' : id))
    clearFeedback()
  }

  const save = async () => {
    if (readOnly) {
      onBlocked?.()
      return
    }
    if (saving) return
    const trimmed = title.trim()
    if (trimmed.length === 0) {
      setError(TITLE_REQUIRED)
      setFailed(false)
      titleRef.current?.focus()
      return
    }
    if (trimmed.length > TITLE_MAX) {
      setError(TITLE_TOO_LONG)
      setFailed(false)
      titleRef.current?.focus()
      return
    }

    setSaving(true)
    clearFeedback()
    let done: boolean | void
    try {
      done = await onSave(event, {
        title: trimmed,
        date: event?.date ?? noon(date),
        categoryId: categoryId || undefined,
        time: optional(time),
        location: optional(location),
        notes: optional(notes),
      })
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    if (done !== false) onClose()
  }

  const askDeletion = () => {
    if (readOnly) {
      onBlocked?.()
      return
    }
    setDeleteFailed(false)
    setConfirming(true)
  }

  const confirmDeletion = async () => {
    if (!event || deleting) return
    setDeleting(true)
    setDeleteFailed(false)
    let done: boolean | void
    try {
      done = await onDelete(event.id)
    } catch {
      setDeleting(false)
      setDeleteFailed(true)
      return
    }
    setDeleting(false)
    if (done === false) {
      setConfirming(false)
      return
    }
    onClose()
  }

  const showConfirm = confirming && !!event
  const field =
    'mt-1 w-full rounded-btn border border-input bg-surface-2 px-3 py-2 text-base font-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

  return (
    <Sheet open={open} onClose={onClose} title={event ? 'Editar evento' : 'Novo evento'}>
      {showConfirm ? (
        <div className="mt-4 space-y-3">
          <p className="text-base font-bold leading-snug">Apagar este evento? Esta ação não pode ser desfeita.</p>
          {deleteFailed ? <Notice tone="danger">{DELETE_FAILED}</Notice> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="flex-1 px-4"
              onClick={() => void confirmDeletion()}
              disabled={deleting}
              aria-busy={deleting}
            >
              Apagar
            </Button>
            <Button
              ref={keepRef}
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 px-4"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Manter
            </Button>
          </div>
        </div>
      ) : (
        <form
          noValidate
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <p className="text-xs font-normal text-muted-foreground">{`Para ${dayLabel(eventDate)}`}</p>

          <div>
            <Label htmlFor="event-title">Título</Label>
            <Input
              id="event-title"
              ref={titleRef}
              data-autofocus=""
              className="mt-1"
              readOnly={readOnly}
              value={title}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'event-title-error' : undefined}
              onChange={(e) => {
                setTitle(e.target.value)
                clearFeedback()
              }}
            />
            {error ? (
              <p id="event-title-error" role="alert" className="mt-1 text-xs font-normal text-danger-ink">
                {error}
              </p>
            ) : null}
          </div>

          <div>
            <span id="event-category-label" className="text-base font-bold leading-snug">
              Categoria
            </span>
            {categories.length > 0 ? (
              <div role="group" aria-labelledby="event-category-label" className="mt-1 flex flex-wrap gap-2">
                {categories.map((category) => {
                  const selected = category.id === categoryId
                  return (
                    <Chip
                      key={category.id}
                      tone={selected ? 'selected' : 'neutral'}
                      pressed={selected}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(readOnly && 'opacity-60')}
                    >
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: category.color }}
                        className="size-3 shrink-0 rounded-full ring-1 ring-background"
                      />
                      {category.name}
                    </Chip>
                  )
                })}
              </div>
            ) : (
              <p className="mt-1 text-xs font-normal text-muted-foreground">Nenhuma categoria de evento criada ainda.</p>
            )}
          </div>

          <div>
            <button
              type="button"
              aria-expanded={detailsOpen}
              aria-controls="event-details"
              onClick={() => setDetailsOpen((current) => !current)}
              className="flex h-11 w-full items-center justify-between rounded-btn text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Mais detalhes
              <ChevronDown
                className={cn('h-5 w-5 transition-transform', detailsOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
            <Collapsible open={detailsOpen} id="event-details">
              <div className="space-y-4 p-1 pt-2">
                <div>
                  <Label htmlFor="event-time">Hora</Label>
                  <Input
                    id="event-time"
                    className="mt-1"
                    type="time"
                    readOnly={readOnly}
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value)
                      clearFeedback()
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="event-location">Local</Label>
                  <Input
                    id="event-location"
                    className="mt-1"
                    maxLength={80}
                    readOnly={readOnly}
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value)
                      clearFeedback()
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="event-notes">Notas</Label>
                  <textarea
                    id="event-notes"
                    rows={3}
                    maxLength={500}
                    readOnly={readOnly}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value)
                      clearFeedback()
                    }}
                    className={cn(field, 'resize-none')}
                  />
                </div>
              </div>
            </Collapsible>
          </div>

          {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={saving}
            aria-busy={saving}
            aria-disabled={readOnly || undefined}
          >
            Salvar evento
          </Button>
          {event ? (
            <button
              type="button"
              aria-disabled={readOnly || undefined}
              onClick={askDeletion}
              className={cn(
                'h-12 w-full rounded-btn text-base font-bold text-danger-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                readOnly && 'cursor-not-allowed opacity-60'
              )}
            >
              Apagar evento
            </button>
          ) : null}
        </form>
      )}
    </Sheet>
  )
}
