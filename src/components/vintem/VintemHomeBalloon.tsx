import { VintemBalloon } from '@/components/vintem/VintemBalloon'
import { VintemVote } from '@/components/vintem/VintemVote'
import { useVintem } from '@/contexts/VintemContext'

/**
 * Balao da Home ligado ao provedor (UI-SPEC S1): de quadrinho, ao lado do porco, por cima do medidor.
 * Fica dentro do espaco do porco (150 por 125) e cresce para cima, para nunca tampar o valor. Sem fala
 * nao renderiza nada; com fala fica ate o toque ou o proximo evento (D-09): nao existe temporizador.
 */
export function VintemHomeBalloon() {
  const { speech, dismiss } = useVintem()
  if (speech === null) return null
  return (
    <div
      className="absolute bottom-[94px] left-[132px] z-30 flex w-[min(250px,calc(50vw+16px))] justify-start text-left"
      data-situation={speech.situation}
      data-phrase={speech.id}
    >
      <VintemBalloon text={speech.text} placement="side" popKey={speech.popKey} onDismiss={dismiss} />
    </div>
  )
}

/** Botoes de voto da fala atual: ficam no fluxo da pagina, para o balao nao tampar o valor. */
export function VintemHomeVote() {
  const { speech, canVote, rate } = useVintem()
  if (speech === null) return null
  return speech.votavel === true && canVote ? (
    <VintemVote key={speech.id} onVote={(voto) => rate(speech.id, voto)} />
  ) : null
}
