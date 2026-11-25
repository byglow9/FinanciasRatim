import { auth } from '@/lib/firebase'
import { MOCK } from '@/lib/mockStorage'
import { getLocalFid } from '@/lib/push/messaging'

const API_URL = (import.meta.env.VITE_BANK_API_URL as string | undefined)?.replace(/\/$/, '')

// Prazo do pedido: o aviso e melhor-esforco e nunca segura a tela.
const CHECK_TIMEOUT_MS = 10_000

/**
 * Pede ao servidor que confira os limites da pessoa logada e envie o aviso no celular (PUSH-02).
 * Melhor-esforco: nunca lanca, nunca mostra erro e nao registra nada. Sem servidor configurado ou no
 * modo local de desenvolvimento nao faz nada. Quem e a pessoa e o casal o servidor decide pelo token;
 * o corpo leva so o FID deste aparelho (se houver), para ele nao receber o aviso que a tela ja mostrou.
 */
export async function checkLimits(): Promise<void> {
  try {
    if (!API_URL || MOCK) return
    const token = await auth?.currentUser?.getIdToken()
    if (!token) return
    const fid = getLocalFid()
    await fetch(`${API_URL}/api/limits/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fid ? { fid } : {}),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    })
  } catch {
    // Melhor-esforco: o alerta dentro do app ja foi criado.
  }
}
