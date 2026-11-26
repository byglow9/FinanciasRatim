import { VintemBalloon } from '@/components/vintem/VintemBalloon'
import { VintemVote } from '@/components/vintem/VintemVote'
import { useVintem } from '@/contexts/VintemContext'

/**
 * Balao da Home ligado ao provedor (UI-SPEC S1). Sem fala nao renderiza nada; com fala fica ate
 * o toque ou o proximo evento (D-09): nao existe temporizador de sumico.
 */
export function VintemHomeBalloon() {
  const { speech, dismiss, canVote, rate } = useVintem()
  if (speech === null) return null
  return (
    <>
      <div className="mt-4 flex justify-center" data-situation={speech.situation} data-phrase={speech.id}>
        <VintemBalloon text={speech.text} placement="below" popKey={speech.popKey} onDismiss={dismiss} />
      </div>
      {speech.votavel === true && canVote ? (
        <VintemVote key={speech.id} onVote={(voto) => rate(speech.id, voto)} />
      ) : null}
    </>
  )
}
