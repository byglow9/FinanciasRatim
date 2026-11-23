#!/usr/bin/env node
// Auditor CDP do PWA em producao local (plano 05-09, D-14, D-15, IDEN-03): serve dist/ com `vite preview`
// na porta 5192 e abre no Chrome sem janela. So 127.0.0.1; nada lido de .env*; sem dependencias novas;
// perfil temporario do Chrome removido no fim.
// Afirma so o que e do worker, do manifest e da casca: o app pode nao concluir o carregamento no build de
// producao sem as variaveis do Firebase. O registro do worker pelo app e do plano 05-10; aqui o auditor
// registra /sw.js na propria pagina, como o app fara.
// Uso: . ./scripts/dev-env.sh && npm run build && node scripts/ux-audit/pwa.mjs
// Saida: uma linha por verificacao e a linha final `FALHAS n`. Codigos: 0 sem falha, 1 alguma falha,
// 2 falha do proprio script (dist/ ausente, Chrome ausente, preview nao subiu, prazo vencido).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connect, launchChrome } from './cdp.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PORT = 5192
const ORIGIN = `http://127.0.0.1:${PORT}`
const TOTAL_TIMEOUT_MS = 120000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Sobe `vite preview` sobre dist/, so em 127.0.0.1. Devolve { stop }. */
async function startPreview({ timeoutMs = 30000 } = {}) {
  const child = spawn(
    join(ROOT, 'node_modules', '.bin', 'vite'),
    ['preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, env: { ...process.env, BROWSER: 'none' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  )
  child.unref()

  let log = ''
  const collect = (chunk) => {
    log = (log + chunk.toString()).slice(-2000)
  }
  child.stdout.on('data', collect)
  child.stderr.on('data', collect)

  let exited = false
  child.on('exit', () => {
    exited = true
  })

  let stopped = false
  const stop = async () => {
    if (stopped) return
    stopped = true
    if (exited) return
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      /* ja encerrado */
    }
    for (let i = 0; i < 30 && !exited; i++) await sleep(100)
    if (!exited) {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        /* ja encerrado */
      }
      for (let i = 0; i < 20 && !exited; i++) await sleep(100)
    }
  }

  try {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (exited) throw new Error(`o vite preview encerrou ao subir (porta ${PORT} ocupada?): ${log.trim().split('\n').slice(-3).join(' | ')}`)
      try {
        const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) })
        if (res.ok) return { stop }
      } catch {
        /* ainda subindo */
      }
      await sleep(250)
    }
    throw new Error('prazo estourado esperando o vite preview')
  } catch (err) {
    await stop()
    throw err
  }
}

