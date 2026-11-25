import { auth } from '@/lib/firebase'
import { MOCK } from '@/lib/mockStorage'
import { normalizePushPrefs, type PushPrefs } from '@shared/core/pushPrefs.js'

const API_URL = (import.meta.env.VITE_BANK_API_URL as string | undefined)?.replace(/\/$/, '')

/** Verdadeiro quando ha servidor configurado e o app nao esta no modo local de desenvolvimento. */
export const PUSH_SERVER_ENABLED = Boolean(API_URL) && !MOCK

/**
 * Chamada ao servidor com o ID token do Firebase. As mensagens de erro sao fixas: nunca levam o corpo
 * da resposta, o token nem o FID, e nada daqui vai a log.
 */
async function call(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<unknown> {
  if (!API_URL || MOCK) throw new Error('Servidor de avisos nao configurado')
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('Entre para usar os avisos')
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error('Falha ao falar com o servidor de avisos')
  return method === 'GET' || method === 'PUT' ? await res.json() : undefined
}

function post(path: string, body?: Record<string, string>): Promise<unknown> {
  return call('POST', path, body)
}

/** Cadastra o FID deste aparelho no servidor (o servidor decide dono e pessoa pelo token). */
export async function registerFid(fid: string): Promise<void> {
  await post('/api/push/register', { fid })
}

/** Pede ao servidor um aviso de teste para a pessoa que esta logada. */
export async function sendTestPush(): Promise<void> {
  await post('/api/push/test')
}

export interface PushStatus {
  registered: boolean
  devices: number
}

/** Este aparelho (FID) consta no servidor para a pessoa logada? Resposta fora do formato vale como erro. */
export async function getPushStatus(fid: string): Promise<PushStatus> {
  const data = (await call('GET', `/api/push/status?fid=${encodeURIComponent(fid)}`)) as Partial<PushStatus> | null
  if (!data || typeof data.registered !== 'boolean') throw new Error('Resposta invalida do servidor de avisos')
  return { registered: data.registered, devices: typeof data.devices === 'number' ? data.devices : 0 }
}

/** Remove o registro deste aparelho no servidor (idempotente). */
export async function unregisterFid(fid: string): Promise<void> {
  await post('/api/push/unregister', { fid })
}

/** Preferencias de aviso da pessoa logada; sempre devolve preferencias validas. */
export async function getPushPrefs(): Promise<PushPrefs> {
  const data = (await call('GET', '/api/push/prefs')) as { prefs?: unknown } | null
  return normalizePushPrefs(data?.prefs)
}

/** Grava as preferencias; o servidor valida o esquema fechado e devolve o que gravou. */
export async function savePushPrefs(prefs: PushPrefs): Promise<PushPrefs> {
  const data = (await call('PUT', '/api/push/prefs', prefs)) as { prefs?: unknown } | null
  return normalizePushPrefs(data?.prefs)
}
