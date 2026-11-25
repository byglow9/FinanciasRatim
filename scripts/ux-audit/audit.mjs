#!/usr/bin/env node
// Auditoria de layout em modo MOCK (Chrome sem janela + protocolo CDP). Sem dependencias novas.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/audit.mjs --route / --viewport 360x640 --report-only
// Flags: --route <caminho> (repetivel) | --routes all  --viewport LxA (repetivel) --smoke --expect-h1 <texto>
//        --report-only --assert dock-peek --seed full|empty|cards
// Saida: uma linha JSON por rota e viewport. Codigos: 0 ok, 1 violacoes, 2 falha do proprio script.
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5199
const ORIGIN = `http://127.0.0.1:${PORT}`
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Rotas autenticadas do app (src/App.tsx, dentro de ProtectedRoute).
const ALL_ROUTES = ['/', '/transacoes', '/contas-fixas', '/porquinho', '/metas', '/relatorios', '/configuracoes', '/calendario', '/casal', '/cartoes']
// Prazo de cada combinacao rota x viewport (navegar, medir e coletar).
const COMBO_TIMEOUT_MS = 60000
// Destinos do dock (NavRail): 9 com Cartoes (D-11). A espiada a 360px confere o total e o link Cartoes.
const DOCK_DESTINATIONS = 9

function parseArgs(argv) {
  const opts = { routes: [], viewports: [], reportOnly: false, smoke: false, expectH1: null, asserts: [], seed: 'full' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      const value = argv[++i]
      if (value === undefined) throw new Error(`falta o valor de ${arg}`)
      return value
    }
    if (arg === '--route') opts.routes.push(next())
    else if (arg === '--routes') {
      const value = next()
      if (value !== 'all') throw new Error(`--routes so aceita all (recebido: ${value})`)
      opts.routes.push(...ALL_ROUTES)
    }
    else if (arg === '--viewport') {
      const raw = next()
      const m = /^(\d+)x(\d+)$/.exec(raw)
      if (!m) throw new Error(`viewport invalido: ${raw} (use LxA, ex.: 360x640)`)
      opts.viewports.push({ width: Number(m[1]), height: Number(m[2]) })
    } else if (arg === '--report-only') opts.reportOnly = true
    else if (arg === '--smoke') opts.smoke = true
    else if (arg === '--expect-h1') opts.expectH1 = next()
    else if (arg === '--assert') {
      const name = next()
      if (name !== 'dock-peek') throw new Error(`assert desconhecido: ${name} (use dock-peek)`)
      opts.asserts.push(name)
    } else if (arg === '--seed') {
      const kind = next()
      if (kind !== 'full' && kind !== 'empty' && kind !== 'cards') {
        throw new Error(`seed invalido: ${kind} (use full, empty ou cards)`)
      }
      opts.seed = kind
    }
    else throw new Error(`flag desconhecida: ${arg}`)
  }
  if (opts.routes.length === 0) throw new Error('informe --route <caminho> ou --routes all')
  opts.routes = [...new Set(opts.routes)]
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

// Roda dentro da pagina (serializada com toString). Sem acesso ao escopo do Node.
function pageRules(cfg) {
  const round = (n) => Math.round(n * 100) / 100
  const selectorOf = (el) => {
    let sel = el.tagName.toLowerCase()
    if (el.id) sel += `#${el.id}`
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : []
    if (cls.length) sel += `.${cls.join('.')}`
    const label = el.getAttribute('aria-label') || el.getAttribute('title') || (el.textContent || '').trim()
    if (label) sel += ` "${label.replace(/\s+/g, ' ').slice(0, 30)}"`
    return sel
  }
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    return typeof el.checkVisibility === 'function' ? el.checkVisibility({ visibilityProperty: true }) : true
  }
  const inAriaHidden = (el) => el.closest('[aria-hidden="true"]') !== null
  const cap = (list) => list.slice(0, 100)

  const result = {}

  const doc = document.documentElement
  result.scrollWidth = doc.scrollWidth
  result.clientWidth = doc.clientWidth
  result.overflowX = doc.scrollWidth > doc.clientWidth

  // Rolagem horizontal: elementos que passam da largura da janela, fora dos carrosseis
  // (overflow-x auto/scroll) e fora de quem recorta (hidden/clip). html e body nao contam como recorte,
  // para um overflow-x escondido no body nao mascarar o vazamento.
  const overflowers = []
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== doc; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true
    }
    return false
  }
  for (const el of document.body.querySelectorAll('*')) {
    if (!isVisible(el) || inAriaHidden(el)) continue
    const rect = el.getBoundingClientRect()
    if (rect.right <= window.innerWidth + 0.5) continue
    if (clippedByAncestor(el)) continue
    overflowers.push({ selector: selectorOf(el), right: round(rect.right), innerWidth: window.innerWidth })
  }
  result.overflowers = cap(overflowers)

  // Alvos tocaveis de pelo menos 44x44.
  const smallTargets = []
  const targetSel = 'button, a[href], [role="button"], [role="tab"], input, select, textarea'
  for (const el of document.querySelectorAll(targetSel)) {
    if (el instanceof HTMLInputElement && el.type === 'hidden') continue
    if (!isVisible(el) || inAriaHidden(el)) continue
    const rect = el.getBoundingClientRect()
    if (rect.width >= 44 && rect.height >= 44) continue
    smallTargets.push({ selector: selectorOf(el), width: round(rect.width), height: round(rect.height) })
  }
  result.smallTargets = cap(smallTargets)

  // Texto renderizado com pelo menos 12px (um item por elemento pai).
  const smallText = []
  const seen = new Set()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.nodeValue || '').trim()
    const parent = node.parentElement
    if (!text || !parent || seen.has(parent)) continue
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue
    if (!isVisible(parent)) continue
    const fontSize = parseFloat(getComputedStyle(parent).fontSize)
    if (fontSize >= 12) continue
    seen.add(parent)
    smallText.push({ selector: selectorOf(parent), fontSize: round(fontSize), text: text.slice(0, 30) })
  }
  result.smallText = cap(smallText)

  return result
}

