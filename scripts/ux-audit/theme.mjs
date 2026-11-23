#!/usr/bin/env node
// Auditor CDP do tema (plano 05-06, D-08, D-09, IDEN-05): Vite em modo MOCK na porta 5190 e Chrome sem janela.
// So 127.0.0.1; nada lido de .env*; perfil temporario do Chrome removido no fim; nenhuma dependencia nova.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/theme.mjs --smoke
//   --smoke  so o primeiro desenho: escuro forcado no aparelho nasce pintado, sem piscar o tema errado.
//   sem flag todos os cenarios (smoke mais o seletor de Ajustes e o modo Automatico).
//   --audit  (plano 05-15, D-10, IDEN-06) todas as rotas e telas de entrada nos dois temas e nos dois tamanhos,
//            cinco verificacoes (rolagem horizontal, contraste, bloco claro no escuro, hex em src, alvo de toque)
//            e uma captura por tela e tema. Filtros: --route R, --theme claro|escuro, --viewport LxA,
//            --report-only (lista violacoes e sai com 0).
//   --overlays (plano 05-16, D-10, IDEN-06) abre cada sobreposicao de OVERLAY_LIST por interacao real em MOCK, nos
//            dois temas e nos dois tamanhos, e roda nelas as mesmas cinco verificacoes mais a da veladura preta.
//            Filtros: --route ID (id da sobreposicao), --theme, --viewport, --report-only.
//   --selftest  prova que o auditor enxerga defeitos: injeta um bloco claro, texto sem contraste, alvo pequeno e
//            estouro de largura no escuro e exige que as quatro verificacoes de pagina os acusem.
// Saida: uma linha por verificacao e a linha final `FALHAS n`. Codigos: 0 sem falha, 1 alguma falha,
// 2 falha do proprio script (Chrome ausente, Vite nao subiu, prazo vencido).
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
  const opts = { smoke: false, audit: false, overlays: false, selftest: false, reportOnly: false, route: null, theme: null, viewport: null }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--smoke') opts.smoke = true
    else if (arg === '--audit') opts.audit = true
    else if (arg === '--overlays') opts.overlays = true
    else if (arg === '--selftest') opts.selftest = true
    else if (arg === '--report-only') opts.reportOnly = true
    else if (arg === '--route' || arg === '--theme' || arg === '--viewport') {
      const value = argv[++i]
      if (value === undefined) throw new Error(`${arg} pede um valor`)
      opts[arg.slice(2)] = value
    } else throw new Error(`flag desconhecida: ${arg}`)
  }
  if (opts.theme !== null && !['claro', 'escuro'].includes(opts.theme)) throw new Error('--theme aceita claro ou escuro')
  if (opts.viewport !== null && !/^\d+x\d+$/.test(opts.viewport)) throw new Error('--viewport aceita LxA, por exemplo 390x844')
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

// ---------------------------------------------------------------------------------------------------------
// Modo --audit (plano 05-15, D-10, IDEN-06): rotas e telas de entrada nos dois temas e nos dois tamanhos.
// ---------------------------------------------------------------------------------------------------------

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CAPTURES_DIR = path.join(ROOT_DIR, '.planning', 'phases', '05-identidade-coinki-pwa-e-onboarding', 'captures')
const AUDIT_THEMES = ['claro', 'escuro']
const AUDIT_VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]
const CAPTURE_VIEWPORT = '390x844'
const AUDIT_TOTAL_TIMEOUT_MS = 20 * 60 * 1000
const AUDIT_COMBO_TIMEOUT_MS = 60000
const MIN_TARGET = 43.5
const MIN_BLOCK = 64

/**
 * Excecoes do auditor. Toda excecao tem motivo e vale para UMA verificacao. So entram aqui coisas de terceiros,
 * de dado do usuario ou isentas por norma; nunca um defeito nosso (T-05-15-03).
 */
const AUDIT_EXCEPTIONS = [
  {
    id: 'widget-pluggy',
    check: 'bloco-claro',
    selector: 'iframe[src*="pluggy"], iframe[title*="Pluggy"]',
    reason: 'O widget do Pluggy Connect e de terceiros, vive em iframe e nao segue o tema; continua claro (UI-SPEC P-09).',
  },
  {
    id: 'cor-de-categoria-de-evento',
    check: 'bloco-claro',
    selector: '.rounded-full[style*="background"]',
    reason: 'A cor de categoria de evento e escolhida pelo usuario (DEFAULT_EVENT_CATEGORY_COLORS) e e dado: aparece so como ponto de cor com borda, nunca como fundo de texto (UI-SPEC S6).',
  },
  {
    id: 'balao-do-vintem',
    check: 'bloco-claro',
    selector: '[class*="bg-[var(--vintem-balloon)]"]',
    reason: 'O balao do Vintem e claro de proposito, com texto escuro, nos dois temas (UI-SPEC, Vintem nos dois temas); o contraste dele e medido normalmente.',
  },
  {
    id: 'controle-desabilitado',
    check: 'contraste',
    selector: ':disabled, [aria-disabled="true"], fieldset:disabled *',
    reason: 'Controle desabilitado e inativo e fica isento de contraste minimo na WCAG 1.4.3.',
  },
]

