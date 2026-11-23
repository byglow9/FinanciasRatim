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
    <div className="flex items-center gap-3 py-3 pl-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
        <Vintem ref={handle} state="neutro" size="inline" follow={false} />
      </div>
      <p lang="pt-BR" className="min-w-0 flex-1 text-base font-normal leading-normal">
        {text}
      </p>
    </div>
  )
}
