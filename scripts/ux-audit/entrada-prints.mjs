#!/usr/bin/env node
// Captura os prints REAIS do app (modo MOCK, dados ficticios) para o sketch 029 (entrada v2).
// Sobe o Vite em 127.0.0.1 com VITE_USE_EMULATOR=true, semeia o localStorage com seed.mjs (ajustado para
// nomes neutros e mais eventos), abre cada rota a 390x844 (dpr 2) nos temas claro e escuro e salva
// PNG em .planning/sketches/029-entrada-v2/prints/ e WEBP (o que o sketch embute).
// So Chrome local e Vite em 127.0.0.1; nenhuma rede externa; nenhum .env lido.
// Uso: . ./scripts/dev-env.sh && node scripts/ux-audit/entrada-prints.mjs [--list]
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = resolve(ROOT, '.planning/sketches/029-entrada-v2/prints')
const PORT = 5198
const ORIGIN = `http://127.0.0.1:${PORT}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// [arquivo, rota, texto que prova que a tela carregou, rolagem em px, clique opcional (rotulo)]
const SHOTS = [
  ['home', '/', 'Pode gastar', 0, null],
  ['limites', '/', 'Limites', 880, null],
  ['calendario', '/calendario', 'Calendário', 0, 'Financeiro'],
  ['agenda', '/calendario', 'Calendário', 0, 'Agenda'],
  ['contas', '/contas-fixas', 'Contas fixas', 0, null],
  ['relatorios', '/relatorios', 'Relat', 0, null],
]
// Acentos que o seed (sem acento por seguranca de arquivo) nao tem; so para o print ficar natural.
const ACCENTS = [
  ['Alimentacao', 'Alimentação'], ['Educacao', 'Educação'], ['Saude', 'Saúde'], ['Servicos', 'Serviços'],
  ['Salario', 'Salário'], ['Combustivel', 'Combustível'], ['Farmacia', 'Farmácia'], ['Vestuario', 'Vestuário'],
  ['aniversario', 'aniversário'], ['Aniversario', 'Aniversário'], ['Almoco', 'Almoço'], ['Padaria do bairro', 'Padaria do bairro'],
  ['Mensalidade', 'Mensalidade'], ['Orcamento', 'Orçamento'], ['Lancamento', 'Lançamento'], ['Seguro do carro', 'Seguro do carro'],
  ['Deposito', 'Depósito'], ['Reserva de emergencia', 'Reserva de emergência'], ['Bonus', 'Bônus'], ['Ingles', 'Inglês'],
  ['medico', 'médico'], ['orcamento', 'orçamento'], ['ingles', 'inglês'], ['Plano de saude', 'Plano de saúde'], ['Energia', 'Energia'], ['musica', 'música'], ['Hortifruti', 'Hortifrúti'],
]

const cleanups = []
for (const s of ['SIGINT', 'SIGTERM']) {
  process.on(s, async () => {
    await Promise.allSettled(cleanups.map((f) => f()))
    process.exit(2)
  })
}

async function startVite() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    env: { ...process.env, VITE_USE_EMULATOR: 'true', BROWSER: 'none' },
    stdio: 'ignore',
    detached: true,
  })
  child.unref()
  let exited = false
  child.on('exit', () => {
    exited = true
  })
  const stop = async () => {
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
    }
  }
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    if (exited) throw new Error('o Vite encerrou ao subir')
    try {
      const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return { stop }
    } catch {
      /* ainda subindo */
    }
    await sleep(250)
  }
  await stop()
  throw new Error('prazo estourado esperando o Vite')
}

/** Seed do audit com nomes neutros e eventos suficientes para o calendario ficar vivo. */
function buildSketchSeed() {
  const now = new Date()
  const seed = buildSeed('full', now)
  const settings = JSON.parse(seed['doc::settings::main'])
  settings.tabNames = { area1: 'Ana', area2: 'Caio', piggy: 'Porquinho' }
  settings.categoryDefs = settings.categoryDefs.filter((d) => !['assinaturas', 'casa', 'pets', 'sona'].includes(d.id))
  settings.categories = settings.categoryDefs.map((d) => d.name)
  seed['doc::settings::main'] = JSON.stringify(settings)
  const events = JSON.parse(seed['db::events'])
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const at = (d, h) => new Date(now.getFullYear(), now.getMonth(), Math.min(last, d), h, 0, 0).toISOString()
  const extra = [
    ['seed-e4', 'conjunto', 'Aniversario da vovo', 3, '19:00', 'seed-ec1'],
    ['seed-e5', 'ela', 'Dentista', 8, '14:00', 'seed-ec2'],
    ['seed-e6', 'conjunto', 'Passeio no parque', 12, '10:00', 'seed-ec3'],
    ['seed-e7', 'ele', 'Futebol com amigos', 15, '19:30', 'seed-ec3'],
    ['seed-e8', 'conjunto', 'Jantar de aniversario', 18, '20:00', 'seed-ec1'],
    ['seed-e9', 'ele', 'Retorno medico', 22, '08:30', 'seed-ec2'],
    ['seed-e10', 'conjunto', 'Viagem de fim de ano', 27, '06:00', 'seed-ec3'],
  ]
  for (const [id, person, title, day, time, categoryId] of extra) {
    events.push({ id, person, title, date: at(day, 12), time, categoryId, createdAt: now.toISOString() })
  }
  seed['db::events'] = JSON.stringify(events)
  // Limites mais folgados: a Home fica no ritmo (Vintem tranquilo), sem aviso vermelho.
  const person = settings.personConfig
  const lim = (id, cents) => [{ from: '2025-01', cents }]
  person.ele.limits.alimentacao = lim('a', 320000)
  person.ele.limits.lazer = lim('l', 60000)
  person.ele.limits.transporte = lim('t', 70000)
  person.ela.limits.alimentacao = lim('a', 200000)
  person.ela.limits.lazer = lim('l', 60000)
  seed['doc::settings::main'] = JSON.stringify(settings)
  for (const k of Object.keys(seed)) {
    let v = seed[k]
    for (const [a, b] of ACCENTS) v = v.split(a).join(b)
    seed[k] = v
  }
  return seed
}

function bootSource(seed, theme) {
  return `(() => {
    try {
      if (!sessionStorage.getItem('__seeded_'+${JSON.stringify(theme)})) {
        for (const k of Object.keys(localStorage)) if (k.startsWith('db::') || k.startsWith('doc::')) localStorage.removeItem(k)
        const seed = ${JSON.stringify(seed)}
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
        localStorage.setItem('coinc:onboarding:v1', '1')
        localStorage.setItem('coinc:tema:v1', ${JSON.stringify(theme)})
        sessionStorage.setItem('__seeded_'+${JSON.stringify(theme)}, '1')
      }
    } catch {}
  })()`
}

async function main() {
  const vite = await startVite()
  cleanups.push(() => vite.stop())
  const chrome = await launchChrome()
  cleanups.push(() => chrome.close())
  try {
    await mkdir(OUT, { recursive: true })
    const seed = buildSketchSeed()
    for (const [theme, tag] of [['claro', 'claro'], ['escuro', 'escuro']]) {
      const page = await connect(chrome.wsUrl)
      await page.send('Page.enable')
      await page.send('Runtime.enable')
      await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
      await page.send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-color-scheme', value: theme === 'escuro' ? 'dark' : 'light' },
          { name: 'prefers-reduced-motion', value: 'reduce' },
        ],
      })
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: bootSource(seed, theme) })
      for (const [name, route, marker, scroll, click] of SHOTS) {
        // As falas do Vintem sorteiam o tom e o tom sem filtro tem palavrao: nos prints do sketch o texto dessas falas
        // e trocado por uma frase neutra (so DOM da captura; o app nao e alterado).
        let ok = false
        for (let attempt = 0; attempt < 1; attempt++) {
          await page.send('Page.navigate', { url: 'about:blank' })
          const loaded = page.waitFor('Page.loadEventFired', 30000)
          await page.send('Page.navigate', { url: `${ORIGIN}${route}` })
          await loaded
          const deadline = Date.now() + 15000
          ok = false
          while (Date.now() < deadline) {
            ok = await page.evaluate(`!!document.body && document.body.innerText.includes(${JSON.stringify(marker)})`)
            if (ok) break
            await sleep(200)
          }
          await sleep(2200)
          break
        }
        if (!ok) console.log(`aviso: marcador "${marker}" nao apareceu em ${name}/${tag}`)
        await page.evaluate(`(() => {
          const rude = /porra|caralh|merda|puta|foda|cacete|bosta|droga|inferno|diabo/i
          for (const el of document.querySelectorAll('p,span,div,button')) {
            if (el.children.length > 0 || !rude.test(el.textContent || '')) continue
            el.textContent = el.closest('[data-situation]')
              ? 'Tudo no ritmo por aqui. Dá para gastar R$ 192 por dia até o fim do mês.'
              : 'O maior peso do mês está em Alimentação, mas dentro do teto.'
          }
        })()`)
        if (click) {
          await page.evaluate(`(() => { const t = ${JSON.stringify(click)}; const els = [...document.querySelectorAll('button,[role=tab],[role=radio]')]; const el = els.find((e) => (e.getAttribute('aria-label') || e.textContent || '').trim() === t); if (el) el.click() })()`)
          await sleep(900)
        }
        if (scroll) {
          await page.evaluate(`(() => { const s = document.scrollingElement; s.scrollTop = ${scroll}; document.querySelectorAll('main,[class*=overflow-y]').forEach((e)=>{ if(e.scrollHeight>e.clientHeight) e.scrollTop=${scroll} }) })()`)
          await sleep(500)
        }
        for (const [format, ext, quality] of [['png', 'png'], ['webp', 'webp', 80]]) {
          let shot
          for (let t = 0; t < 3 && !shot; t++) {
            try {
              shot = await page.send('Page.captureScreenshot', { format, ...(quality ? { quality } : {}) })
            } catch {
              await sleep(800)
            }
          }
          if (!shot) throw new Error(`captura falhou em ${name}/${tag}`)
          await writeFile(resolve(OUT, `${name}-${tag}.${ext}`), Buffer.from(shot.data, 'base64'))
        }
        console.log(`captura ${name}-${tag}`)
      }
      page.close()
    }
  } finally {
    await chrome.close()
    await vite.stop()
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(`entrada-prints: ${e.message}`)
    process.exit(2)
  },
)
