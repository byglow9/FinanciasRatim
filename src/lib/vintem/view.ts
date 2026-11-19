// Desenhista do Vintem: le `model.pose` a cada quadro e escreve atributos SVG por ref.
// Guarda o ultimo valor de cada atributo e so chama setAttribute quando muda; todo numero
// passa por arredondamento que nunca escreve NaN nem infinito. React nunca participa.
import { VintemModel, type VintemPose } from '@shared/core/vintemModel.js'
import { mulberry32 } from '@shared/core/vintemSpring.js'
import { ACCESSORY_ANCHORS, COIN, EYE, FRONT, GROUND, TEAR } from './geometry'
import { getPointer, registerInstance, setInstanceFollow, simWorld, wake } from './world'

// ---- escrita de atributos com cache ----

interface Part {
  el: Element
  last: Record<string, string>
}

function part(el: Element | null, what: string): Part {
  if (!el) throw new Error(`Vintem: parte ausente no SVG (${what})`)
  return { el, last: {} }
}

function put(p: Part, attr: string, value: string) {
  if (p.last[attr] === value) return
  p.last[attr] = value
  p.el.setAttribute(attr, value)
}

function fx(n: number, scale: number): string {
  return Number.isFinite(n) ? String(Math.round(n * scale) / scale) : '0'
}
const f2 = (n: number) => fx(n, 100)
const f3 = (n: number) => fx(n, 1000)

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

// ---- partes ----

interface EyeParts {
  g: Part
  clip: Part
  ring: Part
  scl: Part
  sclG: Part
  wet: Part
  pup: Part
  gl: Part
  up: Part
  lidG: Part
  lidl: Part
  lo: Part
  lb: Part
  arc: Part
}

interface Parts {
  root: Part
  shadow: Part
  front: Part
  earLg: Part
  earRg: Part
  earL: Part
  earR: Part
  face: Part
  snoutG: Part
  eyeL: EyeParts
  eyeR: EyeParts
  bL: Part
  bR: Part
  tear: Part
  accG: Part
  coinsG: Part
  sweat: Part
  anger: Part
  spark: Part
  excl: Part
  z: Part[]
  coinR: Part
  coinS: Part
  coins: Array<{ g: Part; s: Part }>
}

function findParts(svg: SVGSVGElement, uid: string): Parts {
  const byId = (name: string) => part(svg.getElementById(`${uid}-${name}`), name)
  const eye = (side: 'L' | 'R'): EyeParts => {
    const g = svg.getElementById(`${uid}-e${side}`)
    const q = (name: string) => part(g?.querySelector(`[data-e="${name}"]`) ?? null, `e${side}.${name}`)
    const clipEl = svg.getElementById(`${uid}-clip${side}`)
    return {
      g: part(g, `e${side}`),
      clip: part(clipEl?.querySelector('ellipse') ?? null, `clip${side}`),
      ring: q('ring'),
      scl: q('scl'),
      sclG: q('sclG'),
      wet: q('wet'),
      pup: q('pup'),
      gl: q('gl'),
      up: q('up'),
      lidG: q('lidG'),
      lidl: q('lidl'),
      lo: q('lo'),
      lb: q('lb'),
      arc: q('arc'),
    }
  }
  return {
    root: byId('root'),
    shadow: byId('shadow'),
    front: byId('front'),
    earLg: byId('earLg'),
    earRg: byId('earRg'),
    earL: byId('earL'),
    earR: byId('earR'),
    face: byId('face'),
    snoutG: byId('snoutG'),
    eyeL: eye('L'),
    eyeR: eye('R'),
    bL: byId('bL'),
    bR: byId('bR'),
    tear: byId('tear'),
    accG: byId('accG'),
    coinsG: byId('coinsG'),
    sweat: byId('sweat'),
    anger: byId('anger'),
    spark: byId('spark'),
    excl: byId('excl'),
    z: [0, 1, 2].map((i) => byId(`z${i}`)),
    coinR: byId('coinR'),
    coinS: byId('coinS'),
    coins: Array.from({ length: COIN.maxSmall }, (_, i) => ({ g: byId(`pc${i}`), s: byId(`pcs${i}`) })),
  }
}

// ---- desenho ----

