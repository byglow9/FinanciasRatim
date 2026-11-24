#!/usr/bin/env node
// Executor CDP do Login novo do Coinc (sketch 029) e do aviso de endereco novo (planos 05-12 e 05-22, IDEN-01,
// IDEN-06, IDEN-08, D-01, D-04, D-05, D-20, D-23) em Chrome sem janela e modo MOCK, a 360x640 e 390x844 com toque.
// Vite e Chrome so em 127.0.0.1 (porta 5194); so dados ficticios do seed; nada e lido de .env*; perfil temporario
// do Chrome removido no fim.
// Em MOCK o app abre logado: o Login e alcancado por /configuracoes e o botao "Sair da conta".
// O localStorage e semeado com coinc:onboarding:v1 = 1 (o onboarding e do plano 05-14).
// Cenarios (cada um em aba nova, nos dois tamanhos):
//  1 /?origem=antigo: a URL perde o parametro, sessionStorage guarda a marca; o Login tem o H1 Coinc com o wordmark de
//    cinco paths, exatamente um Vintem, nenhuma imagem do icone, titulo da aba Coinc, so os botoes Mostrar senha e
//    Entrar, o rodape, e sem subtitulo, sem "Ver a apresentacao" e sem nome antigo; o aviso de endereco novo e a fala
//    do Vintem em role=status; digitar apaga a fala e o formulario nao se move (ate 0,5 px);
//  2 abertura normal: sem fala;
//  3 /?origem=qualquer: sem fala e o parametro some da URL (sem tocar nos outros parametros);
//  4 rede emulada offline: a fala de sem conexao em role=alert, sem a de credencial, Vintem dormindo (Zzz e duas
//    palpebras fechadas), campos em tom de aviso; online, a fala de credencial errada em role=alert com o Vintem
//    triste (sem Zzz); digitar apaga a fala e devolve o neutro; formulario parado e fala dentro da janela;
//  5 nenhuma mencao ao nome antigo no texto visivel;
//  6 sem rolagem horizontal e todo alvo de toque com pelo menos 43.5 px (com cada fala);
//  7 com coinc:tema:v1 = escuro: corpo rgb(10, 21, 16), wordmark rgb(143, 217, 163), fala de acao rgb(44, 127, 75)
//    com texto de contraste de pelo menos 4,5;
//  8 movimento reduzido emulado: olhos simetricos no neutro (elipses e palpebras) e a fala so com fade;
//  9 capturas dos quatro estados (normal, erro, sem conexao, endereco novo) nos dois temas em
//    .planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/login-novo-* (pasta ignorada pelo git).
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/identity.mjs
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma verificacao
// falhou, 2 falha do script.
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5194
const ORIGIN = `http://127.0.0.1:${PORT}`
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const NOTICE_TITLE = 'O Coinc mudou de endereço.'
const NOTICE_TEXT = 'Entre de novo por aqui. Seus dados continuam salvos.'
const OFFLINE_TEXT = 'Sem internet por aqui. Liga o Wi-Fi ou os dados e tenta de novo.'
const AUTH_FAILED_TEXT = 'Hmm, e-mail ou senha não batem. Confere aí?'
const FOOTER_TEXT = 'Acesso só para quem foi convidado.'
const DARK_BODY = 'rgb(10, 21, 16)'
const DARK_WORDMARK = 'rgb(143, 217, 163)'
const DARK_ACTION = 'rgb(44, 127, 75)'
const WARN_BG_LIGHT = 'rgb(246, 227, 180)'
const ORIGIN_KEY = 'coinc:origem-antiga'
const CAPTURES = fileURLToPath(new URL('../../.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/', import.meta.url))

const FORM = `document.querySelector('form[aria-label="Entrar"]')`
const LOGOUT = `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Sair da conta'))`
const BODY_TEXT = `document.body.innerText`
// A fala do Vintem: unico elemento com role alert ou status dentro do palco do Login.
const SAY = `document.querySelector('.entrada-stage [role="alert"], .entrada-stage [role="status"]')`

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
    console.error(`identity: ${signal} recebido, encerrando Chrome e Vite`)
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
    const media = [{ name: 'prefers-color-scheme', value: 'light' }]
    if (opts.reducedMotion) media.push({ name: 'prefers-reduced-motion', value: 'reduce' })
    await page.send('Emulation.setEmulatedMedia', { features: media })
    // O tema claro e semeado de proposito: o localStorage do Chrome sobrevive entre as abas e o escuro vazaria.
    const seed = { ...buildSeed('full', new Date()), 'coinc:onboarding:v1': '1', 'coinc:tema:v1': 'claro', ...(opts.seed ?? {}) }
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: seedSource(seed) })

    const navigate = makeNavigate(page)
    await fn({ page, check, navigate, viewport, opts })
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

