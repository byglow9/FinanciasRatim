#!/usr/bin/env node
// Executor CDP da pagina de teste oculta do Vintem (D-17, MASC-06) em Chrome sem janela e modo MOCK.
// Abre /vintem-teste a 360x640 e confere montagem, olhos, ausencia de NaN e de excecao, e a piscada.
// So dados ficticios do seed; Vite e Chrome em 127.0.0.1; perfil temporario removido no fim; nada e
// lido de .env*.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/vintem.mjs
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma
// verificacao falhou, 2 falha do script.
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5197
const ORIGIN = `http://127.0.0.1:${PORT}`
const ROUTE = '/vintem-teste?w=360'
const VIEWPORT = { width: 360, height: 640 }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

function seedSource() {
  const seed = buildSeed('full')
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
    console.error(`vintem: ${signal} recebido, encerrando Chrome e Vite`)
    await Promise.allSettled(cleanups.map((fn) => fn()))
    process.exit(2)
  })
}

// ---- Trechos que rodam dentro da pagina (strings simples, sem acesso ao escopo do Node) ------------------

/** Primeiro SVG do Vintem da pagina (o palco). */
const STAGE_SVG = `document.querySelector('svg.vt')`

/** Caixa de um filho do palco por sufixo de id. */
const BOX_OF = (suffix) => `(() => {
  const svg = ${STAGE_SVG}
  const el = svg && svg.querySelector('[id$="-${suffix}"]')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }
})()`

/** Cobertura do piscar do olho esquerdo: o atributo `y` do retangulo `lb`. */
const LID_Y = `(() => {
  const svg = ${STAGE_SVG}
  const el = svg && svg.querySelector('[id$="-eL"] [data-e="lb"]')
  return el ? el.getAttribute('y') : null
})()`

/** Espera o atributo da cobertura mudar (uma piscada) por ate `ms`. */
const WAIT_BLINK = (ms) => `new Promise((resolve) => {
  const read = () => { const svg = ${STAGE_SVG}; const el = svg && svg.querySelector('[id$="-eL"] [data-e="lb"]'); return el ? el.getAttribute('y') : null }
  const base = read()
  const t0 = performance.now()
  const timer = setInterval(() => {
    const now = read()
    if (now !== base) { clearInterval(timer); resolve({ changed: true, ms: Math.round(performance.now() - t0), base, now }) }
    else if (performance.now() - t0 > ${ms}) { clearInterval(timer); resolve({ changed: false, ms: Math.round(performance.now() - t0), base, now }) }
  }, 25)
})`

async function navigate(page, url) {
  // Passa por about:blank: sem isso a checagem de "pronto" podia ler o DOM do documento antigo.
  const blank = page.waitFor('Page.loadEventFired', 15000)
  await page.send('Page.navigate', { url: 'about:blank' })
  await blank
  const loaded = page.waitFor('Page.loadEventFired', 30000)
  await page.send('Page.navigate', { url })
  await loaded
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const ready = await page.evaluate(`!!${STAGE_SVG} && document.querySelector('h1')?.textContent?.trim() === 'Teste do Vintém'`)
    if (ready) break
    await sleep(150)
  }
  await sleep(600)
}

/** Roda todas as verificacoes e devolve a lista de resultados. */
async function runChecks(page, collected) {
  const results = []
  const check = (name, ok, detail = {}) => {
    const line = { check: name, ok: Boolean(ok), ...detail }
    results.push(line)
    console.log(JSON.stringify(line))
  }

  await page.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  collected.exceptions.length = 0
  collected.consoleErrors.length = 0
  await navigate(page, `${ORIGIN}${ROUTE}`)

  // (1) Montagem: titulo, noindex e o SVG decorativo.
  const h1 = await page.evaluate(`document.querySelector('h1')?.textContent?.trim() ?? null`)
  check('h1-teste-do-vintem', h1 === 'Teste do Vintém', { h1 })

  const robots = await page.evaluate(`[...document.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute('content'))`)
  check('meta-robots-noindex', robots.length === 1 && robots[0] === 'noindex', { robots })

  const svgInfo = await page.evaluate(`(() => {
    const svg = ${STAGE_SVG}
    if (!svg) return null
    return { ariaHidden: svg.getAttribute('aria-hidden'), focusable: svg.getAttribute('focusable'), w: svg.getBoundingClientRect().width }
  })()`)
  check('svg-decorativo-montado', svgInfo !== null && svgInfo.ariaHidden === 'true' && svgInfo.w >= 200, { svg: svgInfo })

  // (2) Olhos do neutro com caixa maior que zero.
  const eyeL = await page.evaluate(BOX_OF('eL'))
  const eyeR = await page.evaluate(BOX_OF('eR'))
  check('olhos-do-neutro-com-caixa', eyeL !== null && eyeR !== null && eyeL.w > 0 && eyeL.h > 0 && eyeR.w > 0 && eyeR.h > 0, { eyeL, eyeR })

  // (3) Nenhum NaN, Infinity ou undefined na marcacao do SVG.
  const bad = await page.evaluate(`(() => {
    const svg = ${STAGE_SVG}
    const html = svg ? svg.outerHTML : ''
    return { nan: /NaN/.test(html), inf: /Infinity/.test(html), undef: /undefined/.test(html), len: html.length }
  })()`)
  check('svg-sem-nan-infinity-undefined', bad.len > 0 && !bad.nan && !bad.inf && !bad.undef, bad)

  // (4) Uma piscada observada em ate 9 s.
  const blink = await page.evaluate(WAIT_BLINK(9000))
  check('piscada-observada-em-9s', blink.changed, blink)

  check('sem-excecoes-nem-console-error', collected.exceptions.length === 0 && collected.consoleErrors.length === 0, {
    exceptions: [...collected.exceptions],
    consoleErrors: [...collected.consoleErrors],
  })
  return results
}

async function main() {
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
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: seedSource() })

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

    let all
    try {
      all = await runChecks(page, collected)
    } catch (err) {
      // Mostra o que a pagina reportou antes da falha: ajuda a achar a tela quebrada.
      console.error(JSON.stringify({ exceptions: collected.exceptions, consoleErrors: collected.consoleErrors }))
      throw err
    }
    const failed = all.filter((r) => !r.ok)
    console.log(JSON.stringify({ summary: true, total: all.length, failed: failed.length, failedChecks: failed.map((r) => r.check) }))
    console.log(`FALHAS ${failed.length}`)
    return failed.length > 0 ? 1 : 0
  } finally {
    page?.close()
    if (chrome) await chrome.close()
    if (vite) await vite.stop()
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`vintem: falha do script: ${err.message}`)
    process.exit(2)
  },
)
