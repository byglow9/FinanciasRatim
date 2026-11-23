// Guardas estaticas do service worker da fase 5 (plano 05-09, D-14, D-15, IDEN-03, IDEN-04):
// so pre-cache da casca, uma unica rota de navegacao, ativacao somente por mensagem da pagina.
// Rodar: node --test test/static/phase5-sw.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

const SW = code('src/sw.ts')
const VITE = code('vite.config.ts')
const INSTALL = code('src/lib/pwa/installPrompt.ts')

test('sw.ts importa so de workbox-core, workbox-precaching e workbox-routing', () => {
  const froms = [...SW.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]).sort()
  assert.deepEqual(froms, ['workbox-core', 'workbox-precaching', 'workbox-routing'])
  assert.ok(!/\bimport\s*\(/.test(SW), 'sw.ts sem import dinamico')
})

test('sw.ts tem exatamente uma rota: a NavigationRoute com denylist de /api/ e /__/', () => {
  assert.equal(SW.match(/registerRoute\(/g)?.length, 1, 'uma unica chamada registerRoute')
  assert.equal(SW.match(/new NavigationRoute\(/g)?.length, 1, 'uma unica NavigationRoute')
  assert.ok(SW.includes("createHandlerBoundToURL('/index.html')"), 'navegacao cai no index.html pre-cacheado')
  const denylist = /denylist:\s*\[([^\]]*)\]/.exec(SW)
  assert.ok(denylist, 'NavigationRoute sem denylist')
  assert.ok(denylist[1].includes('/^\\/api\\//'), 'denylist sem /api/')
  assert.ok(denylist[1].includes('/^\\/__\\//'), 'denylist sem /__/ (rotas reservadas do Hosting)')
})

test('sw.ts nao tem ouvinte de fetch nem abre cache a mao (D-15)', () => {
  assert.ok(!/addEventListener\(\s*['"]fetch['"]/.test(SW), 'ouvinte de fetch proibido')
  assert.ok(!/onfetch/.test(SW), 'onfetch proibido')
  assert.ok(!/\bcaches\s*\./.test(SW), 'caches.* proibido: o unico cache e o pre-cache do Workbox')
  assert.ok(!/workbox-strategies|workbox-expiration|workbox-background-sync/.test(SW), 'sem estrategia de execucao')
  assert.ok(!/firestore\.googleapis|pluggy/i.test(SW), 'sw.ts nao cita origem de dados')
})

test('sw.ts nao ativa sozinho: skipWaiting so no tratador da mensagem SKIP_WAITING (D-14)', () => {
  assert.ok(!/addEventListener\(\s*['"](install|activate)['"]/.test(SW), 'sem ouvinte de install nem activate')
  assert.equal(SW.match(/skipWaiting/g)?.length, 1, 'uma unica chamada de skipWaiting')
  const handler = /addEventListener\(\s*'message'[\s\S]*$/.exec(SW)
  assert.ok(handler, 'sem ouvinte de message')
  assert.ok(/SKIP_WAITING/.test(handler[0]), 'tratador de message sem SKIP_WAITING')
  assert.ok(handler[0].includes('skipWaiting'), 'skipWaiting fora do tratador da mensagem')
  assert.ok(!/\bself\.skipWaiting\(\)\s*;?\s*$/m.test(SW.replace(handler[0], '')), 'skipWaiting solto no corpo do worker')
})

test('vite.config.ts: injectManifest, prompt sem registro injetado e limite de pre-cache de 3 MiB ou mais', () => {
  assert.ok(VITE.includes("strategies: 'injectManifest'"))
  assert.ok(VITE.includes("registerType: 'prompt'"))
  assert.ok(VITE.includes('injectRegister: false'))
  assert.ok(!/registerType:\s*'autoUpdate'/.test(VITE), 'autoUpdate proibido (D-14)')
  assert.ok(VITE.includes("filename: 'sw.ts'") && VITE.includes("srcDir: 'src'"))
  assert.ok(/devOptions:\s*\{\s*enabled:\s*false\s*\}/.test(VITE), 'worker so em producao')
  const limit = /maximumFileSizeToCacheInBytes:\s*([\d\s*]+)/.exec(VITE)
  assert.ok(limit, 'sem maximumFileSizeToCacheInBytes')
  const bytes = limit[1].split('*').reduce((acc, n) => acc * Number(n.trim()), 1)
  assert.ok(bytes >= 3 * 1024 * 1024, `limite de pre-cache ${bytes} abaixo de 3 MiB`)
  assert.ok(!/runtimeCaching/.test(VITE), 'sem cache em tempo de execucao')
})

test('installPrompt.ts nao importa React e guarda o evento no modulo', () => {
  assert.ok(!/from\s+'react/.test(INSTALL), 'installPrompt.ts sem React')
  assert.ok(INSTALL.includes("'beforeinstallprompt'") && INSTALL.includes("'appinstalled'"))
  assert.ok(INSTALL.includes('preventDefault()'))
  for (const fn of ['captureInstallPrompt', 'subscribeInstall', 'getCanPrompt', 'promptInstall']) {
    assert.ok(new RegExp(`export (async )?function ${fn}\\(`).test(INSTALL), `sem export de ${fn}`)
  }
})