// Encerramento forcado (Ctrl+C, kill): derruba Chrome e preview antes de sair, sem processo orfao.
const cleanups = []
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.error(`pwa: ${signal} recebido, encerrando Chrome e preview`)
    await Promise.allSettled(cleanups.map((fn) => fn()))
    process.exit(2)
  })
}

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'ok   ' : 'FALHA'} - ${name}${detail ? ` (${detail})` : ''}`)
}

/** Erro de rede esperado (offline, Firebase sem variaveis): nao conta como defeito do PWA. */
const NETWORK_NOISE = /failed to load resource|net::err|failed to fetch|networkerror|err_internet|client is offline|unavailable|firestore|identitytoolkit|securetoken|googleapis|firebase/i

async function navigate(page, url, { reload = false } = {}) {
  const loaded = page.waitFor('Page.loadEventFired', 30000)
  if (reload) await page.send('Page.reload')
  else await page.send('Page.navigate', { url })
  await loaded
  await sleep(800)
}

const withTimeoutPage = (page, promiseSource, ms) =>
  page.evaluate(`Promise.race([(${promiseSource}), new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), ${ms}))])`)

async function getHead(path) {
  const res = await fetch(`${ORIGIN}${path}`, { signal: AbortSignal.timeout(5000) })
  return { status: res.status, type: res.headers.get('content-type') ?? '' }
}

/** Le a lista de URLs de todas as entradas de todos os caches da origem. */
const READ_CACHES = `(async () => {
  const names = await caches.keys()
  const out = []
  for (const name of names) {
    const cache = await caches.open(name)
    const reqs = await cache.keys()
    out.push({ name, urls: reqs.map((r) => r.url) })
  }
  return out
})()`

async function scenarioWorker(ctx) {
  const { page, collected } = ctx
  await navigate(page, `${ORIGIN}/`)

  const registered = await withTimeoutPage(
    page,
    `navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(() => navigator.serviceWorker.ready).then((reg) => ({ active: reg.active ? reg.active.state : null }))`,
    20000,
  )
  check('worker: registra e navigator.serviceWorker.ready resolve em ate 20 s', !registered.timeout && (registered.active === 'activating' || registered.active === 'activated'), JSON.stringify(registered))

  await navigate(page, `${ORIGIN}/`, { reload: true })
  const controlled = await page.evaluate(`navigator.serviceWorker.controller !== null && navigator.serviceWorker.controller.scriptURL`)
  check('worker: depois de recarregar, o worker controla a pagina', typeof controlled === 'string' && controlled.endsWith('/sw.js'), String(controlled))

  const manifest = await getHead('/manifest.webmanifest')
  check('manifest: GET /manifest.webmanifest responde 200 com tipo manifest ou json', manifest.status === 200 && /manifest|json/i.test(manifest.type), `${manifest.status} ${manifest.type}`)
  const sw = await getHead('/sw.js')
  check('worker: GET /sw.js responde 200', sw.status === 200, String(sw.status))

  let icons = []
  try {
    const body = await (await fetch(`${ORIGIN}/manifest.webmanifest`, { signal: AbortSignal.timeout(5000) })).json()
    icons = body.icons ?? []
  } catch {
    /* coberto pela checagem abaixo */
  }
  check('manifest: lista tres icones', icons.length === 3, String(icons.length))
  for (const icon of icons) {
    const res = await getHead(icon.src)
    check(`manifest: icone ${icon.sizes} ${icon.purpose} responde 200 como imagem`, res.status === 200 && /image\/png/.test(res.type), `${icon.src} ${res.status} ${res.type}`)
  }

  const caches = await page.evaluate(READ_CACHES)
  const precache = caches.find((c) => /precache/.test(c.name))
  check('cache: existe um cache de pre-cache', Boolean(precache), caches.map((c) => c.name).join(','))
  const hasIndex = Boolean(precache) && precache.urls.some((u) => /\/index\.html(\?|$)/.test(u))
  check('cache: o pre-cache guarda a entrada do index.html', hasIndex)
  const urls = caches.flatMap((c) => c.urls)
  const foreign = urls.filter((u) => !u.startsWith(`${ORIGIN}/`))
  check('cache: nenhuma entrada de outra origem (Firestore, API, Pluggy)', foreign.length === 0, foreign.slice(0, 3).join(' | '))
  const data = urls.filter((u) => /firestore\.googleapis\.com|\/api\//.test(u))
  check('cache: nenhuma entrada de Firestore nem de /api/', data.length === 0, data.slice(0, 3).join(' | '))
  check('cache: so ha caches do pre-cache do Workbox', caches.every((c) => /precache/.test(c.name)), caches.map((c) => c.name).join(','))

  // Sem rede, a casca abre pelo pre-cache.
  await page.send('Network.enable')
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await navigate(page, `${ORIGIN}/`, { reload: true })
  const offline = await page.evaluate(`({ title: document.title, viaWorker: (performance.getEntriesByType('navigation')[0]?.workerStart ?? 0) > 0, hasRoot: document.getElementById('root') !== null })`)
  check('offline: com a rede desligada o titulo continua Coinc', offline.title === 'Coinc', offline.title)
  check('offline: a casca (#root) abre e quem serviu foi o worker', offline.hasRoot && offline.viaWorker, JSON.stringify(offline))
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })

  const unhandled = collected.exceptions.filter((e) => !NETWORK_NOISE.test(e))
  const errors = collected.consoleErrors.filter((e) => !NETWORK_NOISE.test(e))
  check('pagina: nenhuma excecao nem console.error que nao seja de rede', unhandled.length === 0 && errors.length === 0, [...unhandled, ...errors].slice(0, 3).join(' | '))
}

function withTimeout(promise, ms, label) {
  let timer
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`prazo de ${ms / 1000}s estourado em ${label}`)), ms)
  })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

async function main() {
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.error('pwa: dist/ nao existe, rode npm run build')
    return 2
  }
  let preview = null
  let chrome = null
  let page = null
  try {
    preview = await startPreview()
    cleanups.push(() => preview.stop())
    chrome = await launchChrome()
    cleanups.push(() => chrome.close())
    page = await connect(chrome.wsUrl)
    await page.send('Page.enable')
    await page.send('Runtime.enable')

    const collected = { exceptions: [], consoleErrors: [] }
    page.on('Runtime.exceptionThrown', (p) => {
      const d = p.exceptionDetails ?? {}
      collected.exceptions.push(String(d.exception?.description ?? d.text ?? 'excecao').split('\n')[0].slice(0, 200))
    })
    page.on('Runtime.consoleAPICalled', (p) => {
      if (p.type !== 'error') return
      const text = (p.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ')
      collected.consoleErrors.push(String(text).split('\n')[0].slice(0, 200))
    })

    await withTimeout(scenarioWorker({ page, collected }), TOTAL_TIMEOUT_MS, 'cenarios do PWA')
  } finally {
    page?.close()
    if (chrome) await chrome.close()
    if (preview) await preview.stop()
  }
  const failures = results.filter((r) => !r.ok).length
  console.log(`FALHAS ${failures}`)
  return failures > 0 ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`pwa: falha do script: ${err.message}`)
    process.exit(2)
  },
)
