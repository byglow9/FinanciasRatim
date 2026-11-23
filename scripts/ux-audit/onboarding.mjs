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
const T = ['Veja quanto ainda pode gastar', 'Limites e o Vintém', 'Adicionar à tela inicial']
const T1 = T[0]
const DIALOG = `document.querySelector('[role="dialog"][aria-label="Apresentação do Coinc"]')`
const ROOT = `(document.querySelector('main') || ${DIALOG})`
const REGION = `${ROOT}.querySelector('.overflow-y-auto')`

const READY_APP = `document.getElementById('root')?.children.length > 0`
const btn = (text) => `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(text)})`
const click = (page, text) => page.evaluate(`(() => { const b = ${btn(text)}; if (!b) return false; b.click(); return true })()`)
const readKey = (page) => page.evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`)
const h1Text = `document.querySelector('h1')?.textContent.trim()`
const ROW = `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Rever a apresentação'))`

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

/** Vai para a tela `n` (0 a 2) tocando Continuar e espera o titulo certo. */
async function goTo(page, n) {
  const current = await page.evaluate(`${h1Text}`)
  let at = T.indexOf(current)
  while (at < n) {
    await click(page, 'Continuar')
    at += 1
    await until(page, `${h1Text} === ${JSON.stringify(T[at])}`, 3000)
  }
  await sleep(350)
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

/** Cenario 1: rolagem, barra e rodape parados, sem rolagem horizontal, alvos de pelo menos 43.5 px. */
async function scenarioLayout({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  // O tamanho real so vale depois da navegacao (a pagina em branco usa a janela larga padrao).
  const vp = await page.evaluate(`({ w: window.innerWidth, h: window.innerHeight })`)
  const label = `${vp.w}x${vp.h}`
  check(`cenario-1-onboarding-aparece-${label}`, reached, {})
  if (!reached) return
  for (let n = 0; n < 3; n++) {
    await goTo(page, n)
    const m = await page.evaluate(readLayout())
    check(`cenario-1-tela-${n + 1}-sem-rolagem-do-corpo-${label}`, m.docScrollHeight <= m.innerHeight && m.bodyScrollHeight <= m.innerHeight, m)
    check(`cenario-1-tela-${n + 1}-sem-rolagem-horizontal-${label}`, m.docScrollWidth <= m.docClientWidth && m.regionScrollWidth <= m.regionClientWidth && m.overflowX !== 'scroll', m)
    check(`cenario-1-tela-${n + 1}-regiao-do-meio-rola-so-na-vertical-${label}`, m.overflowY === 'auto', { overflowY: m.overflowY })
    check(`cenario-1-tela-${n + 1}-alvos-de-pelo-menos-43.5px-${label}`, m.small.length === 0, { small: m.small })
    if (n < 2 && vp.h >= 640) {
      check(`cenario-1-tela-${n + 1}-cabe-sem-rolagem-${label}`, m.regionScrollHeight <= m.regionClientHeight + 1, { scrollHeight: m.regionScrollHeight, clientHeight: m.regionClientHeight })
    }
    if (n === 2 && vp.h <= 640) {
      check(`cenario-1-tela-3-rola-na-regiao-do-meio-${label}`, m.regionScrollHeight > m.regionClientHeight, { scrollHeight: m.regionScrollHeight, clientHeight: m.regionClientHeight })
    }
    if (m.regionScrollHeight > m.regionClientHeight) {
      // Rolando a regiao ate o fim, a barra e o rodape nao se mexem e o corpo continua parado.
      await page.evaluate(`${REGION}.scrollTop = ${REGION}.scrollHeight`)
      await sleep(150)
      const after = await page.evaluate(readLayout())
      check(`cenario-1-tela-${n + 1}-barra-e-rodape-parados-${label}`, after.barTop === m.barTop && after.footerBottom === m.footerBottom && after.footerBottom <= after.innerHeight, { before: [m.barTop, m.footerBottom], after: [after.barTop, after.footerBottom] })
      check(`cenario-1-tela-${n + 1}-corpo-parado-ao-rolar-${label}`, after.docScrollHeight <= after.innerHeight, after)
      await page.evaluate(`${REGION}.scrollTop = 0`)
    }
  }
}

// cenario 2 e 3: foco, Voltar, Pular, passo para leitor de tela, Vintem unico, animacao normal.
async function scenarioFlow({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-2-onboarding-aparece', reached, {})
  if (!reached) return
  const back = await page.evaluate(`(() => {
    const b = document.querySelector('button[aria-label="Voltar"]')
    const cs = getComputedStyle(b)
    b.focus()
    return { visibility: cs.visibility, focused: document.activeElement === b }
  })()`)
  check('cenario-2-voltar-invisivel-e-fora-do-foco-na-tela-1', back.visibility === 'hidden' && !back.focused, back)

  // Marca o Vintem da tela 1 para comparar nas outras.
  const marked = await page.evaluate(`(() => {
    const svg = ${ROOT}.querySelector('.rounded-card svg')
    if (!svg) return null
    window.__vintemNode = svg
    const hidden = !!svg.closest('[aria-hidden="true"]')
    return { hidden, focusable: svg.getAttribute('focusable'), tabindex: svg.getAttribute('tabindex') }
  })()`)
  check('cenario-3-vintem-da-tela-1-decorativo', marked !== null && marked.hidden && marked.tabindex === null, { marked })

  for (let n = 0; n < 3; n++) {
    if (n > 0) {
      await click(page, 'Continuar')
      await until(page, `${h1Text} === ${JSON.stringify(T[n])}`, 3000)
      await sleep(250)
    }
    const s = await page.evaluate(`(() => {
      const h1 = document.querySelector('h1')
      const desc = document.getElementById(h1.getAttribute('aria-describedby') || '')
      const svg = ${ROOT}.querySelector('.rounded-card svg')
      const panel = ${ROOT}.querySelector('.rounded-card')
      const wrapper = document.querySelector('.anim-onboarding-in')
      const cs = wrapper ? getComputedStyle(wrapper) : null
      return {
        h1: h1.textContent.trim(),
        focused: document.activeElement === h1,
        tabindex: h1.getAttribute('tabindex'),
        step: desc ? desc.textContent.trim() : null,
        stepSrOnly: !!desc && desc.classList.contains('sr-only'),
        sameVintem: svg === window.__vintemNode && window.__vintemNode.isConnected,
        vintemCount: ${ROOT}.querySelectorAll('svg[viewBox="0 0 240 200"]').length,
        pular: !!(${btn('Pular')}),
        balloons: ${ROOT}.querySelectorAll('[role="status"], [data-vintem-balloon]').length,
        vintemFocusable: !!(svg && (svg.tabIndex >= 0 && svg.getAttribute('tabindex') !== null)),
        animName: cs ? cs.animationName : null,
        animDuration: cs ? cs.animationDuration : null,
        panelHasButton: !!panel.querySelector('[aria-hidden="true"] button, [aria-hidden="true"] a, [aria-hidden="true"] [tabindex]'),
      }
    })()`)
    check(`cenario-2-tela-${n + 1}-foco-no-titulo`, s.focused && s.tabindex === '-1', { focused: s.focused, tabindex: s.tabindex })
    check(`cenario-2-tela-${n + 1}-passo-${n + 1}-de-3-sr-only-ligado-ao-titulo`, s.step === `Passo ${n + 1} de 3` && s.stepSrOnly, { step: s.step })
    check(`cenario-2-tela-${n + 1}-tem-pular`, s.pular, {})
    check(`cenario-3-tela-${n + 1}-vintem-e-o-mesmo-no`, s.sameVintem && s.vintemCount === 1, { sameVintem: s.sameVintem, count: s.vintemCount })
    check(`cenario-3-tela-${n + 1}-vintem-sem-balao-nem-toque`, s.balloons === 0 && !s.vintemFocusable && !s.panelHasButton, { balloons: s.balloons })
    check(`cenario-4-controle-tela-${n + 1}-animacao-normal-de-200ms`, s.animName === 'onboarding-in' || s.animDuration === '0.2s', { name: s.animName, duration: s.animDuration })
  }
  // Tela 3 reaproveita os passos de Ajustes.
  const steps = await page.evaluate(`({ tabs: !!document.querySelector('[aria-label="Aparelho"]'), items: document.querySelectorAll('main ol li').length })`)
  check('cenario-3-tela-3-mostra-os-passos-para-android-e-iphone', steps.tabs && steps.items === 3, steps)

  // Voltar devolve o foco ao titulo da tela anterior.
  await page.evaluate(`document.querySelector('button[aria-label="Voltar"]').click()`)
  await until(page, `${h1Text} === ${JSON.stringify(T[1])}`, 3000)
  await sleep(250)
  const focusBack = await page.evaluate(`document.activeElement === document.querySelector('h1')`)
  check('cenario-2-voltar-leva-o-foco-ao-titulo', focusBack, {})
  check('cenario-2-voltar-nao-grava-a-marca', (await readKey(page)) === null, {})
  // Pular na tela 2 grava e leva ao Login.
  await click(page, 'Pular')
  const login = await until(page, FORM, 4000)
  check('cenario-2-pular-na-tela-2-leva-ao-login', login && (await readKey(page)) === '1', {})
}

// cenario 4: movimento reduzido.
async function scenarioReduced({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-4-onboarding-aparece', reached, {})
  if (!reached) return
  await click(page, 'Continuar')
  const anim = await page.evaluate(`(() => {
    const el = document.querySelector('.anim-onboarding-in')
    const cs = getComputedStyle(el)
    const mm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dots = [...document.querySelectorAll('.sticky [aria-hidden="true"] span')].map((s) => getComputedStyle(s).transitionDuration)
    return { name: cs.animationName, duration: cs.animationDuration, mm, dots }
  })()`)
  const seconds = parseFloat(anim.duration)
  check('cenario-4-movimento-reduzido-emulado', anim.mm, anim)
  check('cenario-4-duracao-da-entrada-de-no-maximo-0.101s', seconds <= 0.101, { duration: anim.duration })
  check('cenario-4-so-fade-sem-deslocamento', anim.name === 'fade-100', { name: anim.name })
  check('cenario-4-pontos-sem-transicao-longa', anim.dots.every((d) => parseFloat(d) <= 0.101), { dots: anim.dots })
  await goTo(page, 2)
  const m = await page.evaluate(readLayout())
  check('cenario-4-sem-rolagem-horizontal', m.docScrollWidth <= m.docClientWidth, m)
}

// cenario 5: Entrar grava e leva ao Login; sem sessao a marca nao e gravada no meio; com sessao e silenciosa.
async function scenarioFinish({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-5-onboarding-aparece', reached, {})
  if (!reached) return
  await goTo(page, 1)
  check('cenario-5-tela-2-nao-gravou-a-marca', (await readKey(page)) === null, {})

  // Recarregar no meio: em MOCK a sessao volta e o app abre; a marca e gravada em silencio (P-05) sem onboarding.
  await navigate('/', READY_APP)
  const session = await page.evaluate(`({ h1: ${h1Text} ?? null, key: localStorage.getItem(${JSON.stringify(KEY)}), main: !!document.querySelector('main') })`).catch(() => null)
  check('cenario-5-com-sessao-o-onboarding-nao-aparece', session !== null && !T.includes(session.h1), { h1: session?.h1 })
  check('cenario-5-com-sessao-a-marca-e-gravada-em-silencio', session !== null && session.key === '1', { key: session?.key })

  // Sem a marca e sem sessao, a apresentacao recomeca na tela 1 (a instancia e nova: passo 0).
  const again = await reachOnboarding(page, navigate)
  check('cenario-5-recomeca-na-tela-1', again && (await page.evaluate(`document.querySelector('h1')?.textContent.trim()`)) === T1, {})
  check('cenario-5-recomecar-nao-gravou', (await readKey(page)) === null, {})

  // Entrar na tela 3 grava e leva ao Login.
  await goTo(page, 2)
  const label = await page.evaluate(`!!(${btn('Entrar')}) && !(${btn('Continuar')})`)
  check('cenario-5-tela-3-tem-entrar-no-lugar-de-continuar', label, {})
  await click(page, 'Entrar')
  const login = await until(page, FORM, 4000)
  check('cenario-5-entrar-mostra-o-login', login, {})
  check('cenario-5-entrar-grava-a-marca', (await readKey(page)) === '1', {})
  check('cenario-5-login-sem-onboarding-por-tras', !(await page.evaluate(`!!document.querySelector('main button[aria-label="Voltar"]')`)), {})
}

// cenario 6: replay em Ajustes.
async function scenarioReplay({ page, check, navigate }) {
  await navigate('/configuracoes', `${ROW}`)
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`)
  const open = async () => {
    await page.evaluate(`(() => { const b = ${ROW}; b.focus(); b.click() })()`)
    return until(page, DIALOG, 3000)
  }
  check('cenario-6-linha-rever-a-apresentacao-existe', await page.evaluate(`!!(${ROW}) && ${ROW}.textContent.includes('As 3 telas de boas-vindas')`), {})
  const opened = await open()
  check('cenario-6-abre-o-dialogo', opened, {})
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
    }
  })()`)
  check('cenario-6-dialogo-modal-com-fechar', d.modal === 'true' && d.labels.includes('Fechar') && !d.labels.includes('Pular') && d.fixed === 'fixed', d)
  check('cenario-6-foco-entra-no-dialogo', d.focusInside && d.onH1, d)
  check('cenario-6-rolagem-do-app-travada', d.bodyOverflow === 'hidden', d)

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
  check('cenario-6-foco-preso-no-dialogo', escaped === 0, { escaped })

  // Esc fecha, devolve o foco a linha, nao grava e nao mostra o Login.
  await pressKey(page, 'Escape', 27)
  const closed = await until(page, `!(${DIALOG})`, 3000)
  check('cenario-6-esc-fecha', closed, {})
  const after = await page.evaluate(`({ key: localStorage.getItem(${JSON.stringify(KEY)}), login: !!${FORM}, path: location.pathname, focusRow: document.activeElement === (${ROW}), bodyOverflow: document.body.style.overflow })`)
  check('cenario-6-foco-volta-a-linha', after.focusRow, after)
  check('cenario-6-esc-nao-grava-a-marca', after.key === null, after)
  check('cenario-6-esc-nao-leva-ao-login', !after.login && after.path === '/configuracoes', after)
  check('cenario-6-rolagem-do-app-liberada', after.bodyOverflow !== 'hidden', after)

  // Concluir na tela 3 tambem fecha sem gravar; Fechar na tela 1 idem.
  await open()
  await goTo(page, 2)
  const labels3 = await page.evaluate(`[...${DIALOG}.querySelectorAll('button')].map((b) => b.textContent.trim())`)
  check('cenario-6-tela-3-tem-concluir-e-fechar', labels3.includes('Concluir') && labels3.includes('Fechar') && !labels3.includes('Entrar'), { labels3 })
  await click(page, 'Concluir')
  const done = await until(page, `!(${DIALOG})`, 3000)
  const key2 = await readKey(page)
  check('cenario-6-concluir-fecha-sem-gravar-nem-ir-ao-login', done && key2 === null && !(await page.evaluate(`!!${FORM}`)), { key2 })
  await open()
  await click(page, 'Fechar')
  check('cenario-6-fechar-fecha', await until(page, `!(${DIALOG})`, 3000), {})
  check('cenario-6-fechar-nao-grava', (await readKey(page)) === null, {})
}

// cenario 7: tema escuro nas tres telas.
async function scenarioDark({ page, check, navigate }) {
  const reached = await reachOnboarding(page, navigate)
  check('cenario-7-onboarding-aparece', reached, {})
  if (!reached) return
  for (let n = 0; n < 3; n++) {
    await goTo(page, n)
    const s = await page.evaluate(`({ body: getComputedStyle(document.body).backgroundColor, dark: document.documentElement.classList.contains('dark'), main: getComputedStyle(document.querySelector('main')).backgroundColor, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })`)
    check(`cenario-7-tela-${n + 1}-corpo-em-rgb-10-21-16-sem-rolagem-horizontal`, s.body === DARK_BODY && s.dark && s.main === DARK_BODY && s.w <= s.cw, s)
  }
}

// cenario 8: armazenamento indisponivel conta como visto e leva direto ao Login.
async function scenarioStorage({ page, check, navigate }) {
  await navigate('/configuracoes', `${LOGOUT}`)
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`)
  // Depois do boot (o modo MOCK precisa do armazenamento para abrir), a leitura passa a lancar.
  await page.evaluate(`Storage.prototype.getItem = function () { throw new Error('armazenamento indisponivel') }`)
  await page.evaluate(`(() => { const b = ${LOGOUT}; b.focus(); b.click() })()`)
  const login = await until(page, FORM, 6000)
  check('cenario-8-armazenamento-lancando-leva-direto-ao-login', login, {})
  const onboarding = await page.evaluate(`${T.map((t) => JSON.stringify(t)).join(' === document.querySelector("h1")?.textContent.trim() || ')} === document.querySelector("h1")?.textContent.trim()`)
  check('cenario-8-sem-onboarding', !onboarding, {})
}

// cenario 9 (pendencia do 05-12): a marca de sessao do aviso de endereco novo sobrevive as telas do onboarding.
async function scenarioLegacyOrigin({ page, check, navigate }) {
  await navigate('/?origem=antigo', READY_APP)
  const stored = () => page.evaluate(`sessionStorage.getItem('coinc:origem-antiga')`)
  check('cenario-9-chegada-pelo-redirect-guarda-a-marca', (await stored()) === 'antigo', {})
  const reached = await reachOnboarding(page, navigate)
  check('cenario-9-onboarding-aparece', reached, {})
  if (!reached) return
  for (let n = 0; n < 3; n++) {
    await goTo(page, n)
    check(`cenario-9-tela-${n + 1}-marca-de-sessao-intacta`, (await stored()) === 'antigo', {})
    check(`cenario-9-tela-${n + 1}-sem-aviso-no-onboarding`, !(await page.evaluate(`document.body.innerText.includes('O Coinc mudou de endereço.')`)), {})
  }
  await click(page, 'Entrar')
  const login = await until(page, FORM, 4000)
  check('cenario-9-entrar-mostra-o-login', login, {})
  const notice = await page.evaluate(`document.body.innerText.includes('O Coinc mudou de endereço.') && document.body.innerText.includes('Entre de novo por aqui. Seus dados continuam salvos.')`)
  check('cenario-9-login-mostra-o-aviso-de-endereco-novo', notice, {})
  check('cenario-9-marca-de-sessao-continua-ate-o-login-dar-certo', (await stored()) === 'antigo', {})
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
      await inTab(chrome, 'tamanhos', viewport, {}, results, scenarioLayout)
      await inTab(chrome, 'fluxo', viewport, {}, results, scenarioFlow)
      await inTab(chrome, 'movimento-reduzido', viewport, { reduced: true }, results, scenarioReduced)
      await inTab(chrome, 'entrar-e-recarga', viewport, {}, results, scenarioFinish)
      await inTab(chrome, 'replay', viewport, {}, results, scenarioReplay)
      await inTab(chrome, 'tema-escuro', viewport, { seed: { 'coinc:tema:v1': 'escuro' } }, results, scenarioDark)
      await inTab(chrome, 'armazenamento-indisponivel', viewport, {}, results, scenarioStorage)
      await inTab(chrome, 'origem-antiga', viewport, {}, results, scenarioLegacyOrigin)
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
