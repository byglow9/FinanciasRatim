import { useEffect, useRef } from 'react'
import { Vintem, type VintemHandle, type VintemState } from '@/components/vintem/Vintem'
import { useVintem } from '@/contexts/VintemContext'

/**
 * Vintem do arco da Home (UI-SPEC S1): botao de 84 por 84 com a arte hero decorativa.
 * Registra o handle no provedor enquanto montado, para as reacoes chegarem a ele.
 */
export function VintemSlot({ state }: { state: VintemState }) {
  const { registerSlot } = useVintem()
  const handle = useRef<VintemHandle>(null)

  useEffect(() => {
    registerSlot(handle.current)
    return () => registerSlot(null)
  }, [registerSlot])

  return (
    <button
      type="button"
      aria-label="Vintém, toque para ouvir uma fala"
      data-vintem-state={state}
      className="flex h-[84px] w-[84px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Vintem ref={handle} size="hero" state={state} follow />
    </button>
  )
}
