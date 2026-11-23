#!/usr/bin/env node
// Executor CDP da pagina de teste oculta do Vintem (D-17, MASC-06) em Chrome sem janela e modo MOCK.
// Abre /vintem-teste a 360x640 e confere montagem, olhos, ausencia de NaN e de excecao, e a piscada.
// So dados ficticios do seed; Vite e Chrome em 127.0.0.1; perfil temporario removido no fim; nada e
// lido de .env*.
// Com --test abre /vintem-teste?test&w=360, espera o autoteste por pixels (window.__done), imprime o
// relatorio dele e soma as falhas as das verificacoes da pagina.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/vintem.mjs [--test]
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma
// verificacao falhou, 2 falha do script.
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5197
const ORIGIN = `http://127.0.0.1:${PORT}`
const ROUTE = '/vintem-teste?w=360'
const TEST_ROUTE = '/vintem-teste?test&w=360'
const WITH_TEST = process.argv.includes('--test')
const SELFTEST_WAIT_MS = 90000
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


/** Espera uma condicao dentro da pagina por ate `ms`; devolve { ok, ms }. */
const WAIT_FOR = (cond, ms) => `new Promise((resolve) => {
  const t0 = performance.now()
  const timer = setInterval(() => {
    let ok = false
    try { ok = Boolean(${cond}) } catch { ok = false }
    const spent = Math.round(performance.now() - t0)
    if (ok) { clearInterval(timer); resolve({ ok: true, ms: spent }) }
    else if (spent > ${ms}) { clearInterval(timer); resolve({ ok: false, ms: spent }) }
  }, 50)
})`

/** Atributo `display` de um filho do palco por sufixo de id. */
const DISPLAY_OF = (suffix) => `(() => {
  const svg = ${STAGE_SVG}
  const el = svg && svg.querySelector('[id$="-${suffix}"]')
  return el ? el.getAttribute('display') : null
})()`

/** Escolhe uma opcao do Select (versao movel: botao e lista), clicando como o usuario. */
const PICK_SELECT_OPTION = (selectId, label) => `(() => {
  const hidden = document.getElementById(${JSON.stringify(selectId)})
  const trigger = hidden && hidden.nextElementSibling
  if (!trigger) return 'sem-gatilho'
  trigger.click()
  return 'aberto'
})()`

const CLICK_OPTION = (label) => `(() => {
  const opts = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === ${JSON.stringify(label)} && b.classList.contains('min-h-11'))
  if (opts.length === 0) return false
  opts[0].click()
  return true
})()`

/** Move o controle de limite como o navegador faria (setter nativo e evento input). */
const SET_RANGE = (value) => `(() => {
  const el = document.getElementById('vt-pct')
  if (!el) return false
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(String(value))})
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
})()`

const CLICK_BY_ID = (id) => `(() => { const el = document.getElementById(${JSON.stringify(id)}); if (!el) return false; el.click(); return true })()`

const CLICK_BY_TEXT = (text) => `(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(text)})
  if (!b) return false
  b.click()
  return true
})()`

/** Alvos de toque menores que 43,5 px entre os controles visiveis da pagina. */
const SMALL_TARGETS = `(() => {
  const out = []
  for (const el of document.querySelectorAll('button, a[href], input, select, [role="switch"], [role="tab"]')) {
    if (el.closest('[aria-hidden="true"], .sr-only')) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.width < 43.5 || r.height < 43.5) {
      out.push({ tag: el.tagName.toLowerCase(), id: el.id || null, text: (el.textContent || '').trim().slice(0, 24), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 })
    }
  }
  return out
})()`

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

/** Registra verificacoes: uma linha JSON por resultado. */
function makeChecker() {
  const results = []
  const check = (name, ok, detail = {}) => {
    const line = { check: name, ok: Boolean(ok), ...detail }
    results.push(line)
    console.log(JSON.stringify(line))
  }
  return { results, check }
}

/** Celular de 360 por 640 com toque. */
async function setupViewport(page) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
}

/**
 * Autoteste por pixels da pagina (?test): espera `window.__done`, imprime o relatorio e conta como falha
 * cada linha que comeca com `FALHA:`. A pagina so carrega o modulo do autoteste com o parametro.
 */
