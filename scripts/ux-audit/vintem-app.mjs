#!/usr/bin/env node
// Executor CDP do Vintem dentro do app (Home, lancamento, limites, estados vazios) em Chrome sem janela
// e modo MOCK. Descobre as suites em scripts/ux-audit/vintem-app/*.mjs: cada suite exporta `name`,
// `route` (padrao `/`), `seed` (padrao `full`), `extraStorage(seed, now)` opcional e
// `async function run({ page, check, navigate, ORIGIN, sleep, collected })`. Cada suite roda em uma pagina
// nova do mesmo Chrome (360x640, escala 2, toque) com o localStorage semeado. So dados ficticios do seed;
// Vite e Chrome em 127.0.0.1; perfil temporario removido no fim; nada e lido de .env*.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/vintem-app.mjs [--only <nome>]
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma
// verificacao falhou, 2 falha do script.
import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5196
const ORIGIN = `http://127.0.0.1:${PORT}`
const VIEWPORT = { width: 360, height: 640 }
const SUITES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'vintem-app')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseArgs(argv) {
  let only = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') {
      only = argv[++i] ?? ''
      if (only === '') throw new Error('--only exige o nome da suite')
    } else throw new Error(`flag desconhecida: ${argv[i]}`)
  }
  return { only }
}

/** Sobe o Vite do projeto em modo MOCK, so em 127.0.0.1. Devolve { stop }. */
async function startVite({ timeoutMs = 45000 } = {}) {
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    env: { ...process.env, VITE_USE_EMULATOR: 'true', BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
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
      if (exited) throw new Error(`o Vite encerrou ao subir (porta ${PORT} ocupada?): ${log.trim().split('\n').slice(-3).join(' | ')}`)
      try {
        const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) })
        if (res.ok) return { stop }
      } catch {
        /* ainda subindo */
      }
      await sleep(250)
    }
    throw new Error('prazo estourado esperando o servidor Vite')
  } catch (err) {
    await stop()
    throw err
  }
}

/** Script que limpa o armazenamento do mock e grava a semente a cada documento novo. */
function seedSource(seed) {
  return `(() => { try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('db::') || k.startsWith('doc::')) localStorage.removeItem(k)
    const seed = ${JSON.stringify(seed)}
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
  } catch {} })()`
}

// Encerramento forcado (Ctrl+C, kill): derruba Chrome e Vite antes de sair.
const cleanups = []
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.error(`vintem-app: ${signal} recebido, encerrando Chrome e Vite`)
    await Promise.allSettled(cleanups.map((fn) => fn()))
    process.exit(2)
  })
}

/** Abre uma aba nova do mesmo Chrome e devolve { page, closeTab }. */
async function openTab(chrome) {
  const res = await fetch(`http://127.0.0.1:${chrome.port}/json/new?about:blank`, {
    method: 'PUT',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`nao abriu aba nova (HTTP ${res.status})`)
  const target = await res.json()
  const page = await connect(target.webSocketDebuggerUrl)
  const closeTab = async () => {
    page.close()
    try {
      await fetch(`http://127.0.0.1:${chrome.port}/json/close/${target.id}`, { signal: AbortSignal.timeout(3000) })
    } catch {
      /* a aba some junto com o Chrome */
    }
  }
  return { page, closeTab }
}

/** Navega passando por about:blank e espera a expressao `ready` ficar verdadeira. */
function makeNavigate(page) {
  return async function navigate(route = '/', ready = 'document.body.innerText.length > 0') {
    const blank = page.waitFor('Page.loadEventFired', 15000)
    await page.send('Page.navigate', { url: 'about:blank' })
    await blank
    const loaded = page.waitFor('Page.loadEventFired', 30000)
    await page.send('Page.navigate', { url: `${ORIGIN}${route}` })
    await loaded
    const deadline = Date.now() + 20000
    while (Date.now() < deadline) {
      if (await page.evaluate(`!!(${ready})`)) break
      await sleep(150)
    }
    await sleep(900)
  }
}

async function loadSuites(only) {
  const files = (await readdir(SUITES_DIR)).filter((f) => f.endsWith('.mjs')).sort()
  const suites = []
  for (const file of files) {
    const mod = await import(pathToFileURL(join(SUITES_DIR, file)).href)
    if (typeof mod.run !== 'function' || typeof mod.name !== 'string') {
      throw new Error(`a suite ${file} precisa exportar name e run`)
    }
    suites.push(mod)
  }
  const chosen = only === null ? suites : suites.filter((s) => s.name === only)
  if (only !== null && chosen.length === 0) {
    throw new Error(`suite "${only}" nao existe (disponiveis: ${suites.map((s) => s.name).join(', ')})`)
  }
  return chosen
}

async function runSuite(chrome, suite) {
  const results = []
  const check = (label, ok, detail = {}) => {
    const line = { suite: suite.name, check: label, ok: Boolean(ok), ...detail }
    results.push(line)
    console.log(JSON.stringify(line))
  }
  const { page, closeTab } = await openTab(chrome)
  try {
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
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: 2,
      mobile: true,
    })
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })

    const now = new Date()
    const seed = buildSeed(suite.seed ?? 'full', now)
    const extra = suite.extraStorage?.(seed, now)
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: seedSource(extra ?? seed) })

    const navigate = makeNavigate(page)
    await suite.run({ page, check, navigate, ORIGIN, sleep, collected, route: suite.route ?? '/' })
    check('sem-excecoes-nem-console-error', collected.exceptions.length === 0 && collected.consoleErrors.length === 0, {
      exceptions: [...collected.exceptions],
      consoleErrors: [...collected.consoleErrors],
    })
  } finally {
    await closeTab()
  }
  return results
}

async function main() {
  const { only } = parseArgs(process.argv.slice(2))
  const suites = await loadSuites(only)
  let vite = null
  let chrome = null
  const all = []
  try {
    vite = await startVite()
    cleanups.push(() => vite.stop())
    chrome = await launchChrome()
    cleanups.push(() => chrome.close())
    for (const suite of suites) all.push(...(await runSuite(chrome, suite)))
    const failed = all.filter((r) => !r.ok)
    console.log(`FALHAS ${failed.length}`)
    return failed.length > 0 ? 1 : 0
  } finally {
    if (chrome) await chrome.close()
    if (vite) await vite.stop()
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`vintem-app: falha do script: ${err.message}`)
    process.exit(2)
  },
)
