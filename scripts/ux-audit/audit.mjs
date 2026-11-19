#!/usr/bin/env node
// Auditoria de layout em modo MOCK (Chrome sem janela + protocolo CDP). Sem dependencias novas.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/audit.mjs --route / --viewport 360x640 --report-only
// Saida: uma linha JSON por rota e viewport. Codigos: 0 ok, 1 violacoes, 2 falha do proprio script.
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'

const PORT = 5199
const ORIGIN = `http://127.0.0.1:${PORT}`
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseArgs(argv) {
  const opts = { routes: [], viewports: [], reportOnly: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      const value = argv[++i]
      if (value === undefined) throw new Error(`falta o valor de ${arg}`)
      return value
    }
    if (arg === '--route') opts.routes.push(next())
    else if (arg === '--viewport') {
      const raw = next()
      const m = /^(\d+)x(\d+)$/.exec(raw)
      if (!m) throw new Error(`viewport invalido: ${raw} (use LxA, ex.: 360x640)`)
      opts.viewports.push({ width: Number(m[1]), height: Number(m[2]) })
    } else if (arg === '--report-only') opts.reportOnly = true
    else throw new Error(`flag desconhecida: ${arg}`)
  }
  if (opts.routes.length === 0) throw new Error('informe --route <caminho>')
  if (opts.viewports.length === 0) {
    opts.viewports = [
      { width: 360, height: 640 },
      { width: 390, height: 844 },
    ]
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

async function navigate(page, url) {
  const loaded = page.waitFor('Page.loadEventFired', 30000)
  await page.send('Page.navigate', { url })
  await loaded
  // Espera o React montar e as rotas carregarem (lazy, fontes).
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const mounted = await page.evaluate(`(document.getElementById('root')?.children.length ?? 0) > 0`)
    if (mounted) break
    await sleep(150)
  }
  await sleep(700)
}

async function measureOverflow(page) {
  return page.evaluate(`(() => {
    const el = document.documentElement
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
  })()`)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  let vite = null
  let chrome = null
  let page = null
  let violations = 0
  try {
    vite = await startVite()
    chrome = await launchChrome()
    page = await connect(chrome.wsUrl)
    await page.send('Page.enable')
    await page.send('Runtime.enable')

    for (const route of opts.routes) {
      for (const viewport of opts.viewports) {
        await page.send('Emulation.setDeviceMetricsOverride', {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 2,
          mobile: true,
        })
        await navigate(page, `${ORIGIN}${route}`)
        const { scrollWidth, clientWidth } = await measureOverflow(page)
        const overflowX = scrollWidth > clientWidth
        if (overflowX) violations++
        console.log(
          JSON.stringify({ route, viewport: `${viewport.width}x${viewport.height}`, scrollWidth, clientWidth, overflowX }),
        )
      }
    }
  } finally {
    page?.close()
    if (chrome) await chrome.close()
    if (vite) await vite.stop()
  }
  return opts.reportOnly ? 0 : violations > 0 ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`ux-audit: falha do script: ${err.message}`)
    process.exit(2)
  },
)
