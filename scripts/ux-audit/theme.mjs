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

/** Navega (ou recarrega, quando so o hash muda a navegacao seria no mesmo documento) e espera o React montar. */
async function navigate(page, url, { reload = false } = {}) {
  const loaded = page.waitFor('Page.loadEventFired', 30000)
  if (reload) await page.send('Page.reload')
  else await page.send('Page.navigate', { url })
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

const GROUP_SEL = '[role="radiogroup"][aria-label="Tema do aplicativo"]'

/** Estado do grupo Tema: textos, marcado, tabulaveis, foco e alvos do cartao Aparencia. */
const READ_GROUP = `(() => {
  const group = document.querySelector(${JSON.stringify(GROUP_SEL)})
  const radios = group ? [...group.querySelectorAll('[role="radio"]')] : []
  const card = document.getElementById('aparencia')
  const targets = card ? [...card.querySelectorAll('button, input, a[href], [role="radio"]')] : []
  const small = targets
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5))
    .map(({ el, r }) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
  return {
    found: group !== null,
    names: radios.map((el) => (el.querySelector('span span')?.textContent ?? '').trim()),
    checked: radios.map((el) => el.getAttribute('aria-checked')),
    tabbable: radios.filter((el) => el.tabIndex === 0).length,
    focusedName: radios.findIndex((el) => el === document.activeElement),
    disabled: radios.some((el) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'),
    small,
    subtitle: card?.textContent?.includes('Tema e nomes das abas') ?? false,
    oldNote: card?.textContent?.includes('Tema claro.') ?? false,
  }
})()`

const clickRadio = (page, name) =>
  page.evaluate(`(() => {
    const group = document.querySelector(${JSON.stringify(GROUP_SEL)})
    const el = [...group.querySelectorAll('[role="radio"]')].find((r) => r.textContent.includes(${JSON.stringify(name)}))
    el.click()
    return true
  })()`)

const KEYS = { ArrowDown: 40, ArrowUp: 38, Home: 36, End: 35 }
async function pressKey(page, key) {
  const base = { key, code: key, windowsVirtualKeyCode: KEYS[key] }
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  await sleep(150)
}

const setSystemTheme = (page, value) =>
  page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] })

/** Cenario 2: seletor de Ajustes. Escolher aplica na hora, grava a chave e sobrevive a recarregamento. */
async function scenarioSelector(ctx) {
  const { page } = ctx
  await setSystemTheme(page, 'light')
  await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true })
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(THEME_KEY)})`)
  await navigate(page, `${ORIGIN}/configuracoes#aparencia`)

  let g = await page.evaluate(READ_GROUP)
  check('seletor: o grupo Tema do aplicativo existe com tres radios', g.found && g.names.length === 3, g.names.join(','))
  check('seletor: ordem Automatico, Claro, Escuro', g.names.join(',') === 'Automático,Claro,Escuro', g.names.join(','))
  check('seletor: Automatico vem marcado por padrao e so ele e tabulavel', g.checked.join(',') === 'true,false,false' && g.tabbable === 1, g.checked.join(','))
  check('seletor: subtitulo novo e sem a nota antiga', g.subtitle && !g.oldNote)
  check('seletor: nenhum radio desabilitado', !g.disabled)
  check('seletor: todo alvo do cartao tem pelo menos 43,5 px', g.small.length === 0, g.small.join(' | '))
  let s = await page.evaluate(READ_STATE)
  check('seletor: sistema claro e Automatico deixam a pagina clara', s.dark === false)
  check('seletor: sem rolagem horizontal a 360x640', s.scrollW <= s.clientW, `${s.scrollW} x ${s.clientW}`)

  // Escuro: na hora, grava e sobrevive ao recarregamento antes do primeiro filho de #root.
  await clickRadio(page, 'Escuro')
  await sleep(200)
  s = await page.evaluate(READ_STATE)
  check('Escuro: liga a classe dark na hora', s.dark === true && s.body === DARK_BODY, s.body)
  check('Escuro: grava escuro na chave do aparelho', s.stored === 'escuro', String(s.stored))
  check('Escuro: atualiza a meta theme-color', s.meta === DARK_META, String(s.meta))
  g = await page.evaluate(READ_GROUP)
  check('Escuro: a opcao fica marcada', g.checked.join(',') === 'false,false,true', g.checked.join(','))
  await navigate(page, `${ORIGIN}/configuracoes#aparencia`, { reload: true })
  s = await page.evaluate(READ_STATE)
  check('Escuro: sobrevive ao recarregamento com a classe antes do primeiro filho de #root', s.dark === true && s.darkAt !== null && s.rootAt !== null && s.darkAt < s.rootAt, `dark ${s.darkAt?.toFixed?.(1)} ms, #root ${s.rootAt?.toFixed?.(1)} ms`)
  g = await page.evaluate(READ_GROUP)
  check('Escuro: depois do recarregamento a opcao continua marcada', g.checked.join(',') === 'false,false,true', g.checked.join(','))
  check('Escuro: alvos do cartao com 43,5 px ou mais no escuro', g.small.length === 0, g.small.join(' | '))
  s = await page.evaluate(READ_STATE)
  check('Escuro: sem rolagem horizontal', s.scrollW <= s.clientW, `${s.scrollW} x ${s.clientW}`)

  // Claro: desliga mesmo com o sistema escuro.
  await setSystemTheme(page, 'dark')
  await clickRadio(page, 'Claro')
  await sleep(200)
  s = await page.evaluate(READ_STATE)
  check('Claro: desliga a classe dark mesmo com o sistema escuro e grava claro', s.dark === false && s.stored === 'claro' && s.meta === LIGHT_META, `${s.dark} ${s.stored} ${s.meta}`)

  // Automatico acompanha o celular com o app aberto.
  await clickRadio(page, 'Automático')
  await sleep(200)
  s = await page.evaluate(READ_STATE)
  check('Automatico com sistema escuro: liga a classe e grava auto', s.dark === true && s.stored === 'auto', `${s.dark} ${s.stored}`)
  await setSystemTheme(page, 'light')
  await sleep(300)
  s = await page.evaluate(READ_STATE)
  check('Automatico: trocar o sistema para claro desliga com o app aberto', s.dark === false && s.meta === LIGHT_META, `${s.dark} ${s.meta}`)
  await setSystemTheme(page, 'dark')
  await sleep(300)
  s = await page.evaluate(READ_STATE)
  check('Automatico: trocar o sistema para escuro liga com o app aberto', s.dark === true && s.meta === DARK_META, `${s.dark} ${s.meta}`)
  await setSystemTheme(page, 'light')
  await sleep(200)

  check('seletor: nenhuma excecao nem console.error', ctx.collected.exceptions.length === 0 && ctx.collected.consoleErrors.length === 0, [...ctx.collected.exceptions, ...ctx.collected.consoleErrors].join(' | '))
}