/** Um olho: porte do `eyeDraw` do sketch, com cobertura do piscar vinda da pose. */
function drawEye(E: EyeParts, pose: VintemPose, cv: number, x: number, y: number, dir: number, k: number): number {
  const e = pose.e
  const rx0 = Math.max(e.ew, 6)
  const ry0 = Math.max(e.eh, 6)
  const b = pose.blink
  const bc = clamp(b, 0, 1)
  const ry = ry0 * (b < 0 ? 1 - b * 0.5 : 1)
  const rx = rx0 * (b < 0 ? 1 - b * 0.2 : 1)
  const arc = clamp(e.arc, 0, 1.1)

  put(E.g, 'transform', `translate(${f2(x)},${f2(y)}) scale(${f3(k)},1)`)
  for (const p of [E.ring, E.clip, E.scl]) {
    put(p, 'rx', f2(rx))
    put(p, 'ry', f2(ry))
  }
  put(E.sclG, 'opacity', f2(clamp(1 - arc * 1.5, 0, 1)))

  // palpebra de cima: cobre ate eyU; o piscar fecha por cobertura, nunca por escala do olho
  const cvT = cv + bc * (1 - cv)
  const eyU = -ry + cvT * EYE.lidReach * ry
  const tilt = dir * e.lt * (1 - bc)
  put(E.up, 'y', f2(eyU - 90))
  put(E.lidG, 'transform', `rotate(${f2(tilt)} 0 ${f2(eyU)})`)
  put(E.lidl, 'd', `M${f2(-rx * 1.1)},${f2(eyU)}Q0,${f2(eyU + 2 + bc * 3)} ${f2(rx * 1.1)},${f2(eyU)}`)
  put(E.lidl, 'opacity', f2(clamp(cvT * 14, 0, 1)))

  // palpebra de baixo (bochecha subindo) e cobertura do piscar
  const cu = clamp(e.cu, 0, 1.05)
  const yt = ry * (1.25 - 1.9 * cu)
  put(E.lo, 'rx', f2(rx * 1.3))
  put(E.lo, 'ry', f2(ry * 1.7))
  put(E.lo, 'cy', f2(yt + ry * 1.7))
  put(E.lb, 'y', f2(ry - bc * 0.88 * ry))

  // pupila presa dentro do olho (norma eliptica <= 1); `ly` do estado desloca o olhar para baixo
  const pr = Math.max(0.05, e.pr) * Math.min(rx, ry) * EYE.pupilScale
  const lmx = Math.max(0, rx - pr) * EYE.pupilRoom
  const lmy = Math.max(0, ry - pr) * EYE.pupilRoom
  let ox = pose.look.x * lmx
  let oy = clamp(pose.look.y + e.ly, -1, 1) * lmy
  const nn = Math.sqrt((ox * ox) / Math.max(1, lmx * lmx) + (oy * oy) / Math.max(1, lmy * lmy))
  if (nn > 1) {
    ox /= nn
    oy /= nn
  }
  put(E.pup, 'r', f2(pr))
  put(E.pup, 'cx', f2(ox))
  put(E.pup, 'cy', f2(oy))

  // brilho unico preso a pupila
  const gr = Math.max(1.6, Math.min(3.6, pr * 0.38))
  put(E.gl, 'r', f2(gr))
  put(E.gl, 'cx', f2(ox - pr * 0.36))
  put(E.gl, 'cy', f2(oy - pr * 0.4))

  // pelicula d'agua (triste) e arco de sorriso (feliz)
  put(E.wet, 'cy', f2(ry * 0.62))
  put(E.wet, 'rx', f2(rx * 0.8))
  put(E.wet, 'ry', f2(ry * 0.34))
  put(E.wet, 'opacity', f2(0.55 * clamp(e.wet, 0, 1)))
  put(E.arc, 'd', `M${f2(-rx * 0.85)},${f2(ry * 0.3)}Q0,${f2(-ry * 0.85)} ${f2(rx * 0.85)},${f2(ry * 0.3)}`)
  put(E.arc, 'opacity', f2(clamp(arc * 1.4 - 0.2, 0, 1)))
  return ry0
}

function drawBrow(p: Part, x: number, y: number, dir: number, bt: number, bc: number) {
  put(p, 'transform', `translate(${f2(x)},${f2(y)}) rotate(${f2(dir * bt)})`)
  put(p, 'd', `M-13,0Q0,${f2(-bc)} 13,0`)
}

/** Posiciona um acessorio: some abaixo de 0,02; a escala segue o pop da mola. */
function place(p: Part, v: number, x: number, y: number, rot: number, opacity?: number) {
  if (v < 0.02) {
    put(p, 'display', 'none')
    return
  }
  put(p, 'display', 'inline')
  put(p, 'transform', `translate(${f2(x)},${f2(y)}) rotate(${f2(rot)}) scale(${f3(v)})`)
  put(p, 'opacity', f2(opacity ?? clamp(v * 1.5, 0, 1)))
}