/** Telas percorridas. `prep` leva a pagina ate o estado certo depois da navegacao inicial. */
const sel = {
  button: (text) => `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(text)})`,
}
const AUDIT_SCREENS = [
  { id: 'home', path: '/' },
  { id: 'transacoes', path: '/transacoes' },
  { id: 'calendario', path: '/calendario' },
  { id: 'contas-fixas', path: '/contas-fixas' },
  { id: 'casal', path: '/casal' },
  { id: 'relatorios-categorias', path: '/relatorios', tab: 'Categorias' },
  { id: 'relatorios-comparacao', path: '/relatorios', tab: 'Comparação' },
  { id: 'relatorios-evolucao', path: '/relatorios', tab: 'Evolução' },
  { id: 'relatorios-visao-geral', path: '/relatorios', tab: 'Visão geral' },
  { id: 'metas', path: '/metas' },
  { id: 'porquinho', path: '/porquinho' },
  { id: 'configuracoes', path: '/configuracoes' },
  { id: 'vintem-teste', path: '/vintem-teste' },
  { id: 'login', path: '/configuracoes', entry: 'login' },
  { id: 'onboarding-1', path: '/configuracoes', entry: 'onboarding', step: 0 },
  { id: 'onboarding-2', path: '/configuracoes', entry: 'onboarding', step: 1 },
  { id: 'onboarding-3', path: '/configuracoes', entry: 'onboarding', step: 2 },
  { id: 'falha', path: '/', entry: 'falha' },
]

/** Semeia o mock, a marca do onboarding e o tema do combo em CADA documento novo. */
function auditBootSource(theme) {
  const seed = buildSeed('full')
  return `(() => { try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('db::') || k.startsWith('doc::')) localStorage.removeItem(k)
    const seed = ${JSON.stringify(seed)}
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    localStorage.setItem('coinc:onboarding:v1', '1')
    localStorage.setItem(${JSON.stringify(THEME_KEY)}, ${JSON.stringify(theme)})
  } catch {} })()`
}

/**
 * Roda DENTRO da pagina (serializada com toString): as verificacoes (a), (b), (c) e (e).
 * A verificacao (d), hex literal em src, e estatica e roda no Node.
 */
