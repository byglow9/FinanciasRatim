import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface VintemVoteProps {
  onVote: (voto: 'sim' | 'nao') => void
  /** Lado onde os botoes ficam: no centro (balao da Home) ou rente a borda de onde o porco espia (toast). */
  align?: 'start' | 'center' | 'end'
}

/**
 * Botoes de voto da fala (07.1, D-12): gostei e nao gostei, de 44 px. Ficam ao lado do balao, nunca
 * dentro dele (o balao e um botao). O pai deve usar `key` com o id da fala para o voto reiniciar.
 * Fundo opaco e sombra para ler sobre
 * qualquer conteudo nos temas claro e escuro. Sem animacao propria.
 */
export function VintemVote({ onVote, align = 'center' }: VintemVoteProps) {
  const [liked, setLiked] = useState(false)
  const justify = align === 'start' ? 'justify-start' : align === 'end' ? 'justify-end' : 'justify-center'
  return (
    <div className={`mt-2 flex gap-3 ${justify}`}>
      <Button
        type="button"
        variant="secondary"
        size="circle"
        aria-label="Gostei dessa fala"
        aria-pressed={liked}
        className="shadow-float motion-reduce:transition-none"
        onClick={() => {
          if (liked) return
          setLiked(true)
          onVote('sim')
        }}
      >
        <ThumbsUp aria-hidden="true" className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="circle"
        aria-label="Não gostei dessa fala"
        className="shadow-float motion-reduce:transition-none"
        onClick={() => onVote('nao')}
      >
        <ThumbsDown aria-hidden="true" className="h-5 w-5" />
      </Button>
    </div>
  )
}
