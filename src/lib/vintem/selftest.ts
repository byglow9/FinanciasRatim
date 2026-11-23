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
import { EYE } from '@/lib/vintem/geometry'
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

/**
 * Limiar da mascara: um pixel e "desenho" quando a soma das diferencas RGB ate o fundo passa disto.
 * Revalidado para o corpo no token de acao (oliva): a distancia corpo-fundo mede cerca de 484 (era 593
 * com o verde do sketch), o focinho, o ponto mais claro do corpo, mede cerca de 408, e a esclera branca
 * fica perto de 65 e entra pelo preenchimento de buracos. Com 150 sobra folga de mais de 2 vezes
 * para a borda suavizada; `checkMaskThreshold` repete essa conta a cada execucao.
 */
const MASK_THRESHOLD = 150
/** Soma RGB acima da qual dois pixels contam como diferentes na comparacao de pares. */
const DIFF_THRESHOLD = 150
/** Distincao minima entre dois estados, em % dos pixels do desenho (nunca relaxar: ajuste a arte). */
const MIN_PAIR_DIFF_PCT = 12
/** O neutro assimetrico precisa diferir do simetrico por pelo menos isto (%) a 84 px. */
const MIN_ASYMMETRY_PCT = 3
/** Diferenca minima entre as palpebras (fracao de cobertura) e entre as sobrancelhas (unidades) do neutro. */
const MIN_LID_GAP = 0.15
const MIN_BROW_GAP = 5
/** Cobertura das duas palpebras do neutro simetrico de referencia (a do sketch, antes da correcao 1). */
const SYMMETRIC_LID = 0.1
/** Altura da silhueta do triste em relacao ao neutro a 84 px. */
const MIN_SAD_HEIGHT_RATIO = 0.92
/** As orelhas do triste passam do corpo por no maximo isto (unidades do viewBox) e ficam entre estas bordas. */
const EAR_OVERHANG = 14
const EAR_LEFT_LIMIT = 14
const EAR_RIGHT_LIMIT = 226
/** Giro: angulos medidos (0 a 1 em passos de 0,05) e minimos da silhueta em relacao a frente. */
const TURN_STEPS = 20
const MIN_TURN_WIDTH_RATIO = 0.5
const MIN_TURN_AREA_RATIO = 0.7
/** Acima disto (pixels) uma mancha conexa e o corpo; abaixo sao acessorios soltos (suor, Zzz, brilho). */
const BODY_MIN_PX = 800
/** Acessorio visivel no perfil: mais que isto de pixels na cor dele (UI-SPEC, ponto fraco 3). */
const MIN_ACCESSORY_PIXELS = 12
/** Distancia RGB maxima entre um pixel e a cor computada do acessorio (cobre a opacidade da fase fixa). */
const ACCESSORY_COLOR_TOLERANCE = 120
/** Lados do quadro de medicao (larguras em pixels); a altura segue a proporcao 6:5 do viewBox. */
const SIZE_HERO = 84
const SIZE_INLINE = 48
const SIZE_STAGE = 240

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

// ---- rasterizador e mascara ----

/** Propriedades computadas copiadas para o clone do svg (variaveis CSS nao viajam para a imagem). */
const COPIED_STYLES = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'display'] as const

const cssRgb = (c: Rgb) => `rgb(${c[0]} ${c[1]} ${c[2]})`
const frameHeight = (w: number) => Math.round((w * 200) / 240)

/** Clona o svg vivo, fixa os estilos computados no clone, serializa como imagem e desenha num canvas. */
async function raster(svg: SVGSVGElement, w: number, h: number, bg: Rgb): Promise<ImageData> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const live = svg.querySelectorAll('*')
  const copy = clone.querySelectorAll<SVGElement>('*')
  for (let i = 0; i < live.length; i++) {
    const cs = getComputedStyle(live[i])
    for (const name of COPIED_STYLES) copy[i].style.setProperty(name, cs.getPropertyValue(name))
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('autoteste: a imagem do svg nao carregou'))
    img.src = src
  })
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('autoteste: canvas 2d indisponivel')
  ctx.fillStyle = cssRgb(bg)
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/** Mascara do desenho (1 = desenho): distancia de cor ao fundo e preenchimento dos buracos (esclera). */
function maskOf(d: ImageData, bg: Rgb): Uint8Array {
  const { width: w, height: h, data } = d
  const n = w * h
  const drawn = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const dist = Math.abs(data[i * 4] - bg[0]) + Math.abs(data[i * 4 + 1] - bg[1]) + Math.abs(data[i * 4 + 2] - bg[2])
    drawn[i] = dist > MASK_THRESHOLD ? 1 : 0
  }
  // fundo = o que se alcanca das bordas sem cruzar o desenho; o resto (olhos brancos) e desenho
  const outside = new Uint8Array(n)
  const stack: number[] = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const q = stack.pop() as number
    if (outside[q] || drawn[q]) continue
    outside[q] = 1
    const x = q % w
    const y = (q - x) / w
    if (x > 0) stack.push(q - 1)
    if (x < w - 1) stack.push(q + 1)
    if (y > 0) stack.push(q - w)
    if (y < h - 1) stack.push(q + w)
  }
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) out[i] = outside[i] ? 0 : 1
  return out
}

