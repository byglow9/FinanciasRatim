// Autoteste do Vintem por pixels e por DOM (UI-SPEC "Testes de regressao exigidos"). So a pagina de
// teste oculta carrega este modulo, por import dinamico atras do parametro `test`. Nao le dado do
// usuario: monta instancias congeladas fora da tela e mede o desenho. A saida e texto: linhas `PASS`,
// `FALHA:` e `INFO`, fechando com `FALHAS n` (o executor CDP le o resultado).
// Nenhuma cor em hexadecimal aqui: tudo vem de estilo computado dos tokens.
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { Vintem, type VintemHandle, type VintemSize, type VintemState } from '@/components/vintem/Vintem'
import type { VintemFreeze } from '@/lib/vintem/view'
import { VINTEM_STATES } from '@shared/core/vintemStates.js'

declare global {
  interface Window {
    /** Vira verdadeiro quando o autoteste termina (o executor CDP espera por isto). */
    __done?: boolean
  }
}

/** Contraste minimo de texto e de elemento grafico (WCAG 2.2). */
const MIN_CONTRAST_TEXT = 4.5
const MIN_CONTRAST_GRAPHIC = 3

// ---- relatorio ----

interface Report {
  lines: string[]
  fails: number
}

function ok(r: Report, name: string, cond: boolean, detail: string | number = '') {
  if (cond) {
    r.lines.push(`PASS ${name}`)
    return
  }
  r.fails++
  r.lines.push(`FALHA: ${name}${detail === '' ? '' : ` -> ${detail}`}`)
}

function info(r: Report, text: string) {
  r.lines.push(`INFO ${text}`)
}

// ---- instancias congeladas fora da tela ----

interface Mounted {
  host: HTMLDivElement
  root: Root
  handle: VintemHandle | null
  size: VintemSize
  svg: () => SVGSVGElement
  /** Congela numa pose nova (renderiza de forma sincrona). */
  set: (frozen: VintemFreeze) => void
  dispose: () => void
}

/** Monta um Vintem congelado num anfitriao invisivel (nao toca na arvore React da pagina). */
function mount(size: VintemSize, frozen: VintemFreeze): Mounted {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1'
  document.body.appendChild(host)
  const root = createRoot(host)
  const m: Mounted = {
    host,
    root,
    handle: null,
    size,
    svg: () => {
      const el = m.handle?.svg()
      if (!el) throw new Error('autoteste: svg do Vintem nao montou')
      return el
    },
    set(next) {
      flushSync(() => {
        root.render(
          createElement(Vintem, {
            ref: (h: VintemHandle | null) => {
              m.handle = h
            },
            state: (next.state ?? 'neutro') as VintemState,
            size,
            follow: false,
            reduced: true,
            frozen: next,
          }),
        )
      })
    },
    dispose() {
      root.unmount()
      host.remove()
    },
  }
  m.set(frozen)
  return m
}

// ---- cores ----

type Rgb = [number, number, number]

let probeCtx: CanvasRenderingContext2D | null = null

/** Converte qualquer cor CSS (rgb, color(srgb ...), etc.) em rgb por um canvas de 1 pixel. */
function toRgb(css: string): Rgb {
  if (!probeCtx) {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    probeCtx = c.getContext('2d', { willReadFrequently: true })
  }
  const ctx = probeCtx
  if (!ctx) throw new Error('autoteste: canvas 2d indisponivel')
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = 'black'
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2]]
}

/** Luminancia relativa do WCAG 2.2. */
function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const x = v / 255
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Cor computada de uma expressao CSS (ex.: `hsl(var(--background))`) lida num elemento de prova. */
function resolveColor(expr: string, prop: 'color' | 'backgroundColor' = 'color'): Rgb {
  const probe = document.createElement('i')
  probe.style[prop] = expr
  document.body.appendChild(probe)
  const css = getComputedStyle(probe)[prop]
  probe.remove()
  return toRgb(css)
}

const fmt = (n: number) => n.toFixed(2)

// ---- verificacoes ----

const INVALID_MARKUP = /NaN|Infinity|undefined/

/** 1. Sete estados: marcacao limpa e dois olhos com caixa na frente (a 84 px, como na grade). */
function checkStates(r: Report) {
  const bad: string[] = []
  for (const state of VINTEM_STATES) {
    const m = mount('hero', { state, turn: 0 })
    const svg = m.svg()
    if (INVALID_MARKUP.test(new XMLSerializer().serializeToString(svg))) bad.push(`${state}: marcacao com NaN, Infinity ou undefined`)
    const eyes = [...svg.querySelectorAll<SVGGElement>('[id$="-eL"], [id$="-eR"]')]
    const seen = eyes.filter((e) => e.getBBox().width > 3 && e.getBoundingClientRect().width > 0)
    if (seen.length !== 2) bad.push(`${state}: ${seen.length} olhos visiveis`)
    m.dispose()
  }
  ok(r, 'os 7 estados renderizam sem NaN e com dois olhos na frente', bad.length === 0, bad.join('; '))
}

/** Maior razao entre o preenchimento ou o contorno de um elemento e um fundo (a cor `none` nao conta). */
function bestContrast(el: Element, bg: Rgb): number {
  const cs = getComputedStyle(el)
  let best = 0
  for (const css of [cs.fill, cs.stroke]) {
    if (!css || css === 'none') continue
    best = Math.max(best, contrast(toRgb(css), bg))
  }
  return best
}

