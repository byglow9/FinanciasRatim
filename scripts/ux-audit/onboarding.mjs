#!/usr/bin/env node
// Executor CDP do onboarding de 3 telas (plano 05-14, IDEN-08, IDEN-03, D-16 a D-19, D-12) em Chrome sem janela
// e modo MOCK, a 360x640 e 390x844 com toque. Vite e Chrome so em 127.0.0.1 (porta 5193); so dados ficticios do
// seed; nada e lido de .env*; perfil temporario do Chrome removido no fim.
// Em MOCK o app abre logado e grava a marca coinc:onboarding:v1 em silencio (P-05). O onboarding e alcancado
// por /configuracoes: remove a marca e toca em "Sair da conta".
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/onboarding.mjs [--smoke]
// `--smoke` roda so o cenario do portao (primeira abertura sem sessao mostra a tela 1 e Pular leva ao Login).
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma verificacao
// falhou, 2 falha do script.
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5193
const ORIGIN = `http://127.0.0.1:${PORT}`
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const NOTICE_TITLE = 'O Coinc mudou de endereço.'
const NOTICE_TEXT = 'Entre de novo por aqui. Seus dados continuam salvos.'
const OFFLINE_TEXT = 'Sem conexão. Conecte-se à internet para entrar.'
const AUTH_FAILED_TEXT = 'E-mail ou senha incorretos.'
const DARK_BODY = 'rgb(10, 21, 16)'
const ORIGIN_KEY = 'coinc:origem-antiga'

const FORM = `document.querySelector('form[aria-label="Entrar"]')`
const LOGOUT = `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Sair da conta'))`
const BODY_TEXT = `document.body.innerText`

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

/** Script que limpa o armazenamento do mock e grava a semente (mais `extra`) a cada documento novo. */
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
    console.error(`onboarding: ${signal} recebido, encerrando Chrome e Vite`)
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
  return async function navigate(route, ready) {
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

/** Espera a expressao ficar verdadeira (ate `ms`). */
async function until(page, expr, ms = 4000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await page.evaluate(`!!(${expr})`)) return true
    await sleep(100)
  }
  return false
}

/** Roda `fn` numa aba nova com o seed, o toque, o tamanho de tela e as opcoes pedidas. */
async function inTab(chrome, name, viewport, opts, results, fn) {
  const label = `${viewport.width}x${viewport.height}`
  const check = (what, ok, detail = {}) => {
    const line = { scenario: name, viewport: label, check: what, ok: Boolean(ok), ...detail }
    results.push(line)
    console.log(JSON.stringify(line))
  }
  const { page, closeTab } = await openTab(chrome)
  try {
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    await page.send('Network.enable')
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
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 2,
      mobile: true,
    })
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    await page.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-reduced-motion', value: opts.reduced ? 'reduce' : 'no-preference' },
      ],
    })
    const seed = { ...buildSeed('full', new Date()), ...(opts.seed ?? {}) }
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: seedSource(seed) })

    const navigate = makeNavigate(page)
    await fn({ page, check, navigate })
    // Falhas de rede forcadas (offline) geram erro de console do navegador; so excecoes e erros de app contam.
    const appErrors = collected.consoleErrors.filter((t) => !/net::ERR|Failed to load resource|WebSocket/i.test(t))
    check('sem-excecoes-nem-console-error', collected.exceptions.length === 0 && appErrors.length === 0, {
      exceptions: [...collected.exceptions],
      consoleErrors: appErrors,
    })
  } finally {
    await closeTab()
  }
}

const KEY = 'coinc:onboarding:v1'
const SMOKE = process.argv.includes('--smoke')
const T1 = 'Veja quanto ainda pode gastar'

const READY_APP = `document.getElementById('root')?.children.length > 0`
const btn = (text) => `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(text)})`
const click = (page, text) => page.evaluate(`(() => { const b = ${btn(text)}; if (!b) return false; b.click(); return true })()`)
const readKey = (page) => page.evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`)
const h1Text = `document.querySelector('h1')?.textContent.trim()`

/** Em MOCK o app abre logado: remove a marca, vai a /configuracoes e toca em Sair da conta. */
async function reachOnboarding(page, navigate) {
  await navigate('/configuracoes', `${LOGOUT}`)
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`)
  await page.evaluate(`(() => { const b = ${LOGOUT}; b.focus(); b.click() })()`)
  return until(page, `${h1Text} === ${JSON.stringify(T1)}`, 6000)
}

// cenario 0 (smoke): portao e Pular.
async function scenarioGate({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('portao-sem-sessao-e-sem-marca-mostra-a-tela-1', reached, {})
  if (!reached) return
  const buttons = await page.evaluate(`[...document.querySelectorAll('main button')].filter((b) => b.checkVisibility({ visibilityProperty: true })).map((b) => (b.getAttribute('aria-label') || b.textContent).trim())`)
  check('portao-botoes-pular-e-continuar-sem-voltar-visivel', buttons.includes('Pular') && buttons.includes('Continuar') && !buttons.includes('Voltar'), { buttons })
  check('portao-nao-grava-a-marca-ao-montar', (await readKey(page)) === null, {})
  check('portao-sem-login-por-tras', !(await page.evaluate(`!!${FORM}`)), {})
  await click(page, 'Pular')
  const login = await until(page, FORM, 4000)
  check('pular-leva-ao-login', login, {})
  check('pular-grava-a-marca', (await readKey(page)) === '1', { key: await readKey(page) })
}

async function main() {
  let vite = null
  let chrome = null
  const results = []
  try {
    vite = await startVite()
    cleanups.push(() => vite.stop())
    chrome = await launchChrome()
    cleanups.push(() => chrome.close())

    for (const viewport of VIEWPORTS) {
      await inTab(chrome, 'portao', viewport, {}, results, scenarioGate)
      if (SMOKE) continue
    }

    const failed = results.filter((r) => !r.ok)
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
    console.error(`onboarding: falha do script: ${err.message}`)
    process.exit(2)
  },
)