function pageAudit(cfg) {
  const round = (n) => Math.round(n * 100) / 100
  const cap = (list) => list.slice(0, 100)
  const doc = document.documentElement
  const selectorOf = (el) => {
    let s = el.tagName.toLowerCase()
    if (el.id) s += `#${el.id}`
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : []
    if (cls.length) s += `.${cls.join('.')}`
    const label = el.getAttribute('aria-label') || (el.textContent || '').trim()
    if (label) s += ` "${label.replace(/\s+/g, ' ').slice(0, 28)}"`
    return s
  }
  const isVisible = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return false
    return typeof el.checkVisibility === 'function' ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : true
  }
  const inAriaHidden = (el) => el.closest('[aria-hidden="true"]') !== null
  const exceptionHits = {}
  const excepted = (el, check) => {
    for (const ex of cfg.exceptions) {
      if (ex.check !== check) continue
      if (el.matches(ex.selector) || el.closest(ex.selector)) {
        exceptionHits[ex.id] = (exceptionHits[ex.id] ?? 0) + 1
        return true
      }
    }
    return false
  }

  // Cores: o canvas resolve qualquer sintaxe (rgb, color-mix, oklab) para sRGB.
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const g2d = canvas.getContext('2d', { willReadFrequently: true })
  const colorCache = new Map()
  const parse = (css) => {
    if (colorCache.has(css)) return colorCache.get(css)
    g2d.clearRect(0, 0, 1, 1)
    g2d.fillStyle = '#000'
    g2d.fillStyle = css
    g2d.fillRect(0, 0, 1, 1)
    const d = g2d.getImageData(0, 0, 1, 1).data
    const out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
    colorCache.set(css, out)
    return out
  }
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a)
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
    const mix = (t, b) => (t * top.a + b * bottom.a * (1 - top.a)) / a
    return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a }
  }
  const lin = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
  const ratioOf = (a, b) => {
    const la = lum(a)
    const lb = lum(b)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }
  const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

  /** Fundo efetivo de `el` (o proprio fundo entra quando includeSelf for verdadeiro) e opacidade acumulada. */
  const backdrop = (el, includeSelf) => {
    const layers = []
    let opacity = 1
    let onImage = false
    for (let p = includeSelf ? el : el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p)
      opacity *= Number(cs.opacity)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') onImage = true
      const bg = parse(cs.backgroundColor)
      if (bg.a > 0) layers.push(bg)
      if (bg.a >= 0.999) break
    }
    let base = { r: 255, g: 255, b: 255, a: 1 }
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base)
    return { color: base, onImage, opacity }
  }

  const result = { overflowers: [], contrast: [], lightBlocks: [], smallTargets: [], notes: { onImage: 0, measured: 0 } }

  // Escopo (plano 05-16): sem rootExpr mede a pagina inteira; com rootExpr mede so a sobreposicao aberta.
  const scope = cfg.rootExpr ? new Function(`return (${cfg.rootExpr})`)() : document.body
  if (!scope) {
    result.rootMissing = true
    return result
  }
  const everyEl = cfg.rootExpr ? [scope, ...scope.querySelectorAll('*')] : [...document.body.querySelectorAll('*')]
  const qsa = (selector) => (cfg.rootExpr ? [...(scope.matches(selector) ? [scope] : []), ...scope.querySelectorAll(selector)] : [...document.querySelectorAll(selector)])

  // (a) Rolagem horizontal, no criterio do auditor da 3.1.
  result.overflowX = doc.scrollWidth > doc.clientWidth
  result.scrollWidth = doc.scrollWidth
  result.clientWidth = doc.clientWidth
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== doc; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true
    }
    return false
  }
  for (const el of everyEl) {
    if (!isVisible(el) || inAriaHidden(el)) continue
    const r = el.getBoundingClientRect()
    if (r.right <= window.innerWidth + 0.5) continue
    if (clipped(el)) continue
    result.overflowers.push({ sel: selectorOf(el), right: round(r.right), innerWidth: window.innerWidth })
  }
  result.overflowers = cap(result.overflowers)

  // (b) Contraste de texto e de icones contra o fundo efetivo composto.
  const seen = new Set()
  const checkPair = (el, fgCss, label, min, kind) => {
    const bd = backdrop(el, true)
    if (bd.onImage) {
      result.notes.onImage++
      return
    }
    const fg0 = parse(fgCss)
    const fg = over({ ...fg0, a: fg0.a * bd.opacity }, bd.color)
    const ratio = ratioOf(fg, bd.color)
    result.notes.measured++
    if (ratio + 0.005 >= min) return
    const key = `${selectorOf(el)}|${label}`
    if (seen.has(key)) return
    seen.add(key)
    result.contrast.push({ kind, sel: selectorOf(el), text: label.slice(0, 28), fg: hex(fg), bg: hex(bd.color), ratio: round(ratio), min })
  }
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  const textOwners = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement
    if (!parent || !(n.nodeValue || '').trim()) continue
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(parent.tagName)) continue
    textOwners.add(parent)
  }
  for (const el of textOwners) {
    if (!isVisible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    if (excepted(el, 'contraste')) continue
    const cs = getComputedStyle(el)
    const size = parseFloat(cs.fontSize)
    const isSvg = el instanceof SVGElement
    const fgCss = isSvg ? cs.fill : cs.color
    if (!fgCss || fgCss === 'none') continue
    const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue.trim()).join(' ')
    checkPair(el, fgCss, own, size >= 28 ? 3 : 4.5, 'texto')
  }
  for (const svg of qsa('svg[class*="lucide"]')) {
    if (!isVisible(svg)) continue
    if (excepted(svg, 'contraste')) continue
    const cs = getComputedStyle(svg)
    const paint = cs.stroke && cs.stroke !== 'none' ? cs.stroke : cs.fill
    if (!paint || paint === 'none') continue
    const name = (svg.getAttribute('class') || '').split(/\s+/).find((c) => c.startsWith('lucide-') && c !== 'lucide') ?? 'icone'
    checkPair(svg, paint, name, 3, 'icone')
  }
  result.contrast = cap(result.contrast)

  // (c) No escuro, bloco de 64x64 ou mais com fundo claro (luminancia acima de 0,5).
  if (cfg.theme === 'escuro') {
    for (const el of everyEl) {
      if (el instanceof SVGElement) continue
      if (!isVisible(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width < cfg.minBlock || r.height < cfg.minBlock) continue
      const own = parse(getComputedStyle(el).backgroundColor)
      if (own.a < 0.05) continue
      const eff = backdrop(el, true)
      const l = lum(eff.color)
      if (l <= 0.5) continue
      if (excepted(el, 'bloco-claro')) continue
      result.lightBlocks.push({ sel: selectorOf(el), size: `${Math.round(r.width)}x${Math.round(r.height)}`, bg: hex(eff.color), lum: round(l) })
    }
  }
  result.lightBlocks = cap(result.lightBlocks)

  // (e) Alvo de toque menor que 43,5 px em elemento interativo.
  const targetSel = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"], input, select, textarea'
  for (const el of qsa(targetSel)) {
    if (el instanceof HTMLInputElement && el.type === 'hidden') continue
    if (!isVisible(el) || inAriaHidden(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width >= cfg.minTarget && r.height >= cfg.minTarget) continue
    result.smallTargets.push({ sel: selectorOf(el), w: round(r.width), h: round(r.height) })
  }
  result.smallTargets = cap(result.smallTargets)

  // Veladura (plano 05-16, UI-SPEC S6): continua preta e translucida nos dois temas.
  if (cfg.veilSel) {
    const veil = document.querySelector(cfg.veilSel)
    if (!veil) result.veil = { missing: true }
    else {
      const c = parse(getComputedStyle(veil).backgroundColor)
      result.veil = { r: c.r, g: c.g, b: c.b, a: round(c.a), ok: c.r <= 8 && c.g <= 8 && c.b <= 8 && c.a >= 0.2 }
    }
  }

  result.notes.exceptions = exceptionHits
  result.h1 = document.querySelector('h1')?.textContent.trim() ?? null
  result.temaAplicado = doc.classList.contains('dark') ? 'escuro' : 'claro'
  result.interativos = qsa(targetSel).length
  return result
}

const waitUntil = async (page, expr, ms = 8000) => {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await page.evaluate(`!!(${expr})`)) return true
    await sleep(120)
  }
  return false
}
const clickByText = (page, text) => page.evaluate(`(() => { const b = ${sel.button(text)}; if (!b) return false; b.click(); return true })()`)