interface Comp {
  n: number
  x0: number
  x1: number
  y0: number
  y1: number
}

/** Componentes conexas (8 vizinhos) da mascara; ignora manchas de menos de `minPx` pixels. */
function components(m: Uint8Array, w: number, h: number, minPx = 6): Comp[] {
  const seen = new Uint8Array(m.length)
  const out: Comp[] = []
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || seen[i]) continue
    const c: Comp = { n: 0, x0: w, x1: -1, y0: h, y1: -1 }
    const stack = [i]
    seen[i] = 1
    while (stack.length) {
      const q = stack.pop() as number
      const x = q % w
      const y = (q - x) / w
      c.n++
      if (x < c.x0) c.x0 = x
      if (x > c.x1) c.x1 = x
      if (y < c.y0) c.y0 = y
      if (y > c.y1) c.y1 = y
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const j = ny * w + nx
          if (m[j] && !seen[j]) {
            seen[j] = 1
            stack.push(j)
          }
        }
      }
    }
    if (c.n >= minPx) out.push(c)
  }
  return out
}

/** Porcentagem de pixels diferentes entre duas imagens, sobre a uniao das duas mascaras. */
function diffPct(a: ImageData, b: ImageData, ma: Uint8Array, mb: Uint8Array): number {
  const n = a.width * a.height
  let diff = 0
  let union = 0
  for (let i = 0; i < n; i++) {
    if (ma[i] || mb[i]) union++
    const dl =
      Math.abs(a.data[i * 4] - b.data[i * 4]) +
      Math.abs(a.data[i * 4 + 1] - b.data[i * 4 + 1]) +
      Math.abs(a.data[i * 4 + 2] - b.data[i * 4 + 2])
    if (dl > DIFF_THRESHOLD) diff++
  }
  return (100 * diff) / Math.max(1, union)
}

/** Imagem e mascara de uma pose congelada, na largura pedida. */
interface Shot {
  img: ImageData
  mask: Uint8Array
}

async function shoot(m: Mounted, frozen: VintemFreeze, w: number, bg: Rgb): Promise<Shot> {
  m.set(frozen)
  const h = frameHeight(w)
  const img = await raster(m.svg(), w, h, bg)
  return { img, mask: maskOf(img, bg) }
}

const pageBackground = () => resolveColor('hsl(var(--background))', 'backgroundColor')

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

/** Revalida o limiar da mascara com o corpo no token de acao: a distancia ao fundo tem de sobrar. */
function checkMaskThreshold(r: Report) {
  const m = mount('stage', { state: 'neutro', turn: 0 })
  const svg = m.svg()
  const bg = pageBackground()
  const dist = (c: Rgb) => Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2])
  const body = toRgb(getComputedStyle(svg.querySelector('[id$="-bodyF"]') as Element).fill)
  const snout = toRgb(getComputedStyle(svg.querySelector('[id$="-snoutG"] ellipse') as Element).fill)
  const eye = toRgb(getComputedStyle(svg.querySelector('[id$="-eL"] [data-e="scl"]') as Element).fill)
  info(r, `limiar da mascara ${MASK_THRESHOLD}: distancia ao fundo corpo ${dist(body)}, focinho ${dist(snout)}, esclera ${dist(eye)} (corpo do sketch: 593)`)
  ok(r, 'limiar da mascara revalidado: o corpo e o focinho passam com folga de pelo menos 2 vezes', dist(body) >= 2 * MASK_THRESHOLD && dist(snout) >= 2 * MASK_THRESHOLD, `${dist(body)} e ${dist(snout)}`)
  ok(r, 'a esclera fica abaixo do limiar e so entra pelo preenchimento de buracos', dist(eye) < MASK_THRESHOLD, dist(eye))
  m.dispose()
}

