import { auth } from '@/lib/firebase'
import { MOCK } from '@/lib/mockStorage'

const API_URL = (import.meta.env.VITE_BANK_API_URL as string | undefined)?.replace(/\/$/, '')

/** Verdadeiro quando ha servidor configurado e o app nao esta no modo local de desenvolvimento. */
export const PUSH_SERVER_ENABLED = Boolean(API_URL) && !MOCK

/**
 * POST no servidor com o ID token do Firebase. As mensagens de erro sao fixas: nunca levam o corpo
 * da resposta, o token nem o FID, e nada daqui vai a log.
 */
async function post(path: string, body?: Record<string, string>): Promise<void> {
  if (!API_URL || MOCK) throw new Error('Servidor de avisos nao configurado')
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('Entre para usar os avisos')
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error('Falha ao falar com o servidor de avisos')
}

/** Cadastra o FID deste aparelho no servidor (o servidor decide dono e pessoa pelo token). */
export function registerFid(fid: string): Promise<void> {
  return post('/api/push/register', { fid })
}

/** Pede ao servidor um aviso de teste para a pessoa que esta logada. */
export function sendTestPush(): Promise<void> {
  return post('/api/push/test')
}
