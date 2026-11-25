// Ativacao dos avisos no app pelo fluxo FID do Firebase Cloud Messaging (PUSH-01, D-08).
// Ordem que importa: o preparo do worker (primePush) acontece ao abrir o cartao; o toque em Ativar
// (enablePush) pede a permissao logo, sem nenhuma espera antes, porque o iPhone so aceita o pedido
// perto do gesto. Nenhum FID, token, chave ou mensagem do SDK vai a log ou a tela: erro vira so o motivo.
import { getApp } from 'firebase/app'
import { getMessaging, isSupported, onRegistered, register } from 'firebase/messaging'
import { MOCK } from '@/lib/mockStorage'
import { PUSH_SERVER_ENABLED, registerFid } from '@/services/push.service'

export type PushReason = 'nao-configurado' | 'nao-suportado' | 'permissao-negada' | 'atualizando' | 'falhou'
export type PushResult = { ok: true } | { ok: false; reason: PushReason }
export type PrimeStatus = 'preparando' | 'pronto' | 'atualizando' | 'nao-configurado' | 'nao-suportado' | 'falhou'
/** Estado do preparo; `waiting` diz que ha uma versao do app esperando para ativar. */
export interface PrimeState {
  status: PrimeStatus
  waiting: boolean
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
const FID_STORAGE_KEY = 'coinc:push:fid'
const READY_MS = 5000
const SUPPORT_MS = 3000
const PING_MS = 1500
const REGISTER_MS = 60000
const FID_MS = 10000

let registration: ServiceWorkerRegistration | null = null
let state: PrimeState = { status: 'preparando', waiting: false }
let inflight: Promise<PrimeState> | null = null
const listeners = new Set<() => void>()

let listening = false
let outcome: boolean | null = null
let waiter: ((ok: boolean) => void) | null = null

function setState(status: PrimeStatus, waiting = false): PrimeState {
  state = { status, waiting }
  listeners.forEach((fn) => fn())
  return state
}

/** Estado atual do preparo (referencia estavel entre mudancas, para useSyncExternalStore). */
export function getPrimeState(): PrimeState {
  return state
}

export function subscribePrime(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Guarda o FID deste aparelho so no localStorage (o 07-10 o usa para nao avisar o aparelho em uso). */
export function rememberFid(fid: string): void {
  try {
    localStorage.setItem(FID_STORAGE_KEY, fid)
  } catch {
    /* sem armazenamento: o aparelho em uso so deixa de ser excluido do envio */
  }
}

export function getLocalFid(): string | null {
  try {
    return localStorage.getItem(FID_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Resolve com o valor da promessa, ou com null se passar do prazo ou se ela falhar. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
    )
  })
}

/** Manda PUSH_PING ao worker e espera PUSH_READY por ate `ms`; so le o estado, nao ativa nada. */
function pingWorker(worker: ServiceWorker, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const container = navigator.serviceWorker
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'PUSH_READY') finish(true)
    }
    const timer = setTimeout(() => finish(false), ms)
    function finish(ok: boolean) {
      clearTimeout(timer)
      container.removeEventListener('message', onMessage)
      resolve(ok)
    }
    container.addEventListener('message', onMessage)
    worker.postMessage({ type: 'PUSH_PING' })
  })
}

/** Espera o resultado do cadastro do FID no servidor por ate `ms`; sem FID no prazo vale falha. */
function awaitFid(ms: number): Promise<boolean> {
  if (outcome !== null) return Promise.resolve(outcome)
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiter = null
      resolve(false)
    }, ms)
    waiter = (ok) => {
      clearTimeout(timer)
      waiter = null
      resolve(ok)
    }
  })
}

/** Ouvinte do FCM: guarda o FID no aparelho, cadastra no servidor e avisa quem espera. */
function handleFid(fid: string): void {
  rememberFid(fid)
  void registerFid(fid).then(
    () => settleFid(true),
    () => settleFid(false),
  )
}

function settleFid(ok: boolean): void {
  outcome = ok
  waiter?.(ok)
}

function isPermissionBlocked(err: unknown): boolean {
  const code = typeof err === 'object' && err !== null ? String((err as { code?: unknown }).code ?? '') : ''
  return code.includes('permission-blocked') || (typeof Notification !== 'undefined' && Notification.permission === 'denied')
}

function configReason(): 'nao-configurado' | 'nao-suportado' | null {
  if (MOCK || !PUSH_SERVER_ENABLED || !VAPID_KEY || !import.meta.env.PROD) return 'nao-configurado'
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof Notification === 'undefined') {
    return 'nao-suportado'
  }
  return null
}

async function runPrime(): Promise<PrimeState> {
  const blocked = configReason()
  if (blocked) return setState(blocked)
  const supported = await withTimeout(isSupported(), SUPPORT_MS)
  if (!supported) return setState('nao-suportado')
  const reg = await withTimeout(navigator.serviceWorker.ready, READY_MS)
  if (!reg) return setState('falhou')
  registration = reg
  if (reg.waiting) return setState('atualizando', true)
  const active = reg.active
  if (active && (await pingWorker(active, PING_MS))) return setState('pronto')
  void reg.update().catch(() => undefined)
  return setState('atualizando')
}

/**
 * Preparo ao abrir o cartao: confere o suporte e confirma que o worker ativo ja trata push.
 * So le o estado: nunca ativa a versao em espera (isso e da politica de atualizacao do app
 * ou do toque explicito em Ativar avisos).
 */
export function primePush(): Promise<PrimeState> {
  if (!inflight) {
    setState('preparando', state.waiting)
    inflight = runPrime().finally(() => {
      inflight = null
    })
  }
  return inflight
}

/** Toque em Ativar avisos: permissao, FID e envio do FID ao servidor. */
export async function enablePush(): Promise<PushResult> {
  const blocked = configReason()
  if (blocked) return { ok: false, reason: blocked }
  if (state.status === 'nao-configurado' || state.status === 'nao-suportado') {
    return { ok: false, reason: state.status }
  }
  if (state.status !== 'pronto' || !registration) {
    // O toque do usuario e o consentimento para ativar a versao que esperava.
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    void primePush()
    return { ok: false, reason: 'atualizando' }
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return { ok: false, reason: 'permissao-negada' }
  }
  try {
    const messaging = getMessaging(getApp())
    if (!listening) {
      onRegistered(messaging, handleFid)
      listening = true
    }
    outcome = null
    let failure: unknown = null
    const finished = await withTimeout(
      register(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }).then(
        () => true,
        (err: unknown) => {
          failure = err
          return false
        },
      ),
      REGISTER_MS,
    )
    if (finished === null) return { ok: false, reason: 'falhou' }
    if (finished === false) return { ok: false, reason: isPermissionBlocked(failure) ? 'permissao-negada' : 'falhou' }
    return (await awaitFid(FID_MS)) ? { ok: true } : { ok: false, reason: 'falhou' }
  } catch {
    return { ok: false, reason: 'falhou' }
  }
}
