import { cn } from '@/lib/utils'
import type { Note } from '@/types'

// Classes literais: o Tailwind só gera o que aparece escrito por inteiro no código.
const PIT_BG: Record<Note['color'], string> = {
  yellow: 'bg-pit-yellow',
  blue: 'bg-pit-blue',
  green: 'bg-pit-green',
  pink: 'bg-pit-pink',
  purple: 'bg-pit-purple',
}

interface MiniPostItProps {
  /** Cores das notas do dia, da mais recente para a mais antiga; só as duas primeiras aparecem. */
  colors: Note['color'][]
}

/**
 * Mini post-it de 12px no canto superior direito da célula (D-09): cor da nota, dobra no canto, até dois
 * sobrepostos (o segundo 8px à esquerda, girado -9deg; o primeiro girado 7deg). É decorativo: o rótulo
 * da célula já diz o que há no dia, então não recebe toque nem leitor de tela. Post-it nunca é pontinho.
 */
export function MiniPostIt({ colors }: MiniPostItProps) {
  const shown = colors.slice(0, 2)
  if (shown.length === 0) return null
  return (
    <>
      {shown.map((color, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1 size-3 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,.14)]',
            PIT_BG[color],
            index === 0 ? 'right-1 rotate-[7deg]' : 'right-3 -rotate-[9deg]'
          )}
        >
          <span className="absolute bottom-0 right-0 size-1 bg-black/25" />
        </span>
      ))}
    </>
  )
}
