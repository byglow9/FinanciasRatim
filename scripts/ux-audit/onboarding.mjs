#!/usr/bin/env node
// Executor CDP do onboarding de quatro telas (planos 05-14 e 05-23, IDEN-08, IDEN-03, IDEN-06, D-11, D-12, D-17,
// D-20 a D-22, sketch 029) em Chrome sem janela e modo MOCK, a 360x640, 390x844 e 360x560 com toque. Vite e Chrome
// so em 127.0.0.1 (porta 5193); so dados ficticios do seed; nada e lido de .env*; perfil temporario do Chrome removido.
// Em MOCK o app abre logado e grava a marca coinc:onboarding:v1 em silencio (P-05). O onboarding e alcancado por
// /configuracoes: remove a marca e toca em "Sair da conta".
// Cenarios: portao (smoke); medidas das quatro telas; roteiro de cada cena em movimento normal (Vintem unico e
// decorativo, estado final, aneis e lente, digitacao); simetria dos olhos; prints por tema; movimento reduzido;
// tela de adicionar (aparelho por agente de usuario, passos, avanco unico, evento do navegador, modo app); as quatro
// saidas; replay em Ajustes; tema escuro; armazenamento que lanca; aviso de endereco novo; capturas para o dono.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/onboarding.mjs [--smoke]
// `--smoke` roda so o cenario do portao (primeira abertura sem sessao mostra a tela 1 e Pular leva ao Login).
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma verificacao
// falhou, 2 falha do script. Capturas em .planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/
// onboarding-novo-* (pasta ignorada pelo git).
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
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
    if (opts.ua) {
      await page.send('Network.setUserAgentOverride', { userAgent: opts.ua, ...(opts.platform ? { platform: opts.platform } : {}) })
    }
    if (opts.standalone) {
      // O Chrome aceita display-mode em setEmulatedMedia mas nao o aplica; a consulta tambem e forcada na pagina.
      await page.send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'display-mode', value: 'standalone' },
          { name: 'prefers-reduced-motion', value: opts.reduced ? 'reduce' : 'no-preference' },
        ],
      })
      await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          const orig = window.matchMedia.bind(window)
          window.matchMedia = (q) => {
            const mq = orig(q)
            if (!/display-mode:\\s*standalone/.test(String(q))) return mq
            return new Proxy(mq, { get(t, p) { if (p === 'matches') return true; const v = t[p]; return typeof v === 'function' ? v.bind(t) : v } })
          }
        })()`,
      })
    }
    // O localStorage do Chrome sobrevive entre as abas: o tema claro e gravado por padrao para o escuro nao vazar.
    const seed = { 'coinc:tema:v1': 'claro', ...buildSeed('full', new Date()), ...(opts.seed ?? {}) }
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
const CAPTURES = fileURLToPath(new URL('../../.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/', import.meta.url))
// Plano 05-23: quatro telas (S29-09, sketch 029).
const T = ['Seu mês, num número', 'Um teto por categoria', 'Tudo no calendário', 'Coinc na tela inicial']
const SAYS = [
  'Oi, eu sou o OINC! Eu cuido das suas contas e digo quanto ainda dá para gastar no mês.',
  'Dê um teto para cada categoria. Se você chegar perto, eu aviso antes de estourar.',
  'As contas fixas e os eventos ficam no calendário. Eu aviso antes de vencer.',
]
const SAY1 = SAYS[0]
const FINAL = ['neutro', 'atento', 'feliz']
const PRINT = ['home', 'limites', 'calendario', 'home']
const T1 = T[0]
const LAST = T.length - 1
const ALREADY_APP = 'Você já está usando o Coinc como app.'
const ADDED = 'Adicionado. Procure o ícone do Coinc na tela inicial.'
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DIALOG = `document.querySelector('[role="dialog"][aria-label="Apresentação do Coinc"]')`
const ROOT = `(document.querySelector('main') || ${DIALOG})`
const REGION = `${ROOT}.querySelector('.overflow-y-auto')`

const READY_APP = `document.getElementById('root')?.children.length > 0`
const btn = (text) => `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(text)})`
const click = (page, text) => page.evaluate(`(() => { const b = ${btn(text)}; if (!b) return false; b.click(); return true })()`)
const readKey = (page) => page.evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`)
const h1Text = `document.querySelector('h1')?.textContent.trim()`
const ROW = `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Rever a apresentação'))`
const STAGE = `${ROOT}.querySelector('[data-scene]')`

async function pressKey(page, key, vk, modifiers = 0) {
  const base = { key, code: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers }
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}

