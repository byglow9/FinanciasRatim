import { Vintem } from '@/components/vintem/Vintem'

/** Poses dos estados vazios e de erro: neutro, sonolento (nada acontecendo) e surpreso (erro de rede). */
export type VintemEmptyPose = 'neutro' | 'sonolento' | 'surpreso'

export interface VintemEmptyProps {
  pose: VintemEmptyPose
}

/**
 * Vintem decorativo dos estados vazios e de erro (UI-SPEC S5, P-02): 120 por 100, sem botao, sem
 * balao, sem fala e sem nome acessivel. Nao e focavel nem tocavel; respira, pisca e deriva como os
 * demais, mas nunca fala. O texto, os botoes e os avisos do estado ficam como no contrato de origem.
 */
export function VintemEmpty({ pose }: VintemEmptyProps) {
  return (
    <div className="mx-auto flex justify-center" aria-hidden="true" data-pose={pose}>
      <Vintem state={pose} size="empty" />
    </div>
  )
}
