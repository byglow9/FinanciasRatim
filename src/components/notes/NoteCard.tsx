import { Pencil, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Note } from '@/types'
import { cn } from '@/lib/utils'

const COLOR_CLASSES: Record<Note['color'], { bg: string; shadow: string }> = {
  yellow:  { bg: 'bg-yellow-300',  shadow: 'shadow-yellow-400/50' },
  blue:    { bg: 'bg-cyan-300',    shadow: 'shadow-cyan-400/50'   },
  green:   { bg: 'bg-lime-300',    shadow: 'shadow-lime-400/50'   },
  pink:    { bg: 'bg-fuchsia-400', shadow: 'shadow-fuchsia-500/50'},
  purple:  { bg: 'bg-violet-300',  shadow: 'shadow-violet-400/50' },
}

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onView: (note: Note) => void
}

export function NoteCard({ note, onEdit, onDelete, onView }: NoteCardProps) {
  const { bg, shadow } = COLOR_CLASSES[note.color]

  return (
    <div
      onClick={() => onView(note)}
      className={cn(
        'relative group aspect-square rounded-sm cursor-pointer select-none',
        'flex flex-col p-3 sm:p-4 overflow-hidden',
        'shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl',
        bg, shadow,
      )}
    >
      {/* Botões de ação — sempre visíveis no mobile, hover no desktop */}
      <div
        className="absolute top-1.5 right-1.5 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(note)}
          className="p-1 rounded hover:bg-black/15 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5 text-gray-700" />
        </button>
        <button
          onClick={() => onDelete(note.id)}
          className="p-1 rounded hover:bg-black/15 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 text-gray-700" />
        </button>
      </div>

      {/* Conteúdo */}
      <p className="font-bold text-sm leading-tight pr-12 text-gray-800 line-clamp-2 mb-1.5">
        {note.title}
      </p>
      <p className="text-sm text-gray-700 leading-snug flex-1 line-clamp-4 whitespace-pre-wrap">
        {note.content}
      </p>

      {/* Data */}
      {note.date && (
        <div className="flex items-center gap-1 mt-auto pt-1.5">
          <Calendar className="h-3 w-3 text-gray-600 shrink-0" />
          <span className="text-xs text-gray-600">
            {format(note.date, "d 'de' MMM", { locale: ptBR })}
          </span>
        </div>
      )}

      {/* Canto dobrado */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 0 20px 20px',
          borderColor: 'transparent transparent rgba(0,0,0,0.18) transparent',
        }}
      />
    </div>
  )
}
