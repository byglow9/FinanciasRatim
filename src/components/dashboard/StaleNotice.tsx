import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Notice } from '@/components/ui/notice'
import { useBankFreshness } from '@/hooks/useBankFreshness'
import { useNow } from '@/hooks/useNow'

interface StaleNoticeProps {
  /** 'top' mostra só o aviso (acima do hero); 'below' só a linha discreta de tudo em dia. */
  placement?: 'top' | 'below'
}

/**
 * Aviso de dado velho do banco (LIM-08). Usa useBankFreshness, a mesma regra de supressão do
 * núcleo que pausa o veredito, então o aviso aparece exatamente quando o ritmo some.
 * Sem conexão bancária, ou enquanto carrega, não renderiza.
 */
export function StaleNotice({ placement = 'top' }: StaleNoticeProps) {
  const { items, suppress, hasConnections, loading } = useBankFreshness()
  const now = useNow(60_000)

  if (!hasConnections || loading) return null

  const ago = (d: Date) => formatDistanceStrict(d, now, { locale: ptBR, addSuffix: true })
  const hasNotice = suppress || items.some((f) => f.level === 'warn' || f.level === 'error')

  if (!hasNotice) {
    if (placement !== 'below') return null
    // Conexão mais antiga que tem data: o texto vale para todas.
    const dated = items.filter((f) => f.updatedAt)
    if (dated.length === 0) return null
    const oldest = dated.reduce((a, b) => (a.updatedAt!.getTime() <= b.updatedAt!.getTime() ? a : b))
    return <p className="text-xs font-normal text-muted-foreground">Banco atualizado {ago(oldest.updatedAt!)}</p>
  }

  if (placement !== 'top') return null

  // Mensagem mais grave: consentimento vencido, reconexão, dados velhos, consentimento perto de vencer.
  let title: string
  let text: string
  const expired = items.find((f) => f.consent === 'expired')
  const reconnect = items.find((f) => f.needsReconnect)
  const stale = items.find((f) => f.stale)
  const expiring = items.find((f) => f.consent === 'expiring')
  if (expired) {
    title = 'Consentimento do banco vencido'
    text = 'Reconecte para voltar a receber lançamentos. O ritmo fica em pausa até lá.'
  } else if (reconnect) {
    title = 'O banco precisa ser reconectado'
    text = 'O ritmo fica em pausa até a reconexão.'
  } else if (stale) {
    title = 'Dados do banco desatualizados'
    text = stale.updatedAt
      ? `Última atualização ${ago(stale.updatedAt)}. Os números podem não incluir os últimos gastos, então o ritmo fica em pausa até o banco atualizar.`
      : 'Sem registro de atualização. O ritmo fica em pausa até o banco atualizar.'
  } else if (expiring) {
    const n = expiring.daysToExpire ?? 0
    title = `O consentimento do banco vence em ${n} ${n === 1 ? 'dia' : 'dias'}`
    text = 'Reconecte antes para não perder lançamentos.'
  } else {
    title = 'Os dados do banco podem estar incompletos'
    text = 'Confira a conexão em Bancos conectados.'
  }

  return (
    <Notice
      icon={Landmark}
      title={title}
      action={
        <Link
          to="/configuracoes#bancos"
          className="inline-flex min-h-11 items-center text-xs font-bold text-foreground underline underline-offset-4"
        >
          Abrir Bancos conectados
        </Link>
      }
    >
      {text}
    </Notice>
  )
}
