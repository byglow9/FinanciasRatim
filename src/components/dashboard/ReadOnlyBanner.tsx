import { Eye } from 'lucide-react'
import { Notice } from '@/components/ui/notice'
import { useReadOnly } from '@/hooks/useReadOnly'

/** Faixa do perfil visto em somente leitura (IDEN-07). Fora desse modo não renderiza. */
export function ReadOnlyBanner() {
  const { readOnly, partnerName } = useReadOnly()

  if (!readOnly) return null

  return (
    <Notice icon={Eye} title={`Perfil de ${partnerName}, somente leitura`}>
      Você vê tudo, mas não lança nem edita.
    </Notice>
  )
}
