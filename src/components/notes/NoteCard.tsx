import { Pencil, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Note } from '@/types'
import { cn } from '@/lib/utils'

const COLOR_CLASSES: Record<Note['color'], string> = {
  yellow: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-50',
  blue: 'bg-blue-100 border-blue-300 hover:bg-blue-50',
  green: 'bg-green-100 border-green-300 hover:bg-green-50',
  pink: 'bg-pink-100 border-pink-300 hover:bg-pink-50',
  purple: 'bg-purple-100 border-purple-300 hover:bg-purple-50',
}

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <div
      className={cn(
        'relative group rounded-lg border p-4 min-h-[140px] flex flex-col gap-2 shadow-sm transition-all',
        COLOR_CLASSES[note.color]
      )}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(note)}
          className="p-1 rounded hover:bg-black/10 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5 text-gray-600" />
        </button>
        <button
          onClick={() => onDelete(note.id)}
          className="p-1 rounded hover:bg-black/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 text-gray-600" />
        </button>
      </div>

      <p className="font-semibold text-sm leading-tight pr-14 line-clamp-2">{note.title}</p>
      <p className="text-sm text-gray-700 leading-snug flex-1 line-clamp-4 whitespace-pre-wrap">
        {note.content}
      </p>

      {note.date && (
        <div className="flex items-center gap-1 mt-auto pt-2 border-t border-black/10">
          <Calendar className="h-3 w-3 text-gray-500 shrink-0" />
          <span className="text-xs text-gray-500">
            {format(note.date, "d 'de' MMM", { locale: ptBR })}
          </span>
        </div>
      )}
    </div>
  )
}