/** Leva a pagina ao estado de `screen` (rota ja navegada). */
async function prepareScreen(page, screen) {
  const LOGOUT = `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Sair da conta'))`
  if (screen.tab) {
    await waitUntil(page, `document.querySelector('[role="tab"]')`)
    if (!(await clickByText(page, screen.tab))) throw new Error(`aba ${screen.tab} nao achada`)
    await sleep(900)
  }
  if (screen.entry === 'login' || screen.entry === 'onboarding') {
    if (!(await waitUntil(page, LOGOUT))) throw new Error('botao Sair da conta nao achado')
    if (screen.entry === 'onboarding') await page.evaluate(`localStorage.removeItem('coinc:onboarding:v1')`)
    await page.evaluate(`(() => { const b = ${LOGOUT}; b.click() })()`)
    const target = screen.entry === 'login' ? `document.querySelector('input[type="password"]')` : `document.querySelector('h1')?.textContent.trim() === 'Veja quanto ainda pode gastar'`
    if (!(await waitUntil(page, target))) throw new Error(`tela ${screen.id} nao abriu`)
    for (let i = 0; i < (screen.step ?? 0); i++) {
      const before = await page.evaluate(`document.querySelector('h1')?.textContent`)
      if (!(await clickByText(page, 'Continuar'))) throw new Error('Continuar nao achado')
      await waitUntil(page, `document.querySelector('h1')?.textContent !== ${JSON.stringify(before)}`, 4000)
    }
    await sleep(500)
  }
  if (screen.entry === 'falha') {
    if (!(await waitUntil(page, `typeof window.__coincBootError === 'function'`))) throw new Error('gancho __coincBootError ausente (so existe em DEV)')
    await page.evaluate(`window.__coincBootError()`)
    if (!(await waitUntil(page, `document.querySelector('h1')?.textContent.includes('Não foi possível abrir o Coinc')`))) throw new Error('tela de falha nao abriu')
    await sleep(400)
  }
}

/** Estado carregado: sem esqueleto nem aria-busy, mais uma folga para as animacoes de entrada. */
async function waitLoaded(page, screen) {
  await waitUntil(page, `!document.querySelector('.animate-pulse, [aria-busy="true"]')`, 8000)
  await sleep(screen.id === 'home' ? 1600 : 700)
}

/** Verificacao (d): a guarda de paleta existente (hex literal em src) como subprocesso. */
function runHexGuard() {
  const res = spawnSync(process.execPath, ['--test', 'test/static/palette-contrast.test.js'], { cwd: ROOT_DIR, encoding: 'utf8', timeout: 120000 })
  if (res.error) throw new Error(`guarda de paleta nao rodou: ${res.error.message}`)
  const tail = `${res.stdout}\n${res.stderr}`.split('\n').filter((l) => /^# (pass|fail)|not ok/.test(l.trim())).slice(0, 6).join(' | ')
  return { ok: res.status === 0, detail: tail }
}

/** Prova de sensibilidade do auditor: defeitos plantados na pagina precisam ser acusados. */
async function runSelftest(page, collected) {
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  const boot = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: auditBootSource('escuro') })
  await navigate(page, `${ORIGIN}/porquinho`)
  await waitLoaded(page, { id: 'porquinho' })
  await page.evaluate(`(() => {
    const host = document.createElement('div')
    host.id = '__selftest'
    host.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;width:600px'
    host.innerHTML = '<div style="width:80px;height:80px;background:#ffffff">claro</div>' +
      '<p style="background:#222222;color:#2a2a2a;font-size:16px">sem contraste</p>' +
      '<button style="width:30px;height:30px">x</button>'
    document.body.appendChild(host)
  })()`)
  const r = await page.evaluate(`(${pageAudit.toString()})(${JSON.stringify({ theme: 'escuro', minTarget: MIN_TARGET, minBlock: MIN_BLOCK, exceptions: AUDIT_EXCEPTIONS })})`)
  check('selftest: bloco claro de 80x80 no escuro e acusado', r.lightBlocks.some((b) => b.size === '80x80'), JSON.stringify(r.lightBlocks.slice(0, 2)))
  check('selftest: texto cinza sobre cinza e acusado', r.contrast.some((c) => c.text === 'sem contraste'), JSON.stringify(r.contrast.slice(0, 2)))
  check('selftest: botao de 30x30 e acusado', r.smallTargets.some((t) => t.w === 30), JSON.stringify(r.smallTargets.slice(0, 2)))
  check('selftest: estouro de largura e acusado', r.overflowers.some((o) => o.right > 390), JSON.stringify(r.overflowers.slice(0, 2)))
  check('selftest: o balao do Vintem passa pela excecao e nao pelo auditor', !r.lightBlocks.some((b) => b.sel.includes('vintem-balloon')))
  check('selftest: nenhuma excecao nem console.error', collected.exceptions.length === 0 && collected.consoleErrors.length === 0, [...collected.exceptions, ...collected.consoleErrors].join(' | '))
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: boot.identifier })
}

