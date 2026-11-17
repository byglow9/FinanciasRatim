import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PersonType } from '@/types'

export interface BankConnection {
  itemId: string
  person: PersonType
  connectorName: string | null
  connectorImageUrl: string | null
  status: string
  lastSyncAt?: Date | null
}

export interface SyncSummary {
  itemId: string
  person: PersonType
  imported: number
  review: number
  ignored: number
}

const API_URL = (import.meta.env.VITE_BANK_API_URL as string | undefined)?.replace(/\/$/, '')
const API_KEY = import.meta.env.VITE_BANK_API_KEY as string | undefined

export const BANK_ENABLED = Boolean(API_URL && API_KEY)

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL || !API_KEY) throw new Error('Servidor bancario nao configurado')
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...init.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Erro ${res.status}`)
  return body as T
}

export function subscribeBankConnections(cb: (list: BankConnection[]) => void): () => void {
  if (!db) return () => {}
  return onSnapshot(query(collection(db, 'bankConnections')), (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data()
        return {
          itemId: d.id,
          person: data.person,
          connectorName: data.connectorName ?? null,
          connectorImageUrl: data.connectorImageUrl ?? null,
          status: data.status ?? '',
          lastSyncAt: data.lastSyncAt?.toDate?.() ?? null,
        } as BankConnection
      })
    )
  })
}

export const createConnectToken = (person: PersonType) =>
  api<{ accessToken: string }>('/api/connect-token', {
    method: 'POST',
    body: JSON.stringify({ person }),
  })

export const registerConnection = (person: PersonType, itemId: string) =>
  api<SyncSummary>('/api/connections', {
    method: 'POST',
    body: JSON.stringify({ person, itemId }),
  })

export const removeConnection = (itemId: string) =>
  api<{ ok: true }>(`/api/connections/${encodeURIComponent(itemId)}`, { method: 'DELETE' })

export const syncNow = () => api<{ results: SyncSummary[] }>('/api/sync', { method: 'POST' })
