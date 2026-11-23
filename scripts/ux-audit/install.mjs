#!/usr/bin/env node
// Executor CDP dos passos de adicionar o Coinc a tela inicial (plano 05-11, IDEN-03, D-11, D-12, P-02, P-06)
// em Chrome sem janela e modo MOCK, a 360x640 com toque. Vite e Chrome so em 127.0.0.1 (porta 5195); so dados
// ficticios do seed; nada e lido de .env*; perfil temporario do Chrome removido no fim.
// Cenarios (cada um em aba nova, com o localStorage semeado):
//  1 folha abre pelo cartao Aplicativo (#aplicativo, depois de Notificacoes);
//  2 seletor Aparelho (setas, Home e End, so a ativa tabulavel) e os tres passos de cada plataforma;
//  3 padrao do seletor pelo agente de usuario (iPhone, Android, iPadOS que se anuncia como Mac);
//  4 sem evento nao ha Adicionar agora; evento sintetico beforeinstallprompt mostra o botao, o toque chama
//    prompt() (aceito mostra o aviso, recusado nao muda nada) e prompt() nunca roda sozinho;
//  5 display-mode standalone emulado: aviso de ja e app no lugar dos passos e linha do cartao diz Ja esta;
//  6 Esc fecha a folha e o foco volta a linha;
//  7 sem rolagem horizontal e todo alvo de toque com pelo menos 43.5 px (folha aberta nas duas plataformas).
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/install.mjs
// Saida: uma linha JSON por verificacao e a linha final `FALHAS n`. Codigos: 0 ok, 1 alguma verificacao
// falhou, 2 falha do script.
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5195
const ORIGIN = `http://127.0.0.1:${PORT}`
const ROUTE = '/configuracoes#aplicativo'
const VIEWPORT = { width: 360, height: 640 }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const UA_IPADOS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'

const ANDROID_STEPS = [
  'Toque no menu no canto superior direito do Chrome.',
  'Escolha Adicionar à tela inicial (ou Instalar app).',
  'Confirme em Adicionar. O ícone do Coinc aparece na sua tela.',
]
const IPHONE_STEPS = [
  'Abra o Coinc no Safari. Em outros navegadores essa opção pode não aparecer.',
  'Toque em Compartilhar na barra do Safari.',
  'Role e escolha Adicionar à Tela de Início, depois toque em Adicionar.',
]
const ADDED_TEXT = 'Adicionado. Procure o ícone do Coinc na tela inicial.'
const ALREADY_APP_TEXT = 'Você já está usando o Coinc como app.'

// Expressoes avaliadas na pagina.
const CARD = `document.querySelector('section#aplicativo')`
const ROW = `[...(${CARD}?.querySelectorAll('button') ?? [])].find((b) => b.textContent.includes('Adicionar à tela inicial'))`
const DIALOG = `document.querySelector('[role="dialog"][aria-modal="true"]')`
const TABLIST = `${DIALOG}?.querySelector('[role="tablist"][aria-label="Aparelho"]')`
const TABS = `[...(${TABLIST}?.querySelectorAll('[role="tab"]') ?? [])]`
const STEP_TEXTS = `[...(${DIALOG}?.querySelectorAll('ol > li p') ?? [])].map((p) => p.textContent.replace(/\\s+/g, ' ').trim())`
const NOW_BUTTON = `[...(${DIALOG}?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === 'Adicionar agora')`

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

/** Script que limpa o armazenamento do mock e grava a semente a cada documento novo. */
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
    console.error(`install: ${signal} recebido, encerrando Chrome e Vite`)
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

