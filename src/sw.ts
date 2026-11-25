// Service worker do Coinc: so pre-cache da casca do app (JS, CSS, HTML, fontes, icones, manifest).
// Dados (Firestore, API do Railway, widget da Pluggy) sao de outras origens e vao direto a rede (D-15).
// Nunca ativa sozinho: a pagina manda SKIP_WAITING quando a politica de shared/core/pwaUpdate.js manda (D-14).
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Navegacao SPA cai no index.html pre-cacheado, que casa com os JS e CSS pre-cacheados da mesma versao.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/__\//, /^\/api\//] }))

clientsClaim()

// Push (Fase 7, PUSH-05): tratador proprio, sem o SDK de mensageria no worker. O iPhone revoga a
// assinatura se um push chegar e nao mostrar notificacao, entao todo caminho termina em showNotification.
// Com janela do app focada a notificacao sai silenciosa (sem som nem vibracao). Se o iPhone parar de
// entregar com isso ligado, vira false: decisao do teste de aparelho do plano 07-06.
const SILENT_WHEN_FOCUSED = true
const PUSH_ICON = '/icons/pwa-192x192.png'
const DEFAULT_TITLE = 'OINC'
const TITLE_MAX = 60
const BODY_MAX = 240
const TAG_RE = /^[A-Za-z0-9:_-]{1,64}$/

type PushFields = { title?: unknown; body?: unknown; tag?: unknown; url?: unknown }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function pickFields(source: Record<string, unknown> | null): PushFields {
  if (!source) return {}
  return { title: source.title, body: source.body, tag: source.tag, url: source.url }
}

// O JSON do FCM para FID e uma hipotese a confirmar no aparelho (07-06): aceita os campos em
// payload.data, no proprio payload ou em payload.notification, nessa ordem de prioridade.
function readFields(payload: unknown): PushFields {
  const root = asRecord(payload)
  const fromData = pickFields(asRecord(root?.data))
  const fromRoot = pickFields(root)
  const fromNotification = pickFields(asRecord(root?.notification))
  return {
    title: fromData.title ?? fromRoot.title ?? fromNotification.title,
    body: fromData.body ?? fromRoot.body ?? fromNotification.body,
    tag: fromData.tag ?? fromRoot.tag ?? fromNotification.tag,
    url: fromData.url ?? fromRoot.url ?? fromNotification.url,
  }
}

// So rota relativa ao proprio app: comeca com uma barra e nao com duas.
function safeUrl(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

async function showPush(event: PushEvent): Promise<void> {
  let payload: unknown = null
  try {
    payload = event.data?.json()
  } catch {
    payload = null
  }
  const fields = readFields(payload)
  const title =
    typeof fields.title === 'string' && fields.title.length > 0 ? fields.title.slice(0, TITLE_MAX) : DEFAULT_TITLE
  const body = typeof fields.body === 'string' ? fields.body.slice(0, BODY_MAX) : ''
  const tag = typeof fields.tag === 'string' && TAG_RE.test(fields.tag) ? fields.tag : undefined

  let focused = false
  if (SILENT_WHEN_FOCUSED) {
    try {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      focused = windows.some((c) => c.focused)
    } catch {
      focused = false
    }
  }

  const options: NotificationOptions = {
    body,
    icon: PUSH_ICON,
    data: { url: safeUrl(fields.url) },
    ...(tag ? { tag } : {}),
    ...(focused ? { silent: true } : {}),
  }
  await self.registration.showNotification(title, options)
}

self.addEventListener('push', (event) => {
  event.waitUntil(showPush(event))
})

// Clique: nunca navega para outra origem; foca a janela do app quando existe, senao abre uma.
async function openFromNotification(raw: unknown): Promise<void> {
  const origin = self.location.origin
  let target = new URL('/', origin)
  try {
    const resolved = new URL(typeof raw === 'string' ? raw : '/', origin)
    if (resolved.origin === origin) target = resolved
  } catch {
    target = new URL('/', origin)
  }
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const first = windows[0]
  if (first) {
    try {
      await first.focus()
      await first.navigate(target.href)
      return
    } catch {
      // navegador sem navigate neste cliente: abre uma janela nova
    }
  }
  await self.clients.openWindow(target.href)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = asRecord(event.notification.data)
  event.waitUntil(openFromNotification(data?.url))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
  // Prontidao do push: a pagina so pede a permissao quando a versao ativa ja trata push.
  else if (event.data?.type === 'PUSH_PING') event.source?.postMessage({ type: 'PUSH_READY' })
})