/** Uma linha da matriz de pares, com os rotulos cortados para caber. */
function matrixRows(names: readonly string[], values: number[][]): string[] {
  const pad = (t: string, n: number) => (t + ' '.repeat(n)).slice(0, n)
  const head = `${pad('', 10)}${names.map((n) => pad(n.slice(0, 6), 8)).join('')}`
  return [head, ...names.map((a, i) => `${pad(a, 10)}${names.map((_, j) => pad(values[i][j].toFixed(1), 8)).join('')}`)]
}

/** 8. Distincao por pares a 84 e a 48 px, mais o controle negativo do olhar. */
async function checkDistinction(r: Report, bg: Rgb) {
  const m = mount('stage', { state: 'neutro', turn: 0 })
  const names = VINTEM_STATES
  for (const width of [SIZE_HERO, SIZE_INLINE]) {
    const shots: Shot[] = []
    for (const state of names) shots.push(await shoot(m, { state, turn: 0 }, width, bg))
    const matrix = names.map(() => names.map(() => 0))
    let min = Infinity
    let minPair = ''
    const below: string[] = []
    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < names.length; j++) {
        matrix[i][j] = diffPct(shots[i].img, shots[j].img, shots[i].mask, shots[j].mask)
        if (j <= i) continue
        if (matrix[i][j] < min) {
          min = matrix[i][j]
          minPair = `${names[i]} x ${names[j]}`
        }
        if (matrix[i][j] < MIN_PAIR_DIFF_PCT) below.push(`${names[i]} x ${names[j]} ${matrix[i][j].toFixed(1)}`)
      }
    }
    ok(
      r,
      `distincao: os 21 pares diferem em pelo menos ${MIN_PAIR_DIFF_PCT}% a ${width} px (menor: ${minPair} ${min.toFixed(1)}%)`,
      below.length === 0,
      below.join('; '),
    )
    for (const row of matrixRows(names, matrix)) info(r, `matriz ${width}px ${row}`)
  }

  // Controle negativo: o neutro so com o olhar desviado nao pode passar como estado distinto.
  const base = await shoot(m, { state: 'neutro', turn: 0 }, SIZE_HERO, bg)
  const gaze = await shoot(m, { state: 'neutro', turn: 0, look: { x: 0.8, y: 0.3 } }, SIZE_HERO, bg)
  const pc = diffPct(base.img, gaze.img, base.mask, gaze.mask)
  ok(r, `controle negativo: o neutro so com o olhar desviado mede ${pc.toFixed(1)}% e fica abaixo de ${MIN_PAIR_DIFF_PCT}%`, pc < MIN_PAIR_DIFF_PCT, pc.toFixed(1))
  m.dispose()
}

/** Cobertura da palpebra de cima (fracao) lida do desenho: `cv = (y + 90 + ry) / (alcance * ry)`. */
function lidCover(svg: SVGSVGElement, side: 'L' | 'R'): number {
  const up = svg.querySelector(`[id$="-e${side}"] [data-e="up"]`) as SVGRectElement
  const ry = Number((svg.querySelector(`[id$="-e${side}"] [data-e="scl"]`) as SVGEllipseElement).getAttribute('ry'))
  return (Number(up.getAttribute('y')) + 90 + ry) / (EYE.lidReach * ry)
}

/** Altura (y da transformacao) de uma sobrancelha. */
function browY(svg: SVGSVGElement, side: 'L' | 'R'): number {
  const t = (svg.querySelector(`[id$="-b${side}"]`) as SVGPathElement).getAttribute('transform') ?? ''
  const m = /translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/.exec(t)
  return m ? Number(m[2]) : NaN
}

/** Extensao horizontal das duas orelhas no viewBox, amostrando o contorno com a matriz de tela. */
function earSpan(svg: SVGSVGElement): { min: number; max: number } {
  const inv = (svg.getScreenCTM() as DOMMatrix).inverse()
  let min = Infinity
  let max = -Infinity
  for (const ear of svg.querySelectorAll<SVGPathElement>('[id$="-earL"] path, [id$="-earR"] path')) {
    const mat = inv.multiply(ear.getScreenCTM() as DOMMatrix)
    const len = ear.getTotalLength()
    for (let i = 0; i <= 48; i++) {
      const p = ear.getPointAtLength((len * i) / 48)
      const x = new DOMPoint(p.x, p.y).matrixTransform(mat).x
      if (x < min) min = x
      if (x > max) max = x
    }
  }
  return { min, max }
}

