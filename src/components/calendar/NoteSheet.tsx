import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import type { NoteDraft } from '@/hooks/useCalendarActions'
import type { Note } from '@/types'
import { cn } from '@/lib/utils'
import { dayLabelOf, noonOfDay } from '@shared/core/dayKey.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const DELETE_FAILED = 'Não foi possível apagar. Confira a conexão e tente de novo.'
const TEXT_REQUIRED = 'Escreva o texto do post-it'
const TEXT_TOO_LONG = 'Use até 60 caracteres'
const TEXT_MAX = 60

// Classes literais: o Tailwind só gera o que aparece escrito por inteiro no código.
const COLORS: { value: Note['color']; label: string; bg: string }[] = [
  { value: 'yellow', label: 'Amarelo', bg: 'bg-pit-yellow' },
  { value: 'blue', label: 'Azul', bg: 'bg-pit-blue' },
  { value: 'green', label: 'Verde', bg: 'bg-pit-green' },
  { value: 'pink', label: 'Rosa', bg: 'bg-pit-pink' },
  { value: 'purple', label: 'Roxo', bg: 'bg-pit-purple' },
]

interface NoteSheetProps {
  open: boolean
  onClose: () => void
  /** Post-it em edição; nulo para criar um novo. */
  note: Note | null
  /** Dia do post-it novo (e do contexto do Sheet). */
  date: Date
  /** Grava; se lançar, o Sheet continua aberto com aviso. Devolve false quando o perfil bloqueou. */
  onSave: (note: Note | null, draft: NoteDraft) => Promise<boolean | void>
  /** Apaga pelo id; se lançar, o Sheet continua aberto com aviso. Devolve false quando o perfil bloqueou. */
  onDelete: (id: string) => Promise<boolean | void>
  /** Perfil do parceiro: salvar e apagar ficam aria-disabled (focáveis) e o toque chama onBlocked. */
  readOnly?: boolean
  onBlocked?: () => void
}

/**
 * Sheet de post-it (UI-SPEC S3, D-10): "Texto" de até 60 caracteres e "Cor" em radiogroup de cinco
 * swatches de 32px dentro de alvos de 44px. O texto vira o título e o conteúdo novo fica vazio (P-14);
 * o conteúdo de um post-it antigo aparece como segunda linha e nunca é apagado ao editar. Apagar troca o
 * conteúdo do mesmo Sheet pela confirmação em duas etapas, sem a janela nativa do navegador (D-03).
 * Todo texto entra como texto React.
 */
export function NoteSheet({ open, onClose, note, date, onSave, onDelete, readOnly, onBlocked }: NoteSheetProps) {
  const [text, setText] = useState('')
  const [color, setColor] = useState<Note['color']>('yellow')
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  const swatches = useRef<(HTMLButtonElement | null)[]>([])
  const keepRef = useRef<HTMLButtonElement>(null)
  // Gatilho de apagar e marca de que o foco deve voltar a ele ao tocar em "Manter" (WR-13).
  const askRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setText(note?.title ?? '')
      setColor(note?.color ?? 'yellow')
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
    else if (restoreFocus.current) {
      restoreFocus.current = false
      askRef.current?.focus()
    }
  }, [confirming])

  // Depois de uma falha ao apagar, o foco volta ao botão seguro em vez de ficar num botão desabilitado.
  useEffect(() => {
    if (!deleting && deleteFailed) keepRef.current?.focus()
  }, [deleting, deleteFailed])

  const noteDate = note?.date ?? date

  const clearFeedback = () => {
    setError('')
    setFailed(false)
  }

  const pickColor = (next: Note['color']) => {
    if (readOnly) {
      onBlocked?.()
      return
    }
    setColor(next)
    clearFeedback()
  }

  const moveColor = (index: number) => {
    const next = (index + COLORS.length) % COLORS.length
    pickColor(COLORS[next].value)
    swatches.current[next]?.focus()
  }

  const onColorKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = Math.max(0, COLORS.findIndex((c) => c.value === color))
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      moveColor(current + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      moveColor(current - 1)
    }
  }

  const save = async () => {
    if (readOnly) {
      onBlocked?.()
      return
    }
    if (saving) return
    const title = text.trim()
    if (title.length === 0) {
      setError(TEXT_REQUIRED)
      setFailed(false)
      return
    }
    if (title.length > TEXT_MAX) {
      setError(TEXT_TOO_LONG)
      setFailed(false)
      return
    }

    setSaving(true)
    clearFeedback()
    let done: boolean | void
    try {
      // Só título, cor e data: o conteúdo antigo da nota não entra na gravação e fica como está.
      done = await onSave(note, { title, color, date: note?.date ?? noonOfDay(date) })
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
    if (!note || deleting) return
    setDeleting(true)
    setDeleteFailed(false)
    let done: boolean | void
    try {
      done = await onDelete(note.id)
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

  const showConfirm = confirming && !!note
  const selectedIndex = Math.max(0, COLORS.findIndex((c) => c.value === color))

  return (
    <Sheet open={open} onClose={onClose} title={note ? 'Editar post-it' : 'Novo post-it'}>
      {showConfirm ? (
        <div className="mt-4 space-y-3">
          <p className="text-base font-bold leading-snug">Apagar este post-it? Esta ação não pode ser desfeita.</p>
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
              onClick={() => {
                restoreFocus.current = true
                setConfirming(false)
              }}
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
          <p className="text-xs font-normal text-muted-foreground">{`Para ${dayLabelOf(noteDate)}`}</p>

          <div>
            <Label htmlFor="note-text">Texto</Label>
            <textarea
              id="note-text"
              data-autofocus=""
              rows={3}
              readOnly={readOnly}
              value={text}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'note-text-error' : undefined}
              onChange={(e) => {
                setText(e.target.value)
                clearFeedback()
              }}
              className="mt-1 w-full resize-none rounded-btn border border-input bg-inset px-3 py-2 text-base font-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {error ? (
              <p id="note-text-error" role="alert" className="mt-1 text-xs font-normal text-danger-ink">
                {error}
              </p>
            ) : null}
            {note && note.content ? (
              <p className="mt-1 whitespace-pre-line text-xs font-normal text-muted-foreground">{note.content}</p>
            ) : null}
          </div>

          <div>
            <span id="note-color-label" className="text-base font-bold leading-snug">
              Cor
            </span>
            <div
              role="radiogroup"
              aria-labelledby="note-color-label"
              aria-disabled={readOnly || undefined}
              onKeyDown={onColorKeyDown}
              className="mt-1 flex flex-wrap gap-x-1"
            >
              {COLORS.map(({ value, label, bg }, index) => {
                const selected = value === color
                return (
                  <button
                    key={value}
                    ref={(el) => {
                      swatches.current[index] = el
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={label}
                    tabIndex={index === selectedIndex ? 0 : -1}
                    onClick={() => pickColor(value)}
                    className={cn('group flex h-11 w-11 items-center justify-center focus:outline-none', readOnly && 'cursor-not-allowed opacity-60')}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-8 rounded-full ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ring',
                        bg,
                        selected && 'ring-2 ring-action group-focus-visible:ring-action'
                      )}
                    />
                  </button>
                )
              })}
            </div>
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
            Salvar post-it
          </Button>
          {note ? (
            <button
              ref={askRef}
              type="button"
              aria-disabled={readOnly || undefined}
              onClick={askDeletion}
              className={cn(
                'h-12 w-full rounded-btn text-base font-bold text-danger-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                readOnly && 'cursor-not-allowed opacity-60'
              )}
            >
              Apagar post-it
            </button>
          ) : null}
        </form>
      )}
    </Sheet>
  )
}
