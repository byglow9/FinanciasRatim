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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