async function runSelfTestChecks(page, collected) {
  const { results, check } = makeChecker()
  await setupViewport(page)
  collected.exceptions.length = 0
  collected.consoleErrors.length = 0
  await navigate(page, `${ORIGIN}${TEST_ROUTE}`)

  const done = await page.evaluate(WAIT_FOR('window.__done === true', SELFTEST_WAIT_MS))
  check('autoteste-termina-no-prazo', done.ok, { ...done, limitMs: SELFTEST_WAIT_MS })
  const text = await page.evaluate(`document.getElementById('selftest')?.textContent ?? ''`)
  const lines = String(text).split('\n').filter((l) => l.trim() !== '')
  for (const line of lines) console.log(`autoteste: ${line}`)
  const failed = lines.filter((l) => l.startsWith('FALHA:'))
  for (const line of failed) check(`autoteste: ${line.slice(0, 160)}`, false)
  const last = lines[lines.length - 1] ?? ''
  check('autoteste-fecha-em-FALHAS-n', last === `FALHAS ${failed.length}` && lines.length > 1, { last, falhas: failed.length })
  const title = await page.evaluate('document.title')
  check('autoteste-ajusta-o-titulo', title === `Vintem teste FALHAS ${failed.length}`, { title })
  check('autoteste-sem-excecoes-nem-console-error', collected.exceptions.length === 0 && collected.consoleErrors.length === 0, {
    exceptions: [...collected.exceptions],
    consoleErrors: [...collected.consoleErrors],
  })
  await runRestChecks(page, collected, check)
  return results
}

/** Observa a pagina por `ms` e devolve as mutacoes de nos fora do svg do Vintem (os atributos mudam por quadro de proposito). */
const OBSERVE_IDLE = (ms) => `new Promise((resolve) => {
  const seen = []
  const inVintem = (n) => { const el = n.nodeType === 1 ? n : n.parentElement; return Boolean(el && el.closest('svg.vt')) }
  const obs = new MutationObserver((records) => {
    for (const r of records) {
      if (inVintem(r.target)) continue
      seen.push({ type: r.type, target: r.target.nodeName, added: r.addedNodes.length, removed: r.removedNodes.length })
    }
  })
  obs.observe(document.body, { childList: true, subtree: true, characterData: true })
  setTimeout(() => { obs.disconnect(); resolve(seen.slice(0, 10)) }, ${ms})
})`

/** Valores distintos do atributo da cobertura da palpebra durante `ms`. */
const LID_VALUES = (ms) => `new Promise((resolve) => {
  const read = () => { const e = document.querySelector('svg.vt [id$="-eL"] [data-e="lb"]'); return e ? e.getAttribute('y') : null }
  const seen = new Set([read()])
  const t0 = performance.now()
  const timer = setInterval(() => {
    seen.add(read())
    if (performance.now() - t0 >= ${ms}) { clearInterval(timer); resolve([...seen]) }
  }, 50)
})`

/** Liga ou desliga a midia de movimento reduzido do proprio navegador (nao o interruptor da pagina). */
const setReducedMedia = (page, on) =>
  page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' }] })

/**
 * Repouso sem re-render e movimento reduzido real (UI-SPEC "Movimento reduzido", testes 7 e 14): com a pagina
 * parada nenhum no muda fora do svg do Vintem em 3 s; com a midia emulada a palpebra fica parada por 6 s, as
 * expressoes ainda mudam e o perfil aparece de imediato; sem a midia a palpebra muda em ate 9 s.
 */
