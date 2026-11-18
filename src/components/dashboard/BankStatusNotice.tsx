import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useBankConnections } from '@/hooks/useBankConnections'
import { useNow } from '@/hooks/useNow'
import { BANK_ENABLED } from '@/services/bank.service'
import { describeBankFreshness } from '@shared/core/bankStatus.js'

/**
 * Frescor dos dados do banco na Home (REV-07, D-08): uma linha discreta quando
 * tudo está bem e um aviso só quando há desatualização, consentimento perto de
 * vencer ou vencido, ou reconexão necessária.
 */
export function BankStatusNotice() {
  const { connections, loading } = useBankConnections()
  const now = useNow(60_000)

  if (!BANK_ENABLED || loading || connections.length === 0) return null

  const ago = (d: Date) => formatDistanceStrict(d, now, { locale: ptBR, addSuffix: true })
  const items = connections.map((c) =>
    describeBankFreshness(
      {
        status: c.status,
        executionStatus: c.executionStatus,
        bankUpdatedAt: c.bankUpdatedAt ?? null,
        lastSyncAt: c.lastSyncAt ?? null,
        consentExpiresAt: c.consentExpiresAt ?? null,
      },
      now
    )
  )

  const isError = items.some((f) => f.level === 'error')
  const isWarn = items.some((f) => f.level === 'warn')

  if (!isError && !isWarn) {
    // Conexão mais antiga que tem data: o texto vale para todas.
    const dated = items.filter((f) => f.updatedAt)
    if (dated.length === 0) return null
    const oldest = dated.reduce((a, b) => (a.updatedAt!.getTime() <= b.updatedAt!.getTime() ? a : b))
    return (
      <p className="text-xs text-muted-foreground">Banco atualizado {ago(oldest.updatedAt!)}</p>
    )
  }

  // Mensagem mais grave: consentimento vencido, reconexão, dados velhos, consentimento perto de vencer.
  let message: string
  const expired = items.find((f) => f.consent === 'expired')
  const reconnect = items.find((f) => f.needsReconnect)
  const stale = items.find((f) => f.stale)
  const expiring = items.find((f) => f.consent === 'expiring')
  if (expired) {
    message = 'Consentimento do banco vencido: reconecte para voltar a receber lançamentos'
  } else if (reconnect) {
    message = 'O banco precisa ser reconectado'
  } else if (stale) {
    message = stale.updatedAt
      ? `Os dados do banco estão desatualizados (última atualização ${ago(stale.updatedAt)})`
      : 'Os dados do banco estão desatualizados (sem registro de atualização)'
  } else if (expiring) {
    const n = expiring.daysToExpire ?? 0
    message = `O consentimento do banco vence em ${n} ${n === 1 ? 'dia' : 'dias'}`
  } else {
    message = 'Os dados do banco podem estar incompletos'
  }

  return (
    <Alert variant={isError ? 'destructive' : 'warning'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <p>{message}</p>
        <Link to="/configuracoes" className="mt-1 inline-block text-sm font-medium underline">
          Abrir Bancos conectados
        </Link>
      </AlertDescription>
    </Alert>
  )
}