/** Em MOCK o app abre logado: remove a marca, vai a /configuracoes e toca em Sair da conta. */
async function reachOnboarding(page, navigate) {
  await navigate('/configuracoes', `${LOGOUT}`)
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`)
  await page.evaluate(`(() => { const b = ${LOGOUT}; b.focus(); b.click() })()`)
  return until(page, `${h1Text} === ${JSON.stringify(T1)}`, 6000)
}

/** Vai para a tela `n` (0 a 3) tocando Continuar; devolve o instante em que a cena montou. */
async function goTo(page, n) {
  const current = await page.evaluate(`${h1Text}`)
  let at = T.indexOf(current)
  let t0 = Date.now()
  while (at < n) {
    await click(page, 'Continuar')
    t0 = Date.now()
    at += 1
    await until(page, `${h1Text} === ${JSON.stringify(T[at])}`, 3000)
  }
  await sleep(350)
  return t0
}

/** Espera ate `ms` depois de `t0`. */
async function waitSince(t0, ms) {
  const left = t0 + ms - Date.now()
  if (left > 0) await sleep(left)
}

/** Medidas da tela aberta: rolagens, barra, rodape e alvos de toque. */
function readLayout() {
  return `(() => {
    const doc = document.documentElement
    const root = ${ROOT}
    const region = ${REGION}
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && (typeof el.checkVisibility === 'function' ? el.checkVisibility({ visibilityProperty: true }) : true)
    }
    const small = []
    for (const el of root.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="radio"], input, select, textarea')) {
      if (!visible(el) || el.closest('[aria-hidden="true"]')) continue
      const r = el.getBoundingClientRect()
      if (r.width >= 43.5 && r.height >= 43.5) continue
      small.push({ text: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 })
    }
    const bar = root.querySelector('button')
    const footer = root.querySelector('.sticky')
    return {
      innerHeight: window.innerHeight,
      docScrollHeight: doc.scrollHeight,
      bodyScrollHeight: document.body.scrollHeight,
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      regionScrollHeight: region.scrollHeight,
      regionClientHeight: region.clientHeight,
      regionScrollWidth: region.scrollWidth,
      regionClientWidth: region.clientWidth,
      overflowY: getComputedStyle(region).overflowY,
      overflowX: getComputedStyle(region).overflowX,
      barTop: Math.round(bar.getBoundingClientRect().top),
      footerBottom: Math.round(footer.getBoundingClientRect().bottom),
      small,
    }
  })()`
}

/** Retangulos do balao, do celular, do palco e do rodape (para dentro da janela e sem encostar nos pontos). */
const READ_GEOMETRY = `(() => {
  const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom } }
  const root = ${ROOT}
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    footer: box(root.querySelector('.sticky')),
    stage: box(root.querySelector('.onb-stage, .onb-install')),
    bubble: box(root.querySelector('[data-say]')),
    phone: box(root.querySelector('.onb-phone')),
    dots: box(root.querySelector('.sticky [aria-hidden="true"]')),
  }
})()`

/** Estado do Vintem de entrada da cena: olhos (elipse e palpebra de cada lado) e marcas de acessibilidade. */
const READ_VINTEM = `(() => {
  const all = document.querySelectorAll('main svg.vt.vt-entrada, [role="dialog"] svg.vt.vt-entrada')
  const svg = all[0]
  if (!svg) return null
  const eye = (side) => {
    const g = svg.querySelector('[id$="-e' + side + '"]')
    const ring = g.querySelector('[data-e="ring"]')
    const up = g.querySelector('[data-e="up"]')
    return { rx: Number(ring.getAttribute('rx')), ry: Number(ring.getAttribute('ry')), upY: Number(up.getAttribute('y')) }
  }
  return {
    count: all.length,
    hidden: !!svg.closest('[aria-hidden="true"]'),
    tabindex: svg.getAttribute('tabindex'),
    focusable: svg.getAttribute('focusable'),
    L: eye('L'),
    R: eye('R'),
  }
})()`

/** Estado da cena: estado do Vintem, fala digitada, aneis e lente. */
const READ_SCENE = `(() => {
  const st = ${STAGE}
  if (!st) return null
  const say = st.querySelector('[data-say]')
  const full = st.querySelector('[data-say-full]')
  const typed = st.querySelector('[data-say-typed]')
  const layer = st.querySelector('.onb-layer')
  const lr = layer ? layer.getBoundingClientRect() : null
  const rel = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - lr.left) / lr.width, y: (r.top - lr.top) / lr.height, w: r.width / lr.width, h: r.height / lr.height } }
  const lens = st.querySelector('[data-lens]')
  const bar = lens ? lens.querySelector('[role="progressbar"]') : null
  return {
    scene: st.getAttribute('data-scene'),
    state: st.getAttribute('data-vintem-state'),
    fullText: full ? full.textContent.trim() : null,
    typedText: typed ? typed.textContent : null,
    typedAttr: say ? Number(say.getAttribute('data-typed')) : null,
    rings: [...st.querySelectorAll('[data-ring]')].map((r) => ({ name: r.getAttribute('data-ring'), on: r.getAttribute('data-on') === 'true', ...(lr ? rel(r) : {}) })),
    lens: lens ? { on: lens.getAttribute('data-on') === 'true', pct: Number(lens.getAttribute('data-pct')), now: bar ? Number(bar.getAttribute('aria-valuenow')) : null, ...(lr ? rel(lens) : {}) } : null,
    img: st.querySelector('img') ? { loaded: st.querySelector('img').complete && st.querySelector('img').naturalWidth > 0, src: st.querySelector('img').currentSrc } : null,
  }
})()`

const near = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol

// cenario 0 (smoke): portao, tela 1 nova e Pular.
async function scenarioGate({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('portao-sem-sessao-e-sem-marca-mostra-a-tela-1', reached, {})
  if (!reached) return
  const buttons = await page.evaluate(`[...document.querySelectorAll('main button')].filter((b) => b.checkVisibility({ visibilityProperty: true })).map((b) => (b.getAttribute('aria-label') || b.textContent).trim())`)
  check('portao-botoes-pular-e-continuar-sem-voltar-visivel', buttons.includes('Pular') && buttons.includes('Continuar') && !buttons.includes('Voltar'), { buttons })
  const t1 = await page.evaluate(`(() => {
    const img = document.querySelector('main img')
    const say = document.querySelector('[data-say-full]')
    return {
      h1: ${h1Text},
      vintems: document.querySelectorAll('main svg.vt.vt-entrada').length,
      imgLoaded: !!img && img.complete && img.naturalWidth > 0,
      imgSrc: img ? img.currentSrc : null,
      say: say ? say.textContent.trim() : null,
      sayHidden: !!say && say.classList.contains('sr-only'),
      dots: document.querySelectorAll('main .sticky [aria-hidden="true"] > span').length,
      step: document.querySelector('main p.sr-only')?.textContent.trim() ?? null,
    }
  })()`)
  check('portao-tela-1-titulo-seu-mes-num-numero', t1.h1 === T1, t1)
  check('portao-tela-1-um-so-vintem-de-entrada', t1.vintems === 1, t1)
  check('portao-tela-1-print-carregado-com-o-nome-do-tema', t1.imgLoaded && /home-claro/.test(t1.imgSrc ?? ''), t1)
  check('portao-tela-1-fala-completa-em-sr-only', t1.say === SAY1 && t1.sayHidden, t1)
  check('portao-tela-1-quatro-pontos-e-passo-1-de-4', t1.dots === 4 && t1.step === 'Passo 1 de 4', t1)
  check('portao-nao-grava-a-marca-ao-montar', (await readKey(page)) === null, {})
  check('portao-sem-login-por-tras', !(await page.evaluate(`!!${FORM}`)), {})
  await click(page, 'Pular')
  const login = await until(page, FORM, 4000)
  check('pular-leva-ao-login', login, {})
  check('pular-grava-a-marca', (await readKey(page)) === '1', { key: await readKey(page) })
}

/** Cenario 1: medidas de cada tela: sem rolagem horizontal, so a regiao do meio rola, alvos, balao e celular na janela. */
async function scenarioLayout({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  // O tamanho real so vale depois da navegacao (a pagina em branco usa a janela larga padrao).
  const vp = await page.evaluate(`({ w: window.innerWidth, h: window.innerHeight })`)
  const label = `${vp.w}x${vp.h}`
  check(`cenario-1-onboarding-aparece-${label}`, reached, {})
  if (!reached) return
  for (let n = 0; n < T.length; n++) {
    await goTo(page, n)
    const m = await page.evaluate(readLayout())
    const g = await page.evaluate(READ_GEOMETRY)
    const id = `cenario-1-tela-${n + 1}`
    check(`${id}-sem-rolagem-do-corpo-${label}`, m.docScrollHeight <= m.innerHeight && m.bodyScrollHeight <= m.innerHeight, m)
    check(`${id}-sem-rolagem-horizontal-${label}`, m.docScrollWidth <= m.docClientWidth && m.regionScrollWidth <= m.regionClientWidth && m.overflowX !== 'scroll', m)
    check(`${id}-regiao-do-meio-rola-so-na-vertical-${label}`, m.overflowY === 'auto', { overflowY: m.overflowY })
    check(`${id}-alvos-de-pelo-menos-43.5px-${label}`, m.small.length === 0, { small: m.small })
    if (n < 3 && vp.h >= 640) {
      check(`${id}-cabe-sem-rolagem-${label}`, m.regionScrollHeight <= m.regionClientHeight + 1, { scrollHeight: m.regionScrollHeight, clientHeight: m.regionClientHeight })
    }
    if (n < 3) {
      check(`${id}-balao-inteiro-dentro-da-janela-${label}`, g.bubble && g.bubble.l >= 0 && g.bubble.r <= g.vw && g.bubble.t >= 0 && g.bubble.b <= g.footer.t, g)
      check(`${id}-celular-dentro-da-janela-e-sem-passar-dos-pontos-${label}`, g.phone && g.phone.l >= 0 && g.phone.r <= g.vw && Math.min(g.phone.b, g.stage.b) <= g.dots.t + 1, g)
    } else {
      check(`${id}-celular-dentro-da-janela-${label}`, g.phone && g.phone.l >= 0 && g.phone.r <= g.vw, g)
    }
    if (m.regionScrollHeight > m.regionClientHeight) {
      // Rolando a regiao ate o fim, a barra e o rodape nao se mexem e o corpo continua parado.
      await page.evaluate(`${REGION}.scrollTop = ${REGION}.scrollHeight`)
      await sleep(150)
      const after = await page.evaluate(readLayout())
      check(`${id}-barra-e-rodape-parados-${label}`, after.barTop === m.barTop && after.footerBottom === m.footerBottom && after.footerBottom <= after.innerHeight, { before: [m.barTop, m.footerBottom], after: [after.barTop, after.footerBottom] })
      check(`${id}-corpo-parado-ao-rolar-${label}`, after.docScrollHeight <= after.innerHeight, after)
      await page.evaluate(`${REGION}.scrollTop = 0`)
    }
  }
}

// cenario 2 e 3: foco, Voltar, passo para leitor de tela, roteiro de cada cena e simetria dos olhos (movimento normal).
async function scenarioScript({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-2-onboarding-aparece', reached, {})
  if (!reached) return
  const back = await page.evaluate(`(() => {
    const b = [...document.querySelectorAll('main button')].find((x) => x.textContent.trim() === 'Voltar')
    const cs = getComputedStyle(b)
    b.focus()
    return { visibility: cs.visibility, focused: document.activeElement === b }
  })()`)
  check('cenario-2-voltar-invisivel-e-fora-do-foco-na-tela-1', back.visibility === 'hidden' && !back.focused, back)

  for (let n = 0; n < 3; n++) {
    const t0 = n === 0 ? Date.now() - 600 : await goTo(page, n)
    const id = `cenario-2-tela-${n + 1}`
    const s = await page.evaluate(`(() => {
      const h1 = document.querySelector('h1')
      const desc = document.getElementById(h1.getAttribute('aria-describedby') || '')
      const full = document.querySelector('[data-say-full]')
      return {
        focused: document.activeElement === h1,
        tabindex: h1.getAttribute('tabindex'),
        step: desc ? desc.textContent.trim() : null,
        stepSrOnly: !!desc && desc.classList.contains('sr-only'),
        fullText: full ? full.textContent.trim() : null,
        pular: !!(${btn('Pular')}),
        dots: document.querySelectorAll('main .sticky [aria-hidden="true"] > span').length,
        onDot: [...document.querySelectorAll('main .sticky [aria-hidden="true"] > span')].findIndex((d) => d.className.includes('w-5')),
        balloons: document.querySelectorAll('[data-vintem-balloon]').length,
        cardBehind: !!document.querySelector('main .rounded-card.bg-card svg.vt'),
        anim: getComputedStyle(document.querySelector('.anim-onboarding-in')).animationDuration,
      }
    })()`)
    check(`${id}-foco-no-titulo`, s.focused && s.tabindex === '-1', { focused: s.focused, tabindex: s.tabindex })
    check(`${id}-passo-${n + 1}-de-4-sr-only-ligado-ao-titulo`, s.step === `Passo ${n + 1} de 4` && s.stepSrOnly, { step: s.step })
    check(`${id}-quatro-pontos-e-o-da-tela-ativo`, s.dots === 4 && s.onDot === n, { dots: s.dots, onDot: s.onDot })
    check(`${id}-fala-completa-em-sr-only-na-montagem`, s.fullText === SAYS[n], { fullText: s.fullText })
    check(`${id}-tem-pular-e-nao-tem-painel-nem-balao-do-app`, s.pular && s.balloons === 0 && !s.cardBehind, s)
    check(`${id}-entrada-de-200ms`, s.anim === '0.2s', { anim: s.anim })

    // Cerca de 2,5 s depois da montagem a fala esta sendo digitada (prefixo menor que o texto inteiro).
    await waitSince(t0, 2500)
    const mid = await page.evaluate(READ_SCENE)
    check(`${id}-fala-digitando-em-2.5s`, mid && mid.typedText.length > 0 && mid.typedText.length < SAYS[n].length && SAYS[n].startsWith(mid.typedText), { typed: mid?.typedText })

    // Cerca de 9,5 s: o roteiro terminou.
    await waitSince(t0, 9500)
    const end = await page.evaluate(READ_SCENE)
    const v = await page.evaluate(READ_VINTEM)
    check(`${id}-um-so-vintem-de-entrada-aria-hidden-e-nao-focavel`, v !== null && v.count === 1 && v.hidden && v.tabindex === null, v ?? {})
    check(`${id}-estado-do-vintem-no-fim-${FINAL[n]}`, end.state === FINAL[n], { state: end.state })
    check(`${id}-fala-digitada-por-inteiro`, end.typedText === SAYS[n] && end.typedAttr === SAYS[n].length, { typed: end.typedText })
    check(`${id}-print-carregado-claro-${PRINT[n]}`, end.img.loaded && end.img.src.includes(PRINT[n]) && end.img.src.includes('claro'), end.img)
    if (n === 0) {
      const r = end.rings.find((x) => x.name === 'ring1')
      check(`${id}-anel-no-pode-gastar`, !!r && r.on && near(r.x, 40 / 390, 0.012) && near(r.y, 236 / 844, 0.012) && near(r.w, 310 / 390, 0.02), { rings: end.rings })
    } else if (n === 1) {
      check(`${id}-lente-em-82-por-cento-na-linha-de-alimentacao`, !!end.lens && end.lens.on && end.lens.pct === 82 && near(end.lens.now, 82, 1) && near(end.lens.y, 236 / 844, 0.012), { lens: end.lens })
    } else {
      const names = end.rings.map((r) => r.name).join(',')
      check(`${id}-quatro-aneis-do-calendario-em-cena`, names === 'd8,d14,d19,d23' && end.rings.every((r) => r.on), { rings: end.rings })
      const d8 = end.rings[0]
      check(`${id}-anel-do-dia-8-na-posicao-do-print`, near(d8.x, (36 - 29) / 390, 0.012) && near(d8.y, (316 - 25) / 844, 0.012), { d8 })
    }
    // Simetria dos olhos no neutro (tela 1) e no feliz (tela 3), com as elipses e as palpebras iguais.
    if (n === 0 || n === 2) {
      const d = (a, b) => Math.abs(a - b)
      check(`cenario-3-tela-${n + 1}-olhos-simetricos-${FINAL[n]}`, v !== null && d(v.L.rx, v.R.rx) <= 0.5 && d(v.L.ry, v.R.ry) <= 0.5 && d(v.L.upY, v.R.upY) <= 0.5, v ?? {})
    }
  }
  // Voltar devolve o foco ao titulo da tela anterior e nao grava a marca.
  await click(page, 'Voltar')
  await until(page, `${h1Text} === ${JSON.stringify(T[1])}`, 3000)
  await sleep(250)
  check('cenario-2-voltar-leva-o-foco-ao-titulo', await page.evaluate(`document.activeElement === document.querySelector('h1')`), {})
  check('cenario-2-voltar-nao-grava-a-marca', (await readKey(page)) === null, {})
  await click(page, 'Pular')
  const login = await until(page, FORM, 4000)
  check('cenario-2-pular-na-tela-2-leva-ao-login', login && (await readKey(page)) === '1', {})
}

// cenario 4: movimento reduzido: pose final, fala inteira, aneis e lente em cena, so fade, sem avanco automatico.
async function scenarioReduced({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-4-onboarding-aparece', reached, {})
  if (!reached) return
  const mm = await page.evaluate(`window.matchMedia('(prefers-reduced-motion: reduce)').matches`)
  check('cenario-4-movimento-reduzido-emulado', mm, {})
  for (let n = 0; n < 3; n++) {
    await goTo(page, n)
    const id = `cenario-4-tela-${n + 1}`
    const s = await page.evaluate(READ_SCENE)
    const a = await page.evaluate(`(() => {
      const wrap = document.querySelector('.anim-onboarding-in')
      const bubble = document.querySelector('[data-say]')
      const drop = document.querySelector('.onb-drop')
      const w = getComputedStyle(wrap)
      const b = getComputedStyle(bubble)
      const d = getComputedStyle(drop)
      const marker = (cs) => ({ name: cs.animationName, dur: parseFloat(cs.animationDuration), tr: cs.transform })
      return { wrap: marker(w), bubble: marker(b), drop: marker(d) }
    })()`)
    check(`${id}-nasce-na-pose-final-${FINAL[n]}`, s.state === FINAL[n], { state: s.state })
    check(`${id}-fala-inteira-sem-temporizador`, s.typedText === SAYS[n] && s.typedAttr === SAYS[n].length, { typed: s.typedText })
    if (n === 0) check(`${id}-anel-ja-em-cena`, s.rings.length === 1 && s.rings[0].on, { rings: s.rings })
    if (n === 1) check(`${id}-lente-ja-em-82`, !!s.lens && s.lens.on && s.lens.pct === 82, { lens: s.lens })
    if (n === 2) check(`${id}-quatro-aneis-ja-em-cena`, s.rings.length === 4 && s.rings.every((r) => r.on), { rings: s.rings })
    check(`${id}-entrada-de-no-maximo-0.101s-so-fade-sem-deslocamento`, [a.wrap, a.bubble, a.drop].every((x) => x.name === 'fade-100' && x.dur <= 0.101), a)
    check(`${id}-sem-deslocamento-no-fim-da-entrada`, [a.wrap, a.bubble, a.drop].every((x) => x.tr === 'none' || x.tr === 'matrix(1, 0, 0, 1, 0, 0)'), a)
    // Nada muda sozinho: 2 s depois o estado e a fala continuam iguais (nenhum temporizador de roteiro).
    await sleep(2000)
    const later = await page.evaluate(READ_SCENE)
    check(`${id}-nada-muda-sozinho`, later.state === s.state && later.typedText === s.typedText && later.rings.length === s.rings.length, { state: later.state })
  }
  await goTo(page, LAST)
  await sleep(9000)
  const step = await page.evaluate(`document.querySelector('[data-scene="ia"]').getAttribute('data-step')`)
  check('cenario-4-tela-4-sem-avanco-automatico', step === '0', { step })
  const m = await page.evaluate(readLayout())
  check('cenario-4-sem-rolagem-horizontal', m.docScrollWidth <= m.docClientWidth, m)
}

// cenario 5: tela de adicionar: aparelho pelo agente de usuario, passos, avanco automatico unico, evento do navegador.
async function scenarioInstall({ page, check, navigate }, expectPlatform) {
  const reached = await reachOnboarding(page, navigate)
  check(`cenario-5-${expectPlatform}-onboarding-aparece`, reached, {})
  if (!reached) return
  const t0 = await goTo(page, LAST)
  const id = `cenario-5-${expectPlatform}`
  const ctl = await page.evaluate(`(() => {
    const st = document.querySelector('[data-scene="ia"]')
    const tabs = [...st.querySelectorAll('[role="tab"]')]
    return { platform: st.getAttribute('data-platform'), selected: tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.textContent.trim(), group: !!st.querySelector('[role="tablist"][aria-label="Aparelho"]'), pressed: [...st.querySelectorAll('[role="group"][aria-label="Passos"] button')].map((b) => b.getAttribute('aria-pressed')), steps: [...st.querySelectorAll('[role="group"][aria-label="Passos"] button')].map((b) => b.textContent.trim().replace(/^\\d/, '')), h1: ${h1Text}, step: st.getAttribute('data-step') }
  })()`)
  check(`${id}-seletor-abre-no-aparelho-certo`, ctl.platform === expectPlatform && ctl.selected === (expectPlatform === 'iphone' ? 'iPhone' : 'Android') && ctl.group, ctl)
  check(`${id}-tres-passos-do-aparelho-com-aria-pressed`, ctl.pressed.join(',') === 'true,false,false' && ctl.steps.length === 3, ctl)
  const wanted = expectPlatform === 'iphone' ? ['Compartilhar, no Safari', 'Adicionar à Tela de Início', 'Toque em Adicionar'] : ['Abra o menu do Chrome', 'Adicionar à tela inicial', 'Confirme em Adicionar']
  check(`${id}-textos-dos-passos-do-sketch`, wanted.every((w, i) => ctl.steps[i] === w), ctl)
  check(`${id}-titulo-sem-a-palavra-instalar`, ctl.h1 === 'Coinc na tela inicial' && !(await page.evaluate(`/instal/i.test(document.body.innerText.replace(/Instalar app/g, ''))`)), ctl)

  if (expectPlatform === 'android') {
    // Avanco automatico unico: 1,2 s passo 1, 4,3 s passo 2, 7,4 s passo 3; depois para.
    await waitSince(t0, 5200)
    const s2 = await page.evaluate(`document.querySelector('[data-scene="ia"]').getAttribute('data-step')`)
    check(`${id}-avanco-automatico-no-passo-2-em-5s`, s2 === '1', { step: s2 })
    await waitSince(t0, 8400)
    const s3 = await page.evaluate(`document.querySelector('[data-scene="ia"]').getAttribute('data-step')`)
    check(`${id}-avanco-automatico-no-passo-3-em-8s`, s3 === '2', { step: s3 })
    await sleep(2500)
    const s4 = await page.evaluate(`document.querySelector('[data-scene="ia"]').getAttribute('data-step')`)
    check(`${id}-avanco-automatico-roda-uma-unica-vez`, s4 === '2', { step: s4 })
  }

  // Tocar num passo escolhe, move o marcador e mostra a folha daquele passo.
  const tapStep = (i) => page.evaluate(`document.querySelectorAll('[data-scene="ia"] [role="group"][aria-label="Passos"] button')[${i}].click()`)
  const read = () => page.evaluate(`(() => {
    const st = document.querySelector('[data-scene="ia"]')
    return { step: st.getAttribute('data-step'), sheet1: st.querySelector('[data-sheet="1"]').getAttribute('data-on'), sheet2: st.querySelector('[data-sheet="2"]').getAttribute('data-on'), marker: st.querySelector('.onb-marker').textContent.trim(), pressed: [...st.querySelectorAll('[role="group"][aria-label="Passos"] button')].map((b) => b.getAttribute('aria-pressed')).join(',') }
  })()`)
  await tapStep(1)
  await sleep(500)
  const p2 = await read()
  check(`${id}-passo-2-mostra-a-folha-do-menu-e-o-marcador-2`, p2.step === '1' && p2.sheet1 === 'true' && p2.sheet2 === 'false' && p2.marker === '2' && p2.pressed === 'false,true,false', p2)
  await tapStep(2)
  await sleep(500)
  const p3 = await read()
  check(`${id}-passo-3-mostra-a-confirmacao-e-o-marcador-3`, p3.step === '2' && p3.sheet1 === 'false' && p3.sheet2 === 'true' && p3.marker === '3' && p3.pressed === 'false,false,true', p3)
  await tapStep(0)
  await sleep(500)
  const p1 = await read()
  check(`${id}-passo-1-sem-folha`, p1.step === '0' && p1.sheet1 === 'false' && p1.sheet2 === 'false' && p1.marker === '1', p1)

  // Trocar de aparelho troca os passos.
  await page.evaluate(`[...document.querySelectorAll('[data-scene="ia"] [role="tab"]')].find((t) => t.getAttribute('aria-selected') !== 'true').click()`)
  await sleep(400)
  const other = await page.evaluate(`(() => { const st = document.querySelector('[data-scene="ia"]'); return { platform: st.getAttribute('data-platform'), first: st.querySelector('[role="group"][aria-label="Passos"] button').textContent.trim().replace(/^\\d/, ''), step: st.getAttribute('data-step') } })()`)
  check(`${id}-trocar-de-aparelho-troca-os-passos`, other.platform !== expectPlatform && other.first !== wanted[0] && other.step === '0', other)
  await page.evaluate(`[...document.querySelectorAll('[data-scene="ia"] [role="tab"]')].find((t) => t.getAttribute('aria-selected') !== 'true').click()`)
  await sleep(300)

  if (expectPlatform === 'android') {
    // Sem o evento do navegador nao ha Adicionar agora; com o evento simulado ele aparece e o toque chama prompt().
    check(`${id}-sem-evento-nao-ha-adicionar-agora`, !(await page.evaluate(`!!(${btn('Adicionar agora')})`)), {})
    await page.evaluate(`(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true })
      window.__promptCalls = 0
      e.prompt = () => { window.__promptCalls += 1; return Promise.resolve() }
      e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })
      window.dispatchEvent(e)
    })()`)
    check(`${id}-com-evento-aparece-adicionar-agora`, await until(page, `!!(${btn('Adicionar agora')})`, 3000), {})
    check(`${id}-o-evento-nao-dispara-sozinho`, (await page.evaluate(`window.__promptCalls`)) === 0, {})
    await click(page, 'Adicionar agora')
    await sleep(500)
    const done = await page.evaluate(`({ calls: window.__promptCalls, added: document.body.innerText.includes(${JSON.stringify(ADDED)}), button: !!(${btn('Adicionar agora')}) })`)
    check(`${id}-toque-chama-prompt-e-mostra-adicionado`, done.calls === 1 && done.added && !done.button, done)
  }
}

// cenario 5b: o toque num passo encerra o avanco automatico.
async function scenarioInstallTouch({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-5-toque-onboarding-aparece', reached, {})
  if (!reached) return
  const t0 = await goTo(page, LAST)
  await waitSince(t0, 1800)
  await page.evaluate(`document.querySelectorAll('[data-scene="ia"] [role="group"][aria-label="Passos"] button')[2].click()`)
  await waitSince(t0, 8800)
  const step = await page.evaluate(`document.querySelector('[data-scene="ia"]').getAttribute('data-step')`)
  check('cenario-5-tocar-num-passo-para-o-avanco-automatico', step === '2', { step })
}

// cenario 5c: modo app (standalone emulado): frase de ja e app, sem seletor, Pular no topo e Entrar embaixo.
async function scenarioStandalone({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-5-app-onboarding-aparece', reached, {})
  if (!reached) return
  await goTo(page, LAST)
  const s = await page.evaluate(`(() => {
    const st = document.querySelector('[data-scene="ia"]')
    const labels = [...document.querySelectorAll('main button')].filter((b) => b.checkVisibility({ visibilityProperty: true })).map((b) => b.textContent.trim())
    return { text: document.body.innerText.includes(${JSON.stringify(ALREADY_APP)}), tablist: !!document.querySelector('[role="tablist"][aria-label="Aparelho"]'), steps: !!(st && st.querySelector('[role="group"][aria-label="Passos"]')), phone: !!document.querySelector('.onb-phone'), vintem: document.querySelectorAll('main svg.vt.vt-entrada').length, labels }
  })()`)
  check('cenario-5-app-mostra-a-frase-de-ja-e-app', s.text, s)
  check('cenario-5-app-sem-seletor-sem-passos-sem-celular', !s.tablist && !s.steps && !s.phone, s)
  check('cenario-5-app-um-vintem-feliz', s.vintem === 1, s)
  check('cenario-5-app-pular-no-topo-e-entrar-embaixo', s.labels.includes('Pular') && s.labels.includes('Entrar') && !s.labels.includes('Agora não') && !s.labels.includes('Já adicionei'), s)
  await click(page, 'Entrar')
  const login = await until(page, FORM, 4000)
  check('cenario-5-app-entrar-mostra-o-login-e-grava-a-marca', login && (await readKey(page)) === '1', {})
}

// cenario 6: as quatro saidas gravam a marca so ao sair; Voltar, Continuar e recarregar nao gravam.
async function scenarioExits({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-6-onboarding-aparece', reached, {})
  if (!reached) return
  await goTo(page, 2)
  check('cenario-6-tela-3-nao-gravou-a-marca', (await readKey(page)) === null, {})
  await click(page, 'Voltar')
  await until(page, `${h1Text} === ${JSON.stringify(T[1])}`, 3000)
  check('cenario-6-voltar-nao-grava', (await readKey(page)) === null, {})

  // Recarregar no meio: em MOCK a sessao volta e o app abre; a marca e gravada em silencio (P-05) sem onboarding.
  await navigate('/', READY_APP)
  const session = await page.evaluate(`({ h1: ${h1Text} ?? null, key: localStorage.getItem(${JSON.stringify(KEY)}) })`).catch(() => null)
  check('cenario-6-com-sessao-o-onboarding-nao-aparece', session !== null && !T.includes(session.h1), { h1: session?.h1 })
  check('cenario-6-com-sessao-a-marca-e-gravada-em-silencio', session !== null && session.key === '1', { key: session?.key })
  const again = await reachOnboarding(page, navigate)
  check('cenario-6-recomeca-na-tela-1', again && (await page.evaluate(`document.querySelector('h1')?.textContent.trim()`)) === T1, {})
  check('cenario-6-recomecar-nao-gravou', (await readKey(page)) === null, {})

  const exits = [
    { name: 'pular-na-tela-1', at: 0, label: 'Pular' },
    { name: 'pular-na-tela-3', at: 2, label: 'Pular' },
    { name: 'agora-nao', at: LAST, label: 'Agora não' },
    { name: 'ja-adicionei', at: LAST, label: 'Já adicionei' },
  ]
  for (const ex of exits) {
    const ok = await reachOnboarding(page, navigate)
    check(`cenario-6-${ex.name}-onboarding-aparece`, ok, {})
    if (!ok) continue
    await goTo(page, ex.at)
    check(`cenario-6-${ex.name}-botao-existe-e-a-marca-ainda-nao-existe`, (await page.evaluate(`!!(${btn(ex.label)})`)) && (await readKey(page)) === null, {})
    await click(page, ex.label)
    const login = await until(page, FORM, 4000)
    check(`cenario-6-${ex.name}-mostra-o-login`, login, {})
    check(`cenario-6-${ex.name}-grava-a-marca`, (await readKey(page)) === '1', { key: await readKey(page) })
    check(`cenario-6-${ex.name}-login-sem-onboarding-por-tras`, !(await page.evaluate(`!!document.querySelector('main [data-scene]')`)), {})
  }
}

// cenario 7: replay em Ajustes.
async function scenarioReplay({ page, check, navigate }) {
  await navigate('/configuracoes', `${ROW}`)
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`)
  const open = async () => {
    await page.evaluate(`(() => { const b = ${ROW}; b.focus(); b.click() })()`)
    return until(page, DIALOG, 3000)
  }
  check('cenario-7-linha-rever-a-apresentacao-existe', await page.evaluate(`!!(${ROW}) && ${ROW}.textContent.includes('As telas de boas-vindas') && !${ROW}.textContent.includes('3 telas')`), {})
  const opened = await open()
  check('cenario-7-abre-o-dialogo', opened, {})
  if (!opened) return
  await sleep(300)
  const d = await page.evaluate(`(() => {
    const dlg = ${DIALOG}
    const labels = [...dlg.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.textContent).trim())
    return {
      modal: dlg.getAttribute('aria-modal'),
      labels,
      focusInside: dlg.contains(document.activeElement),
      onH1: document.activeElement === dlg.querySelector('h1'),
      bodyOverflow: document.body.style.overflow,
      fixed: getComputedStyle(dlg).position,
      step: dlg.querySelector('p.sr-only')?.textContent.trim(),
    }
  })()`)
  check('cenario-7-dialogo-modal-com-fechar', d.modal === 'true' && d.labels.includes('Fechar') && !d.labels.includes('Pular') && d.fixed === 'fixed', d)
  check('cenario-7-passo-1-de-4', d.step === 'Passo 1 de 4', d)
  check('cenario-7-foco-entra-no-dialogo', d.focusInside && d.onH1, d)
  check('cenario-7-rolagem-do-app-travada', d.bodyOverflow === 'hidden', d)

  // Foco preso: Tab e Shift+Tab nunca saem do dialogo.
  let escaped = 0
  for (let i = 0; i < 10; i++) {
    await pressKey(page, 'Tab', 9)
    if (!(await page.evaluate(`${DIALOG}.contains(document.activeElement)`))) escaped += 1
  }
  for (let i = 0; i < 4; i++) {
    await pressKey(page, 'Tab', 9, 8)
    if (!(await page.evaluate(`${DIALOG}.contains(document.activeElement)`))) escaped += 1
  }
  check('cenario-7-foco-preso-no-dialogo', escaped === 0, { escaped })

  // Esc fecha, devolve o foco a linha, nao grava e nao mostra o Login.
  await pressKey(page, 'Escape', 27)
  const closed = await until(page, `!(${DIALOG})`, 3000)
  check('cenario-7-esc-fecha', closed, {})
  const after = await page.evaluate(`({ key: localStorage.getItem(${JSON.stringify(KEY)}), login: !!${FORM}, path: location.pathname, focusRow: document.activeElement === (${ROW}), bodyOverflow: document.body.style.overflow })`)
  check('cenario-7-foco-volta-a-linha', after.focusRow, after)
  check('cenario-7-esc-nao-grava-a-marca', after.key === null, after)
  check('cenario-7-esc-nao-leva-ao-login', !after.login && after.path === '/configuracoes', after)
  check('cenario-7-rolagem-do-app-liberada', after.bodyOverflow !== 'hidden', after)

  // Concluir na tela 4 tambem fecha sem gravar; Fechar na tela 1 idem.
  await open()
  await goTo(page, LAST)
  const labels4 = await page.evaluate(`[...${DIALOG}.querySelectorAll('button')].map((b) => b.textContent.trim())`)
  check('cenario-7-tela-4-tem-concluir-e-fechar', labels4.includes('Concluir') && labels4.includes('Fechar') && !labels4.includes('Entrar') && !labels4.includes('Já adicionei') && !labels4.includes('Agora não'), { labels4 })
  await click(page, 'Concluir')
  const done = await until(page, `!(${DIALOG})`, 3000)
  const key2 = await readKey(page)
  check('cenario-7-concluir-fecha-sem-gravar-nem-ir-ao-login', done && key2 === null && !(await page.evaluate(`!!${FORM}`)), { key2 })
  await open()
  await click(page, 'Fechar')
  check('cenario-7-fechar-fecha', await until(page, `!(${DIALOG})`, 3000), {})
  check('cenario-7-fechar-nao-grava', (await readKey(page)) === null, {})
}