async function runAudit(page, opts, collected) {
  const screens = AUDIT_SCREENS.filter((s) => opts.route === null || s.id === opts.route || s.path === opts.route)
  if (screens.length === 0) throw new Error(`--route sem correspondencia: ${opts.route}`)
  const themes = AUDIT_THEMES.filter((t) => opts.theme === null || t === opts.theme)
  const viewports = AUDIT_VIEWPORTS.filter((v) => opts.viewport === null || `${v.width}x${v.height}` === opts.viewport)
  if (viewports.length === 0) throw new Error(`--viewport desconhecido: ${opts.viewport} (use 360x640 ou 390x844)`)
  fs.mkdirSync(CAPTURES_DIR, { recursive: true })
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

  let total = 0
  let failures = 0
  const failed = []
  for (const theme of themes) {
    const boot = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: auditBootSource(theme) })
    for (const viewport of viewports) {
      await page.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 2, mobile: true })
      const vp = `${viewport.width}x${viewport.height}`
      for (const screen of screens) {
        const run = async () => {
          collected.exceptions.length = 0
          collected.consoleErrors.length = 0
          await navigate(page, `${ORIGIN}${screen.path}`)
          await prepareScreen(page, screen)
          await waitLoaded(page, screen)
          const r = await page.evaluate(`(${pageAudit.toString()})(${JSON.stringify({ theme, minTarget: MIN_TARGET, minBlock: MIN_BLOCK, exceptions: AUDIT_EXCEPTIONS })})`)
          if (vp === CAPTURE_VIEWPORT) {
            const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
            fs.writeFileSync(path.join(CAPTURES_DIR, `${screen.id}-${theme}.png`), Buffer.from(shot.data, 'base64'))
          }
          return r
        }
        const r = await withTimeout(run(), AUDIT_COMBO_TIMEOUT_MS, `${screen.id} ${theme} ${vp}`)
        // Salvaguarda do proprio auditor: se o tema pedido nao foi aplicado, a medicao nao vale.
        const temaErrado = r.temaAplicado !== theme
        const found = (temaErrado ? 1 : 0) + (r.overflowX || r.overflowers.length > 0 ? 1 : 0) + r.contrast.length + r.lightBlocks.length + r.smallTargets.length
        total++
        failures += found
        if (found > 0) failed.push(`${screen.id} ${theme} ${vp}`)
        console.log(
          JSON.stringify({
            screen: screen.id,
            theme,
            viewport: vp,
            violacoes: found,
            h1: r.h1,
            temaErrado: temaErrado ? `pedido ${theme}, aplicado ${r.temaAplicado}` : null,
            interativos: r.interativos,
            rolagemHorizontal: r.overflowX || r.overflowers.length > 0 ? { scrollWidth: r.scrollWidth, clientWidth: r.clientWidth, overflowers: r.overflowers.slice(0, 8) } : null,
            contraste: r.contrast,
            blocoClaro: r.lightBlocks,
            alvoPequeno: r.smallTargets,
            notas: r.notes,
            erros: [...collected.exceptions, ...collected.consoleErrors].slice(0, 3),
          }),
        )
      }
    }
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: boot.identifier })
  }
  const hex = runHexGuard()
  console.log(JSON.stringify({ verificacao: 'hex-literal-em-src', ok: hex.ok, detalhe: hex.detail }))
  if (!hex.ok) failures++
  console.log(JSON.stringify({ resumo: true, combinacoes: total, comViolacao: failed, capturas: path.relative(ROOT_DIR, CAPTURES_DIR) }))
  return failures
}

// ---------------------------------------------------------------------------------------------------------
// Modo --overlays (plano 05-16, D-10, IDEN-06): sobreposicoes abertas por interacao real, nos dois temas.
// ---------------------------------------------------------------------------------------------------------

const LAST_DIALOG = `[...document.querySelectorAll('[role="dialog"]')].at(-1)`
const SHEET_VEIL = 'body > div[aria-hidden="true"].fixed'
const DIALOG_VEIL = 'body > div.dialog-overlay-animate'
const TOAST_BOX = `document.querySelector('div[role="status"][aria-live="polite"]')`
const FAB = `document.querySelector('button[aria-label="Novo lançamento"]')`
const TX_ROW = `[...document.querySelectorAll('button')].find((b) => b.className.includes('min-h-14') && b.querySelector('.num-display'))`
const byText = (text, within = 'document') =>
  `[...${within}.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}))`

