import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Vintem, type VintemHandle, type VintemReaction } from '@/components/vintem/Vintem'

export interface VintemToastBodyProps {
  /** Fala ja sorteada e preenchida; entra como texto React, nunca como HTML. */
  text: string
  /** Mesma reacao da Home, em miniatura (UI-SPEC S2 e S4). */
  reaction: VintemReaction
  /** Lado da tela de onde ele espia (padrao: direita). */
  side?: 'left' | 'right'
}

/**
 * Conteudo do toast do Vintem para lancamentos fora da Home (UI-SPEC S4): Vintem de 48 por 40 numa
 * area de 48 por 48, decorativo e sem toque, e a fala em Sora 16/400. A superficie clara, a borda, o
 * botao de dispensar e o temporizador vem do item custom de toast.tsx. A fala nunca e truncada.
 */
export function VintemToastBody({ text, reaction, side = 'right' }: VintemToastBodyProps) {
  const handle = useRef<VintemHandle>(null)

  useEffect(() => {
    handle.current?.react(reaction)
  }, [reaction])

  const left = side === 'left'
  return (
    <div className={cn('relative pb-28 pt-1', left ? 'pl-6' : 'pr-6')}>
      <div
        className={cn(
          'anim-peek-bubble relative min-w-0 max-w-[210px] rounded-2xl bg-action px-3 py-2 text-action-text shadow-float',
          left ? 'origin-bottom-left' : 'origin-bottom-right',
        )}
      >
        <p lang="pt-BR" className="text-base font-normal leading-normal">
          {text}
        </p>
        <span
          aria-hidden="true"
          className={cn(
            'absolute -bottom-[7px] h-3.5 w-3.5 rotate-45 rounded-br-[3px] bg-action',
            left ? 'left-6' : 'right-6',
          )}
        />
      </div>
      {/* Vintem grande, inclinado na diagonal, com metade do corpo para fora da borda da tela. */}
      <div
        className={cn('pointer-events-none absolute bottom-0', left ? '-left-8' : '-right-8')}
        aria-hidden="true"
      >
        <div className="anim-peek-vintem [&_ellipse[id$=-shadow]]:hidden">
          <Vintem ref={handle} state="atento" size="empty" follow={false} />
        </div>
      </div>
    </div>
  )
}