/** 12. Contraste por cores computadas, com o corpo no token de acao atual (nao o verde antigo). */
function checkContrast(r: Report) {
  const m = mount('stage', { state: 'neutro', turn: 0 })
  const svg = m.svg()
  const css = getComputedStyle(svg)
  const bodyToken = css.getPropertyValue('--vintem-body').trim()
  ok(r, 'a variavel --vintem-body esta definida (vem do token de acao)', bodyToken !== '', 'vazia')

  const pick = (selector: string): Element => {
    const el = svg.querySelector(selector)
    if (!el) throw new Error(`autoteste: sem elemento ${selector}`)
    return el
  }
  const body = toRgb(getComputedStyle(pick('[id$="-bodyF"]')).fill)
  const eye = toRgb(getComputedStyle(pick('[id$="-eL"] [data-e="scl"]')).fill)
  const brow = toRgb(getComputedStyle(pick('[id$="-bL"]')).stroke)
  const coin = toRgb(getComputedStyle(pick('[id$="-coinR"] circle')).fill)
  const page = resolveColor('hsl(var(--background))', 'backgroundColor')
  const card = resolveColor('hsl(var(--card))', 'backgroundColor')
  const action = resolveColor('var(--color-action)')
  ok(r, 'o corpo do Vintem tem a cor computada do token de acao', body.join() === action.join(), `${body.join()} contra ${action.join()}`)

  const eyeBody = contrast(eye, body)
  const browBody = contrast(brow, body)
  const bodyPage = contrast(body, page)
  const bodyCard = contrast(body, card)
  const coinBody = contrast(coin, body)
  ok(r, `contraste esclera sobre corpo ${fmt(eyeBody)}:1 (minimo ${MIN_CONTRAST_TEXT})`, eyeBody >= MIN_CONTRAST_TEXT)
  ok(r, `contraste sobrancelha sobre corpo ${fmt(browBody)}:1 (minimo ${MIN_CONTRAST_TEXT})`, browBody >= MIN_CONTRAST_TEXT)
  ok(r, `contraste corpo sobre o fundo da pagina ${fmt(bodyPage)}:1 (minimo ${MIN_CONTRAST_GRAPHIC})`, bodyPage >= MIN_CONTRAST_GRAPHIC)
  ok(r, `contraste corpo sobre o cartao ${fmt(bodyCard)}:1 (minimo ${MIN_CONTRAST_GRAPHIC})`, bodyCard >= MIN_CONTRAST_GRAPHIC)
  ok(r, `contraste moeda sobre corpo ${fmt(coinBody)}:1 (minimo ${MIN_CONTRAST_GRAPHIC})`, coinBody >= MIN_CONTRAST_GRAPHIC)

  // Acessorios: pelo preenchimento ou pelo contorno. A lagrima fica sobre o corpo; os demais fora dele,
  // sobre o cartao e sobre o fundo da pagina (vale o pior dos dois).
  const parts: Array<[string, string, boolean]> = [
    ['suor', '[id$="-sweat"] path', false],
    ['raiva', '[id$="-anger"] path', false],
    ['brilho', '[id$="-spark"] path', false],
    ['exclamacao', '[id$="-excl"] rect', false],
    ['Zzz', '[id$="-z0"] path', false],
    ['lagrima', '[id$="-tear"] path', true],
  ]
  const accLog: string[] = []
  for (const [name, selector, onBody] of parts) {
    const el = pick(selector)
    const ratio = onBody ? bestContrast(el, body) : Math.min(bestContrast(el, card), bestContrast(el, page))
    accLog.push(`${name} ${fmt(ratio)}`)
    ok(r, `contraste do acessorio ${name} ${fmt(ratio)}:1 (minimo ${MIN_CONTRAST_GRAPHIC})`, ratio >= MIN_CONTRAST_GRAPHIC)
  }
  info(r, `contrastes de acessorios: ${accLog.join(', ')}`)
  info(r, `cores computadas: corpo ${body.join(',')}, fundo ${page.join(',')}, cartao ${card.join(',')}`)
  m.dispose()
}

/** Roda todas as verificacoes e escreve o relatorio no elemento `host` (o `pre` da pagina de teste). */
async function run(host: HTMLElement): Promise<void> {
  const r: Report = { lines: [], fails: 0 }
  try {
    checkStates(r)
    checkContrast(r)
  } catch (err) {
    r.fails++
    r.lines.push(`FALHA: erro no autoteste -> ${err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)}`)
  }
  host.textContent = `${r.lines.join('\n')}\nFALHAS ${r.fails}`
  document.title = `Vintem teste FALHAS ${r.fails}`
  window.__done = true
}

const started = new WeakMap<HTMLElement, Promise<void>>()

/**
 * Roda o autoteste uma vez por elemento de saida (o StrictMode do desenvolvimento chama o efeito duas
 * vezes). Termina com a linha `FALHAS n`, ajusta `document.title` e liga `window.__done`.
 */
export function runSelfTest(host: HTMLElement): Promise<void> {
  let p = started.get(host)
  if (!p) {
    p = run(host)
    started.set(host, p)
  }
  return p
}
