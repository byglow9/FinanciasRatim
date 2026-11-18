import { useMemo, useSyncExternalStore } from 'react'

/**
 * Instante atual renovado a cada `intervalMs`, para textos relativos
 * ("Atualizado há 3 horas") não congelarem na tela.
 */
export function useNow(intervalMs = 60_000): Date {
  const tick = useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, intervalMs)
      return () => clearInterval(id)
    },
    // Snapshot truncado ao intervalo: número estável dentro do mesmo intervalo.
    () => Math.floor(Date.now() / intervalMs) * intervalMs
  )
  return useMemo(() => new Date(tick), [tick])
}
