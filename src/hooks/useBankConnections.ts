import { useEffect, useState } from 'react'
import { subscribeBankConnections, type BankConnection } from '@/services/bank.service'

/**
 * Conexões bancárias do dono em tempo real. Reaproveitado na Fase 3 (LIM-08).
 */
export function useBankConnections() {
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loading, setLoading] = useState(true)
  // Mantido por paridade com os demais hooks; a inscrição já trata o erro e devolve lista vazia.
  const [error] = useState<Error | null>(null)

  useEffect(
    () =>
      subscribeBankConnections((list) => {
        setConnections(list)
        setLoading(false)
      }),
    []
  )

  return { connections, loading, error }
}
