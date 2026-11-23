#!/usr/bin/env node
// Executor CDP do Login do Coinc e do aviso de endereco novo (plano 05-12, IDEN-01, IDEN-02, IDEN-08, D-01, D-04, D-05)
// em Chrome sem janela e modo MOCK, a 360x640 e 390x844 com toque. Vite e Chrome so em 127.0.0.1 (porta 5194);
// so dados ficticios do seed; nada e lido de .env*; perfil temporario do Chrome removido no fim.
// Em MOCK o app abre logado: o Login e alcancado por /configuracoes e o botao "Sair da conta".
// O localStorage e semeado com coinc:onboarding:v1 = 1 (o onboarding e do plano 05-14).
// Cenarios (cada um em aba nova, nos dois tamanhos):
//  1 /?origem=antigo: a URL perde o parametro, sessionStorage guarda a marca, o Login mostra o H1 Coinc, a imagem
//    da marca (/icons/icon.svg, alt vazio), o titulo da aba Coinc e o aviso de endereco novo acima do formulario;
//  2 abertura normal: sem aviso;
//  3 /?origem=qualquer: sem aviso e o parametro some da URL (sem tocar nos outros parametros);
//  4 rede emulada offline: enviar o formulario mostra a mensagem de sem conexao e nao a de credencial errada;
//  5 nenhuma mencao ao nome antigo no texto visivel;
//  6 sem rolagem horizontal e todo alvo de toque com pelo menos 43.5 px (com aviso e com a mensagem de erro);
//  7 com coinc:tema:v1 = escuro o Login renderiza com o corpo em rgb(10, 21, 16).
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/identity.mjs
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma verificacao
// falhou, 2 falha do script.
import { spawn } from 'node:child_process'
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
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
    const seed = { ...buildSeed('full', new Date()), 'coinc:onboarding:v1': '1', ...(opts.seed ?? {}) }
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

const READY_APP = `document.getElementById('root')?.children.length > 0`

/** Em MOCK o app abre logado: vai a /configuracoes, toca em Sair da conta e espera o Login. */
async function reachLogin(page, navigate) {
  await navigate('/configuracoes', `${LOGOUT}`)
  await page.evaluate(`(() => { const b = ${LOGOUT}; b.focus(); b.click() })()`)
  return until(page, FORM, 6000)
}