/** Acessorios (fora do corpo), lagrima, moeda do gasto e moedinhas da festa. */
function drawAccessories(P: Parts, pose: VintemPose) {
  const a = pose.acc
  const ph = pose.accPhase
  const wave = Math.sin(ph * Math.PI * 2)
  const A = ACCESSORY_ANCHORS.front
  put(P.accG, 'transform', `translate(${f2(pose.px)},${f2(pose.py)})`)
  put(P.coinsG, 'transform', `translate(${f2(pose.px)},${f2(pose.py)})`)

  // suor escorre; raiva pulsa; brilho gira e pulsa; exclamacao treme; Zzz sobem
  place(P.sweat, a.sweat, A.sweat.x, A.sweat.y + ph * 26, 0, clamp(1 - ph * 0.8, 0, 1) * clamp(a.sweat * 1.5, 0, 1))
  place(P.anger, a.anger * (1 + 0.08 * wave), A.anger.x, A.anger.y, 0)
  place(P.spark, a.spark * (1 + 0.15 * wave), A.spark.x, A.spark.y, ph * 90)
  place(P.excl, a.excl, A.excl.x, A.excl.y, wave * 3)
  for (let i = 0; i < 3; i++) {
    const zp = (ph + i / 3) % 1
    place(
      P.z[i],
      a.z * (0.5 + zp * 0.7),
      A.z.x + zp * 30 + Math.sin(ph * Math.PI * 2 + i) * 3,
      A.z.y - zp * 46,
      0,
      clamp(Math.sin(zp * Math.PI) * 1.4, 0, 1) * clamp(a.z, 0, 1),
    )
  }

  // lagrima: pinga do olho esquerdo em ciclo de 2,8 s (cresce, cai, some)
  const tr = a.tear
  if (tr < 0.02) put(P.tear, 'display', 'none')
  else {
    const grow = ph < 0.35 ? 0.35 + (ph / 0.35) * 0.65 : 1
    const fall = ph < 0.35 ? 0 : Math.pow((ph - 0.35) / 0.65, 2) * TEAR.fall
    const fade = ph < 0.75 ? 1 : clamp((1 - ph) / 0.25, 0, 1)
    put(P.tear, 'display', 'inline')
    put(
      P.tear,
      'transform',
      `translate(${f2(GROUND.x - EYE.dx + TEAR.dx)},${f2(EYE.y + pose.e.eh + TEAR.dy + fall)}) scale(${f3(tr * grow * 0.8)})`,
    )
    put(P.tear, 'opacity', f2(fade * clamp(tr * 1.5, 0, 1)))
  }

  // moeda do gasto (recortada acima de y = 55) e moedinhas da festa
  const c = pose.coin
  if (c.on) {
    put(P.coinR, 'display', 'inline')
    put(P.coinR, 'transform', `translate(${f2(c.x)},${f2(c.y)})`)
    put(P.coinS, 'transform', `scale(${f3(c.sx)},1)`)
  } else put(P.coinR, 'display', 'none')
  for (let i = 0; i < P.coins.length; i++) {
    const q = pose.coins[i]
    const slot = P.coins[i]
    if (!q) {
      put(slot.g, 'display', 'none')
      continue
    }
    put(slot.g, 'display', 'inline')
    put(slot.g, 'transform', `translate(${f2(q.x)},${f2(q.y)}) scale(${COIN.smallScale})`)
    put(slot.s, 'transform', `scale(${f3(Math.max(0.14, Math.abs(Math.cos(q.a))))},1)`)
    put(slot.g, 'opacity', f2(q.o))
  }
}

export type PoseDrawer = (pose: VintemPose) => void