const READY_APP = `document.getElementById('root')?.children.length > 0`

/** Em MOCK o app abre logado: vai a /configuracoes, toca em Sair da conta e espera o Login. */
async function reachLogin(page, navigate) {
  await navigate('/configuracoes', `${LOGOUT}`)
  await page.evaluate(`(() => { const b = ${LOGOUT}; b.focus(); b.click() })()`)
  return until(page, FORM, 6000)
}

/** Fotografia do Login: H1, wordmark, Vintem, imagens, botoes visiveis, titulo da aba e fala. */
function readLogin() {
  return `(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    }
    const form = ${FORM}
    const h1 = document.querySelector('h1')
    const say = ${SAY}
    return {
      h1: h1 ? h1.textContent.trim() : null,
      paths: h1 ? h1.querySelectorAll('svg path').length : 0,
      vintems: document.querySelectorAll('svg.vt').length,
      icons: document.querySelectorAll('img[src="/icons/icon.svg"]').length,
      title: document.title,
      buttons: [...document.querySelectorAll('button')].filter(visible).map((b) => (b.getAttribute('aria-label') || b.textContent).trim()).sort(),
      say: say ? say.textContent.replace(/\\s+/g, ' ').trim() : null,
      sayRole: say ? say.getAttribute('role') : null,
      sayAboveForm: !!say && !!form && (say.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      stored: sessionStorage.getItem(${JSON.stringify(ORIGIN_KEY)}),
      search: location.search,
      path: location.pathname,
    }
  })()`
}

/** Estado do Vintem de entrada: olhos (elipse e palpebra de cada lado), Zzz e fim da piscada. */
const READ_VINTEM = `(() => {
  const svg = document.querySelector('svg.vt')
  if (!svg) return null
  const eye = (side) => {
    const g = svg.querySelector('[id$="-e' + side + '"]')
    const ring = g.querySelector('[data-e="ring"]')
    const up = g.querySelector('[data-e="up"]')
    const rx = Number(ring.getAttribute('rx'))
    const ry = Number(ring.getAttribute('ry'))
    const upY = Number(up.getAttribute('y'))
    return { rx, ry, upY, closed: upY + Number(up.getAttribute('height')) >= ry }
  }
  const z = svg.querySelector('[id$="-z0"]')
  return { L: eye('L'), R: eye('R'), zzz: !!z && z.getAttribute('display') !== 'none', entrada: svg.classList.contains('vt-entrada') }
})()`

/** Retangulos do que nao pode se mexer quando a fala entra ou sai. */
const READ_RECTS = `(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }
  const footer = [...document.querySelectorAll('p')].find((p) => p.textContent.includes(${JSON.stringify(FOOTER_TEXT)}))
  return {
    form: box(${FORM}),
    email: box(document.getElementById('email').parentElement),
    password: box(document.getElementById('password').parentElement),
    submit: box(${FORM}.querySelector('button[type="submit"]')),
    wordmark: box(document.querySelector('h1 svg')),
    footer: box(footer),
  }
})()`

/** Maior diferenca (px) entre dois conjuntos de retangulos. */
function rectDelta(a, b) {
  let worst = 0
  for (const key of Object.keys(a)) {
    for (const prop of ['x', 'y', 'w', 'h']) worst = Math.max(worst, Math.abs(a[key][prop] - b[key][prop]))
  }
  return Math.round(worst * 100) / 100
}

/** A fala fica inteira dentro da janela (topo, esquerda e direita). */
async function sayInsideWindow(page) {
  return page.evaluate(`(() => {
    const el = ${SAY}
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, right: r.right, vw: window.innerWidth, ok: r.top >= 0 && r.left >= 0 && r.right <= window.innerWidth }
  })()`)
}

