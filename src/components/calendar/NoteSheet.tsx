import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import type { NoteDraft } from '@/hooks/useCalendarActions'
import type { Note } from '@/types'
import { MONTH_LONG } from '@shared/core/format.js'

const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const TEXT_REQUIRED = 'Escreva o texto do post-it'
const TEXT_TOO_LONG = 'Use até 60 caracteres'
const TEXT_MAX = 60

interface NoteSheetProps {
  open: boolean
  onClose: () => void
  /** Post-it em edição; nulo para criar um novo. */
  note: Note | null
  /** Dia do post-it novo (e do contexto do Sheet). */
  date: Date
  /** Grava; se lançar, o Sheet continua aberto com aviso. Devolve false quando o perfil bloqueou. */
  onSave: (note: Note | null, draft: NoteDraft) => Promise<boolean | void>
  /** Perfil do parceiro: salvar fica aria-disabled (focável) e o toque chama onBlocked. */
  readOnly?: boolean
  onBlocked?: () => void
}

/** "18 de novembro" a partir de uma data local. */
function dayLabel(date: Date): string {
  return `${date.getDate()} de ${MONTH_LONG[date.getMonth()].toLowerCase()}`
}

/** Meio-dia local: a data do post-it não escorrega de dia por causa do fuso. */
function noon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
}

/**
 * Sheet de post-it (UI-SPEC S3, D-10): só o campo "Texto" de até 60 caracteres. O texto vira o título
 * e o conteúdo novo fica vazio (P-14); o formulário antigo exigia conteúdo, este não. Todo texto entra
 * como texto React.
 */
export function NoteSheet({ open, onClose, note, date, onSave, readOnly, onBlocked }: NoteSheetProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setText(note?.title ?? '')
      setError('')
      setFailed(false)
      setSaving(false)
    }
  }

  const noteDate = note?.date ?? date

  const clearFeedback = () => {
    setError('')
    setFailed(false)
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
      done = await onSave(note, {
        title,
        color: note?.color ?? 'yellow',
        date: note?.date ?? noon(date),
      })
    } catch {
      setSaving(false)
      setFailed(true)
      return
    }
    setSaving(false)
    if (done !== false) onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={note ? 'Editar post-it' : 'Novo post-it'}>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <p className="text-xs font-normal text-muted-foreground">{`Para ${dayLabel(noteDate)}`}</p>

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
            className="mt-1 w-full resize-none rounded-btn border border-input bg-surface-2 px-3 py-2 text-base font-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {error ? (
            <p id="note-text-error" role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {error}
            </p>
          ) : null}
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
      </form>
    </Sheet>
  )
}