async function pressKey(page, key, vk) {
  const base = { key, code: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
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

/**
 * Roda `fn` numa aba nova com o seed, o toque e as opcoes pedidas.
 * `opts.ua` e `opts.platform` trocam o agente de usuario; `opts.standalone` emula display-mode standalone.
 */
async function inTab(chrome, name, opts, results, fn) {
  const check = (label, ok, detail = {}) => {
    const line = { scenario: name, check: label, ok: Boolean(ok), ...detail }
    results.push(line)
    console.log(JSON.stringify(line))
  }
  const { page, closeTab } = await openTab(chrome)
  try {
    await page.send('Page.enable')
    await page.send('Runtime.enable')
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
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: 2,
      mobile: true,
    })
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: opts.touchPoints ?? 1 })
    if (opts.ua) {
      await page.send('Network.setUserAgentOverride', { userAgent: opts.ua, ...(opts.platform ? { platform: opts.platform } : {}) })
    }
    if (opts.standalone) {
      // O Chrome aceita display-mode em setEmulatedMedia mas nao o aplica (matches segue falso), entao a
      // consulta tambem e forcada na pagina: so a consulta (display-mode: standalone) muda, o resto e o real.
      await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] })
      await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          const orig = window.matchMedia.bind(window)
          window.matchMedia = (q) => {
            const mq = orig(q)
            if (!/display-mode:\\s*standalone/.test(String(q))) return mq
            return new Proxy(mq, {
              get(t, p) {
                if (p === 'matches') return true
                const v = t[p]
                return typeof v === 'function' ? v.bind(t) : v
              },
            })
          }
        })()`,
      })
    }
    if (opts.standaloneIos) {
      // Safari do iPhone aberto pela tela inicial: navigator.standalone verdadeiro, sem display-mode.
      await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true })`,
      })
    }
    const seed = buildSeed('full', new Date())
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: seedSource(seed) })

    const navigate = makeNavigate(page)
    await fn({ page, check, navigate })
    check('sem-excecoes-nem-console-error', collected.exceptions.length === 0 && collected.consoleErrors.length === 0, {
      exceptions: [...collected.exceptions],
      consoleErrors: [...collected.consoleErrors],
    })
  } finally {
    await closeTab()
  }
}

/** Foca a linha do cartao e a toca (foco antes, como um toque real faria). */
async function openSheet(page) {
  await page.evaluate(`(() => { const r = ${ROW}; r.focus(); r.click() })()`)
  return until(page, DIALOG)
}

/** Dispara na pagina um evento sintetico beforeinstallprompt com prompt() e userChoice simulados. */
function fakeInstallEvent(outcome) {
  return `(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true })
    window.__promptCalls = 0
    e.prompt = () => { window.__promptCalls += 1; return Promise.resolve() }
    e.userChoice = Promise.resolve({ outcome: '${outcome}', platform: 'web' })
    window.dispatchEvent(e)
    window.__fakeEvent = e
    return true
  })()`
}

const READY = `${CARD}`

