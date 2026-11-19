#!/usr/bin/env node
// Cenario real do recolhimento do mes do Calendario (D-08), em Chrome sem janela via CDP e modo MOCK.
// Mede o DOM em 360x640 e 390x844: o mes recolhe ao rolar a agenda, a setinha reabre e trava, tocar num
// dia e em "Hoje" nunca recolhe sozinho, o teclado e o gesto movem o dia e o ciclo, e em repouso o DOM nao
// muda (nenhum laco de re-render). So dados ficticios do seed; Vite e Chrome em 127.0.0.1; perfil
// temporario removido no fim; nada e lido de .env*.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/calendar-collapse.mjs [--viewport LxA]
// Saida: uma linha JSON por verificacao. Codigos: 0 ok, 1 alguma verificacao falhou, 2 falha do script.
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5198
const ORIGIN = `http://127.0.0.1:${PORT}`
const ROUTE = '/calendario'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Tempo para a transicao de altura (200ms) e o redutor assentarem antes de medir.
const SETTLE_MS = 450
// Observacao em repouso: sem interacao, o DOM nao pode mudar.
const IDLE_MS = 3000
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]

function parseArgs(argv) {
  const viewports = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--viewport') {
      const m = /^(\d+)x(\d+)$/.exec(argv[++i] ?? '')
      if (!m) throw new Error('viewport invalido (use LxA, ex.: 360x640)')
      viewports.push({ width: Number(m[1]), height: Number(m[2]) })
    } else throw new Error(`flag desconhecida: ${argv[i]}`)
  }
  return { viewports: viewports.length > 0 ? viewports : VIEWPORTS }
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
    console.error(`calendar-collapse: ${signal} recebido, encerrando Chrome e Vite`)
    await Promise.allSettled(cleanups.map((fn) => fn()))
    process.exit(2)
  })
}

// ---- Trechos que rodam dentro da pagina (strings simples, sem acesso ao escopo do Node) ------------------

const AGENDA = `document.querySelector('[aria-label="Agenda do ciclo"]')`

/** Linhas da grade: total no DOM e quantas tem altura. */
const GRID_ROWS = `(() => {
  const rows = [...document.querySelectorAll('[data-week-row]')]
  return { total: rows.length, visible: rows.filter((r) => r.getBoundingClientRect().height > 1).length }
})()`

/** Geometria da agenda e da pagina. */
const GEOMETRY = `(() => {
  const el = ${AGENDA}
  const doc = document.documentElement
  return {
    top: Math.round(el.scrollTop),
    client: Math.round(el.clientHeight),
    scroll: Math.round(el.scrollHeight),
    maxScroll: Math.round(el.scrollHeight - el.clientHeight),
    pageScrollable: doc.scrollHeight > window.innerHeight + 1,
    docHeight: doc.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
  }
})()`

const SELECTED_KEY = `document.querySelector('[data-key][aria-pressed="true"]')?.getAttribute('data-key') ?? null`

function setScroll(top) {
  return `(() => { const el = ${AGENDA}; el.scrollTop = ${top}; return el.scrollTop })()`
}

/** Mede mutacoes do DOM sem interacao durante `ms`. */
function observeIdle(ms) {
  return `new Promise((resolve) => {
    let count = 0
    const sample = []
    const obs = new MutationObserver((list) => {
      count += list.length
      for (const m of list) if (sample.length < 3) sample.push(m.type + ':' + (m.target.nodeName || '') + ':' + (m.attributeName || ''))
    })
    obs.observe(document.body, { childList: true, attributes: true, characterData: true, subtree: true })
    setTimeout(() => { obs.disconnect(); resolve({ count, sample }) }, ${ms})
  })`
}

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
    // Pronto = agenda montada, celulas do dia presentes e sem "Carregando".
    const ready = await page.evaluate(
      `!!${AGENDA} && document.querySelectorAll('[data-key]').length > 0 && !document.querySelector('[role="status"]')`,
    )
    if (ready) break
    await sleep(150)
  }
  await sleep(900)
}

async function pressKey(page, key, code, vk) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}

