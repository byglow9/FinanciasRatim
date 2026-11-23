import { useEffect, useRef } from 'react'
import { Vintem, type VintemHandle, type VintemState } from '@/components/vintem/Vintem'
import { useVintem } from '@/contexts/VintemContext'

/**
 * Vintem do arco da Home (UI-SPEC S1): botao de 150 por 125 com a arte hero decorativa.
 * Registra o handle no provedor enquanto montado, para as reacoes chegarem a ele.
 */
export function VintemSlot({
  state,
  onTap,
}: {
  state: VintemState
  onTap?: (handle: VintemHandle | null) => void
}) {
  const { registerSlot } = useVintem()
  const handle = useRef<VintemHandle>(null)

  useEffect(() => {
    registerSlot(handle.current)
    return () => registerSlot(null)
  }, [registerSlot])

  return (
    <button
      type="button"
      onClick={() => onTap?.(handle.current)}
      aria-label="Vintém, toque para ouvir uma fala"
      data-vintem-state={state}
      className="flex h-[125px] w-[150px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Vintem ref={handle} size="gauge" state={state} follow />
    </button>
  )
}