/** Cria o desenhista de um SVG ja montado (ids derivados de `uid`). */
export function createDrawer(svg: SVGSVGElement, uid: string): PoseDrawer {
  const P = findParts(svg, uid)

  return (pose) => {
    const e = pose.e
    // raiz: posicao, inclinacao (olhar, reacao, cabeca tombada) e escala do corpo em torno do chao
    const rot = pose.rot + pose.head + e.rt
    put(
      P.root,
      'transform',
      `translate(${f2(pose.px)},${f2(pose.py)}) translate(${GROUND.x},${GROUND.y}) rotate(${f2(rot)}) scale(${f3(pose.sx)},${f3(pose.sy)}) translate(${-GROUND.x},${-GROUND.y})`,
    )
    put(P.shadow, 'rx', f2(FRONT.shadow.rx * pose.shadow.sx))
    put(P.shadow, 'opacity', f2(pose.shadow.a))

    // orelhas: ancoradas na silhueta (atras do corpo), seguem o corpo com atraso
    const es = e.es
    const sxE = f3(Math.max(0.5, es < 1 ? es : 1))
    const syE = f3(Math.max(0.6, es))
    put(P.earLg, 'transform', `translate(${FRONT.earPivotL.x},${FRONT.earPivotL.y})`)
    put(P.earRg, 'transform', `translate(${FRONT.earPivotR.x},${FRONT.earPivotR.y})`)
    put(P.earL, 'transform', `rotate(${f2(-(e.ea + pose.earL))}) scale(${sxE},${syE})`)
    put(P.earR, 'transform', `rotate(${f2(e.ea + pose.earR)}) scale(${sxE},${syE})`)

    // rosto: paralaxe do olhar
    put(P.face, 'transform', `translate(${f2(pose.look.x * FRONT.parallax.x)},${f2(pose.look.y * FRONT.parallax.y)})`)
    put(P.snoutG, 'transform', `translate(${FRONT.snout.cx},${FRONT.snout.cy})`)

    const ex = EYE.dx
    const h = drawEye(P.eyeL, pose, e.cvL, GROUND.x - ex, EYE.y, 1, 1)
    drawEye(P.eyeR, pose, e.cvR, GROUND.x + ex, EYE.y, -1, 1)
    drawBrow(P.bL, GROUND.x - ex, EYE.y - h - EYE.browGap + e.by, 1, e.bt, e.bc)
    drawBrow(P.bR, GROUND.x + ex, EYE.y - h - EYE.browGap + e.by + e.ba, -1, e.bt, e.bc)

    drawAccessories(P, pose)
  }
}

// ---- cache de desenhistas por SVG (testes e capturas) ----

const drawers = new WeakMap<SVGSVGElement, PoseDrawer>()

/** Desenha uma pose num SVG montado (cria e guarda o desenhista na primeira chamada). */
export function drawPose(svg: SVGSVGElement, uid: string, pose: VintemPose) {
  let d = drawers.get(svg)
  if (!d) {
    d = createDrawer(svg, uid)
    drawers.set(svg, d)
  }
  d(pose)
}

// ---- view ----

export interface VintemViewHandle {
  setState: (state: string) => void
  setReduced: (reduced: boolean) => void
  setFollow: (follow: boolean) => void
  /** Reacao curta ('spend', 'susto', 'bronca', 'festa' ou 'wake'); volta ao humor de fundo. */
  react: (kind: string) => void
  /** Toque: desperta o sonolento (devolve true); senao so pisca. */
  touch: () => boolean
  /** Giro de lado: frente (falso) ou perfil (verdadeiro). */
  setTurn: (on: boolean) => void
  destroy: () => void
  /** O modelo vivo (leitura da pose por testes e capturas). */
  model: VintemModel
}

export interface VintemViewOptions {
  uid: string
  state?: string
  follow?: boolean
  reduced?: boolean
}

/** Semente por `crypto.getRandomValues`; sem acaso nativo. */
function newSeed(): number {
  const c = globalThis.crypto
  if (c && typeof c.getRandomValues === 'function') {
    const a = new Uint32Array(1)
    c.getRandomValues(a)
    return a[0]
  }
  return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0
}

/**
 * Liga um SVG montado ao modelo e ao laco global. `destroy()` remove do mundo, desliga o
 * observador e invalida o modelo (simetrico em StrictMode).
 */
export function createVintemView(svg: SVGSVGElement, opts: VintemViewOptions): VintemViewHandle {
  let reduced = !!opts.reduced
  let follow = opts.follow !== false

  const model = new VintemModel({
    state: opts.state,
    rand: mulberry32(newSeed()),
    world: simWorld,
    reduced: () => reduced,
    getPointer: () => (follow ? getPointer() : null),
    hostRect: () => svg.getBoundingClientRect(),
  })
  const drawer = createDrawer(svg, opts.uid)
  const draw = () => drawer(model.pose)
  draw()
  const unregister = registerInstance({ model, draw, host: svg, follow, reduced: () => reduced })

  return {
    model,
    setState(state) {
      model.setState(state)
      wake()
    },
    setReduced(next) {
      if (next === reduced) return
      reduced = next
      wake()
    },
    setFollow(next) {
      if (next === follow) return
      follow = next
      setInstanceFollow(svg, next)
    },
    react(kind) {
      model.react(kind)
      wake()
    },
    touch() {
      const woke = model.touch()
      wake()
      return woke
    },
    setTurn(on) {
      model.setTurn(on)
      wake()
    },
    destroy() {
      unregister()
      model.destroy()
    },
  }
}