async function swipe(page, fromX, toX, y) {
  const touch = (x) => [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }]
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(fromX) })
  const steps = 6
  for (let i = 1; i <= steps; i++) {
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: touch(fromX + ((toX - fromX) * i) / steps),
    })
    await sleep(16)
  }
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/** Roda todas as verificacoes de um viewport e devolve a lista de resultados. */
async function runViewport(page, collected, viewport) {
  const vp = `${viewport.width}x${viewport.height}`
  const results = []
  const check = (name, ok, detail = {}) => {
    const line = { viewport: vp, check: name, ok: Boolean(ok), ...detail }
    results.push(line)
    console.log(JSON.stringify(line))
  }

  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  collected.exceptions.length = 0
  collected.consoleErrors.length = 0
  await navigate(page, `${ORIGIN}${ROUTE}`)

  // (1) Estado inicial coerente. Com altura de sobra o mes abre inteiro (4 a 6 linhas); numa tela baixa
  // (360x640) a tela abre com o mes recolhido para a agenda ter altura. Nos dois casos a agenda precisa de
  // altura util e de rolagem suficiente para cruzar o limiar de 24px, e a pagina nao rola na vertical.
  const rows0 = await page.evaluate(GRID_ROWS)
  const geo = await page.evaluate(GEOMETRY)
  const initialOpen = rows0.visible === rows0.total
  check('estado-inicial-coerente', rows0.total >= 4 && rows0.total <= 6 && (initialOpen || rows0.visible === 1), { ...rows0, initial: initialOpen ? 'aberto' : 'recolhido' })
  check('agenda-tem-altura-e-rolagem', geo.client >= 96 && geo.maxScroll >= 48, geo)
  check('pagina-nao-rola-na-vertical', !geo.pageScrollable, { docHeight: geo.docHeight, innerHeight: geo.innerHeight })
  check('sem-rolagem-horizontal', geo.scrollWidth <= geo.clientWidth, { scrollWidth: geo.scrollWidth, clientWidth: geo.clientWidth })

  // A agenda abre em hoje: o dia de hoje (ou o dia com item imediatamente anterior) esta no topo da agenda ou a
  // agenda esta no fim. A lista vai do dia mais recente ao mais antigo, entao a ordem no DOM e decrescente.
  const opened = await page.evaluate(`(() => {
    const el = ${AGENDA}
    const today = document.querySelector('[data-key][aria-current="date"]')?.getAttribute('data-key') ?? null
    const days = [...el.querySelectorAll('[data-day]')].map((d) => d.getAttribute('data-day'))
    const descending = days.every((k, i) => i === 0 || days[i - 1] > k)
    const target = (descending ? days.find((k) => today !== null && k <= today) : null) ?? days[days.length - 1] ?? null
    const row = target ? el.querySelector('[data-day="' + target + '"]') : null
    const delta = row ? Math.round(row.getBoundingClientRect().top - el.getBoundingClientRect().top) : null
    return { today, descending, target, delta, top: Math.round(el.scrollTop), maxScroll: Math.round(el.scrollHeight - el.clientHeight) }
  })()`)
  check(
    'agenda-abre-em-hoje',
    opened.descending !== false && opened.target !== null && opened.delta !== null && (Math.abs(opened.delta) <= 12 || opened.top >= opened.maxScroll - 2),
    opened,
  )

  // (2) Rolar a agenda recolhe o mes para uma linha, e continua recolhido (sem oscilar).
  await page.evaluate(setScroll(0))
  await sleep(SETTLE_MS)
  const openBefore = await page.evaluate(GRID_ROWS)
  const wanted = Math.min(200, Math.max(0, geo.maxScroll))
  // A agenda recolhida ganha altura e perde rolagem; o limiar de 24px tem que continuar valendo.
  // O caso duro: so 6px acima do limiar, onde qualquer clamp do navegador reabriria o mes.
  const wantedLow = 30
  await page.evaluate(setScroll(wantedLow))
  await sleep(SETTLE_MS)
  const collapsed1 = await page.evaluate(GRID_ROWS)
  await sleep(SETTLE_MS)
  const collapsed2 = await page.evaluate(GRID_ROWS)
  const geoCollapsed = await page.evaluate(GEOMETRY)
  check('rolar-recolhe-para-uma-linha', openBefore.visible === openBefore.total && collapsed1.visible === 1 && collapsed2.visible === 1, {
    before: openBefore,
    after: collapsed1,
    later: collapsed2,
  })
  // O mes recolhido da altura a agenda: o scrollTop nao pode ter voltado ao limiar nem a 0 (reabriria o mes).
  check('recolher-nao-devolve-scrolltop-ao-limiar', geoCollapsed.top > 24 && geoCollapsed.maxScroll >= 48 && geoCollapsed.client >= 96, geoCollapsed)

  // (3) A setinha reabre o mes inteiro e trava: rolar de novo nao recolhe ate a agenda voltar a 0.
  const clicked = await page.evaluate(`(() => {
    const b = document.querySelector('button[aria-label="Mostrar mês inteiro"]')
    if (!b) return false
    b.click()
    return b.getAttribute('aria-expanded')
  })()`)
  await sleep(SETTLE_MS)
  const reopened = await page.evaluate(GRID_ROWS)
  const expandedAttr = await page.evaluate(`document.querySelector('button[aria-label="Recolher mês"]')?.getAttribute('aria-expanded') ?? null`)
  check('setinha-reabre-o-mes', clicked !== false && reopened.visible === reopened.total && expandedAttr === 'true', {
    clicked,
    reopened,
    ariaExpanded: expandedAttr,
  })

  await page.evaluate(setScroll(wanted + 2))
  await sleep(SETTLE_MS)
  await page.evaluate(setScroll(wanted))
  await sleep(SETTLE_MS)
  const locked = await page.evaluate(GRID_ROWS)
  check('trava-impede-recolher-ate-voltar-ao-topo', locked.visible === locked.total, locked)

  // Voltando ao topo a trava cai, e rolar de novo recolhe.
  await page.evaluate(setScroll(0))
  await sleep(SETTLE_MS)
  await page.evaluate(setScroll(wanted))
  await sleep(SETTLE_MS)
  const again = await page.evaluate(GRID_ROWS)
  check('topo-solta-a-trava-e-recolhe-de-novo', again.visible === 1, again)

  // Volta ao topo: reabre o mes (histerese) para os proximos passos.
  await page.evaluate(setScroll(0))
  await sleep(SETTLE_MS)
  const topOpen = await page.evaluate(GRID_ROWS)
  check('topo-reabre-o-mes', topOpen.visible === topOpen.total, topOpen)

  // (4) Rolagem programatica nunca recolhe: tocar num dia da grade e em "Hoje".
  const tap = await page.evaluate(`(() => {
    const cells = [...document.querySelectorAll('[data-key]')]
    const pressed = cells.findIndex((c) => c.getAttribute('aria-pressed') === 'true')
    const pick = cells[pressed - 3] ?? cells[pressed + 3] ?? cells[0]
    pick.click()
    return pick.getAttribute('data-key')
  })()`)
  await sleep(SETTLE_MS + 200)
  const afterTap = await page.evaluate(`({ rows: ${GRID_ROWS}, sel: ${SELECTED_KEY}, geo: ${GEOMETRY} })`)
  check('tocar-num-dia-nao-recolhe', afterTap.sel === tap && afterTap.rows.visible === afterTap.rows.total, {
    tapped: tap,
    selected: afterTap.sel,
    rows: afterTap.rows,
    top: afterTap.geo.top,
  })

  const todayClick = await page.evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Hoje')
    if (!b) return 'sem-botao'
    const disabled = b.getAttribute('aria-disabled') === 'true'
    b.click()
    return disabled ? 'desabilitado' : 'clicado'
  })()`)
  await sleep(SETTLE_MS + 200)
  const afterToday = await page.evaluate(`({ rows: ${GRID_ROWS}, sel: ${SELECTED_KEY}, today: document.querySelector('[data-key][aria-current="date"]')?.getAttribute('data-key') ?? null })`)
  check('hoje-nao-recolhe-e-volta-ao-dia-de-hoje', todayClick === 'clicado' && afterToday.rows.visible === afterToday.rows.total && afterToday.sel === afterToday.today, {
    button: todayClick,
    ...afterToday,
  })
  const todayNow = await page.evaluate(`[...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Hoje')?.getAttribute('aria-disabled') ?? null`)
  check('hoje-fica-aria-disabled-no-ciclo-e-dia-atuais', todayNow === 'true', { ariaDisabled: todayNow })

  // (5) Em repouso o DOM nao muda: sem laco de re-render, com o mes aberto e depois recolhido.
  await sleep(SETTLE_MS)
  const idleOpen = await page.evaluate(observeIdle(IDLE_MS))
  check('repouso-mes-aberto-sem-mutacoes', idleOpen.count === 0, idleOpen)

  await page.evaluate(setScroll(wanted))
  await sleep(SETTLE_MS * 2)
  const rowsCollapsed = await page.evaluate(GRID_ROWS)
  const idleCollapsed = await page.evaluate(observeIdle(IDLE_MS))
  check('repouso-mes-recolhido-sem-mutacoes', rowsCollapsed.visible === 1 && idleCollapsed.count === 0, {
    rows: rowsCollapsed,
    ...idleCollapsed,
  })

  // Reabre para o teclado e o gesto.
  await page.evaluate(setScroll(0))
  await sleep(SETTLE_MS)

  // Teclado: setas movem o dia em 1 e 7 e o foco acompanha.
  const keyboard = await page.evaluate(`(() => {
    const cells = [...document.querySelectorAll('[data-key]')].map((c) => c.getAttribute('data-key'))
    const sel = ${SELECTED_KEY}
    const i = cells.indexOf(sel)
    document.querySelector('[data-key][aria-pressed="true"]').focus()
    return { keys: cells, sel, i }
  })()`)
  const horizontal = keyboard.i + 1 < keyboard.keys.length ? { key: 'ArrowRight', vk: 39, delta: 1 } : { key: 'ArrowLeft', vk: 37, delta: -1 }
  await pressKey(page, horizontal.key, horizontal.key, horizontal.vk)
  await sleep(300)
  const afterH = await page.evaluate(`({ sel: ${SELECTED_KEY}, focus: document.activeElement?.getAttribute('data-key') ?? null })`)
  check('teclado-seta-lateral-move-um-dia-e-o-foco', afterH.sel === keyboard.keys[keyboard.i + horizontal.delta] && afterH.focus === afterH.sel, {
    pressed: horizontal.key,
    from: keyboard.sel,
    ...afterH,
  })

  const idxH = keyboard.i + horizontal.delta
  const vertical = idxH + 7 < keyboard.keys.length ? { key: 'ArrowDown', vk: 40, delta: 7 } : { key: 'ArrowUp', vk: 38, delta: -7 }
  await pressKey(page, vertical.key, vertical.key, vertical.vk)
  await sleep(300)
  const afterV = await page.evaluate(`({ sel: ${SELECTED_KEY}, focus: document.activeElement?.getAttribute('data-key') ?? null })`)
  check('teclado-seta-vertical-move-sete-dias-e-o-foco', afterV.sel === keyboard.keys[idxH + vertical.delta] && afterV.focus === afterV.sel, {
    pressed: vertical.key,
    ...afterV,
  })

  const afterKeysRows = await page.evaluate(GRID_ROWS)
  check('teclado-nao-recolhe-o-mes', afterKeysRows.visible === afterKeysRows.total, afterKeysRows)

  // Gesto: deslizar a grade para a direita volta ao ciclo anterior; para a esquerda avanca (so se nao for o atual).
  const labelOf = `document.querySelector('p[aria-live="polite"]')?.textContent?.trim() ?? null`
  const gridBox = await page.evaluate(`(() => {
    const r = document.querySelector('[data-week-row]').getBoundingClientRect()
    return { y: Math.round(r.top + r.height / 2) }
  })()`)
  const label0 = await page.evaluate(labelOf)
  await swipe(page, 60, Math.round(viewport.width - 60), gridBox.y)
  await sleep(SETTLE_MS + 300)
  const label1 = await page.evaluate(labelOf)
  const rowsAfterSwipe = await page.evaluate(GRID_ROWS)
  // Trocar de ciclo reabre o mes (reset) e, em tela baixa, recolhe de novo para a agenda ter altura: igual ao estado inicial.
  check('deslizar-para-a-direita-volta-ao-ciclo-anterior', label1 !== null && label1 !== label0 && rowsAfterSwipe.visible === (initialOpen ? rowsAfterSwipe.total : 1), {
    before: label0,
    after: label1,
    rows: rowsAfterSwipe,
  })

  await swipe(page, Math.round(viewport.width - 60), 60, gridBox.y)
  await sleep(SETTLE_MS + 300)
  const label2 = await page.evaluate(labelOf)
  check('deslizar-para-a-esquerda-avanca-ao-atual', label2 === label0, { before: label1, after: label2, expected: label0 })

  await swipe(page, Math.round(viewport.width - 60), 60, gridBox.y)
  await sleep(SETTLE_MS + 300)
  const label3 = await page.evaluate(labelOf)
  check('nao-existe-ciclo-futuro', label3 === label0, { label: label3 })

  check('sem-excecoes-nem-console-error', collected.exceptions.length === 0 && collected.consoleErrors.length === 0, {
    exceptions: [...collected.exceptions],
    consoleErrors: [...collected.consoleErrors],
  })
  return results
}

async function main() {
  const { viewports } = parseArgs(process.argv.slice(2))
  let vite = null
  let chrome = null
  let page = null
  const all = []
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

    for (const viewport of viewports) {
      try {
        all.push(...(await runViewport(page, collected, viewport)))
      } catch (err) {
        // Mostra o que a pagina reportou antes da falha: ajuda a achar o laco ou a tela quebrada.
        console.error(JSON.stringify({ viewport: `${viewport.width}x${viewport.height}`, exceptions: collected.exceptions, consoleErrors: collected.consoleErrors }))
        throw err
      }
    }
    const failed = all.filter((r) => !r.ok)
    console.log(JSON.stringify({ summary: true, total: all.length, failed: failed.length, failedChecks: failed.map((r) => `${r.viewport} ${r.check}`) }))
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
    console.error(`calendar-collapse: falha do script: ${err.message}`)
    process.exit(2)
  },
)