/** Clica no elemento da expressao; falha com mensagem clara se ele nao existir. */
async function clickExpr(page, expr, what) {
  if (!(await waitUntil(page, expr))) throw new Error(`${what} nao achado`)
  const ok = await page.evaluate(`(() => { const el = ${expr}; if (!el) return false; el.click(); return true })()`)
  if (!ok) throw new Error(`${what} nao clicado`)
  await sleep(250)
}

/** Lanca um gasto pelo teclado de tela (mesmo caminho da Fase 4) para provocar os toasts. */
async function launchSpend(page) {
  await clickExpr(page, FAB, 'botao de novo lancamento')
  if (!(await waitUntil(page, `${LAST_DIALOG}?.querySelector('[role="radio"]')`))) throw new Error('lancador nao abriu')
  await sleep(300)
  await clickExpr(page, `[...${LAST_DIALOG}.querySelectorAll('button[role="radio"]')].find((b) => b.textContent.trim().startsWith('Lazer'))`, 'categoria Lazer')
  for (const d of ['5', '00']) await clickExpr(page, byText(d, LAST_DIALOG), `tecla ${d}`)
  await clickExpr(page, byText('Lançar gasto', LAST_DIALOG), 'botao Lançar gasto')
}

/**
 * Monta o Dialog de ui/dialog.tsx numa pagina de DEV. Nenhuma tela do app usa esse primitivo hoje, entao nao
 * existe gatilho real em MOCK: o auditor importa o modulo do proprio Vite e o React ja carregado pela pagina.
 */
async function mountDialogHarness(page) {
  const out = await page.evaluate(`(async () => {
    const urls = performance.getEntriesByType('resource').map((e) => e.name)
    const reactUrl = urls.find((u) => /\\/deps\\/react\\.js/.test(u))
    const domUrl = urls.find((u) => /\\/deps\\/react-dom_client\\.js/.test(u))
    if (!reactUrl || !domUrl) return 'react nao achado nos recursos da pagina'
    const ReactMod = await import(reactUrl)
    const DomMod = await import(domUrl)
    const dlg = await import('/src/components/ui/dialog.tsx')
    const btn = await import('/src/components/ui/button.tsx')
    const h = (ReactMod.default ?? ReactMod).createElement
    const createRoot = DomMod.createRoot ?? DomMod.default.createRoot
    const host = document.createElement('div')
    host.id = '__dialog_host'
    document.body.appendChild(host)
    createRoot(host).render(
      h(dlg.Dialog, { open: true, onOpenChange() {} },
        h(dlg.DialogContent, null,
          h(dlg.DialogHeader, null,
            h(dlg.DialogTitle, null, 'Apagar o lançamento?'),
            h(dlg.DialogDescription, null, 'Esta ação não pode ser desfeita.')),
          h(dlg.DialogFooter, null,
            h(btn.Button, { variant: 'outline' }, 'Manter'),
            h(btn.Button, { variant: 'destructive' }, 'Apagar')))))
    return 'ok'
  })()`)
  if (out !== 'ok') throw new Error(`dialogo nao montou: ${out}`)
}

/**
 * Lista fechada de sobreposicoes do UI-SPEC S6 (D-10). `root` e a expressao do elemento medido, `veil` o seletor da
 * veladura quando existe. Todas abrem por clique real, exceto o Dialog, sem consumidor no app (mountDialogHarness).
 */
