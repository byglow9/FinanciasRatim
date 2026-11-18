import { useMemo } from 'react'
import { useBankConnections } from '@/hooks/useBankConnections'
import { useNow } from '@/hooks/useNow'
import { BANK_ENABLED } from '@/services/bank.service'
import { describeBankFreshness, shouldSuppressVerdict } from '@shared/core/bankStatus.js'

/**
 * Frescor das conexoes do banco e se o veredito (ritmo) deve ficar suprimido (LIM-08).
 * Sem banco configurado ou sem conexao nada e suprimido: o usuario so manual segue com o veredito.
 */
export function useBankFreshness() {
  const { connections, loading } = useBankConnections()
  const now = useNow(60_000)

  const items = useMemo(
    () =>
      BANK_ENABLED
        ? connections.map((c) =>
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
        : [],
    [connections, now]
  )

  const hasConnections = BANK_ENABLED && connections.length > 0
  const suppress = hasConnections && shouldSuppressVerdict(items)

  return { items, suppress, hasConnections, loading: BANK_ENABLED ? loading : false }
}