/** Pontos fracos 1 (neutro assimetrico) e 2 (triste achatado, orelhas de asa). */
async function checkWeakPoints12(r: Report, bg: Rgb) {
  const m = mount('stage', { state: 'neutro', turn: 0 })

  // 1. neutro esperto: uma palpebra mais baixa e uma sobrancelha mais alta, visivel a 84 px
  const svgN = m.svg()
  const lidGap = lidCover(svgN, 'L') - lidCover(svgN, 'R')
  const browGap = Math.abs(browY(svgN, 'R') - browY(svgN, 'L'))
  ok(r, `neutro assimetrico: palpebras com diferenca ${lidGap.toFixed(2)} (minimo ${MIN_LID_GAP})`, lidGap >= MIN_LID_GAP, lidGap.toFixed(3))
  ok(r, `neutro assimetrico: sobrancelhas com diferenca ${browGap.toFixed(1)} unidades (minimo ${MIN_BROW_GAP})`, browGap >= MIN_BROW_GAP, browGap.toFixed(2))
  const neutro = await shoot(m, { state: 'neutro', turn: 0 }, SIZE_HERO, bg)
  const sym = await shoot(m, { state: 'neutro', turn: 0, expr: { cvL: SYMMETRIC_LID, cvR: SYMMETRIC_LID, ba: 0 } }, SIZE_HERO, bg)
  const asym = diffPct(neutro.img, sym.img, neutro.mask, sym.mask)
  ok(r, `neutro assimetrico difere do simetrico em ${asym.toFixed(1)}% a 84 px (minimo ${MIN_ASYMMETRY_PCT}%)`, asym >= MIN_ASYMMETRY_PCT, asym.toFixed(2))

  // 2. triste: altura da silhueta e orelhas dentro do corpo mais a folga
  const sad = await shoot(m, { state: 'triste', turn: 0 }, SIZE_HERO, bg)
  const height = (s: Shot) => {
    const c = components(s.mask, s.img.width, s.img.height).sort((a, b) => b.n - a.n)[0]
    return c ? c.y1 - c.y0 + 1 : 0
  }
  const hN = height(neutro)
  const hS = height(sad)
  const ratio = hS / Math.max(1, hN)
  ok(r, `triste com altura ${hS} px contra ${hN} do neutro a 84 px (${(ratio * 100).toFixed(1)}%, minimo ${MIN_SAD_HEIGHT_RATIO * 100}%)`, ratio >= MIN_SAD_HEIGHT_RATIO, ratio.toFixed(3))
  const svgS = m.svg()
  const span = earSpan(svgS)
  const bodyBox = (svgS.querySelector('[id$="-bodyF"]') as SVGPathElement).getBBox()
  const reach = span.max - span.min
  ok(
    r,
    `triste: orelhas de ${span.min.toFixed(1)} a ${span.max.toFixed(1)} (extensao ${reach.toFixed(1)}, corpo ${bodyBox.width.toFixed(0)} mais ${EAR_OVERHANG})`,
    reach <= bodyBox.width + EAR_OVERHANG && span.min >= EAR_LEFT_LIMIT && span.max <= EAR_RIGHT_LIMIT,
    `${span.min.toFixed(1)} a ${span.max.toFixed(1)}`,
  )
  m.dispose()
}

/** Os estados cujo acessorio precisa aparecer por pixels no perfil (UI-SPEC, ponto fraco 3), com o id do acessorio. */
const PROFILE_ACCESSORIES: Array<[string, string]> = [
  ['triste', 'tear'],
  ['atento', 'sweat'],
  ['bravo', 'anger'],
  ['sonolento', 'z0'],
]
const NO_ACCESSORY = { tear: 0, sweat: 0, anger: 0, spark: 0, excl: 0, z: 0 }

/** Opacidade efetiva de uma camada (frente ou perfil) lida dos atributos que o desenhista escreve. */
function layerOpacity(el: Element): number {
  if (el.getAttribute('display') === 'none') return 0
  const op = el.getAttribute('opacity')
  return op === null ? 1 : Number(op)
}

/** Olhos com caixa na camada dominante: dois na frente, um no perfil (empate vale a frente). */
function visibleEyes(svg: SVGSVGElement): number {
  const front = layerOpacity(svg.querySelector('[id$="-front"]') as Element)
  const side = layerOpacity(svg.querySelector('[id$="-side"]') as Element)
  if (front === 0 && side === 0) return 0
  const ids = front >= side ? ['eL', 'eR'] : ['eP']
  return ids.filter((id) => (svg.querySelector(`[id$="-${id}"]`) as SVGGElement).getBBox().width > 3).length
}

