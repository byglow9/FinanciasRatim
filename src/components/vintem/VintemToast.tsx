import { useEffect, useRef } from 'react'
import { Vintem, type VintemHandle, type VintemReaction } from '@/components/vintem/Vintem'

export interface VintemToastBodyProps {
  /** Fala ja sorteada e preenchida; entra como texto React, nunca como HTML. */
  text: string
  /** Mesma reacao da Home, em miniatura (UI-SPEC S2 e S4). */
  reaction: VintemReaction
}

/**
 * Conteudo do toast do Vintem para lancamentos fora da Home (UI-SPEC S4): Vintem de 48 por 40 numa
 * area de 48 por 48, decorativo e sem toque, e a fala em Sora 16/400. A superficie clara, a borda, o
 * botao de dispensar e o temporizador vem do item custom de toast.tsx. A fala nunca e truncada.
 */
export function VintemToastBody({ text, reaction }: VintemToastBodyProps) {
  const handle = useRef<VintemHandle>(null)

  useEffect(() => {
    handle.current?.react(reaction)
  }, [reaction])

  return (
    <div className="flex items-end">
      <div className="relative mb-3 min-w-0 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-foreground shadow-float">
        <p lang="pt-BR" className="text-base font-normal leading-normal">
          {text}
        </p>
        <span
          aria-hidden="true"
          className="absolute -right-[7px] bottom-4 h-3.5 w-3.5 rotate-45 border-r border-t border-border bg-surface-2"
        />
      </div>
      {/* Vintem espiando: metade do corpo fica para fora da borda da tela. */}
      <div className="-mr-6 ml-2 flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden="true">
        <Vintem ref={handle} state="neutro" size="inline" follow={false} />
      </div>
    </div>
  )
}