/** Cenario 3: teclado do radiogroup e sincronizacao entre abas pelo evento storage. */
async function scenarioKeyboardAndStorage(ctx) {
  const { page } = ctx
  await setSystemTheme(page, 'light')
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(THEME_KEY)})`)
  await navigate(page, `${ORIGIN}/configuracoes#aparencia`, { reload: true })
  await page.evaluate(`document.querySelector(${JSON.stringify(GROUP_SEL + ' [role="radio"][aria-checked="true"]')}).focus()`)
  await sleep(100)

  await pressKey(page, 'ArrowDown')
  let g = await page.evaluate(READ_GROUP)
  let s = await page.evaluate(READ_STATE)
  check('teclado: seta para baixo move e ativa Claro', g.checked.join(',') === 'false,true,false' && g.focusedName === 1 && s.stored === 'claro', `${g.checked.join(',')} foco ${g.focusedName} ${s.stored}`)
  await pressKey(page, 'End')
  g = await page.evaluate(READ_GROUP)
  s = await page.evaluate(READ_STATE)
  check('teclado: End vai para Escuro e liga a classe dark', g.checked.join(',') === 'false,false,true' && s.dark === true && s.stored === 'escuro', `${g.checked.join(',')} ${s.dark} ${s.stored}`)
  await pressKey(page, 'ArrowDown')
  g = await page.evaluate(READ_GROUP)
  check('teclado: seta para baixo no ultimo volta ao primeiro', g.checked.join(',') === 'true,false,false', g.checked.join(','))
  await pressKey(page, 'ArrowUp')
  g = await page.evaluate(READ_GROUP)
  check('teclado: seta para cima no primeiro vai ao ultimo', g.checked.join(',') === 'false,false,true', g.checked.join(','))
  await pressKey(page, 'Home')
  g = await page.evaluate(READ_GROUP)
  check('teclado: Home volta a Automatico', g.checked.join(',') === 'true,false,false' && g.tabbable === 1, g.checked.join(','))

  // Outra aba do mesmo aparelho grava a chave; o evento storage chega nesta aba.
  const fireStorage = (value) =>
    page.evaluate(`(() => {
      localStorage.setItem(${JSON.stringify(THEME_KEY)}, ${JSON.stringify(value)})
      window.dispatchEvent(new StorageEvent('storage', { key: ${JSON.stringify(THEME_KEY)}, newValue: ${JSON.stringify(value)}, storageArea: localStorage }))
    })()`)
  await fireStorage('escuro')
  await sleep(200)
  s = await page.evaluate(READ_STATE)
  g = await page.evaluate(READ_GROUP)
  check('storage: outra aba gravando escuro liga a classe e atualiza o seletor', s.dark === true && g.checked.join(',') === 'false,false,true', `${s.dark} ${g.checked.join(',')}`)
  await fireStorage('claro')
  await sleep(200)
  s = await page.evaluate(READ_STATE)
  check('storage: outra aba gravando claro desliga a classe', s.dark === false, String(s.dark))
  await fireStorage('xyz')
  await sleep(200)
  g = await page.evaluate(READ_GROUP)
  check('storage: valor desconhecido vale Automatico', g.checked.join(',') === 'true,false,false', g.checked.join(','))

  check('teclado e storage: nenhuma excecao nem console.error', ctx.collected.exceptions.length === 0 && ctx.collected.consoleErrors.length === 0, [...ctx.collected.exceptions, ...ctx.collected.consoleErrors].join(' | '))
}

const SCENARIOS_FULL = [scenarioSelector, scenarioKeyboardAndStorage]

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
