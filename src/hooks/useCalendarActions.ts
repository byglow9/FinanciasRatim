import { useCallback } from 'react'
import type { AgendaEvent, Note, PersonType } from '@/types'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useToast } from '@/components/ui/toast'
import { addNote, deleteNote, updateNote } from '@/services/notes.service'
import { addEvent, deleteEvent, updateEvent } from '@/services/events.service'

/** Dados do post-it vindos do Sheet: o texto vira o título e o conteúdo novo fica vazio (P-14). */
export interface NoteDraft {
  title: string
  color: Note['color']
  date: Date
}

/** Dados do evento vindos do Sheet; campo vazio chega como undefined. */
export interface EventDraft {
  title: string
  date: Date
  categoryId?: string
  time?: string
  location?: string
  notes?: string
}

/**
 * Na edição, um campo esvaziado vira texto vazio: o Firestore ignora `undefined` (ignoreUndefinedProperties)
 * e o valor antigo ficaria. Sem valor antigo, continua sem o campo.
 */
function cleared(next: string | undefined, previous: string | undefined): string | undefined {
  return next ?? (previous ? '' : undefined)
}

interface UseCalendarActionsOptions {
  /** Pessoa do calendário visto: dona do post-it novo. */
  person: PersonType
  /** Chamado depois de uma gravação que deu certo: a página faz o refetch silencioso. */
  onChanged: () => void
}

/**
 * Gravação de post-its e eventos do Calendário (D-10). Toda ação passa por `guard('editar')`
 * (perfil do parceiro não grava), mostra um aviso simples de sucesso e chama `onChanged`.
 * Falha de rede rejeita a promessa: o Sheet continua aberto e mostra o aviso dele.
 * Devolve `false` quando o perfil bloqueou (nada foi gravado) e `true` quando gravou.
 */
export function useCalendarActions({ person, onChanged }: UseCalendarActionsOptions) {
  const { guard } = useReadOnly()
  const { show } = useToast()

  const saveNote = useCallback(
    async (note: Note | null, draft: NoteDraft): Promise<boolean> => {
      if (guard('editar')) return false
      if (note) {
        // O conteúdo antigo não entra na atualização: fica como está (P-14).
        await updateNote(note.id, { title: draft.title, color: draft.color, date: draft.date })
      } else {
        await addNote({ person, title: draft.title, content: '', color: draft.color, date: draft.date })
      }
      show('Post-it salvo')
      onChanged()
      return true
    },
    [guard, show, onChanged, person]
  )

  const removeNote = useCallback(
    async (id: string): Promise<boolean> => {
      if (guard('editar')) return false
      await deleteNote(id)
      show('Post-it apagado')
      onChanged()
      return true
    },
    [guard, show, onChanged]
  )

  const saveEvent = useCallback(
    async (event: AgendaEvent | null, draft: EventDraft): Promise<boolean> => {
      if (guard('editar')) return false
      if (event) {
        // A pessoa do evento existente é mantida: não entra na atualização.
        await updateEvent(event.id, {
          title: draft.title,
          date: draft.date,
          categoryId: cleared(draft.categoryId, event.categoryId),
          time: cleared(draft.time, event.time),
          location: cleared(draft.location, event.location),
          notes: cleared(draft.notes, event.notes),
        })
      } else {
        // Evento novo é de "Nós dois", como no formulário antigo.
        await addEvent({
          person: 'conjunto',
          title: draft.title,
          date: draft.date,
          categoryId: draft.categoryId,
          time: draft.time,
          location: draft.location,
          notes: draft.notes,
        })
      }
      show('Evento salvo')
      onChanged()
      return true
    },
    [guard, show, onChanged]
  )

  const removeEvent = useCallback(
    async (id: string): Promise<boolean> => {
      if (guard('editar')) return false
      await deleteEvent(id)
      show('Evento apagado')
      onChanged()
      return true
    },
    [guard, show, onChanged]
  )

  return { saveNote, removeNote, saveEvent, removeEvent }
}
