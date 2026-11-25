import { auth } from '@/lib/firebase'
import { MOCK } from '@/lib/mockStorage'

// Pedido da fala por IA ao servidor (POST /api/vintem/fala). O app so diz a situacao (lista fechada) e,
// quando houver, o id da categoria: nunca texto, valor, resumo nem descricao (D-16, IA-02). O servidor
// monta o resumo, chama a IA e valida. Qualquer falha devolve null em silencio e o Vintem fala com o
// banco de frases; nada aqui lanca nem registra nada.

/** Situacoes aceitas pelo servidor. */
export type AskSituation = 'lancamento' | 'limite' | 'sync' | 'abertura' | 'espiar'

export interface AskArgs {
  situation: AskSituation
  categoryId?: string | null
  /** Prazo do pedido inteiro em milissegundos. */
  timeoutMs: number
}

/** Prazo nas reacoes (alguem espera o resultado do lancamento). */
export const ASK_TIMEOUT_REACTION_MS = 2500
/** Prazo na abertura e na sincronizacao (ninguem esta esperando um toque). */
export const ASK_TIMEOUT_OPEN_MS = 4000

/** Teto de tamanho da fala aceita; o servidor ja limita, o app confere de novo. */
const MAX_TEXT_LENGTH = 300

const API_URL = (import.meta.env.VITE_BANK_API_URL as string | undefined)?.replace(/\/$/, '')

/** Promessa que falha quando o prazo estoura (cobre tambem a espera pelo ID token). */
function deadline(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(new Error('prazo'))
      return
    }
    signal.addEventListener('abort', () => reject(new Error('prazo')), { once: true })
  })
}

async function request(situation: AskSituation, categoryId: string | null, signal: AbortSignal): Promise<string | null> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) return null
  const body: { situation: AskSituation; categoryId?: string } = { situation }
  if (categoryId !== null) body.categoryId = categoryId
  const res = await fetch(`${API_URL}/api/vintem/fala`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) return null
  const data: unknown = await res.json()
  if (data === null || typeof data !== 'object') return null
  const text = (data as { text?: unknown }).text
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.length > MAX_TEXT_LENGTH) return null
  return trimmed
}

/** Pede uma fala a IA. Devolve o texto ou null (sem servidor, sem rede, erro, prazo ou corpo inesperado). */
export async function askVintem({ situation, categoryId, timeoutMs }: AskArgs): Promise<string | null> {
  try {
    if (MOCK || !API_URL) return null
    const signal = AbortSignal.timeout(timeoutMs)
    return await Promise.race([request(situation, categoryId ?? null, signal), deadline(signal)])
  } catch {
    return null
  }
}
