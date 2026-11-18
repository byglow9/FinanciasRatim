import { collection, onSnapshot, query } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { ownerScope } from '@/lib/scope'
import type { PersonType } from '@/types'

export interface BankConnection {
  itemId: string
  person: PersonType
  connectorName: string | null
  connectorImageUrl: string | null
  status: string
  lastSyncAt?: Date | null
  bankUpdatedAt?: Date | null
  consentExpiresAt?: Date | null
  executionStatus?: string | null
  errorCode?: string | null
  lastWebhookAt?: Date | null
  lastWebhookEvent?: string | null
}

export interface SyncSummary {
  itemId: string
  person: PersonType
  imported: number
  review: number
  ignored: number
}

const API_URL = (import.meta.env.VITE_BANK_API_URL as string | undefined)?.replace(/\/$/, '')

export const BANK_ENABLED = Boolean(API_URL)

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error('Servidor bancario nao configurado')
  // O servidor so aceita o ID token do Firebase (FUND-04); o token nunca e registrado em log.
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('Entre para usar a sincronizacao')
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Erro ${res.status}`)
  return body as T
}

export function subscribeBankConnections(cb: (list: BankConnection[]) => void): () => void {
  if (!db) return () => {}
  return onSnapshot(
    query(collection(db, 'bankConnections'), ...ownerScope()),
    (snap) => {
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
            bankUpdatedAt: data.bankUpdatedAt?.toDate?.() ?? null,
            consentExpiresAt: data.consentExpiresAt?.toDate?.() ?? null,
            executionStatus: data.executionStatus ?? null,
            errorCode: data.errorCode ?? null,
            lastWebhookAt: data.lastWebhookAt?.toDate?.() ?? null,
            lastWebhookEvent: data.lastWebhookEvent ?? null,
          } as BankConnection
        })
      )
    },
    (err) => {
      console.error('[bank] listener:', err.message)
      cb([])
    }
  )
}

// Banco novo: passa a pessoa. Reconectar um banco existente: passa { itemId } (o servidor
// confere o dono e usa a pessoa do documento).
export const createConnectToken = (target: PersonType | { itemId: string }) =>
  api<{ accessToken: string }>('/api/connect-token', {
    method: 'POST',
    body: typeof target === 'string' ? JSON.stringify({ person: target }) : JSON.stringify({ itemId: target.itemId }),
  })

export const registerConnection = (person: PersonType, itemId: string) =>
  api<SyncSummary>('/api/connections', {
    method: 'POST',
    body: JSON.stringify({ person, itemId }),
  })

export const removeConnection = (itemId: string) =>
  api<{ ok: true }>(`/api/connections/${encodeURIComponent(itemId)}`, { method: 'DELETE' })

export const syncNow = () => api<{ results: SyncSummary[] }>('/api/sync', { method: 'POST' })