// cenarios 1, 2 e 7
async function scenarioSheet({ page, check, navigate }) {
  await navigate(ROUTE, READY)

  // cenario 1: o cartao existe, vem depois de Notificacoes e antes de Sair da conta.
  const card = await page.evaluate(`(() => {
    const c = ${CARD}
    if (!c) return null
    const sections = [...document.querySelectorAll('main section[id], section[id]')].map((s) => s.id)
    const logout = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Sair da conta'))
    return {
      title: c.querySelector('h2')?.textContent ?? '',
      subtitle: c.querySelector('header p')?.textContent ?? '',
      row: ${ROW}?.textContent ?? '',
      sections,
      afterNotifications: !!document.querySelector('section#notificacoes')?.compareDocumentPosition(c) && (document.querySelector('section#notificacoes').compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      beforeLogout: !!logout && (c.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      isLast: sections[sections.length - 1] === 'aplicativo',
    }
  })()`)
  check('cenario-1-cartao-aplicativo-existe', card !== null && card.title === 'Aplicativo' && card.subtitle === 'Coinc na tela inicial', { card })
  if (card === null) return
  check('cenario-1-linha-com-o-texto-do-contrato', card.row.includes('Adicionar à tela inicial') && card.row.includes('Passo a passo para Android e iPhone'), { row: card.row })
  check('cenario-1-depois-de-notificacoes-e-antes-de-sair', card.afterNotifications && card.beforeLogout && card.isLast, { sections: card.sections })

  const opened = await openSheet(page)
  check('cenario-1-linha-abre-a-folha', opened, {})
  if (!opened) return
  const title = await page.evaluate(`${DIALOG}?.querySelector('h2')?.textContent ?? ''`)
  check('cenario-1-folha-com-o-titulo-certo', title === 'Adicionar à tela inicial', { title })

  // cenario 2: seletor Aparelho com Android e iPhone.
  const tabs = await page.evaluate(`${TABS}.map((t) => ({ name: t.textContent.trim(), selected: t.getAttribute('aria-selected') === 'true', tab: t.tabIndex }))`)
  check('cenario-2-seletor-aparelho-tem-android-e-iphone', tabs.length === 2 && tabs[0].name === 'Android' && tabs[1].name === 'iPhone', { tabs })
  check('cenario-2-so-a-opcao-ativa-e-tabulavel', tabs.every((t) => (t.selected ? t.tab === 0 : t.tab === -1)) && tabs.filter((t) => t.selected).length === 1, { tabs })

  const selectedName = () => page.evaluate(`${TABS}.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.textContent.trim())`)
  const activeIsSelected = () => page.evaluate(`document.activeElement === ${TABS}.find((t) => t.getAttribute('aria-selected') === 'true')`)

  // Android (padrao no Chrome de computador).
  check('cenario-2-padrao-sem-agente-de-iphone-e-android', JSON.stringify(await selectedName()) === '["Android"]', { selected: await selectedName() })
  const android = await page.evaluate(STEP_TEXTS)
  check('cenario-2-android-mostra-os-tres-passos-do-contrato', JSON.stringify(android) === JSON.stringify(ANDROID_STEPS), { android })

  await page.evaluate(`${TABS}[0].focus()`)
  await pressKey(page, 'ArrowRight', 39)
  await sleep(300)
  check('cenario-2-seta-direita-vai-para-iphone', JSON.stringify(await selectedName()) === '["iPhone"]' && (await activeIsSelected()), { selected: await selectedName() })
  const iphone = await page.evaluate(STEP_TEXTS)
  check('cenario-2-iphone-mostra-os-tres-passos-do-contrato', JSON.stringify(iphone) === JSON.stringify(IPHONE_STEPS), { iphone })

  // cenario 7 (parte): folha aberta com iPhone escolhido.
  await checkLayout(page, check, 'iphone-escolhido')

  await pressKey(page, 'Home', 36)
  await sleep(300)
  check('cenario-2-home-vai-para-android', JSON.stringify(await selectedName()) === '["Android"]', { selected: await selectedName() })
  await pressKey(page, 'End', 35)
  await sleep(300)
  check('cenario-2-end-vai-para-iphone', JSON.stringify(await selectedName()) === '["iPhone"]', { selected: await selectedName() })
  await pressKey(page, 'ArrowLeft', 37)
  await sleep(300)
  check('cenario-2-seta-esquerda-volta-para-android', JSON.stringify(await selectedName()) === '["Android"]', { selected: await selectedName() })
  const tabsAfter = await page.evaluate(`${TABS}.map((t) => ({ selected: t.getAttribute('aria-selected') === 'true', tab: t.tabIndex }))`)
  check('cenario-2-so-a-ativa-segue-tabulavel-depois-das-teclas', tabsAfter.every((t) => (t.selected ? t.tab === 0 : t.tab === -1)), { tabsAfter })

  // Termos: "instalar" so na citacao do menu do Chrome (D-11).
  const text = await page.evaluate(`${DIALOG}?.textContent ?? ''`)
  const stripped = text.replaceAll('Instalar app', '')
  check('cenario-2-sem-a-palavra-instalar-fora-da-citacao', !/instal/i.test(stripped), {})

  // cenario 7 (parte): folha aberta com Android.
  await checkLayout(page, check, 'android-escolhido')
}