async function runRestChecks(page, collected, check) {
  // (a) repouso: a pagina do autoteste ja terminou e nada mais deve mexer nos nos fora do svg
  await sleep(500)
  const idle = await page.evaluate(OBSERVE_IDLE(3000))
  check('repouso-sem-mudanca-de-nos-fora-do-svg-em-3s', idle.length === 0, { mutations: idle })

  // (b) movimento reduzido real: a midia e emulada e a pagina de teste recarregada
  collected.exceptions.length = 0
  collected.consoleErrors.length = 0
  await setReducedMedia(page, true)
  await navigate(page, `${ORIGIN}${ROUTE}`)
  const media = await page.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`)
  check('midia-de-movimento-reduzido-emulada', media === true, { media })
  await sleep(1200)
  const lids = await page.evaluate(LID_VALUES(6000))
  check('midia-reduzida-segura-a-palpebra-por-6s', lids.length === 1, { values: lids })

  await page.evaluate(PICK_SELECT_OPTION('vt-state', 'Triste'))
  await sleep(150)
  const clickedTriste = await page.evaluate(CLICK_OPTION('Triste'))
  const tear = await page.evaluate(WAIT_FOR(`(() => { const e = document.querySelector('svg.vt [id$="-tear"]'); return e && e.getAttribute('display') === 'inline' })()`, 3000))
  check('midia-reduzida-ainda-muda-a-expressao', clickedTriste && tear.ok, { clickedTriste, ...tear })

  await page.evaluate(CLICK_BY_ID('vt-turn'))
  const profile = await page.evaluate(WAIT_FOR(`document.querySelector('svg.vt [id$="-side"]')?.getAttribute('display') === 'inline'`, 500))
  check('midia-reduzida-mostra-o-perfil-de-imediato', profile.ok, profile)

  // (c) sem a midia a palpebra volta a mudar em ate 9 s
  await setReducedMedia(page, false)
  await navigate(page, `${ORIGIN}${ROUTE}`)
  const blink = await page.evaluate(WAIT_BLINK(9000))
  check('sem-a-midia-a-palpebra-muda-em-ate-9s', blink.changed, blink)
  check('repouso-e-midia-sem-excecoes-nem-console-error', collected.exceptions.length === 0 && collected.consoleErrors.length === 0, {
    exceptions: [...collected.exceptions],
    consoleErrors: [...collected.consoleErrors],
  })
}

/** Roda todas as verificacoes e devolve a lista de resultados. */
async function runChecks(page, collected) {
  const { results, check } = makeChecker()

  await setupViewport(page)
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

  // (4b) Cartoes novos: grade de 7 estados em 84 px, medidor real com Vintem no slot e balao ainda sem fala.
  const cards = await page.evaluate(`(() => {
    const titles = [...document.querySelectorAll('section h2')].map((h) => h.textContent.trim())
    const section = (t) => [...document.querySelectorAll('section')].find((x) => x.querySelector('h2')?.textContent.trim() === t)
    const grid = section('Sete estados em 84px')
    const gridBtns = grid ? [...grid.querySelectorAll('button')] : []
    const gridArt = gridBtns.map((b) => { const r = b.querySelector('svg.vt')?.getBoundingClientRect(); return r ? Math.round(r.width) : 0 })
    const gaugeSvg = section('No medidor')?.querySelector('svg.vt')
    const gaugeBox = gaugeSvg ? Math.round(gaugeSvg.getBoundingClientRect().width) : 0
    const inGauge = Boolean(gaugeSvg && gaugeSvg.closest('div.rounded-full'))
    const balloonCard = section('Balão de fala')
    return {
      titles,
      gridCount: gridBtns.length,
      gridArt,
      pressed: gridBtns.filter((b) => b.getAttribute('aria-pressed') === 'true').length,
      gaugeBox,
      inGauge,
      balloonLegend: balloonCard?.textContent.includes('Toque em Falar para ouvir uma fala') ?? false,
      balloonButtons: balloonCard ? balloonCard.querySelectorAll('button').length : -1,
    }
  })()`)
  const wantTitles = ['Vintém grande', 'Controles', 'Sete estados em 84px', 'No medidor', 'Balão de fala']
  check('cinco-cartoes-na-ordem-do-contrato', JSON.stringify(cards.titles) === JSON.stringify(wantTitles), { titles: cards.titles })
  check(
    'grade-de-sete-estados-em-84px',
    cards.gridCount === 7 && cards.gridArt.every((w) => w === 84) && cards.pressed === 1,
    { gridCount: cards.gridCount, gridArt: cards.gridArt, pressed: cards.pressed },
  )
  check('arcgauge-real-com-vintem-84-no-slot', cards.gaugeBox === 84 && cards.inGauge, { gaugeBox: cards.gaugeBox, inGauge: cards.inGauge })
  check('balao-sem-fala-mostra-so-a-legenda', cards.balloonLegend && cards.balloonButtons === 0, {
    balloonLegend: cards.balloonLegend,
    balloonButtons: cards.balloonButtons,
  })

  // (5) Estado pelo Select: "Triste" liga a lagrima.
  await page.evaluate(PICK_SELECT_OPTION('vt-state', 'Triste'))
  await sleep(150)
  const clickedTriste = await page.evaluate(CLICK_OPTION('Triste'))
  const tear = await page.evaluate(WAIT_FOR(`(() => { const e = document.querySelector('svg.vt [id$="-tear"]'); return e && e.getAttribute('display') === 'inline' })()`, 3000))
  check('select-triste-liga-a-lagrima', clickedTriste && tear.ok, { clickedTriste, ...tear })

  // (6) Controle de limite em 120 leva ao bravo (acessorio de raiva).
  const moved = await page.evaluate(SET_RANGE(120))
  const anger = await page.evaluate(WAIT_FOR(`(() => { const e = document.querySelector('svg.vt [id$="-anger"]'); return e && e.getAttribute('display') === 'inline' })()`, 3000))
  const pctText = await page.evaluate(`document.querySelector('label[for="vt-pct"]')?.nextElementSibling?.textContent?.trim() ?? ''`)
  check('limite-120-da-estado-bravo', moved && anger.ok && pctText === '120%', { moved, ...anger, pctText: pctText.slice(0, 40) })

  // (7) Falar mostra um texto nao vazio.
  const clickedFalar = await page.evaluate(CLICK_BY_TEXT('Falar'))
  await sleep(200)
  const speech = await page.evaluate(`document.getElementById('vt-speech')?.textContent?.trim() ?? ''`)
  check('falar-mostra-texto', clickedFalar && speech.length > 0, { clickedFalar, speech: speech.slice(0, 80) })

  // (7b) Balao de fala: aparece com a fala, pop de mola por onFrame e texto simples dentro de aria-hidden.
  const pop = await page.evaluate(`new Promise((resolve) => {
    const falar = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Falar')
    falar.click()
    const grab = () => document.querySelector('button[aria-label="Dispensar fala do Vintém"]')
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = grab()
      if (!el) { resolve({ found: false }); return }
      const early = { opacity: el.style.opacity, transform: el.style.transform, origin: el.style.transformOrigin }
      const t0 = performance.now()
      const timer = setInterval(() => {
        const e = grab()
        const settled = e && e.style.transform === 'none' && e.style.opacity === '1'
        const spent = Math.round(performance.now() - t0)
        if (settled || spent > 3000) {
          clearInterval(timer)
          const hiddenText = e ? e.querySelector('span[aria-hidden="true"]')?.textContent ?? '' : ''
          resolve({ found: true, early, settled: Boolean(settled), ms: spent, hiddenText: hiddenText.slice(0, 60), height: e ? Math.round(e.getBoundingClientRect().height) : 0, rowBtn: Boolean(document.querySelector('button[aria-label="Vintém, toque para ouvir uma fala"]')) })
        }
      }, 50)
    }))
  })`)
  const animating = pop.found && (Number(pop.early.opacity) < 1 || /scale/.test(pop.early.transform))
  check('balao-aparece-com-pop-e-assenta', pop.found && animating && pop.settled && pop.hiddenText.length > 0 && pop.rowBtn && pop.height >= 48, pop)

  // (8) Girar de lado: o perfil aparece em ate 2 s e a frente volta ao desligar.
  await page.evaluate(CLICK_BY_ID('vt-turn'))
  const profile = await page.evaluate(WAIT_FOR(`document.querySelector('svg.vt [id$="-side"]')?.getAttribute('display') === 'inline'`, 2000))
  check('girar-de-lado-mostra-o-perfil-em-2s', profile.ok, profile)
  await page.evaluate(CLICK_BY_ID('vt-turn'))
  const front = await page.evaluate(WAIT_FOR(`document.querySelector('svg.vt [id$="-side"]')?.getAttribute('display') === 'none'`, 3000))
  check('girar-de-lado-desligado-volta-a-frente', front.ok, front)

  // (9) Layout: sem rolagem horizontal e nenhum alvo de toque menor que 43,5 px.
  const scroll = await page.evaluate(`({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth })`)
  check('sem-rolagem-horizontal-a-360', scroll.sw <= scroll.cw && scroll.bw <= scroll.cw, scroll)
  const small = await page.evaluate(SMALL_TARGETS)
  check('nenhum-alvo-de-toque-menor-que-43-5', small.length === 0, { small })

  // (9b) Tocar no balao o dispensa e a legenda volta.
  const dismissed = await page.evaluate(`(() => {
    const el = document.querySelector('button[aria-label="Dispensar fala do Vintém"]')
    if (!el) return { had: false }
    el.click()
    return { had: true }
  })()`)
  await sleep(200)
  const after = await page.evaluate(`({ gone: !document.querySelector('button[aria-label="Dispensar fala do Vintém"]'), legend: document.body.textContent.includes('Toque em Falar para ouvir uma fala') })`)
  check('balao-dispensa-ao-tocar', dismissed.had && after.gone && after.legend, { ...dismissed, ...after })

  // (10) Movimento reduzido: a cobertura da palpebra fica parada por 6 s.
  await page.evaluate(CLICK_BY_ID('vt-reduced'))
  await sleep(1200)
  const lids = await page.evaluate(`new Promise((resolve) => {
    const read = () => { const e = document.querySelector('svg.vt [id$="-eL"] [data-e="lb"]'); return e ? e.getAttribute('y') : null }
    const seen = new Set([read()])
    const t0 = performance.now()
    const timer = setInterval(() => {
      seen.add(read())
      if (performance.now() - t0 >= 6000) { clearInterval(timer); resolve([...seen]) }
    }, 50)
  })`)
  check('movimento-reduzido-segura-a-palpebra-por-6s', lids.length === 1, { values: lids })

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
      all = WITH_TEST ? await runSelfTestChecks(page, collected) : []
      all = [...all, ...(await runChecks(page, collected))]
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
