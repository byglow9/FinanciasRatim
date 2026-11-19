import { useCallback } from 'react'
import type { Note, PersonType } from '@/types'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useToast } from '@/components/ui/toast'
import { addNote, deleteNote, updateNote } from '@/services/notes.service'

/** Dados do post-it vindos do Sheet: o texto vira o título e o conteúdo novo fica vazio (P-14). */
export interface NoteDraft {
  title: string
  color: Note['color']
  date: Date
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

  return { saveNote, removeNote }
}
