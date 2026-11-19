import { cn } from '@/lib/utils'
import type { NoteDayItem } from '@shared/core/calendarModel.js'

// Classes literais: o Tailwind só gera o que aparece escrito por inteiro no código.
const PIT_BG: Record<NoteDayItem['color'], string> = {
  yellow: 'bg-pit-yellow',
  blue: 'bg-pit-blue',
  green: 'bg-pit-green',
  pink: 'bg-pit-pink',
  purple: 'bg-pit-purple',
}

interface PostItCardProps {
  note: NoteDayItem
  /** Posição do post-it no dia: a rotação de ±0,5deg alterna. */
  index: number
  onOpen: (id: string) => void
}

/**
 * Post-it da agenda (UI-SPEC S3, D-10): botão de largura total na cor da nota, raio `4px 4px 16px 4px`,
 * dobra de 16px no canto inferior direito e rotação leve que alterna (sem rotação com movimento
 * reduzido). Tocar abre o Sheet de edição. O texto entra sempre como texto React.
 */
export function PostItCard({ note, index, onOpen }: PostItCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(note.id)}
      className={cn(
        'relative min-h-14 w-full overflow-hidden rounded-[4px_4px_16px_4px] p-3 text-left text-base font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:rotate-0',
        PIT_BG[note.color],
        index % 2 === 0 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'
      )}
    >
      <span className="block break-words pr-4">{note.title}</span>
      <span aria-hidden="true" className="absolute bottom-0 right-0 size-4 rounded-tl-[6px] bg-black/20" />
    </button>
  )
}
