import { VintemBalloon } from '@/components/vintem/VintemBalloon'
import { useVintem } from '@/contexts/VintemContext'

/**
 * Balao da Home ligado ao provedor (UI-SPEC S1): de quadrinho, saindo da cabeca do porco para o lado, por cima do medidor.
 * Fica dentro do espaco do porco (150 por 125) e cresce para cima, para nunca tampar o valor. Sem fala
 * nao renderiza nada; com fala fica ate o toque ou o proximo evento (D-09): nao existe temporizador.
 */
export function VintemHomeBalloon() {
  const { speech, dismiss } = useVintem()
  if (speech === null) return null
  return (
    <div
      className="absolute bottom-[112px] left-[78px] z-30 flex w-[min(172px,calc(50vw-28px))] justify-start text-left"
      data-situation={speech.situation}
      data-phrase={speech.id}
    >
      <VintemBalloon text={speech.text} placement="side" popKey={speech.popKey} onDismiss={dismiss} />
    </div>
  )
}