const OVERLAY_LIST = [
  {
    id: 'lancador-com-teclado',
    path: '/',
    root: LAST_DIALOG,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, FAB, 'botao de novo lancamento')
      await waitUntil(page, `${LAST_DIALOG}?.querySelector('[role="radio"]')`)
      await sleep(300)
      await clickExpr(page, `[...${LAST_DIALOG}.querySelectorAll('button[role="radio"]')].find((b) => b.textContent.trim().startsWith('Lazer'))`, 'categoria Lazer')
      await clickExpr(page, byText('5', LAST_DIALOG), 'tecla 5')
    },
  },
  {
    id: 'acoes-da-linha',
    path: '/transacoes',
    root: LAST_DIALOG,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, TX_ROW, 'linha de transacao')
    },
  },
  {
    id: 'confirmacao-de-apagar',
    path: '/transacoes',
    root: LAST_DIALOG,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, TX_ROW, 'linha de transacao')
      await sleep(400)
      await clickExpr(page, byText('Apagar', LAST_DIALOG), 'acao Apagar')
    },
  },
  {
    id: 'select-aberto',
    path: '/transacoes',
    root: LAST_DIALOG,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, TX_ROW, 'linha de transacao')
      await sleep(400)
      await clickExpr(page, byText('Editar', LAST_DIALOG), 'acao Editar')
      await waitUntil(page, `document.querySelectorAll('[role="dialog"]').length === 1 && ${LAST_DIALOG}.querySelector('select.sr-only')`)
      await sleep(400)
      await clickExpr(page, `${LAST_DIALOG}.querySelector('select.sr-only')?.nextElementSibling`, 'gatilho do Select')
    },
  },
  {
    id: 'folha-de-evento',
    path: '/calendario',
    root: LAST_DIALOG,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, `[...document.querySelectorAll('[role="radio"], [role="tab"], button')].find((b) => (b.getAttribute('aria-label') || b.textContent).trim().startsWith('Agenda'))`, 'modo Agenda')
      await sleep(500)
      await clickExpr(page, `document.querySelector('button[aria-label="Novo evento"]')`, 'botao Novo evento')
    },
  },
  {
    id: 'folha-de-nota',
    path: '/calendario',
    root: LAST_DIALOG,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, `[...document.querySelectorAll('[role="radio"], [role="tab"], button')].find((b) => (b.getAttribute('aria-label') || b.textContent).trim().startsWith('Financeiro'))`, 'modo Financeiro')
      await sleep(500)
      await clickExpr(page, `document.querySelector('button[aria-label="Nova nota"]')`, 'botao Nova nota')
    },
  },
  {
    id: 'editor-de-categoria',
    path: '/configuracoes',
    root: LAST_DIALOG,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, byText('+ Nova'), 'botao + Nova')
    },
  },
  {
    id: 'seletor-de-icone',
    path: '/configuracoes',
    root: `${LAST_DIALOG}?.querySelector('[role="radiogroup"][aria-label="Ícone"]')`,
    veil: SHEET_VEIL,
    open: async (page) => {
      await clickExpr(page, byText('+ Nova'), 'botao + Nova')
      await waitUntil(page, `${LAST_DIALOG}?.querySelector('[role="radiogroup"][aria-label="Ícone"]')`)
      await sleep(300)
      await clickExpr(page, `${LAST_DIALOG}.querySelector('[role="radiogroup"][aria-label="Ícone"] [role="radio"]')`, 'primeiro icone')
    },
  },
  {
    id: 'dialogo',
    path: '/configuracoes',
    root: LAST_DIALOG,
    veil: DIALOG_VEIL,
    open: async (page) => {
      await waitUntil(page, `document.querySelector('h1')`)
      await mountDialogHarness(page)
    },
  },
  {
    id: 'painel-do-sino',
    path: '/',
    root: `document.querySelector('[role="dialog"][aria-label="Avisos"]')`,
    veil: null,
    open: async (page) => {
      await clickExpr(page, `document.querySelector('button[aria-label="Avisos"]')`, 'sino de avisos')
    },
  },
  {
    id: 'painel-do-ciclo',
    path: '/',
    root: `document.querySelector('[role="listbox"][aria-label="Ciclos"]')`,
    veil: null,
    open: async (page) => {
      await clickExpr(page, `document.querySelector('button[aria-haspopup="listbox"]')`, 'seletor de ciclo')
    },
  },
  {
    id: 'menu-de-perfil',
    path: '/',
    root: `document.querySelector('[role="menu"][aria-label="Perfil"]')`,
    veil: null,
    open: async (page) => {
      await clickExpr(page, `document.querySelector('button[aria-haspopup="menu"]')`, 'menu de perfil')
    },
  },
  {
    id: 'toast',
    path: '/transacoes',
    root: TOAST_BOX,
    veil: null,
    open: async (page) => {
      await launchSpend(page)
      if (!(await waitUntil(page, `${TOAST_BOX}?.querySelector('button[aria-label="Fechar aviso"]')`, 6000))) throw new Error('toast comum nao apareceu')
    },
  },
  {
    id: 'toast-do-vintem',
    path: '/transacoes',
    root: TOAST_BOX,
    veil: null,
    open: async (page) => {
      await launchSpend(page)
      if (!(await waitUntil(page, `${TOAST_BOX}?.querySelector('button[aria-label="Dispensar fala do Vintém"]')`, 12000))) throw new Error('toast do Vintem nao apareceu')
    },
  },
]

