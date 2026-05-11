import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useArea } from '@/contexts/AreaContext'
import { useNotes } from '@/hooks/useNotes'
import { NoteCard } from '@/components/notes/NoteCard'
import { NoteForm } from '@/components/notes/NoteForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Plus, StickyNote, Calendar, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note, PersonType } from '@/types'

const VIEW_BG: Record<Note['color'], string> = {
  yellow: '!bg-yellow-300',
  blue:   '!bg-cyan-300',
  green:  '!bg-lime-300',
  pink:   '!bg-fuchsia-400',
  purple: '!bg-violet-300',
}

export function NotasPage() {
  const { currentArea } = useArea()
  const [formOpen, setFormOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)

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
    setViewingNote(null)
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
              onView={setViewingNote}
            />
          ))}
        </div>
      )}

      {/* Modal de visualização */}
      <Dialog open={!!viewingNote} onOpenChange={(open) => !open && setViewingNote(null)}>
        <DialogContent className={cn('p-0 overflow-hidden max-w-sm border-0 shadow-xl rounded-sm', viewingNote && VIEW_BG[viewingNote.color])}>
          {viewingNote && (
            <div className="flex flex-col min-h-[280px] p-6 relative">
              {/* Canto dobrado */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 0,
                  height: 0,
                  borderStyle: 'solid',
                  borderWidth: '0 0 28px 28px',
                  borderColor: 'transparent transparent rgba(0,0,0,0.18) transparent',
                }}
              />

              <h2 className="font-bold text-lg text-gray-800 leading-tight mb-3 pr-2">
                {viewingNote.title}
              </h2>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed flex-1 text-sm">
                {viewingNote.content}
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/10">
                {viewingNote.date ? (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-600" />
                    <span className="text-xs text-gray-600">
                      {format(viewingNote.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                ) : <span />}

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 hover:bg-black/10 text-gray-700"
                  onClick={() => handleEdit(viewingNote)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
