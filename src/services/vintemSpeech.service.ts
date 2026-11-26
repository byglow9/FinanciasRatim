import { auth } from '@/lib/firebase'
import { MOCK } from '@/lib/mockStorage'

// Pedido da fala por IA ao servidor (POST /api/vintem/fala). O app so diz a situacao (lista fechada) e,
// quando houver, o id da categoria: nunca texto, valor, resumo nem descricao (D-16, IA-02). O servidor
// monta o resumo, chama a IA e valida. Qualquer falha devolve null em silencio e o Vintem fala com o
// banco de frases; nada aqui lanca nem registra nada. A resposta traz o texto e, quando o servidor
// manda, o id da fala (usado no voto, 07.1).
// As frequencias da fala espontanea e o prazo das reacoes vem do servidor (GET /api/vintem/hints); os
// numeros daqui sao so a reserva para quando nao ha resposta.

/** Situacoes aceitas pelo servidor. */
export type AskSituation = 'lancamento' | 'limite' | 'sync' | 'abertura' | 'espiar'

export interface AskArgs {
  situation: AskSituation
  categoryId?: string | null
  /** Prazo do pedido inteiro em milissegundos. */
  timeoutMs: number
}

/** Fala devolvida pela IA. */
export interface AskAnswer {
  text: string
  /** Id da fala no servidor, para o voto; nulo quando nao veio ou veio fora do formato. */
  id: string | null
}

/** Prazo nas reacoes (alguem espera o resultado do lancamento). */
export const ASK_TIMEOUT_REACTION_MS = 2500
/** Prazo na abertura e na sincronizacao (ninguem esta esperando um toque). */
export const ASK_TIMEOUT_OPEN_MS = 4000

/** Teto de tamanho da fala aceita; o servidor ja limita, o app confere de novo. */
const MAX_TEXT_LENGTH = 300
/** Formato de id de fala aceito (o mesmo do voto). */
const ID_RE = /^[a-z0-9-]{3,64}$/

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

async function request(situation: AskSituation, categoryId: string | null, signal: AbortSignal): Promise<AskAnswer | null> {
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
  const { text, id } = data as { text?: unknown; id?: unknown }
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.length > MAX_TEXT_LENGTH) return null
  return { text: trimmed, id: typeof id === 'string' && ID_RE.test(id) ? id : null }
}

/** Pede uma fala a IA. Devolve texto e id, ou null (sem servidor, sem rede, erro, prazo ou corpo inesperado). */
export async function askVintem({ situation, categoryId, timeoutMs }: AskArgs): Promise<AskAnswer | null> {
  try {
    if (MOCK || !API_URL) return null
    const signal = AbortSignal.timeout(timeoutMs)
    return await Promise.race([request(situation, categoryId ?? null, signal), deadline(signal)])
  } catch {
    return null
  }
}

/** O que o servidor diz sobre quando perguntar e quanto esperar. */
export interface VintemHints {
  /** Espera da primeira fala espontanea, ao abrir o app ou voltar a ele (07.1, D-18). */
  peekFirstMs: number
  peekMinMs: number
  peekMaxMs: number
  peekPerDay: number
  openPerDay: number
  reactionTimeoutMs: number
}

/** Reserva usada sem servidor, em MOCK ou quando a consulta falha. */
export const DEFAULT_HINTS: Readonly<VintemHints> = Object.freeze({
  // Primeira fala em cerca de 1 minuto, depois a cada cerca de 3 (07.1, D-17, D-18).
  peekFirstMs: 60_000,
  peekMinMs: 150_000,
  peekMaxMs: 210_000,
  peekPerDay: 200,
  openPerDay: 200,
  reactionTimeoutMs: ASK_TIMEOUT_REACTION_MS,
})

// Uma resposta boa vale pela carga inteira do app; falha nao fica guardada, para tentar de novo depois.
let loadedHints: VintemHints | null = null
let loadingHints: Promise<VintemHints> | null = null

/** Inteiro vindo do servidor, a partir de `min`; qualquer outra coisa vale a reserva. */
function whole(value: unknown, fallback: number, min = 1): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min ? value : fallback
}

async function requestHints(signal: AbortSignal): Promise<VintemHints | null> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) return null
  const res = await fetch(`${API_URL}/api/vintem/hints`, { headers: { Authorization: `Bearer ${token}` }, signal })
  if (!res.ok) return null
  const data: unknown = await res.json()
  if (data === null || typeof data !== 'object') return null
  const sent = data as Partial<Record<keyof VintemHints, unknown>>
  const peekMinMs = whole(sent.peekMinMs, DEFAULT_HINTS.peekMinMs)
  return {
    peekFirstMs: whole(sent.peekFirstMs, DEFAULT_HINTS.peekFirstMs),
    peekMinMs,
    peekMaxMs: Math.max(peekMinMs, whole(sent.peekMaxMs, DEFAULT_HINTS.peekMaxMs)),
    peekPerDay: whole(sent.peekPerDay, DEFAULT_HINTS.peekPerDay, 0),
    openPerDay: whole(sent.openPerDay, DEFAULT_HINTS.openPerDay, 0),
    reactionTimeoutMs: whole(sent.reactionTimeoutMs, DEFAULT_HINTS.reactionTimeoutMs),
  }
}

async function loadHints(): Promise<VintemHints> {
  try {
    const signal = AbortSignal.timeout(ASK_TIMEOUT_OPEN_MS)
    const found = await Promise.race([requestHints(signal), deadline(signal)])
    if (found === null) return DEFAULT_HINTS
    loadedHints = found
    return found
  } catch {
    return DEFAULT_HINTS
  }
}

/** Hints do servidor (uma vez por carga) ou a reserva. Nunca lanca. */
export function getVintemHints(): Promise<VintemHints> {
  if (loadedHints !== null) return Promise.resolve(loadedHints)
  if (MOCK || !API_URL) return Promise.resolve(DEFAULT_HINTS)
  loadingHints ??= loadHints().finally(() => {
    loadingHints = null
  })
  return loadingHints
}

/**
 * Prazo que o app espera a IA nas reacoes a lancamento e a limite: o dos hints, quando ja chegaram.
 * Sincrono de proposito: a reacao nunca espera a consulta dos hints.
 */
export function getReactionTimeoutMs(): number {
  return loadedHints?.reactionTimeoutMs ?? ASK_TIMEOUT_REACTION_MS
}
