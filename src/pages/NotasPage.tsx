import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useNotes } from '@/hooks/useNotes'
import { NoteCard } from '@/components/notes/NoteCard'
import { NoteForm } from '@/components/notes/NoteForm'
import { Button } from '@/components/ui/button'
import { Plus, StickyNote } from 'lucide-react'
import type { Note, PersonType } from '@/types'

export function NotasPage() {
  const { currentArea } = useArea()
  const [formOpen, setFormOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const person: PersonType = currentArea === 'porquinho' ? 'ele' : (currentArea as PersonType)
  const { notes, loading, error, add, update, remove } = useNotes(person)

  const handleSubmit = async (data: Omit<Note, 'id' | 'createdAt'>) => {
    if (editingNote) {
      await update(editingNote.id, data)
    } else {
      await add(data)
    }
    setEditingNote(null)
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta anotação?')) {
      await remove(id)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditingNote(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 sm:hidden" />
        <div className="hidden sm:block sm:flex-1">
          <h1 className="text-2xl font-bold">Anotações</h1>
          <p className="text-muted-foreground">Suas notas e lembretes</p>
        </div>
        <div className="flex-1 sm:flex-none flex justify-end">
          <Button
            size="sm"
            onClick={() => { setEditingNote(null); setFormOpen(true) }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-1">Nova</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="border border-destructive bg-destructive/10 rounded-lg p-4 text-destructive">
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Carregando...</div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <StickyNote className="h-12 w-12 opacity-20" />
          <p className="text-sm">Nenhuma anotação ainda. Crie sua primeira!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <NoteForm
        key={editingNote?.id ?? 'new'}
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        currentPerson={person}
        initialData={editingNote ?? undefined}
      />
    </div>
  )
}
