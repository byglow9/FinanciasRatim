import { auth } from '@/lib/firebase'
import { MOCK } from '@/lib/mockStorage'

// Acervo e voto do OINC (07.1, D-12). O app manda ao servidor so o id da fala e o voto ('sim' ou 'nao'):
// nunca texto. As falas reprovadas ficam tambem no localStorage, para a mesma fala nao voltar nem
// depois de recarregar e nem sem servidor. Qualquer falha e silenciosa: nada aqui lanca nem registra.

export type Voto = 'sim' | 'nao'

/** Chave versionada das falas reprovadas neste aparelho. */
const REJECTED_KEY = 'oinc:rejeitadas:v1'
/** Corte das reprovadas guardadas aqui (o servidor corta em 500). */
const REJECTED_MAX = 500
/** Prazo dos pedidos ao servidor. */
const TIMEOUT_MS = 4000
const ID_RE = /^[a-z0-9-]{3,64}$/
const CENA_RE = /^[a-z0-9-]{2,40}$/

const API_URL = (import.meta.env.VITE_BANK_API_URL as string | undefined)?.replace(/\/$/, '')

/** Fala gerada que o servidor guardou para a pessoa. */
export interface GeneratedLine {
  id: string
  cena: string
  text: string
}

export interface Acervo {
  rejected: string[]
  generated: GeneratedLine[]
}

/** Falas reprovadas guardadas neste aparelho (lista vazia se nao der para ler). */
export function readRejected(): string[] {
  try {
    const raw = localStorage.getItem(REJECTED_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string' && ID_RE.test(id))
  } catch {
    return []
  }
}

function writeRejected(ids: string[]): void {
  try {
    localStorage.setItem(REJECTED_KEY, JSON.stringify(ids.slice(-REJECTED_MAX)))
  } catch {
    // Sem armazenamento local: so deixa de lembrar neste aparelho.
  }
}

/** Junta listas de ids sem repetir, mantendo a ordem. */
function union(...lists: string[][]): string[] {
  return [...new Set(lists.flat())]
}

async function call(path: string, init: RequestInit): Promise<unknown> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) return null
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) return null
  return await res.json()
}

/**
 * Acervo da pessoa: as reprovadas do servidor juntadas as deste aparelho. Sem servidor, em MOCK ou
 * com falha, vale so o que ha aqui. Nunca lanca.
 */
export async function fetchAcervo(): Promise<Acervo> {
  const local = readRejected()
  try {
    if (MOCK || !API_URL) return { rejected: local, generated: [] }
    const data = await call('/api/vintem/acervo', { method: 'GET' })
    if (data === null || typeof data !== 'object') return { rejected: local, generated: [] }
    const sent = data as { rejected?: unknown; generated?: unknown }
    const remote = Array.isArray(sent.rejected)
      ? sent.rejected.filter((id): id is string => typeof id === 'string' && ID_RE.test(id))
      : []
    const generated: GeneratedLine[] = []
    if (Array.isArray(sent.generated)) {
      for (const g of sent.generated) {
        const line = g as Partial<GeneratedLine> | null
        if (line && typeof line.id === 'string' && typeof line.cena === 'string' && typeof line.text === 'string') {
          generated.push({ id: line.id, cena: line.cena, text: line.text })
        }
      }
    }
    const rejected = union(local, remote)
    writeRejected(rejected)
    return { rejected, generated }
  } catch {
    return { rejected: local, generated: [] }
  }
}

/**
 * Registra o voto numa fala. Atualiza o aparelho primeiro (a reprovada some na hora) e depois avisa o
 * servidor, so com o id e o voto. Devolve se o servidor gravou. Nunca lanca.
 */
export async function votar(id: string, voto: Voto): Promise<boolean> {
  try {
    if (!ID_RE.test(id)) return false
    const current = readRejected().filter((x) => x !== id)
    writeRejected(voto === 'nao' ? [...current, id] : current)
    if (MOCK || !API_URL) return false
    const data = await call('/api/vintem/voto', { method: 'POST', body: JSON.stringify({ id, voto }) })
    return data !== null && typeof data === 'object' && (data as { ok?: unknown }).ok === true
  } catch {
    return false
  }
}

/**
 * Pede ao servidor mais falas para uma cena que esta acabando (D-11). So o nome da cena vai, nunca texto.
 * Rota ausente, falha ou sem servidor e silencio: devolve falso e nunca lanca.
 */
export async function repor(cena: string): Promise<boolean> {
  try {
    if (MOCK || !API_URL || !CENA_RE.test(cena)) return false
    const data = await call('/api/vintem/repor', { method: 'POST', body: JSON.stringify({ cena }) })
    return data !== null && typeof data === 'object'
  } catch {
    return false
  }
}