async function runOverlays(page, opts, collected) {
  const overlays = OVERLAY_LIST.filter((o) => opts.route === null || o.id === opts.route)
  if (overlays.length === 0) throw new Error(`--route sem sobreposicao: ${opts.route}`)
  const themes = AUDIT_THEMES.filter((t) => opts.theme === null || t === opts.theme)
  const viewports = AUDIT_VIEWPORTS.filter((v) => opts.viewport === null || `${v.width}x${v.height}` === opts.viewport)
  if (viewports.length === 0) throw new Error(`--viewport desconhecido: ${opts.viewport} (use 360x640 ou 390x844)`)
  fs.mkdirSync(CAPTURES_DIR, { recursive: true })
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

  let total = 0
  let failures = 0
  const failed = []
  for (const theme of themes) {
    const boot = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: auditBootSource(theme) })
    for (const viewport of viewports) {
      await page.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 2, mobile: true })
      const vp = `${viewport.width}x${viewport.height}`
      for (const overlay of overlays) {
        const run = async () => {
          collected.exceptions.length = 0
          collected.consoleErrors.length = 0
          await navigate(page, `${ORIGIN}${overlay.path}`)
          await waitLoaded(page, { id: overlay.path === '/' ? 'home' : overlay.id })
          await overlay.open(page)
          if (!(await waitUntil(page, overlay.root, 6000))) throw new Error(`sobreposicao ${overlay.id} nao abriu`)
          await sleep(900)
          const cfg = { theme, minTarget: MIN_TARGET, minBlock: MIN_BLOCK, exceptions: AUDIT_EXCEPTIONS, rootExpr: overlay.root, veilSel: overlay.veil }
          const r = await page.evaluate(`(${pageAudit.toString()})(${JSON.stringify(cfg)})`)
          if (r.rootMissing) throw new Error(`sobreposicao ${overlay.id} sumiu antes da medicao`)
          if (vp === CAPTURE_VIEWPORT) {
            const shot = await page.send('Page.captureScreenshot', { format: 'png' })
            fs.writeFileSync(path.join(CAPTURES_DIR, `sobreposicao-${overlay.id}-${theme}.png`), Buffer.from(shot.data, 'base64'))
          }
          return r
        }
        let r
        try {
          // Uma nova tentativa: a abertura por clique pode perder a corrida com a carga dos dados do mock.
          try {
            r = await withTimeout(run(), AUDIT_COMBO_TIMEOUT_MS, `${overlay.id} ${theme} ${vp}`)
          } catch {
            r = await withTimeout(run(), AUDIT_COMBO_TIMEOUT_MS, `${overlay.id} ${theme} ${vp} (2a tentativa)`)
          }
        } catch (err) {
          // Sobreposicao que nao abre e falha do auditor contra o app: conta como violacao, nao como erro do script.
          total++
          failures++
          failed.push(`${overlay.id} ${theme} ${vp}`)
          console.log(JSON.stringify({ overlay: overlay.id, theme, viewport: vp, violacoes: 1, naoAbriu: String(err.message).slice(0, 200) }))
          continue
        }
        const temaErrado = r.temaAplicado !== theme
        const veilBad = overlay.veil !== null && (!r.veil || r.veil.missing || r.veil.ok === false)
        const found = (temaErrado ? 1 : 0) + (r.overflowX || r.overflowers.length > 0 ? 1 : 0) + r.contrast.length + r.lightBlocks.length + r.smallTargets.length + (veilBad ? 1 : 0)
        total++
        failures += found
        if (found > 0) failed.push(`${overlay.id} ${theme} ${vp}`)
        console.log(
          JSON.stringify({
            overlay: overlay.id,
            theme,
            viewport: vp,
            violacoes: found,
            temaErrado: temaErrado ? `pedido ${theme}, aplicado ${r.temaAplicado}` : null,
            interativos: r.interativos,
            rolagemHorizontal: r.overflowX || r.overflowers.length > 0 ? { scrollWidth: r.scrollWidth, clientWidth: r.clientWidth, overflowers: r.overflowers.slice(0, 8) } : null,
            contraste: r.contrast,
            blocoClaro: r.lightBlocks,
            alvoPequeno: r.smallTargets,
            veladura: r.veil ?? null,
            notas: r.notes,
            erros: [...collected.exceptions, ...collected.consoleErrors].slice(0, 3),
          }),
        )
      }
    }
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: boot.identifier })
  }
  const hex = runHexGuard()
  console.log(JSON.stringify({ verificacao: 'hex-literal-em-src', ok: hex.ok, detalhe: hex.detail }))
  if (!hex.ok) failures++
  console.log(JSON.stringify({ resumo: true, sobreposicoes: overlays.length, combinacoes: total, comViolacao: failed, capturas: path.relative(ROOT_DIR, CAPTURES_DIR) }))
  return failures
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
  let auditFailures = null
  try {
    vite = await startVite()
    cleanups.push(() => vite.stop())
    chrome = await launchChrome()
    cleanups.push(() => chrome.close())
    page = await connect(chrome.wsUrl)
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    if (!opts.audit && !opts.overlays && !opts.selftest) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: bootSource('escuro') })

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

    if (opts.selftest) {
      await withTimeout(runSelftest(page, collected), 60000, 'selftest do auditor')
    } else if (opts.overlays) {
      auditFailures = await withTimeout(runOverlays(page, opts, collected), AUDIT_TOTAL_TIMEOUT_MS, 'auditoria de sobreposicoes')
    } else if (opts.audit) {
      const failures = await withTimeout(runAudit(page, opts, collected), AUDIT_TOTAL_TIMEOUT_MS, 'auditoria de tema')
      auditFailures = failures
    } else {
      const ctx = { page, collected }
      const list = opts.smoke ? [scenarioSmoke] : [scenarioSmoke, ...SCENARIOS_FULL]
      await withTimeout(
        (async () => {
          for (const scenario of list) await scenario(ctx)
        })(),
        TOTAL_TIMEOUT_MS,
        'cenarios do tema',
      )
    }
  } finally {
    page?.close()
    if (chrome) await chrome.close()
    if (vite) await vite.stop()
  }
  const failures = auditFailures ?? results.filter((r) => !r.ok).length
  console.log(`FALHAS ${failures}`)
  if ((opts.audit || opts.overlays) && opts.reportOnly) return 0
  return failures > 0 ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`theme: falha do script: ${err.message}`)
    process.exit(2)
  },
)