/** Verificacao comum de um estado com fala: papel, texto, formulario parado e fala dentro da janela. */
async function checkSay({ page, check }, tag, { text, role, base }) {
  const ok = await until(page, `(${SAY})?.textContent.includes(${JSON.stringify(text)})`, 4000)
  check(`${tag}-fala-com-o-texto`, ok, {})
  await sleep(500)
  const s = await page.evaluate(readLogin())
  check(`${tag}-fala-em-role-${role}`, s.sayRole === role, { role: s.sayRole })
  check(`${tag}-fala-acima-do-formulario`, s.sayAboveForm, {})
  const inside = await sayInsideWindow(page)
  check(`${tag}-fala-dentro-da-janela`, inside?.ok === true, inside ?? {})
  if (base) {
    const now = await page.evaluate(READ_RECTS)
    const delta = rectDelta(base, now)
    check(`${tag}-formulario-parado-0.5px`, delta <= 0.5, { delta })
  }
}

/** cenario 6: sem rolagem horizontal e todo alvo visivel com pelo menos 43.5 px. */
async function checkLayout(page, check, label) {
  const m = await page.evaluate(`(() => {
    const doc = document.documentElement
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return false
      return typeof el.checkVisibility === 'function' ? el.checkVisibility({ visibilityProperty: true }) : true
    }
    const small = []
    for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="tab"], input, select, textarea')) {
      if (el instanceof HTMLInputElement && el.type === 'hidden') continue
      if (!visible(el) || el.closest('[aria-hidden="true"]')) continue
      const r = el.getBoundingClientRect()
      if (r.width >= 43.5 && r.height >= 43.5) continue
      small.push({ text: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 })
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, small }
  })()`)
  check(`cenario-6-sem-rolagem-horizontal-${label}`, m.scrollWidth <= m.clientWidth, m)
  check(`cenario-6-alvos-de-pelo-menos-43.5px-${label}`, m.small.length === 0, { small: m.small })
}

/** Cenario 5: nenhuma mencao ao nome antigo no texto visivel. */
async function checkNoOldName(page, check, label) {
  const text = await page.evaluate(BODY_TEXT)
  check(`cenario-5-sem-nome-antigo-${label}`, !/ratimbum|financias\b/i.test(text), { text: text.slice(0, 120) })
}

/** Estrutura do Login novo: H1 e wordmark, um Vintem, sem icone, so dois botoes, rodape e sem texto antigo. */
async function checkStructure(page, check, tag) {
  const s = await page.evaluate(readLogin())
  const text = await page.evaluate(BODY_TEXT)
  check(`${tag}-h1-coinc`, s.h1 === 'Coinc', { h1: s.h1 })
  check(`${tag}-wordmark-com-cinco-paths`, s.paths === 5, { paths: s.paths })
  check(`${tag}-exatamente-um-vintem-de-entrada`, s.vintems === 1, { vintems: s.vintems })
  const v = await page.evaluate(READ_VINTEM)
  check(`${tag}-vintem-com-a-classe-vt-entrada`, v?.entrada === true, {})
  check(`${tag}-nenhuma-imagem-do-icone`, s.icons === 0, { icons: s.icons })
  check(`${tag}-titulo-da-aba-coinc`, s.title === 'Coinc', { title: s.title })
  check(`${tag}-so-os-botoes-mostrar-senha-e-entrar`, JSON.stringify(s.buttons) === JSON.stringify(['Entrar', 'Mostrar senha']), { buttons: s.buttons })
  check(`${tag}-rodape-presente`, text.includes(FOOTER_TEXT), {})
  check(`${tag}-sem-subtitulo-nem-apresentacao`, !text.includes('Entre para gerenciar') && !text.includes('Ver a apresentação'), {})
  check(`${tag}-sem-link-de-senha-esquecida`, !/esqueci/i.test(text), {})
}