/** Leva um ponto do espaco local de `from` para o espaco local de `to` (ambos dentro do mesmo svg). */
function between(from: SVGGraphicsElement, to: SVGGraphicsElement, x: number, y: number): DOMPoint {
  const mat = (to.getScreenCTM() as DOMMatrix).inverse().multiply(from.getScreenCTM() as DOMMatrix)
  return new DOMPoint(x, y).matrixTransform(mat)
}

/** Pontos da orelha que ficam dentro do corpo (espaco local da orelha): o pivo e o meio da base. */
const EAR_ANCHORS_FRONT: Array<[string, number, number]> = [['pivo', 0, 0], ['base', 0, 8]]
const EAR_ANCHORS_PROFILE: Array<[string, number, number]> = [['pivo', 0, 0], ['base', 1, 8]]

/**
 * Orelhas ancoradas: o pivo e o meio da base de cada orelha (ja com a rotacao e a escala da pose) caem
 * dentro do preenchimento do corpo, na frente e no perfil. As pontas da base nao entram: com a orelha
 * dobrada do triste uma ponta passa 3 unidades do topo da cabeca sem soltar a orelha do corpo.
 */
function anchoredEars(svg: SVGSVGElement): string[] {
  const bad: string[] = []
  const body = svg.querySelector('[id$="-bodyF"]') as SVGGeometryElement
  // camada oculta (display none) nao tem matriz de tela confiavel: so mede a que aparece
  const showFront = layerOpacity(svg.querySelector('[id$="-front"]') as Element) > 0
  const showSide = layerOpacity(svg.querySelector('[id$="-side"]') as Element) > 0
  for (const id of showFront ? ['earL', 'earR'] : []) {
    const ear = svg.querySelector(`[id$="-${id}"]`) as SVGGraphicsElement
    for (const [name, x, y] of EAR_ANCHORS_FRONT) {
      if (!body.isPointInFill(between(ear, body, x, y))) bad.push(`${id} ${name}`)
    }
  }
  if (!showSide) return bad
  const prof = [svg.querySelector('[id$="-profHead"]'), svg.querySelector('[id$="-profBody"]')] as SVGGeometryElement[]
  const earP = svg.querySelector('[id$="-earP"]') as SVGGraphicsElement
  for (const [name, x, y] of EAR_ANCHORS_PROFILE) {
    if (!prof.some((p) => p.isPointInFill(between(earP, p, x, y)))) bad.push(`earP ${name}`)
  }
  return bad
}

/** Pixels do acessorio: diferem da mesma pose sem acessorio e estao perto da cor computada dele. */
function accessoryPixels(withAcc: Shot, without: Shot, color: Rgb): number {
  const a = withAcc.img.data
  const b = without.img.data
  let n = 0
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
    if (d <= DIFF_THRESHOLD) continue
    const c = Math.abs(a[i] - color[0]) + Math.abs(a[i + 1] - color[1]) + Math.abs(a[i + 2] - color[2])
    if (c <= ACCESSORY_COLOR_TOLERANCE) n++
  }
  return n
}