// Dentro da pagina: mede o dock a 360px. Itens totalmente visiveis, item parcial a direita e corte a esquerda.
function pageDockPeek() {
  const nav = document.querySelector('nav[aria-label="Navegação principal"]')
  if (!nav) return { found: false }
  nav.scrollLeft = 0
  const navRect = nav.getBoundingClientRect()
  const links = [...nav.querySelectorAll('a[href]')]
  const labels = links.map((a) => a.getAttribute('aria-label'))
  const items = links.map((a) => a.getBoundingClientRect())
  const eps = 0.5
  const full = items.filter((r) => r.left >= navRect.left - eps && r.right <= navRect.right + eps).length
  const partialRight = items.filter((r) => r.left < navRect.right - eps && r.right > navRect.right + eps).length
  const firstCutLeft = items.length > 0 && items[0].left < navRect.left - eps
  return { found: true, total: items.length, labels, full, partialRight, firstCutLeft }
}

async function applyRules(page, opts, viewport) {
  const rules = await page.evaluate(`(${pageRules.toString()})(${JSON.stringify({})})`)
  const overflow = rules.overflowX || rules.overflowers.length > 0
  const violations = (overflow ? 1 : 0) + rules.smallTargets.length + rules.smallText.length
  return { ...rules, violations }
}

async function checkDockPeek(page) {
  await page.evaluate(`document.querySelector('nav[aria-label="Navegação principal"]')?.scrollTo(0, 0)`)
  await sleep(200)
  const m = await page.evaluate(`(${pageDockPeek.toString()})()`)
  const hasCards = m.found && Array.isArray(m.labels) && m.labels.includes('Cartões')
  const ok = m.found && m.total === DOCK_DESTINATIONS && hasCards && m.full === 4 && m.partialRight === 1 && !m.firstCutLeft
  return { ...m, expected: { total: DOCK_DESTINATIONS, label: 'Cartões', full: 4, partialRight: 1, firstCutLeft: false }, ok }
}

async function checkSmoke(page, opts, collected) {
  const h1 = await page.evaluate(`document.querySelector('h1')?.textContent?.trim() ?? null`)
  const h1Ok = opts.expectH1 === null ? h1 !== null : h1 !== null && h1.includes(opts.expectH1)
  const exceptions = [...collected.exceptions]
  const consoleErrors = [...collected.consoleErrors]
  return {
    ok: h1Ok && exceptions.length === 0 && consoleErrors.length === 0,
    h1,
    expectH1: opts.expectH1,
    h1Ok,
    exceptions,
    consoleErrors,
  }
}

function seedSource(kind) {
  const seed = buildSeed(kind)
  // Reescreve db::/doc:: a cada documento novo: cada rota parte do mesmo dado. O try/catch cobre
  // about:blank, onde o localStorage nao existe.
  return `(() => { try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('db::') || k.startsWith('doc::')) localStorage.removeItem(k)
    const seed = ${JSON.stringify(seed)}
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
  } catch {} })()`
}

// Encerramento forcado (Ctrl+C, kill): derruba Chrome e Vite antes de sair, sem processo orfao.
const cleanups = []
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.error(`ux-audit: ${signal} recebido, encerrando Chrome e Vite`)
    await Promise.allSettled(cleanups.map((fn) => fn()))
    process.exit(2)
  })
}

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
  let violations = 0
  let total = 0
  const failedRoutes = []
  try {
    vite = await startVite()
    cleanups.push(() => vite.stop())
    chrome = await launchChrome()
    cleanups.push(() => chrome.close())
    page = await connect(chrome.wsUrl)
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: seedSource(opts.seed) })

    // Erros nao tratados e console.error da pagina atual (zerados a cada navegacao).
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

    const auditCombo = async (route, viewport) => {
      await page.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 2,
        mobile: true,
      })
      collected.exceptions.length = 0
      collected.consoleErrors.length = 0
      await navigate(page, `${ORIGIN}${route}`)

      const line = { route, viewport: `${viewport.width}x${viewport.height}` }
      let found = 0
      if (opts.smoke) {
        line.smoke = await checkSmoke(page, opts, collected)
        if (!line.smoke.ok) found++
      } else {
        const rules = await applyRules(page, opts, viewport)
        Object.assign(line, rules)
        found += rules.violations
      }
      if (opts.asserts.includes('dock-peek')) {
        if (viewport.width === 360 && viewport.height === 640) {
          line.dockPeek = await checkDockPeek(page)
          if (!line.dockPeek.ok) found++
        } else {
          line.dockPeek = { skipped: 'so vale em 360x640' }
        }
      }
      return { line, found }
    }

    // Uma instancia de Chrome e de Vite para todas as combinacoes, em sequencia.
    for (const route of opts.routes) {
      for (const viewport of opts.viewports) {
        const label = `${route} ${viewport.width}x${viewport.height}`
        const { line, found } = await withTimeout(auditCombo(route, viewport), COMBO_TIMEOUT_MS, label)
        total++
        violations += found
        if (found > 0) failedRoutes.push(label)
        console.log(JSON.stringify(line))
      }
    }
    console.log(JSON.stringify({ summary: true, total, violations, failedRoutes }))
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