/** cenario 7: sem rolagem horizontal e todo alvo visivel com pelo menos 43.5 px. */
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
    const dialog = ${DIALOG}
    const wide = dialog ? dialog.scrollWidth > dialog.clientWidth : false
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, small, dialogWide: wide }
  })()`)
  check(`cenario-7-sem-rolagem-horizontal-${label}`, m.scrollWidth <= m.clientWidth && !m.dialogWide, m)
  check(`cenario-7-alvos-de-pelo-menos-43.5px-${label}`, m.small.length === 0, { small: m.small })
}

// cenario 3: padrao do seletor pelo agente de usuario.
async function scenarioDefault(page, check, navigate, expected, label) {
  await navigate(ROUTE, READY)
  const opened = await openSheet(page)
  const selected = opened ? await page.evaluate(`${TABS}.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.textContent.trim())`) : null
  check(`cenario-3-${label}-padrao-${expected}`, JSON.stringify(selected) === JSON.stringify([expected]), { selected })
  if (!opened) return
  const steps = await page.evaluate(STEP_TEXTS)
  check(`cenario-3-${label}-passos-da-plataforma-certa`, JSON.stringify(steps) === JSON.stringify(expected === 'iPhone' ? IPHONE_STEPS : ANDROID_STEPS), { steps })
}

// cenario 4: evento de adicao.
async function scenarioNoEvent({ page, check, navigate }) {
  await navigate(ROUTE, READY)
  check('cenario-4-sem-evento-a-folha-abre', await openSheet(page), {})
  check('cenario-4-sem-evento-nao-existe-adicionar-agora', (await page.evaluate(`!!(${NOW_BUTTON})`)) === false, {})
  check('cenario-4-sem-evento-os-passos-aparecem', (await page.evaluate(`${STEP_TEXTS}.length`)) === 3, {})
}

async function scenarioAccepted({ page, check, navigate }) {
  await navigate(ROUTE, READY)
  await openSheet(page)
  await page.evaluate(fakeInstallEvent('accepted'))
  const shown = await until(page, NOW_BUTTON)
  check('cenario-4-evento-faz-o-botao-aparecer', shown, {})
  if (!shown) return
  const pre = await page.evaluate(`({ calls: window.__promptCalls, prevented: window.__fakeEvent.defaultPrevented, steps: ${STEP_TEXTS}.length })`)
  check('cenario-4-prompt-nunca-roda-sozinho', pre.calls === 0, pre)
  check('cenario-4-evento-guardado-com-preventDefault', pre.prevented === true, pre)
  check('cenario-4-passos-continuam-visiveis-com-o-botao', pre.steps === 3, pre)
  const order = await page.evaluate(`(() => {
    const b = ${NOW_BUTTON}
    const ol = ${DIALOG}.querySelector('ol')
    return !!b && !!ol && (b.compareDocumentPosition(ol) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  })()`)
  check('cenario-4-botao-fica-acima-dos-passos', order, {})
  await checkLayout(page, check, 'com-botao-nativo')

  await page.evaluate(`${NOW_BUTTON}.click()`)
  const added = await until(page, `${DIALOG}.textContent.includes(${JSON.stringify(ADDED_TEXT)})`)
  const post = await page.evaluate(`({ calls: window.__promptCalls, steps: ${STEP_TEXTS}.length, button: !!(${NOW_BUTTON}) })`)
  check('cenario-4-toque-chama-prompt-uma-vez', post.calls === 1, post)
  check('cenario-4-aceito-mostra-o-aviso-de-adicionado', added, {})
  check('cenario-4-aceito-mantem-os-passos', post.steps === 3, post)
}

async function scenarioDismissed({ page, check, navigate }) {
  await navigate(ROUTE, READY)
  // Evento chega antes de a folha abrir: o estado vive no modulo, nao no componente.
  await page.evaluate(fakeInstallEvent('dismissed'))
  await openSheet(page)
  const shown = await until(page, NOW_BUTTON)
  check('cenario-4-evento-anterior-a-folha-tambem-mostra-o-botao', shown, {})
  if (!shown) return
  await page.evaluate(`${NOW_BUTTON}.click()`)
  await until(page, `window.__promptCalls === 1`)
  await sleep(500)
  const post = await page.evaluate(`({ calls: window.__promptCalls, added: ${DIALOG}.textContent.includes(${JSON.stringify(ADDED_TEXT)}), steps: ${STEP_TEXTS}.length, dialog: !!${DIALOG} })`)
  check('cenario-4-recusado-chama-prompt-uma-vez', post.calls === 1, post)
  check('cenario-4-recusado-nao-mostra-aviso-e-mantem-passos', post.added === false && post.steps === 3 && post.dialog === true, post)
}

// cenario 5: standalone emulado.
async function scenarioStandalone({ page, check, navigate }) {
  await navigate(ROUTE, READY)
  const media = await page.evaluate(`window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`)
  check('cenario-5-standalone-emulado', media === true, { media })
  const row = await page.evaluate(`${ROW}?.textContent ?? ''`)
  check('cenario-5-linha-do-cartao-diz-ja-esta-na-tela-inicial', row.includes('Já está na tela inicial') && !row.includes('Passo a passo'), { row })
  // Mesmo com o evento chegando, o botao nao aparece quando ja e app.
  await page.evaluate(fakeInstallEvent('accepted'))
  const opened = await openSheet(page)
  check('cenario-5-folha-abre', opened, {})
  if (!opened) return
  await sleep(300)
  const state = await page.evaluate(`({
    text: ${DIALOG}.textContent.includes(${JSON.stringify(ALREADY_APP_TEXT)}),
    button: !!(${NOW_BUTTON}),
    list: !!${DIALOG}.querySelector('ol'),
    tabs: !!(${TABLIST}),
    status: !!${DIALOG}.querySelector('[role="status"]'),
  })`)
  check('cenario-5-mostra-voce-ja-esta-usando-o-coinc-como-app', state.text && state.status, state)
  check('cenario-5-sem-botao-nem-passos-nem-seletor', !state.button && !state.list && !state.tabs, state)
}

// cenario 6: Esc fecha a folha e o foco volta a linha.
async function scenarioEscape({ page, check, navigate }) {
  await navigate(ROUTE, READY)
  const opened = await openSheet(page)
  check('cenario-6-folha-abre', opened, {})
  if (!opened) return
  const focusInside = await page.evaluate(`${DIALOG}.contains(document.activeElement)`)
  check('cenario-6-foco-vai-para-dentro-da-folha', focusInside, {})
  await pressKey(page, 'Escape', 27)
  const closed = await until(page, `!${DIALOG}`, 3000)
  check('cenario-6-esc-fecha-a-folha', closed, {})
  const back = await page.evaluate(`document.activeElement === ${ROW}`)
  check('cenario-6-foco-volta-a-linha', back, {})
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

    await inTab(chrome, 'folha', {}, results, scenarioSheet)
    await inTab(chrome, 'agente-iphone', { ua: UA_IPHONE, platform: 'iPhone' }, results, (c) =>
      scenarioDefault(c.page, c.check, c.navigate, 'iPhone', 'iphone'),
    )
    await inTab(chrome, 'agente-android', { ua: UA_ANDROID, platform: 'Linux armv81' }, results, (c) =>
      scenarioDefault(c.page, c.check, c.navigate, 'Android', 'android'),
    )
    await inTab(chrome, 'agente-ipados-como-mac', { ua: UA_IPADOS_MAC, platform: 'MacIntel', touchPoints: 5 }, results, (c) =>
      scenarioDefault(c.page, c.check, c.navigate, 'iPhone', 'ipados-como-mac'),
    )
    await inTab(chrome, 'sem-evento', {}, results, scenarioNoEvent)
    await inTab(chrome, 'evento-aceito', {}, results, scenarioAccepted)
    await inTab(chrome, 'evento-recusado', {}, results, scenarioDismissed)
    await inTab(chrome, 'standalone', { standalone: true }, results, scenarioStandalone)
    await inTab(chrome, 'standalone-ios', { standaloneIos: true, ua: UA_IPHONE, platform: 'iPhone' }, results, scenarioStandalone)
    await inTab(chrome, 'esc-e-foco', {}, results, scenarioEscape)

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
    console.error(`install: falha do script: ${err.message}`)
    process.exit(2)
  },
)
