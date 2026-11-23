#!/usr/bin/env node
// Executor CDP do autoteste do sketch 021 (icone do app, D-13) em Chrome sem janela.
// Abre o sketch por file:// com ?test a 1000x900, espera window.__done (ate 30 s), imprime o relatorio do
// autoteste e a linha final `FALHAS n`. Depois abre o sketch sem ?test e salva preview.png com as cinco
// versoes. So Chrome local em 127.0.0.1 (porta de depuracao); nenhuma requisicao de rede; nenhum .env* lido;
// perfil temporario removido no fim.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/icon-sketch.mjs
// Saida: relatorio do autoteste e a linha final `FALHAS n`. Codigos: 0 sem falha, 1 alguma falha do
// autoteste, 2 falha do proprio script (Chrome ausente, prazo vencido, excecao).
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { connect, launchChrome } from './cdp.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = process.argv[2] ?? '021-icone-app'
const NUM = DIR.slice(0, 3)
const SKETCH = resolve(ROOT, `.planning/sketches/${DIR}/index.html`)
const PREVIEW = resolve(ROOT, `.planning/sketches/${DIR}/preview.png`)
const SKETCH_URL = pathToFileURL(SKETCH).href
const VIEWPORT = { width: 1000, height: 900 }
const WAIT_MS = 30000
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

// Encerramento forcado (Ctrl+C, kill): derruba o Chrome antes de sair.
const cleanups = []
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.error(`icon-sketch: ${signal} recebido, encerrando o Chrome`)
    await Promise.allSettled(cleanups.map((fn) => fn()))
    process.exit(2)
  })
}

/** Navega e espera o evento de carga da pagina. */
async function navigate(page, url) {
  const loaded = page.waitFor('Page.loadEventFired', WAIT_MS)
  await page.send('Page.navigate', { url })
  await loaded
}

/** Espera uma condicao da pagina por ate `ms` ms. Devolve true se valeu. */
async function waitUntil(page, expression, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await page.evaluate(expression)) return true
    await sleep(150)
  }
  return false
}

async function main() {
  let chrome = null
  let page = null
  try {
    chrome = await launchChrome()
    cleanups.push(() => chrome.close())
    page = await connect(chrome.wsUrl)
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: 1,
      mobile: false,
    })

    const exceptions = []
    page.on('Runtime.exceptionThrown', (p) => {
      const d = p.exceptionDetails ?? {}
      exceptions.push(String(d.exception?.description ?? d.text ?? 'excecao').split('\n')[0].slice(0, 200))
    })

    // 1. autoteste
    await navigate(page, `${SKETCH_URL}?test`)
    const done = await waitUntil(page, 'window.__done === true', WAIT_MS)
    if (!done) throw new Error(`o autoteste nao terminou em ${WAIT_MS / 1000} s`)
    const text = String(await page.evaluate(`document.getElementById('selftest')?.textContent ?? ''`))
    const title = String(await page.evaluate('document.title'))
    const lines = text.split('\n').filter((l) => l.trim() !== '')
    for (const line of lines) console.log(`autoteste: ${line}`)
    const failLines = lines.filter((l) => l.startsWith('FAIL '))
    const crashed = lines[0]?.startsWith('FALHAS 1 (erro no teste')
    let failures = failLines.length + (crashed ? 1 : 0)
    if (!crashed && title !== `${NUM} teste FALHAS ${failLines.length}`) {
      console.log(`icon-sketch: titulo inesperado: ${title}`)
      failures += 1
    }
    if (exceptions.length > 0) {
      console.log(`icon-sketch: excecoes na pagina: ${exceptions.join(' | ')}`)
      failures += exceptions.length
    }

    // 2. captura das cinco versoes lado a lado (largura 1000)
    await navigate(page, SKETCH_URL)
    await sleep(300)
    const height = Math.ceil(await page.evaluate('document.documentElement.scrollHeight'))
    const shot = await page.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height, scale: 1 },
    })
    await writeFile(PREVIEW, Buffer.from(shot.data, 'base64'))
    console.log(`icon-sketch: captura salva em ${PREVIEW} (${VIEWPORT.width}x${height})`)

    console.log(`FALHAS ${failures}`)
    return failures > 0 ? 1 : 0
  } finally {
    page?.close()
    if (chrome) await chrome.close()
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`icon-sketch: falha do script: ${err.message}`)
    process.exit(2)
  },
)