/** 9 e 10. Giro sem vazamento nem colapso nos 7 estados e 21 angulos, orelhas ancoradas, acessorios no perfil. */
async function checkTurn(r: Report, bg: Rgb) {
  const leaks: string[] = []
  const collapse: string[] = []
  const eyes: string[] = []
  const ears: string[] = []
  let worstWidth = Infinity
  let worstArea = Infinity
  let worstAt = ''
  /** Pixels de desenho em cada borda do quadro, ex.: `topo 2, direita 3` (vazio quando limpo). */
  const edge = (m: Uint8Array, w: number, h: number) => {
    let top = 0
    let bottom = 0
    let left = 0
    let right = 0
    for (let x = 0; x < w; x++) {
      top += m[x]
      bottom += m[(h - 1) * w + x]
    }
    for (let y = 0; y < h; y++) {
      left += m[y * w]
      right += m[y * w + w - 1]
    }
    return [top && `topo ${top}`, bottom && `base ${bottom}`, left && `esquerda ${left}`, right && `direita ${right}`].filter(Boolean).join(', ')
  }
  const m = mount('stage', { state: 'neutro', turn: 0 })
  for (const state of VINTEM_STATES) {
    const hasAcc = state !== 'neutro'
    let front: Comp | null = null
    for (let step = 0; step <= TURN_STEPS; step++) {
      const turn = step / TURN_STEPS
      const tag = `${state} T=${turn.toFixed(2)}`
      const shot = await shoot(m, { state, turn }, SIZE_STAGE, bg)
      const w = shot.img.width
      const h = shot.img.height
      const comps = components(shot.mask, w, h)
      const bodyComps = comps.filter((c) => c.n > BODY_MIN_PX)
      const touching = edge(shot.mask, w, h)
      if (touching) leaks.push(`${tag} borda ${touching}`)
      if (hasAcc ? bodyComps.length !== 1 : comps.length !== 1) leaks.push(`${tag} massas ${comps.map((c) => c.n).join('/')}`)
      const body = [...comps].sort((a, b) => b.n - a.n)[0]
      if (step === 0) front = body ?? null
      if (body && front) {
        const wr = (body.x1 - body.x0 + 1) / (front.x1 - front.x0 + 1)
        const ar = body.n / front.n
        if (wr < worstWidth) {
          worstWidth = wr
          worstAt = tag
        }
        worstArea = Math.min(worstArea, ar)
        if (wr < MIN_TURN_WIDTH_RATIO || ar < MIN_TURN_AREA_RATIO) collapse.push(`${tag} largura ${(wr * 100).toFixed(0)}% area ${(ar * 100).toFixed(0)}%`)
      }
      const seen = visibleEyes(m.svg())
      const want = turn <= 0.4 ? [2] : turn >= 0.6 ? [1] : [1, 2]
      if (!want.includes(seen)) eyes.push(`${tag} olhos ${seen}`)
      const loose = anchoredEars(m.svg())
      if (loose.length) ears.push(`${tag}: ${loose.join(', ')}`)
    }
  }
  ok(r, `giro sem vazamento: 7 estados x ${TURN_STEPS + 1} angulos com uma massa conexa e nada na borda do quadro`, leaks.length === 0, leaks.slice(0, 6).join('; '))
  info(r, `giro: pior largura ${(worstWidth * 100).toFixed(0)}% (${worstAt}), pior area ${(worstArea * 100).toFixed(0)}%`)
  ok(
    r,
    `giro sem colapso: largura >= ${MIN_TURN_WIDTH_RATIO * 100}% e area >= ${MIN_TURN_AREA_RATIO * 100}% da frontal em todos os angulos`,
    collapse.length === 0,
    collapse.slice(0, 6).join('; '),
  )
  ok(r, 'giro: dois olhos na frente, um no perfil e nunca zero no cruzamento', eyes.length === 0, eyes.slice(0, 6).join('; '))
  ok(r, 'orelhas ancoradas: pivo e base dentro do corpo em todos os estados e angulos', ears.length === 0, ears.slice(0, 4).join('; '))

  // Acessorios no perfil (T = 1): contam pixels na cor deles, medidos contra a mesma pose sem acessorio.
  const lost: string[] = []
  for (const [state, accId] of PROFILE_ACCESSORIES) {
    const withAcc = await shoot(m, { state, turn: 1 }, SIZE_STAGE, bg)
    const el = m.svg().querySelector(`[id$="-${accId}"] path`) as Element
    const cs = getComputedStyle(el)
    const color = toRgb(cs.fill !== 'none' ? cs.fill : cs.stroke)
    const without = await shoot(m, { state, turn: 1, acc: NO_ACCESSORY }, SIZE_STAGE, bg)
    const n = accessoryPixels(withAcc, without, color)
    info(r, `acessorio ${accId} de ${state} no perfil: ${n} pixels na cor ${color.join(',')}`)
    if (n <= MIN_ACCESSORY_PIXELS) lost.push(`${state} ${n}`)
  }
  ok(r, `acessorios de triste, atento, bravo e sonolento aparecem no perfil (mais de ${MIN_ACCESSORY_PIXELS} pixels)`, lost.length === 0, lost.join('; '))
  m.dispose()
}

/** Roda todas as verificacoes e escreve o relatorio no elemento `host` (o `pre` da pagina de teste). */
async function run(host: HTMLElement): Promise<void> {
  const r: Report = { lines: [], fails: 0 }
  try {
    const bg = pageBackground()
    checkStates(r)
    checkContrast(r)
    checkMaskThreshold(r)
    await checkDistinction(r, bg)
    await checkWeakPoints12(r, bg)
    await checkTurn(r, bg)
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
