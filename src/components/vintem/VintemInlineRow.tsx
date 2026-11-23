import { Vintem, type VintemState } from '@/components/vintem/Vintem'
import { VintemBalloon } from '@/components/vintem/VintemBalloon'

export interface VintemInlineRowProps {
  state: VintemState
  /** Fala atual. Sem texto, a linha nao renderiza nada (UI-SPEC S3). */
  text: string | null | undefined
  onDismiss?: () => void
  /** Toque no Vintem: pede uma fala nova. */
  onTap?: () => void
  popKey?: string | number
  reduced?: boolean
}

/** Linha com o Vintem de 48 px (botao de 48x48) e o balao a direita, com 12 px de intervalo. */
export function VintemInlineRow({ state, text, onDismiss, onTap, popKey, reduced }: VintemInlineRowProps) {
  if (!text) return null
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Vintém, toque para ouvir uma fala"
        onClick={onTap}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Vintem state={state} size="inline" reduced={reduced} />
      </button>
      <div className="min-w-0 flex-1">
        <VintemBalloon text={text} placement="inline" onDismiss={onDismiss} popKey={popKey} reduced={reduced} />
      </div>
    </div>
  )
}
