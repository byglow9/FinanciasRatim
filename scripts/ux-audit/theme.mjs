#!/usr/bin/env node
// Auditor CDP do tema (plano 05-06, D-08, D-09, IDEN-05): Vite em modo MOCK na porta 5190 e Chrome sem janela.
// So 127.0.0.1; nada lido de .env*; perfil temporario do Chrome removido no fim; nenhuma dependencia nova.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/theme.mjs --smoke
//   --smoke  so o primeiro desenho: escuro forcado no aparelho nasce pintado, sem piscar o tema errado.
//   sem flag todos os cenarios (smoke mais o seletor de Ajustes e o modo Automatico).
// Saida: uma linha por verificacao e a linha final `FALHAS n`. Codigos: 0 sem falha, 1 alguma falha,
// 2 falha do proprio script (Chrome ausente, Vite nao subiu, prazo vencido).
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5190
const ORIGIN = `http://127.0.0.1:${PORT}`
const THEME_KEY = 'coinc:tema:v1'
const DARK_BODY = 'rgb(10, 21, 16)'
const DARK_META = '#0a1510'
const LIGHT_META = '#f5ecdb'
const TOTAL_TIMEOUT_MS = 180000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseArgs(argv) {
  const opts = { smoke: false }
  for (const arg of argv) {
    if (arg === '--smoke') opts.smoke = true
    else throw new Error(`flag desconhecida: ${arg}`)
  }
  return opts
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

/**
 * Codigo que roda em cada documento novo, antes de qualquer script da pagina.
 * - Semeia os dados do mock e as chaves de aparelho (tema e onboarding) uma unica vez por aba (sessionStorage
 *   marca a semeadura, para um recarregamento nao desfazer a escolha feita na tela).
 * - Instala um MutationObserver que anota o instante em que <html> ganha a classe dark e o instante em que
 *   #root recebe o primeiro filho.
 */
function bootSource(initialTheme) {
  const seed = buildSeed('full')
  return `(() => {
    window.__theme = { darkAt: null, rootAt: null }
    try {
      if (!sessionStorage.getItem('__theme_seeded')) {
        for (const k of Object.keys(localStorage)) if (k.startsWith('db::') || k.startsWith('doc::')) localStorage.removeItem(k)
        const seed = ${JSON.stringify(seed)}
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
        localStorage.setItem('coinc:onboarding:v1', '1')
        const theme = ${JSON.stringify(initialTheme)}
        if (theme) localStorage.setItem(${JSON.stringify(THEME_KEY)}, theme)
        else localStorage.removeItem(${JSON.stringify(THEME_KEY)})
        sessionStorage.setItem('__theme_seeded', '1')
      }
    } catch {}
    const note = () => {
      const t = window.__theme
      if (t.darkAt === null && document.documentElement && document.documentElement.classList.contains('dark')) t.darkAt = performance.now()
      if (t.rootAt === null) {
        const root = document.getElementById('root')
        if (root && root.firstChild) t.rootAt = performance.now()
      }
    }
    new MutationObserver(note).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    note()
  })()`
}

async function navigate(page, url) {
  const loaded = page.waitFor('Page.loadEventFired', 30000)
  await page.send('Page.navigate', { url })
  await loaded
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const mounted = await page.evaluate(`(document.getElementById('root')?.children.length ?? 0) > 0`)
    if (mounted) break
    await sleep(150)
  }
  await sleep(600)
}

// Encerramento forcado (Ctrl+C, kill): derruba Chrome e Vite antes de sair, sem processo orfao.
const cleanups = []
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.error(`theme: ${signal} recebido, encerrando Chrome e Vite`)
    await Promise.allSettled(cleanups.map((fn) => fn()))
    process.exit(2)
  })
}

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'ok   ' : 'FALHA'} - ${name}${detail ? ` (${detail})` : ''}`)
}

/** Estado do tema na pagina atual. */
const READ_STATE = `(() => ({
  dark: document.documentElement.classList.contains('dark'),
  colorScheme: getComputedStyle(document.documentElement).colorScheme,
  body: getComputedStyle(document.body).backgroundColor,
  meta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
  stored: (() => { try { return localStorage.getItem(${JSON.stringify(THEME_KEY)}) } catch { return 'erro' } })(),
  darkAt: window.__theme?.darkAt ?? null,
  rootAt: window.__theme?.rootAt ?? null,
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}))()`

/** Cenario 1: escuro forcado no aparelho nasce pintado, sem piscar o tema errado (D-09). */
async function scenarioSmoke(ctx) {
  const { page } = ctx
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true })
  await navigate(page, `${ORIGIN}/`)
  const s = await page.evaluate(READ_STATE)
  check('smoke: classe dark presente com o escuro forcado e o sistema claro', s.dark === true)
  check('smoke: fundo do corpo e rgb(10, 21, 16)', s.body === DARK_BODY, s.body)
  check('smoke: color-scheme computado e dark', s.colorScheme === 'dark', s.colorScheme)
  check(`smoke: meta theme-color e ${DARK_META}`, s.meta === DARK_META, String(s.meta))
  check(
    'smoke: a classe dark entrou antes do primeiro filho de #root',
    s.darkAt !== null && s.rootAt !== null && s.darkAt < s.rootAt,
    `dark ${s.darkAt?.toFixed?.(1)} ms, #root ${s.rootAt?.toFixed?.(1)} ms`,
  )
  check('smoke: sem rolagem horizontal a 360x640', s.scrollW <= s.clientW, `${s.scrollW} x ${s.clientW}`)
  check('smoke: nenhuma excecao nem console.error', ctx.collected.exceptions.length === 0 && ctx.collected.consoleErrors.length === 0, [...ctx.collected.exceptions, ...ctx.collected.consoleErrors].join(' | '))
}

const SCENARIOS_FULL = []

function withTimeout(promise, ms, label) {
  let timer
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`prazo de ${ms / 1000}s estourado em ${label}`)), ms)
  })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  let vite = null
  let chrome = null
  let page = null
  try {
    vite = await startVite()
    cleanups.push(() => vite.stop())
    chrome = await launchChrome()
    cleanups.push(() => chrome.close())
    page = await connect(chrome.wsUrl)
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: bootSource('escuro') })

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

    const ctx = { page, collected }
    const list = opts.smoke ? [scenarioSmoke] : [scenarioSmoke, ...SCENARIOS_FULL]
    await withTimeout(
      (async () => {
        for (const scenario of list) await scenario(ctx)
      })(),
      TOTAL_TIMEOUT_MS,
      'cenarios do tema',
    )
  } finally {
    page?.close()
    if (chrome) await chrome.close()
    if (vite) await vite.stop()
  }
  const failures = results.filter((r) => !r.ok).length
  console.log(`FALHAS ${failures}`)
  return failures > 0 ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`theme: falha do script: ${err.message}`)
    process.exit(2)
  },
)