/** Digita no campo de e-mail como o usuario (dispara o onChange do formulario). */
async function typeIn(page, id, value) {
  await page.evaluate(`(() => {
    const el = document.getElementById(${JSON.stringify(id)})
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, ${JSON.stringify(value)})
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
}

// cenarios 1, 5 e 6: chegada pelo redirect do site antigo.
async function scenarioLegacy(ctx) {
  const { page, check, navigate } = ctx
  await navigate('/?origem=antigo&outro=1#topo', READY_APP)
  const boot = await page.evaluate(readLogin())
  check('cenario-1-url-perde-so-o-parametro-origem', boot.search === '?outro=1' && !boot.search.includes('origem'), { search: boot.search })
  check('cenario-1-sessionStorage-guarda-a-marca', boot.stored === 'antigo', { stored: boot.stored })
  const hash = await page.evaluate('location.hash')
  check('cenario-1-hash-preservado', hash === '#topo', { hash })

  const reached = await reachLogin(page, navigate)
  check('cenario-1-sair-da-conta-mostra-o-login', reached, {})
  if (!reached) return
  await sleep(600)
  await checkStructure(page, check, 'cenario-1')
  const withSay = await page.evaluate(READ_RECTS)
  const s = await page.evaluate(readLogin())
  check('cenario-1-fala-com-titulo-e-texto', s.say !== null && s.say.includes(NOTICE_TITLE) && s.say.includes(NOTICE_TEXT), { say: s.say })
  check('cenario-1-marca-sobrevive-a-recarga', s.stored === 'antigo', { stored: s.stored })
  await checkSay(ctx, 'cenario-1', { text: NOTICE_TITLE, role: 'status', base: null })
  await checkNoOldName(page, check, 'com-aviso')
  await checkLayout(page, check, 'com-aviso')

  // Digitar apaga a fala de endereco novo e o formulario nao se move.
  await typeIn(page, 'email', 'a')
  await typeIn(page, 'email', '')
  const gone = await until(page, `!(${SAY})`, 3000)
  check('cenario-1-digitar-apaga-a-fala', gone, {})
  await sleep(400)
  const without = await page.evaluate(READ_RECTS)
  const delta = rectDelta(withSay, without)
  check('cenario-1-formulario-parado-0.5px-com-e-sem-fala', delta <= 0.5, { delta })
}

// cenario 2: abertura normal, sem fala.
async function scenarioNormal({ page, check, navigate }) {
  const reached = await reachLogin(page, navigate)
  check('cenario-2-login-aparece', reached, {})
  if (!reached) return
  await sleep(600)
  const s = await page.evaluate(readLogin())
  check('cenario-2-sem-fala-e-sem-marca-guardada', s.say === null && s.stored === null, { say: s.say, stored: s.stored })
  await checkStructure(page, check, 'cenario-2')
  const v = await page.evaluate(READ_VINTEM)
  check('cenario-2-vintem-neutro-sem-zzz', v !== null && !v.zzz && Math.abs(v.L.rx - 21) < 0.6, v ?? {})
  await checkNoOldName(page, check, 'abertura-normal')
  await checkLayout(page, check, 'abertura-normal')
}

// cenario 3: valor desconhecido nao liga a fala, e o parametro some.
async function scenarioOther({ page, check, navigate }) {
  await navigate('/?origem=qualquer', READY_APP)
  const boot = await page.evaluate(readLogin())
  check('cenario-3-parametro-some-da-url', !boot.search.includes('origem') && boot.search === '', { search: boot.search })
  check('cenario-3-nada-guardado', boot.stored === null, { stored: boot.stored })
  const reached = await reachLogin(page, navigate)
  check('cenario-3-login-aparece', reached, {})
  if (!reached) return
  const s = await page.evaluate(readLogin())
  check('cenario-3-sem-fala', s.say === null, { say: s.say })
  // Variantes que so parecem 'antigo' tambem nao ligam a fala.
  for (const variant of ['ANTIGO', 'antigo%20', 'antigo,x']) {
    await navigate(`/?origem=${variant}`, READY_APP)
    const v = await page.evaluate(readLogin())
    check(`cenario-3-variante-${variant}-nao-liga`, v.stored === null && !v.search.includes('origem'), { stored: v.stored, search: v.search })
  }
}

/** Preenche e envia o formulario do Login com valores validos. */
async function submitLogin(page) {
  await typeIn(page, 'email', 'teste@exemplo.com')
  await typeIn(page, 'password', 'senha-qualquer')
  await page.evaluate(`(() => ${FORM}.querySelector('button[type="submit"]').click())()`)
}

// cenarios 4, 5, 6: sem conexao, credencial errada e digitar.
async function scenarioOffline(ctx) {
  const { page, check, navigate } = ctx
  const reached = await reachLogin(page, navigate)
  check('cenario-4-login-aparece', reached, {})
  if (!reached) return
  await sleep(600)
  const base = await page.evaluate(READ_RECTS)
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  const online = await page.evaluate('navigator.onLine')
  check('cenario-4-navegador-offline', online === false, { online })
  await submitLogin(page)
  await checkSay(ctx, 'cenario-4-sem-conexao', { text: OFFLINE_TEXT, role: 'alert', base })
  const text = await page.evaluate(BODY_TEXT)
  check('cenario-4-nao-mostra-credencial-errada', !text.includes(AUTH_FAILED_TEXT), {})
  // Vintem dormindo: Zzz visivel e as duas palpebras fechadas (depois de assentar).
  const asleep = await until(page, `(() => { const v = ${READ_VINTEM}; return v && v.zzz && v.L.closed && v.R.closed })()`, 6000)
  check('cenario-4-vintem-dormindo-com-zzz-e-palpebras-fechadas', asleep, (await page.evaluate(READ_VINTEM)) ?? {})
  const tone = await page.evaluate(`(() => { const s = document.getElementById('email').parentElement; return getComputedStyle(s).backgroundColor })()`)
  check('cenario-4-campos-em-tom-de-aviso', tone === WARN_BG_LIGHT, { background: tone })
  await checkLayout(page, check, 'sem-conexao')
  await checkNoOldName(page, check, 'sem-conexao')

  // De volta online, o envio segue o fluxo normal (em MOCK nao ha provedor: cai na fala fixa de credencial).
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await page.evaluate(`(() => ${FORM}.querySelector('button[type="submit"]').click())()`)
  await checkSay(ctx, 'cenario-4-credencial', { text: AUTH_FAILED_TEXT, role: 'alert', base })
  const textBack = await page.evaluate(BODY_TEXT)
  check('cenario-4-online-some-a-fala-de-sem-conexao', !textBack.includes(OFFLINE_TEXT), {})
  const sad = await until(page, `(() => { const v = ${READ_VINTEM}; return v && !v.zzz && Math.abs(v.L.rx - 18) < 0.6 })()`, 6000)
  check('cenario-4-vintem-triste-sem-zzz', sad, (await page.evaluate(READ_VINTEM)) ?? {})
  const dangerBg = await page.evaluate(`getComputedStyle(document.getElementById('password').parentElement).backgroundColor`)
  check('cenario-4-campos-em-tom-de-erro', dangerBg === 'rgb(243, 213, 203)', { background: dangerBg })
  await checkLayout(page, check, 'credencial-errada')

  // Digitar apaga a fala e devolve o neutro; o formulario segue parado.
  await typeIn(page, 'email', 'teste@exemplo.com.br')
  const gone = await until(page, `!(${SAY})`, 3000)
  check('cenario-4-digitar-apaga-a-fala', gone, {})
  const neutral = await until(page, `(() => { const v = ${READ_VINTEM}; return v && !v.zzz && Math.abs(v.L.rx - 21) < 0.6 })()`, 6000)
  check('cenario-4-vintem-volta-ao-neutro', neutral, (await page.evaluate(READ_VINTEM)) ?? {})
  const after = await page.evaluate(READ_RECTS)
  const delta = rectDelta(base, after)
  check('cenario-4-formulario-parado-0.5px-no-fim', delta <= 0.5, { delta })
}

// cenario 7: tema escuro no Login.
async function scenarioDark(ctx) {
  const { page, check, navigate } = ctx
  const reached = await reachLogin(page, navigate)
  check('cenario-7-login-aparece', reached, {})
  if (!reached) return
  await sleep(600)
  const s = await page.evaluate(`({
    body: getComputedStyle(document.body).backgroundColor,
    dark: document.documentElement.classList.contains('dark'),
    wordmark: getComputedStyle(document.querySelector('h1 svg path')).fill,
  })`)
  check('cenario-7-corpo-em-rgb-10-21-16', s.body === DARK_BODY && s.dark, s)
  check('cenario-7-wordmark-em-rgb-143-217-163', s.wordmark === DARK_WORDMARK, { wordmark: s.wordmark })
  await checkStructure(page, check, 'cenario-7')
  await submitLogin(page)
  await checkSay(ctx, 'cenario-7', { text: AUTH_FAILED_TEXT, role: 'alert', base: null })
  const say = await page.evaluate(`(() => {
    const el = ${SAY}
    const cs = getComputedStyle(el)
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const a = lum(cs.color)
    const b = lum(cs.backgroundColor)
    return { background: cs.backgroundColor, color: cs.color, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
  })()`)
  check('cenario-7-fala-de-acao-em-rgb-44-127-75', say.background === DARK_ACTION, say)
  check('cenario-7-fala-com-contraste-de-pelo-menos-4.5', say.contrast >= 4.5, say)
  await checkNoOldName(page, check, 'escuro')
  await checkLayout(page, check, 'escuro')
}

// cenario 8: movimento reduzido emulado: olhos simetricos e a fala so com fade.
async function scenarioReduced(ctx) {
  const { page, check, navigate } = ctx
  const reached = await reachLogin(page, navigate)
  check('cenario-8-login-aparece', reached, {})
  if (!reached) return
  await sleep(800)
  const v = await page.evaluate(READ_VINTEM)
  const d = (a, b) => Math.abs(a - b)
  check('cenario-8-elipses-dos-olhos-iguais-0.5px', v !== null && d(v.L.rx, v.R.rx) <= 0.5 && d(v.L.ry, v.R.ry) <= 0.5, v ?? {})
  check('cenario-8-palpebras-na-mesma-posicao-0.5px', v !== null && d(v.L.upY, v.R.upY) <= 0.5, v ?? {})
  check('cenario-8-olho-largo-21-por-18', v !== null && d(v.L.rx, 21) <= 0.5 && d(v.L.ry, 18) <= 0.5, v ?? {})
  await submitLogin(page)
  await until(page, `!!(${SAY})`, 4000)
  const m = await page.evaluate(`(() => {
    const cs = getComputedStyle(${SAY})
    return { animation: cs.animationName, transform: cs.transform, translate: cs.translate, duration: cs.animationDuration }
  })()`)
  check('cenario-8-fala-so-com-fade-sem-transformacao', m.animation === 'fade-100' && (m.transform === 'none' || m.transform === 'matrix(1, 0, 0, 1, 0, 0)'), m)
  await checkLayout(page, check, 'movimento-reduzido')
}

/** Grava uma captura do estado atual no nome login-novo-<estado>-<tema>-<largura>.png. */
async function capture(page, state, theme, viewport) {
  await sleep(1400)
  const shot = await page.send('Page.captureScreenshot', { format: 'png' })
  await mkdir(CAPTURES, { recursive: true })
  await writeFile(`${CAPTURES}login-novo-${state}-${theme}-${viewport.width}.png`, Buffer.from(shot.data, 'base64'))
}

// cenario 9: capturas dos quatro estados no tema do seed.
function scenarioCaptures(theme) {
  return async ({ page, check, navigate, viewport }) => {
    await navigate('/?origem=antigo', READY_APP)
    let reached = await reachLogin(page, navigate)
    check(`cenario-9-${theme}-login-com-endereco-novo`, reached, {})
    if (!reached) return
    await capture(page, 'endereco-novo', theme, viewport)
    // Estados seguintes sem a marca do site antigo.
    await page.evaluate(`sessionStorage.removeItem(${JSON.stringify(ORIGIN_KEY)})`)
    reached = await reachLogin(page, navigate)
    check(`cenario-9-${theme}-login-normal`, reached, {})
    if (!reached) return
    await capture(page, 'normal', theme, viewport)
    await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await submitLogin(page)
    await until(page, `(${SAY})?.textContent.includes(${JSON.stringify(OFFLINE_TEXT)})`, 4000)
    await capture(page, 'sem-conexao', theme, viewport)
    await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await page.evaluate(`(() => ${FORM}.querySelector('button[type="submit"]').click())()`)
    const shown = await until(page, `(${SAY})?.textContent.includes(${JSON.stringify(AUTH_FAILED_TEXT)})`, 4000)
    check(`cenario-9-${theme}-fala-de-credencial`, shown, {})
    await capture(page, 'erro', theme, viewport)
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
      await inTab(chrome, 'origem-antiga', viewport, {}, results, scenarioLegacy)
      await inTab(chrome, 'abertura-normal', viewport, {}, results, scenarioNormal)
      await inTab(chrome, 'origem-qualquer', viewport, {}, results, scenarioOther)
      await inTab(chrome, 'sem-conexao', viewport, {}, results, scenarioOffline)
      await inTab(chrome, 'tema-escuro', viewport, dark, results, scenarioDark)
      await inTab(chrome, 'movimento-reduzido', viewport, { reducedMotion: true }, results, scenarioReduced)
      await inTab(chrome, 'capturas-claro', viewport, {}, results, scenarioCaptures('claro'))
      await inTab(chrome, 'capturas-escuro', viewport, dark, results, scenarioCaptures('escuro'))
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
    console.error(`identity: falha do script: ${err.message}`)
    process.exit(2)
  },
)
