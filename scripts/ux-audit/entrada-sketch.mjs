#!/usr/bin/env node
// Executor CDP do autoteste dos sketches de entrada do Coinc (026 e 029: onboarding, instalar e login) em Chrome sem janela.
// Aceita a pasta do sketch como argumento (padrao 026-entrada; o 029-entrada-v2 usa relogio virtual e gera tambem
// as folhas de contato de quadros-chave frames-*.png para avaliar a fluidez sem video).
// Abre o sketch por file:// com ?test&fast a 440x900, espera window.__done (ate 90 s), imprime o relatorio do
// autoteste e a linha final `FALHAS n`. Depois salva preview.png (visao geral, pose final) e preview-a/b/c.png
// (cada variante, claro e escuro, nos dois tamanhos). So Chrome local em 127.0.0.1; nenhuma requisicao de rede;
// nenhum .env* lido; perfil temporario removido no fim.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/entrada-sketch.mjs [026-entrada | 029-entrada-v2]
// Saida: relatorio do autoteste e a linha final `FALHAS n`. Codigos: 0 sem falha, 1 alguma falha do
// autoteste, 2 falha do proprio script (Chrome ausente, prazo vencido, excecao).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { connect, launchChrome } from './cdp.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = process.argv[2] || '026-entrada'
const V2 = DIR.startsWith('029')
const NUM = DIR.slice(0, 3)
const SKETCH = resolve(ROOT, `.planning/sketches/${DIR}/index.html`)
const OUTDIR = resolve(ROOT, `.planning/sketches/${DIR}`)
const SKETCH_URL = pathToFileURL(SKETCH).href
const VIEWPORT = { width: 440, height: 900 }
const WAIT_MS = V2 ? 240000 : 90000
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
    await navigate(page, `${SKETCH_URL}?test${V2 ? '' : '&fast'}`)
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
    const shots = V2
      ? [
          ['preview.png', 'v=all', 1560],
          ['preview-o.png', 'v=o', 1560],
          ['preview-o-escuro.png', 'v=o&t=dark', 1560],
          ['preview-i.png', 'v=i', 1560],
          ['preview-i-escuro.png', 'v=i&t=dark', 1560],
          ['preview-l.png', 'v=l', 1560],
          ['preview-l-escuro.png', 'v=l&t=dark', 1560],
        ]
      : [
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
      await waitUntil(page, `(${V2 ? 'window.__ready === true' : 'true'}) && [...document.images].every((i) => i.complete)`, 8000)
      await sleep(900)
      const height = Math.ceil(await page.evaluate('document.documentElement.scrollHeight'))
      const shot = await page.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      })
      await writeFile(resolve(OUTDIR, file), Buffer.from(shot.data, 'base64'))
      console.log(`entrada-sketch: captura ${file} (${width}x${height})`)
    }

    // 3. (so 029) folhas de contato: quadros-chave em tempos fixos com relogio virtual (?vclock + __adv)
    if (V2) {
      const SHEETS = [
        ['o1', 'light', [0.46, 0.62, 0.78, 0.92, 1.1, 1.5, 2.1, 3.4, 5.2, 6.4, 7.6, 9.4]],
        ['o2', 'light', [0.5, 0.68, 0.84, 1.1, 1.35, 1.7, 2.6, 5.6, 6.5, 7.0, 7.5, 9.5]],
        ['o3', 'light', [0.5, 0.68, 0.84, 1.1, 1.35, 1.7, 2.6, 5.6, 7.0, 8.2, 9.0, 10.2]],
        ['ia', 'light', [0.3, 0.45, 0.6, 1.3, 2.0, 4.3, 4.9, 5.6, 7.4, 8.0, 8.8, 9.4]],
        ['l', 'light', [0.3, 0.45, 0.6, 0.8, 1.4, 1.9, 2.2, 3.4, 3.9, 5.2, 5.5, 6.4]],
        ['le', 'light', [1.3, 1.45, 1.6, 1.75, 1.9, 2.05, 2.2, 2.4, 2.7, 3.0, 3.4, 4.0]],
        ['o1', 'dark', [0.46, 0.62, 0.78, 0.92, 1.1, 1.5, 2.1, 3.4, 5.2, 6.4, 7.6, 9.4]],
      ]
      await page.send('Emulation.setDeviceMetricsOverride', { width: 460, height: 960, deviceScaleFactor: 1, mobile: false })
      const tmp = mkdtempSync(resolve(tmpdir(), 'entrada-frames-'))
      try {
        for (const [kind, theme, times] of SHEETS) {
          await navigate(page, `${SKETCH_URL}?only=${kind}&w=390&h=844&t=${theme}&vclock`)
          await waitUntil(page, 'window.__ready === true && [...document.images].every((i) => i.complete)', 8000)
          await sleep(300)
          const box = await page.evaluate(`(() => { const r = document.querySelector('.bez').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height } })()`)
          let cur = 0
          const files = []
          for (let i = 0; i < times.length; i++) {
            await page.evaluate(`window.__adv(${(times[i] - cur).toFixed(4)})`)
            cur = times[i]
            const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...box, scale: 1 } })
            const f = resolve(tmp, `${String(i).padStart(2, '0')}.png`)
            await writeFile(f, Buffer.from(shot.data, 'base64'))
            files.push(f)
          }
          const sheet = resolve(OUTDIR, `frames-${kind}${theme === 'dark' ? '-escuro' : ''}.png`)
          execFileSync('montage', [...files, '-tile', '6x2', '-geometry', '+4+4', '-background', '#888888', sheet])
          console.log(`entrada-sketch: folha de quadros frames-${kind}${theme === 'dark' ? '-escuro' : ''}.png (${times.join(', ')} s)`)
        }
      } finally {
        rmSync(tmp, { recursive: true, force: true })
      }
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