/** Fotografia do Login: H1, marca, titulo da aba, aviso e posicao do aviso. */
function readLogin() {
  return `(() => {
    const form = ${FORM}
    const h1 = document.querySelector('h1')
    const img = document.querySelector('img[src="/icons/icon.svg"]')
    const r = img ? img.getBoundingClientRect() : null
    const notice = [...document.querySelectorAll('[role="status"]')].find((n) => n.textContent.includes(${JSON.stringify(NOTICE_TITLE)}))
    return {
      h1: h1 ? h1.textContent.trim() : null,
      title: document.title,
      img: img ? { alt: img.getAttribute('alt'), w: Math.round(r.width), h: Math.round(r.height), complete: img.complete } : null,
      imgBeforeH1: !!img && !!h1 && (img.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      notice: notice ? notice.textContent.replace(/\\s+/g, ' ').trim() : null,
      noticeAboveForm: !!notice && !!form && (notice.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      stored: sessionStorage.getItem(${JSON.stringify(ORIGIN_KEY)}),
      search: location.search,
      path: location.pathname,
    }
  })()`
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

// cenarios 1, 5 e 6: chegada pelo redirect do site antigo.
async function scenarioLegacy({ page, check, navigate }) {
  await navigate('/?origem=antigo&outro=1#topo', READY_APP)
  const boot = await page.evaluate(readLogin())
  check('cenario-1-url-perde-so-o-parametro-origem', boot.search === '?outro=1' && !boot.search.includes('origem'), { search: boot.search })
  check('cenario-1-sessionStorage-guarda-a-marca', boot.stored === 'antigo', { stored: boot.stored })
  const hash = await page.evaluate('location.hash')
  check('cenario-1-hash-preservado', hash === '#topo', { hash })

  const reached = await reachLogin(page, navigate)
  check('cenario-1-sair-da-conta-mostra-o-login', reached, {})
  if (!reached) return
  const s = await page.evaluate(readLogin())
  check('cenario-1-h1-coinc', s.h1 === 'Coinc', { h1: s.h1 })
  check('cenario-1-titulo-da-aba-coinc', s.title === 'Coinc', { title: s.title })
  check('cenario-1-marca-do-icone-decorativa-de-56-por-56', s.img !== null && s.img.alt === '' && s.img.w === 56 && s.img.h === 56 && s.img.complete && s.imgBeforeH1, { img: s.img })
  check('cenario-1-aviso-com-titulo-e-texto', s.notice !== null && s.notice.includes(NOTICE_TITLE) && s.notice.includes(NOTICE_TEXT), { notice: s.notice })
  check('cenario-1-aviso-acima-do-formulario', s.noticeAboveForm, {})
  check('cenario-1-marca-sobrevive-a-recarga', s.stored === 'antigo', { stored: s.stored })
  await checkNoOldName(page, check, 'com-aviso')
  await checkLayout(page, check, 'com-aviso')
}

// cenario 2: abertura normal, sem aviso.
async function scenarioNormal({ page, check, navigate }) {
  const reached = await reachLogin(page, navigate)
  check('cenario-2-login-aparece', reached, {})
  if (!reached) return
  const s = await page.evaluate(readLogin())
  check('cenario-2-sem-aviso-e-sem-marca-guardada', s.notice === null && s.stored === null, { notice: s.notice, stored: s.stored })
  check('cenario-2-h1-coinc', s.h1 === 'Coinc', { h1: s.h1 })
  await checkNoOldName(page, check, 'abertura-normal')
  await checkLayout(page, check, 'abertura-normal')
}

// cenario 3: valor desconhecido nao liga o aviso, e o parametro some.
async function scenarioOther({ page, check, navigate }) {
  await navigate('/?origem=qualquer', READY_APP)
  const boot = await page.evaluate(readLogin())
  check('cenario-3-parametro-some-da-url', !boot.search.includes('origem') && boot.search === '', { search: boot.search })
  check('cenario-3-nada-guardado', boot.stored === null, { stored: boot.stored })
  const reached = await reachLogin(page, navigate)
  check('cenario-3-login-aparece', reached, {})
  if (!reached) return
  const s = await page.evaluate(readLogin())
  check('cenario-3-sem-aviso', s.notice === null, { notice: s.notice })
  // Variantes que so parecem 'antigo' tambem nao ligam o aviso.
  for (const variant of ['ANTIGO', 'antigo%20', 'antigo,x']) {
    await navigate(`/?origem=${variant}`, READY_APP)
    const v = await page.evaluate(readLogin())
    check(`cenario-3-variante-${variant}-nao-liga`, v.stored === null && !v.search.includes('origem'), { stored: v.stored, search: v.search })
  }
}

/** Preenche e envia o formulario do Login com valores validos. */
async function submitLogin(page) {
  await page.evaluate(`(() => {
    const set = (id, value) => {
      const el = document.getElementById(id)
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    set('email', 'teste@exemplo.com')
    set('password', 'senha-qualquer')
    ${FORM}.querySelector('button[type="submit"]').click()
  })()`)
}

// cenario 4: sem conexao.
async function scenarioOffline({ page, check, navigate }) {
  const reached = await reachLogin(page, navigate)
  check('cenario-4-login-aparece', reached, {})
  if (!reached) return
  await page.evaluate(`window.__signInCalls = 0`)
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  const online = await page.evaluate('navigator.onLine')
  check('cenario-4-navegador-offline', online === false, { online })
  await submitLogin(page)
  const shown = await until(page, `document.body.innerText.includes(${JSON.stringify(OFFLINE_TEXT)})`, 4000)
  check('cenario-4-mostra-sem-conexao', shown, {})
  const text = await page.evaluate(BODY_TEXT)
  check('cenario-4-nao-mostra-credencial-errada', !text.includes(AUTH_FAILED_TEXT), {})
  const alertRole = await page.evaluate(`[...document.querySelectorAll('[role="alert"]')].some((n) => n.textContent.includes(${JSON.stringify(OFFLINE_TEXT)}))`)
  check('cenario-4-mensagem-em-role-alert', alertRole, {})
  await checkLayout(page, check, 'sem-conexao')

  // De volta online, o envio segue o fluxo normal (em MOCK nao ha provedor: cai na mensagem fixa).
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await page.evaluate(`(() => ${FORM}.querySelector('button[type="submit"]').click())()`)
  const back = await until(page, `document.body.innerText.includes(${JSON.stringify(AUTH_FAILED_TEXT)})`, 4000)
  check('cenario-4-online-volta-a-mensagem-de-credencial', back, {})
  const textBack = await page.evaluate(BODY_TEXT)
  check('cenario-4-online-some-a-mensagem-de-sem-conexao', !textBack.includes(OFFLINE_TEXT), {})
}

// cenario 7: tema escuro no Login.
async function scenarioDark({ page, check, navigate }) {
  const reached = await reachLogin(page, navigate)
  check('cenario-7-login-aparece', reached, {})
  if (!reached) return
  const s = await page.evaluate(`({ body: getComputedStyle(document.body).backgroundColor, dark: document.documentElement.classList.contains('dark') })`)
  check('cenario-7-corpo-em-rgb-10-21-16', s.body === DARK_BODY && s.dark, s)
  const img = await page.evaluate(`!!document.querySelector('img[src="/icons/icon.svg"]')?.complete`)
  check('cenario-7-marca-carregada-no-escuro', img, {})
  await checkNoOldName(page, check, 'escuro')
  await checkLayout(page, check, 'escuro')
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
      await inTab(chrome, 'origem-antiga', viewport, {}, results, scenarioLegacy)
      await inTab(chrome, 'abertura-normal', viewport, {}, results, scenarioNormal)
      await inTab(chrome, 'origem-qualquer', viewport, {}, results, scenarioOther)
      await inTab(chrome, 'sem-conexao', viewport, {}, results, scenarioOffline)
      await inTab(chrome, 'tema-escuro', viewport, { seed: { 'coinc:tema:v1': 'escuro' } }, results, scenarioDark)
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
