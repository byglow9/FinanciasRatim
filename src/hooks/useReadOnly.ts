import { useCallback } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useToast } from '@/components/ui/toast'

/**
 * Modo somente leitura derivado do perfil visto (IDEN-07). O bloqueio e so de interface nesta
 * fase: as regras do Firestore seguem permitindo, a aplicacao delas e da Fase 8.
 * `guard` mostra o aviso e devolve true quando bloqueou: quem chama nao executa a acao.
 */
export function useReadOnly() {
  const { readOnly, currentArea, lastPerson, settings } = useArea()
  const { show } = useToast()

  const viewed = currentArea === 'porquinho' ? lastPerson : currentArea
  const partnerName = viewed === 'ele' ? settings.tabNames.area1 : settings.tabNames.area2

  const guard = useCallback(
    (verb: 'lançar' | 'editar'): boolean => {
      if (!readOnly) return false
      show(`Perfil em somente leitura. Volte ao seu perfil para ${verb}.`)
      return true
    },
    [readOnly, show]
  )

  return { readOnly, partnerName, guard }
}
