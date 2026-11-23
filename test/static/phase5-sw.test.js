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

// Registro e atualizacao silenciosa (plano 05-10, D-14, IDEN-04).
const REGISTER = code('src/lib/pwa/registerPwa.ts')
const BUSY = code('src/lib/pwa/isBusy.ts')
const MAIN = code('src/main.tsx')

test('registerPwa.ts delega a decisao ao nucleo e nao reescreve a regra (D-14)', () => {
  assert.ok(REGISTER.includes("'@shared/core/pwaUpdate.js'"), 'sem import de @shared/core/pwaUpdate.js')
  for (const fn of ['decideUpdate', 'decideReload', 'decidePreloadError']) {
    assert.ok(new RegExp(`\\b${fn}\\(`).test(REGISTER), `registerPwa.ts nao chama ${fn}`)
  }
  assert.ok(/\bSW_RELOAD_KEY\b/.test(REGISTER) && /\bPRELOAD_RELOAD_KEY\b/.test(REGISTER), 'chaves de sessao vem do nucleo')
  assert.ok(!/\b3000\b|\b10000\b|\b3_000\b|\b10_000\b/.test(REGISTER), 'janela de tempo reescrita em vez de importada do nucleo')
  assert.ok(!/coinc:/.test(REGISTER), 'chave de sessao escrita a mao')
})

test('registerPwa.ts so age em producao e liga visibilitychange e vite:preloadError', () => {
  assert.ok(/if\s*\(\s*!import\.meta\.env\.PROD/.test(REGISTER), 'sem a guarda import.meta.env.PROD')
  assert.ok(REGISTER.indexOf('import.meta.env.PROD') < REGISTER.indexOf('registerSW('), 'a guarda de producao vem antes do registro')
  assert.ok(REGISTER.includes("'visibilitychange'"), 'sem visibilitychange')
  assert.ok(REGISTER.includes("'vite:preloadError'"), 'sem vite:preloadError')
  assert.ok(REGISTER.includes('preventDefault()'), 'vite:preloadError sem preventDefault')
  assert.ok(REGISTER.includes("from 'virtual:pwa-register'") && REGISTER.includes('immediate: true'))
  assert.ok(REGISTER.includes('onNeedReload'), 'a recarga passa por onNeedReload (protegida)')
})

test('registerPwa.ts: todo sessionStorage dentro de try e catch', () => {
  const uses = [...REGISTER.matchAll(/sessionStorage\./g)]
  assert.ok(uses.length >= 3, 'esperava leitura, escrita e limpeza')
  for (const use of uses) {
    const head = REGISTER.slice(0, use.index)
    const tryAt = head.lastIndexOf('try {')
    const closed = head.slice(tryAt).includes('} catch')
    assert.ok(tryAt >= 0 && !closed, `sessionStorage fora de try na posicao ${use.index}`)
  }
})

test('registerPwa.ts nao tem aviso, toast nem interface de atualizacao (D-14)', () => {
  assert.ok(!/from\s+'(sonner|react|@\/components|@\/contexts)/.test(REGISTER), 'registro sem React, componente nem contexto')
  assert.ok(!/\btoast\b|\bNotice\b|Vintem/i.test(REGISTER), 'sem toast, Notice nem Vintem no registro')
  assert.ok(!/alert\(|confirm\(|prompt\(/.test(REGISTER), 'sem dialogo nativo')
})

test('registerPwa.ts nao recarrega fora de producao nem sem a guarda de 10 s', () => {
  const reloads = [...REGISTER.matchAll(/location\.reload\(\)/g)]
  assert.equal(reloads.length, 2, 'duas recargas: a do worker novo e a do erro de trecho')
  for (const r of reloads) {
    const head = REGISTER.slice(0, r.index)
    const inGuarded = head.lastIndexOf('function guardedReload') > head.lastIndexOf('\n}\n')
    const inPreload = head.lastIndexOf("'vite:preloadError'") > head.lastIndexOf('\n  })\n')
    assert.ok(inGuarded || inPreload, 'recarga fora da funcao guardada e do tratador de preloadError')
  }
  const guarded = /function guardedReload\(\)[\s\S]*?\n\}\n/.exec(REGISTER)
  assert.ok(guarded && /decideReload\(/.test(guarded[0]) && /writeSession\(SW_RELOAD_KEY/.test(guarded[0]), 'guardedReload sem decideReload e carimbo')
})

test('isBusy.ts consulta Sheet e Dialog modais e os tres campos de edicao', () => {
  assert.ok(BUSY.includes('[role="dialog"][aria-modal="true"]'), 'sem a consulta de role=dialog com aria-modal')
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) assert.ok(BUSY.includes(`'${tag}'`), `sem ${tag}`)
  assert.ok(/isContentEditable|contentEditable/.test(BUSY), 'sem contentEditable')
  assert.ok(/typeof document === 'undefined'/.test(BUSY), 'sem document devolve falso')
  assert.ok(!/from\s+'(react|@\/contexts|@\/services)/.test(BUSY), 'isBusy sem React nem contexto')
})

test('main.tsx captura a instalacao e registra o worker; captura antes de createRoot', () => {
  assert.ok(MAIN.includes("from '@/lib/pwa/installPrompt'") && MAIN.includes("from '@/lib/pwa/registerPwa'"))
  const capture = MAIN.indexOf('captureInstallPrompt()')
  assert.ok(capture > 0, 'main.tsx nao chama captureInstallPrompt()')
  assert.ok(capture < MAIN.indexOf('createRoot('), 'captureInstallPrompt() antes do createRoot')
  assert.ok(MAIN.indexOf('registerPwa(') > MAIN.indexOf('.render('), 'registerPwa depois de montar')
  assert.ok(MAIN.indexOf("import './index.css'") < capture, 'a ordem de fontes e CSS vem antes')
})

test('registerPwa.ts: em segundo plano com algo em andamento a versao nova espera (nunca no meio de um lancamento)', () => {
  assert.ok(/hidden:\s*document\.visibilityState === 'hidden' && !busy/.test(REGISTER), 'hidden precisa ceder a busy')
  assert.ok(/busy,\s*\n/.test(REGISTER) || /\bbusy\b,/.test(REGISTER), 'busy vai para decideUpdate')
  const visible = /visibilityState === 'visible'[\s\S]*?else/.exec(REGISTER)
  assert.ok(visible && /evaluate\(\)/.test(visible[0]), 'ao voltar a visivel a versao que esperava e reavaliada')
})