// cenario 8: tema escuro nas quatro telas.
async function scenarioDark({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-8-onboarding-aparece', reached, {})
  if (!reached) return
  for (let n = 0; n < T.length; n++) {
    await goTo(page, n)
    await sleep(n < 3 ? 2600 : 200)
    const s = await page.evaluate(`(() => {
      const lum = (rgb) => {
        const [r, g, b] = rgb.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const bub = document.querySelector('[data-say]')
      const img = document.querySelector('main img')
      const cs = bub ? getComputedStyle(bub) : null
      const ratio = cs ? (Math.max(lum(cs.color), lum(cs.backgroundColor)) + 0.05) / (Math.min(lum(cs.color), lum(cs.backgroundColor)) + 0.05) : null
      return { body: getComputedStyle(document.body).backgroundColor, dark: document.documentElement.classList.contains('dark'), main: getComputedStyle(document.querySelector('main')).backgroundColor, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, imgSrc: img ? img.currentSrc : null, imgLoaded: !!img && img.complete && img.naturalWidth > 0, bubbleBg: cs ? cs.backgroundColor : null, ratio }
    })()`)
    check(`cenario-8-tela-${n + 1}-corpo-em-rgb-10-21-16-sem-rolagem-horizontal`, s.body === DARK_BODY && s.dark && s.main === DARK_BODY && s.w <= s.cw, s)
    check(`cenario-8-tela-${n + 1}-print-${PRINT[n]}-escuro`, s.imgLoaded && s.imgSrc.includes(PRINT[n]) && s.imgSrc.includes('escuro'), s)
    if (n < 3) check(`cenario-8-tela-${n + 1}-balao-em-rgb-44-127-75-com-contraste-de-4.5`, s.bubbleBg === 'rgb(44, 127, 75)' && s.ratio >= 4.5, s)
  }
}

// cenario 9: armazenamento indisponivel conta como visto e leva direto ao Login.
async function scenarioStorage({ page, check, navigate }) {
  await navigate('/configuracoes', `${LOGOUT}`)
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`)
  // Depois do boot (o modo MOCK precisa do armazenamento para abrir), a leitura passa a lancar.
  await page.evaluate(`Storage.prototype.getItem = function () { throw new Error('armazenamento indisponivel') }`)
  await page.evaluate(`(() => { const b = ${LOGOUT}; b.focus(); b.click() })()`)
  const login = await until(page, FORM, 6000)
  check('cenario-9-armazenamento-lancando-leva-direto-ao-login', login, {})
  const onboarding = await page.evaluate(`${T.map((t) => JSON.stringify(t)).join(' === document.querySelector("h1")?.textContent.trim() || ')} === document.querySelector("h1")?.textContent.trim()`)
  check('cenario-9-sem-onboarding', !onboarding, {})
}

// cenario 10 (pendencia do 05-12): a marca de sessao do aviso de endereco novo sobrevive as telas do onboarding.
async function scenarioLegacyOrigin({ page, check, navigate }) {
  await navigate('/?origem=antigo', READY_APP)
  const stored = () => page.evaluate(`sessionStorage.getItem('coinc:origem-antiga')`)
  check('cenario-10-chegada-pelo-redirect-guarda-a-marca', (await stored()) === 'antigo', {})
  const reached = await reachOnboarding(page, navigate)
  check('cenario-10-onboarding-aparece', reached, {})
  if (!reached) return
  for (let n = 0; n < T.length; n++) {
    await goTo(page, n)
    check(`cenario-10-tela-${n + 1}-marca-de-sessao-intacta`, (await stored()) === 'antigo', {})
    check(`cenario-10-tela-${n + 1}-sem-aviso-no-onboarding`, !(await page.evaluate(`document.body.innerText.includes('O Coinc mudou de endereço.')`)), {})
  }
  await click(page, 'Já adicionei')
  const login = await until(page, FORM, 4000)
  check('cenario-10-ja-adicionei-mostra-o-login', login, {})
  const notice = await page.evaluate(`document.body.innerText.includes('O Coinc mudou de endereço.') && document.body.innerText.includes('Entre de novo por aqui. Seus dados continuam salvos.')`)
  check('cenario-10-login-mostra-o-aviso-de-endereco-novo', notice, {})
  check('cenario-10-marca-de-sessao-continua-ate-o-login-dar-certo', (await stored()) === 'antigo', {})
}

/** Capturas das quatro telas na pose final (movimento reduzido), no tema do seed, para o dono olhar antes de publicar. */
function scenarioCaptures(theme) {
  return async ({ page, check, navigate }) => {
    const reached = await reachOnboarding(page, navigate)
    const vp = await page.evaluate(`window.innerWidth`)
    check(`capturas-${theme}-onboarding-aparece`, reached, {})
    if (!reached) return
    await mkdir(CAPTURES, { recursive: true })
    for (let n = 0; n < T.length; n++) {
      await goTo(page, n)
      await sleep(900)
      const shot = await page.send('Page.captureScreenshot', { format: 'png' })
      await writeFile(`${CAPTURES}onboarding-novo-tela-${n + 1}-${theme}-${vp}.png`, Buffer.from(shot.data, 'base64'))
    }
    check(`capturas-${theme}-quatro-telas-gravadas-${vp}`, true, {})
  }
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

    const dark = { seed: { 'coinc:tema:v1': 'escuro' } }
    for (const viewport of VIEWPORTS) {
      await inTab(chrome, 'portao', viewport, {}, results, scenarioGate)
      if (SMOKE) continue
      await inTab(chrome, 'tamanhos', viewport, {}, results, scenarioLayout)
      await inTab(chrome, 'roteiro', viewport, {}, results, scenarioScript)
      await inTab(chrome, 'movimento-reduzido', viewport, { reduced: true }, results, scenarioReduced)
      await inTab(chrome, 'adicionar-android', viewport, {}, results, (ctx) => scenarioInstall(ctx, 'android'))
      await inTab(chrome, 'adicionar-iphone', viewport, { ua: UA_IPHONE, platform: 'iPhone' }, results, (ctx) => scenarioInstall(ctx, 'iphone'))
      await inTab(chrome, 'adicionar-toque', viewport, {}, results, scenarioInstallTouch)
      await inTab(chrome, 'adicionar-modo-app', viewport, { standalone: true }, results, scenarioStandalone)
      await inTab(chrome, 'saidas-e-recarga', viewport, {}, results, scenarioExits)
      await inTab(chrome, 'replay', viewport, {}, results, scenarioReplay)
      await inTab(chrome, 'tema-escuro', viewport, dark, results, scenarioDark)
      await inTab(chrome, 'armazenamento-indisponivel', viewport, {}, results, scenarioStorage)
      await inTab(chrome, 'origem-antiga', viewport, {}, results, scenarioLegacyOrigin)
      await inTab(chrome, 'capturas-claro', viewport, { reduced: true }, results, scenarioCaptures('claro'))
      await inTab(chrome, 'capturas-escuro', viewport, { reduced: true, ...dark }, results, scenarioCaptures('escuro'))
    }
    if (!SMOKE) {
      // Altura menor que 640: so a regiao do meio rola.
      await inTab(chrome, 'tamanhos', { width: 360, height: 560 }, {}, results, scenarioLayout)
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
