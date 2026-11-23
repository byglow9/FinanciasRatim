#!/usr/bin/env node
// Executor CDP do autoteste do sketch 026 (entrada do Coinc: onboarding, instalar e login) em Chrome sem janela.
// Abre o sketch por file:// com ?test&fast a 440x900, espera window.__done (ate 90 s), imprime o relatorio do
// autoteste e a linha final `FALHAS n`. Depois salva preview.png (visao geral, pose final) e preview-a/b/c.png
// (cada variante, claro e escuro, nos dois tamanhos). So Chrome local em 127.0.0.1; nenhuma requisicao de rede;
// nenhum .env* lido; perfil temporario removido no fim.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/entrada-sketch.mjs
// Saida: relatorio do autoteste e a linha final `FALHAS n`. Codigos: 0 sem falha, 1 alguma falha do
// autoteste, 2 falha do proprio script (Chrome ausente, prazo vencido, excecao).
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { connect, launchChrome } from './cdp.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = '026-entrada'
const NUM = DIR.slice(0, 3)
const SKETCH = resolve(ROOT, `.planning/sketches/${DIR}/index.html`)
const OUTDIR = resolve(ROOT, `.planning/sketches/${DIR}`)
const SKETCH_URL = pathToFileURL(SKETCH).href
const VIEWPORT = { width: 440, height: 900 }
const WAIT_MS = 90000
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

// Encerramento forcado (Ctrl+C, kill): derruba o Chrome antes de sair.
const cleanups = []
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.error(`entrada-sketch: ${signal} recebido, encerrando o Chrome`)
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

    // 1. autoteste (movimento acelerado em ?fast)
    await navigate(page, `${SKETCH_URL}?test&fast`)
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
      console.log(`entrada-sketch: titulo inesperado: ${title}`)
      failures += 1
    }
    const sw = await page.evaluate('document.documentElement.scrollWidth')
    if (sw > VIEWPORT.width) {
      console.log(`entrada-sketch: rolagem horizontal da pagina a ${VIEWPORT.width} px (${sw})`)
      failures += 1
    }
    if (exceptions.length > 0) {
      console.log(`entrada-sketch: excecoes na pagina: ${exceptions.join(' | ')}`)
      failures += exceptions.length
    }

    // 2. capturas (pose final: ?still)
    const shots = [
      ['preview.png', 'v=all', 1500],
      ['preview-a.png', 'v=a', 1560],
      ['preview-b.png', 'v=b&t=dark', 1560],
      ['preview-c.png', 'v=c', 1560],
      ['preview-a-escuro.png', 'v=a&t=dark', 1560],
      ['preview-b-claro.png', 'v=b&t=light', 1560],
      ['preview-c-escuro.png', 'v=c&t=dark', 1560],
    ]
    for (const [file, q, width] of shots) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
      await navigate(page, `${SKETCH_URL}?${q}&still`)
      await sleep(500)
      const height = Math.ceil(await page.evaluate('document.documentElement.scrollHeight'))
      const shot = await page.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      })
      await writeFile(resolve(OUTDIR, file), Buffer.from(shot.data, 'base64'))
      console.log(`entrada-sketch: captura ${file} (${width}x${height})`)
    }

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
    console.error(`entrada-sketch: falha do script: ${err.message}`)
    process.exit(2)
  },
)
