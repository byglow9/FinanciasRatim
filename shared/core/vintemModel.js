// @ts-check
// Modelo puro do Vintem: molas por parametro, alvos por estado, respiracao e a
// pose que o desenhista le. Sem DOM, sem relogio nativo e sem acaso nativo: o
// tempo e `World.t` (relogio simulado) e o acaso entra por `rand` injetado.
// O desenho (plano 04-09) so le `model.pose`.

import { Spring, SPRING_PARAMS, BLINK, blinkEnv } from './vintemSpring.js'
import { STATE_KEYS, STATE_DEFAULTS, STATE_PARAMS } from './vintemStates.js'

/** Quadro maximo do relogio simulado: aba voltando do fundo nunca explode. */
const MAX_DT = 1 / 30
const TAU = Math.PI * 2
/** Tolerancias de "assentou": erro e velocidade despreziveis. */
const SETTLE_ERR = 0.01
const SETTLE_VEL = 0.05
/** Ponteiro de toque ou caneta expira depois disto (D-18); o mouse mantem a posicao. */
const TOUCH_TTL = 1.2
/** Probabilidade de uma piscada agendada virar dupla (1 em 8). */
const DOUBLE_BLINK_P = 1 / 8

/** Acessorios da pose, cada um com uma mola de entrada e saida. */
export const ACCESSORY_KEYS = Object.freeze(['tear', 'sweat', 'anger', 'spark', 'excl', 'z'])

/** Chaves da pose que o desenhista le. */
export const POSE_KEYS = Object.freeze([
  'e', 'px', 'py', 'sx', 'sy', 'rot', 'head', 'look', 'gaze', 'blink', 'earL', 'earR',
  'tail', 'turn', 'acc', 'accPhase', 'coin', 'coins', 'shadow',
])

/**
 * Pose do Vintem, escrita a cada `update` e lida pelo desenhista.
 * `e`: as 19 chaves de expressao ja com as molas (cvL e cvR ja com o despertar e
 * a queda da cabeca). `px`, `py`: deslocamento. `sx`, `sy`: escala do corpo
 * (volume preservado). `rot`: inclinacao do corpo em graus (segue o olhar mais as
 * reacoes). `head`: inclinacao extra da cabeca (queda do sonolento) em graus.
 * `look`: pupila normalizada (norma eliptica menor ou igual a 1). `gaze`: centro
 * do olhar. `blink`: cobertura da palpebra (0 a 1, negativo no overshoot).
 * `earL`, `earR`, `tail`: graus. `turn`: 0 frente, 1 perfil. `acc`: acessorios de
 * 0 a cerca de 1,2. `accPhase`: fase (0 a 1) dos acessorios animados.
 * `coin`: moeda do gasto. `coins`: moedinhas da festa (ate 8; `a` e o giro em
 * radianos e `o` a opacidade). `shadow`: escala `sx` e opacidade `a` da sombra.
 * @typedef {{
 *   e: Record<string, number>,
 *   px: number, py: number, sx: number, sy: number, rot: number, head: number,
 *   look: { x: number, y: number }, gaze: { x: number, y: number },
 *   blink: number, earL: number, earR: number, tail: number, turn: number,
 *   acc: Record<string, number>, accPhase: number,
 *   coin: { on: boolean, x: number, y: number, sx: number, rot: number },
 *   coins: Array<{ x: number, y: number, a: number, o: number }>,
 *   shadow: { sx: number, a: number },
 * }} VintemPose
 */

/**
 * Ponteiro entregue pelo mundo do navegador. `mouse` mantem a ultima posicao;
 * `touch` e `pen` expiram quando `ageSec` passa de 1,2 s.
 * @typedef {{ x: number, y: number, kind: string, ageSec: number }} Pointer
 */

/**
 * Retangulo do host na tela, em pixels.
 * @typedef {{ left: number, top: number, width: number, height: number }} HostRect
 */

/**
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

/**
 * @param {number} v
 * @returns {number}
 */
function num(v) {
  return Number.isFinite(v) ? v : 0
}

/**
 * @param {number} x
 * @param {readonly number[]} pr [k, c]
 * @returns {Spring}
 */
function mk(x, pr) {
  return new Spring(x, pr[0], pr[1])
}

/** @type {Record<string, Readonly<Record<string, number>>>} */
const MERGED = {}

/**
 * Parametros completos de um estado (padrao mais diferencas).
 * @param {string} name
 * @returns {Readonly<Record<string, number>>}
 */
function paramsFor(name) {
  let m = MERGED[name]
  if (!m) {
    const diff = /** @type {Record<string, Record<string, number>>} */ (/** @type {unknown} */ (STATE_PARAMS))[name]
    m = Object.freeze({ ...STATE_DEFAULTS, ...(diff || {}) })
    MERGED[name] = m
  }
  return m
}

/**
 * Periodo e amplitude da respiracao em `sy`.
 * @param {string} eff
 * @returns {{ period: number, amp: number }}
 */
function breathOf(eff) {
  if (eff === 'sonolento') return { period: 5.6, amp: 0.028 }
  if (eff === 'surpreso') return { period: 3.6, amp: 0.012 }
  return { period: 3.6, amp: 0.02 }
}

/** Overrides vazios (movimento reduzido ignora os overrides de movimento). */
const NO_OV = Object.freeze({})

/**
 * Relogio simulado compartilhado: `t` em segundos, fila de entradas futuras e
 * lista de modelos vivos. `step` limita o `dt` a 1/30 s.
 */
export class World {
  constructor() {
    this.t = 0
    /** @type {Set<VintemModel>} */
    this._models = new Set()
    /** @type {Array<{ at: number, seq: number, fn: () => void, owner: any }>} */
    this._q = []
    this._seq = 0
  }

  /** @param {VintemModel} m */
  add(m) {
    this._models.add(m)
  }

  /** @param {VintemModel} m */
  remove(m) {
    this._models.delete(m)
  }

  /**
   * Agenda `fn` daqui a `ms` milissegundos de tempo simulado. Empate pelo
   * instante resolve pela ordem de insercao. Se o dono foi destruido ou removido
   * do mundo ate la, a entrada vira nada.
   * @param {number} ms
   * @param {() => void} fn
   * @param {any} [owner]
   */
  later(ms, fn, owner) {
    const entry = { at: this.t + ms / 1000, seq: this._seq++, fn, owner }
    let i = this._q.length
    while (i > 0 && this._q[i - 1].at > entry.at) i--
    this._q.splice(i, 0, entry)
  }

  /**
   * Avanca o relogio, dispara o que venceu e atualiza os modelos vivos.
   * @param {number} dt segundos (limitado a [0, 1/30])
   */
  step(dt) {
    const h = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), MAX_DT)
    this.t += h
    while (this._q.length && this._q[0].at <= this.t) {
      const e = /** @type {NonNullable<typeof this._q[0]>} */ (this._q.shift())
      if (e.owner && (e.owner.dead || !this._models.has(e.owner))) continue
      e.fn()
    }
    for (const m of [...this._models]) if (!m.dead) m.update(h)
  }
}

/**
 * Pose inicial (tudo em repouso).
 * @returns {VintemPose}
 */
function newPose() {
  /** @type {Record<string, number>} */
  const e = {}
  for (const k of STATE_KEYS) e[k] = 0
  /** @type {Record<string, number>} */
  const acc = {}
  for (const k of ACCESSORY_KEYS) acc[k] = 0
  return {
    e, px: 0, py: 0, sx: 1, sy: 1, rot: 0, head: 0,
    look: { x: 0, y: 0 }, gaze: { x: 0, y: 0 },
    blink: 0, earL: 0, earR: 0, tail: 0, turn: 0, acc, accPhase: 0.3,
    coin: { on: false, x: 120, y: -80, sx: 1, rot: 0 },
    coins: [], shadow: { sx: 1, a: 0.12 },
  }
}

/** O modelo do Vintem: molas, alvos por estado e a pose. */
export class VintemModel {
  /**
   * @param {{
   *   state?: string,
   *   rand: () => number,
   *   world?: World,
   *   reduced?: () => boolean,
   *   getPointer?: () => Pointer | null,
   *   hostRect?: () => HostRect | null,
   *   onEvent?: (kind: string, t: number, data?: any) => void,
   * }} o
   */
  constructor(o) {
    this.rand = o.rand
    this.world = o.world || new World()
    this._reduced = o.reduced || null
    this._getPointer = o.getPointer || null
    this._hostRect = o.hostRect || null
    this._onEvent = o.onEvent || null
    this.dead = false
    /** Estado de fundo. */
    this.state = STATE_PARAMS[/** @type {keyof typeof STATE_PARAMS} */ (o.state || 'neutro')] ? o.state || 'neutro' : 'neutro'
    /** Overrides das reacoes (vazio em repouso). */
    this.ov = /** @type {Record<string, any>} */ ({})
    this._flash = /** @type {string | null} */ (null)
    this._flashUntil = 0
    /** Fase da respiracao, independente do piscar. */
    this._bph = this.rand() * TAU
    this._turn = false
    this._pose = newPose()
    // olhar: sacadas curtas na deriva, centro que muda a cada 1,1 a 3,3 s
    this._gT = 0
    this._gcT = 0
    this._gcx = 0
    this._gcy = 0
    this._tx = 0
    this._ty = 0
    this._forceGaze = false
    // sonolento e orelha
    this._sleepT = 0
    this._earT = 2.5 + this.rand() * 4
    // piscar: agenda propria, independente da respiracao
    this._bStart = -9
    this._bNext = 0
    this._dbl = false
    this._scheduleBlink()

    const base = paramsFor(this.state)
    /** @type {Record<string, Spring>} */
    this._p = {}
    for (const k of STATE_KEYS) this._p[k] = mk(base[k], SPRING_PARAMS.pp)
    this._s = {
      sy: mk(1, SPRING_PARAMS.body),
      sx: mk(1, SPRING_PARAMS.body),
      px: mk(0, SPRING_PARAMS.pos),
      py: mk(0, SPRING_PARAMS.pos),
      rot: mk(0, SPRING_PARAMS.rot),
      head: mk(0, SPRING_PARAMS.head),
      lx: mk(0, SPRING_PARAMS.look),
      ly: mk(0, SPRING_PARAMS.look),
      turn: mk(0, SPRING_PARAMS.turn),
      wake: mk(0, SPRING_PARAMS.wake),
      droop: mk(0, SPRING_PARAMS.droop),
      earL: mk(0, SPRING_PARAMS.ear),
      earR: mk(0, SPRING_PARAMS.ear),
      tail: mk(0, SPRING_PARAMS.tail),
    }
    this.world.add(this)
    this.snapPose()
  }

  /** Pose atual (mesmo objeto a cada quadro, escrito em `update`). */
  get pose() {
    return this._pose
  }

  /** @returns {boolean} */
  _rm() {
    return this._reduced ? !!this._reduced() : false
  }

  /**
   * Estado efetivamente mostrado: o forcado de uma reacao ou o de fundo.
   * @returns {string}
   */
  effState() {
    return this._flash && this.world.t < this._flashUntil ? this._flash : this.state
  }

  /**
   * Troca o estado de fundo.
   * @param {string} s
   */
  setState(s) {
    if (this.dead || s === this.state || !STATE_PARAMS[/** @type {keyof typeof STATE_PARAMS} */ (s)]) return
    this.state = s
    this._sleepT = 0
    this._retargetExpression()
    this._blinkNow()
  }

  /**
   * Avisa um observador externo (testes); em producao nao ha observador.
   * @param {string} kind
   * @param {any} [data]
   */
  _emit(kind, data) {
    if (this._onEvent) this._onEvent(kind, this.world.t, data)
  }

  /** Agenda a proxima piscada normal: espera de 2 a 6 s. */
  _scheduleBlink() {
    const wait = 2 + this.rand() * 4
    this._bNext = wait
    this._emit('blink-schedule', { mode: 'normal', wait })
  }

  /** Inicia uma piscada agora, se nao houver uma em curso e o movimento permitir. */
  _blinkNow() {
    if (this._rm()) return
    const t = this.world.t
    if (t - this._bStart > BLINK.total) {
      this._bStart = t
      this._emit('blink', { phase: this._bph })
    }
  }

  /**
   * Ponteiro valido para seguir: o mouse mantem a ultima posicao; toque e caneta
   * expiram em 1,2 s.
   * @returns {Pointer | null}
   */
  _activePointer() {
    if (!this._getPointer) return null
    const p = this._getPointer()
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
    if (p.kind !== 'mouse' && p.ageSec > TOUCH_TTL) return null
    return p
  }

  /**
   * Olha para (x, y) normalizados (-1 a 1): fixa o centro do olhar e faz uma
   * sacada no proximo quadro.
   * @param {number} x
   * @param {number} y
   */
  gazeTo(x, y) {
    if (this.dead) return
    this._gcx = clamp(num(x), -1, 1)
    this._gcy = clamp(num(y), -1, 1)
    this._gcT = 1.1 + this.rand() * 2.2
    this._forceGaze = true
    this._gT = 0
  }

  /**
   * Uma sacada: novo alvo da pupila. Seguindo o ponteiro a cada 120 a 300 ms,
   * na deriva a cada 200 a 600 ms. Sacada grande dispara uma piscada.
   * @param {Pointer | null} ptr
   */
  _saccade(ptr) {
    const rect = ptr && !this._forceGaze && this._hostRect ? this._hostRect() : null
    let lx
    let ly
    let follow = false
    if (ptr && rect) {
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const rw = Math.max(rect.width, 90)
      this._gcx = Math.tanh((ptr.x - cx) / (rw * 1.1))
      this._gcy = Math.tanh((ptr.y - cy) / (rw * 1.1))
      this._gT = 0.12 + this.rand() * 0.18
      lx = this._gcx + (this.rand() - 0.5) * 0.08
      ly = this._gcy + (this.rand() - 0.5) * 0.06
      follow = true
    } else {
      this._gT = 0.2 + this.rand() * 0.4
      lx = this._gcx + (this.rand() - 0.5) * 0.3
      ly = this._gcy * 0.7 + (this.rand() - 0.5) * 0.2
    }
    this._forceGaze = false
    const nx = clamp(lx, -1, 1)
    const ny = clamp(ly, -1, 1)
    if (Math.hypot(nx - this._tx, ny - this._ty) > 0.55 && this.world.t - this._bStart > 0.6) this._blinkNow()
    this._tx = nx
    this._ty = ny
    this._emit('saccade', { x: nx, y: ny, follow })
  }

  /**
   * Novo centro do olhar na deriva. No neutro ha vies de +0,15 em x.
   * @param {string} eff
   */
  _newGazeCenter(eff) {
    const bias = eff === 'neutro' ? 0.15 : 0
    this._gcT = 1.1 + this.rand() * 2.2
    this._gcx = bias + (this.rand() * 2 - 1) * (0.75 - bias)
    this._gcy = (this.rand() * 2 - 1) * 0.5
    this._emit('gaze-center', { x: this._gcx, y: this._gcy })
  }

  /**
   * Reacao curta. Aqui so o despertar do sonolento (a piscada e a queda zerada);
   * o roteiro completo das reacoes vem depois.
   * @param {string} kind
   */
  react(kind) {
    if (this.dead) return
    if (kind === 'wake') {
      this._sleepT = 0
      this._s.droop.x = 0
      this._s.droop.v = 0
      this._blinkNow()
    }
  }

  /**
   * Toque no Vintem: desperta se estiver sonolento (devolve true), senao so pisca.
   * @returns {boolean}
   */
  touch() {
    if (this.dead) return false
    if (this.state === 'sonolento' || this.effState() === 'sonolento') {
      this.react('wake')
      return true
    }
    this._blinkNow()
    return false
  }

  /** Aponta as molas de expressao para o estado mostrado agora (sem avancar o tempo). */
  _retargetExpression() {
    const Z = paramsFor(this.effState())
    for (const k of STATE_KEYS) this._p[k].t = Z[k]
  }

  /**
   * Calcula o alvo de todas as molas para este quadro.
   * @param {number} dt
   * @param {boolean} rm movimento reduzido
   */
  _targets(dt, rm) {
    const s = this._s
    const eff = this.effState()
    const Z = paramsFor(eff)
    const ov = /** @type {Record<string, any>} */ (rm ? NO_OV : this.ov)

    // respiracao: fase propria, independente do piscar
    const { period, amp } = breathOf(eff)
    let b = 0
    if (!rm) {
      this._bph = (this._bph + (dt * TAU) / period) % TAU
      b = Math.sin(this._bph)
    }
    let sy = Z.sy * (1 + amp * b)
    if (ov.sy != null) sy = ov.sy
    sy -= s.droop.x * 0.03
    sy = Math.max(sy, 0.2)
    s.sy.t = sy
    s.sx.t = 1 / sy

    // sonolento: a cabeca cai em 3 etapas (2,4 s cada) e volta com um tranco aos 9,4 s
    const sleepy = eff === 'sonolento' && !rm
    if (sleepy) {
      if (dt > 0) this._sleepT += dt
      const stg = Math.min(3, Math.floor(this._sleepT / 2.4))
      const target = stg / 3
      if (target !== s.droop.t) this._emit('droop', { stage: stg })
      s.droop.t = target
      if (this._sleepT > 9.4) {
        this._sleepT = 0
        s.droop.t = 0
        s.droop.v = -1.4
        s.wake.t = 1
        s.wake.x = Math.max(s.wake.x, 0.4)
        this.world.later(320, () => { s.wake.t = 0 }, this)
        this._emit('jolt')
        this._blinkNow()
      }
    } else {
      if (eff !== 'sonolento') this._sleepT = 0
      s.droop.t = 0
    }

    // olhar em sacadas; o centro do olhar muda sozinho na deriva
    let lx = 0
    let ly = 0
    if (!rm) {
      const ptr = this._activePointer()
      if (dt > 0) {
        this._gT -= dt
        if (this._gT <= 0) this._saccade(ptr)
        if (!ptr) {
          this._gcT -= dt
          if (this._gcT <= 0) this._newGazeCenter(eff)
        }
      }
      lx = this._tx
      ly = this._ty
    } else {
      this._tx = 0
      this._ty = 0
    }
    if (ov.lx != null) lx = ov.lx
    if (ov.ly != null) ly = ov.ly
    if (sleepy) {
      lx *= 0.4
      ly = 0.2 + s.droop.x * 0.3
    }
    s.lx.t = clamp(lx, -1, 1)
    s.ly.t = clamp(ly, -1, 1)

    // cabeca segue o centro do olhar (nao a sacada), com atraso das molas
    const gcx = rm ? 0 : this._gcx
    s.rot.t = gcx * 3.2 + (ov.rot || 0)
    s.head.t = sleepy ? s.droop.x * 10 : 0
    s.px.t = gcx * 3 + (ov.px || 0)
    s.py.t = Z.py + (ov.py || 0) + (sleepy ? s.droop.x * 5 : 0)

    // piscar: espera de 2 a 6 s (so conta depois de a piscada anterior acabar), dupla em 1 de 8
    if (!rm && dt > 0 && this._bNext > 0 && this.world.t - this._bStart > BLINK.total) {
      this._bNext -= dt
      if (this._bNext <= 0) {
        this._blinkNow()
        if (this._dbl) {
          this._dbl = false
          this._scheduleBlink()
        } else if (this.rand() < DOUBLE_BLINK_P) {
          this._dbl = true
          this._bNext = 0.14 + this.rand() * 0.06
          this._emit('blink-schedule', { mode: 'double', wait: this._bNext })
        } else {
          this._scheduleBlink()
        }
      }
    }

    // uma mola por parametro de expressao
    for (const k of STATE_KEYS) this._p[k].t = Z[k]

    // orelhas seguem a velocidade do corpo e assentam depois (corpo -> cabeca -> orelhas)
    const bv = -s.py.v * 0.05 + s.sy.v * 9 + s.rot.v * 0.35 - (rm ? 0 : s.px.v * 0.03)
    const ear = rm ? 0 : clamp(bv, -24, 24)
    s.earL.t = ear
    s.earR.t = ear
    if (!rm && dt > 0) {
      this._earT -= dt
      if (this._earT <= 0) {
        this._earT = 2.5 + this.rand() * 4
        const left = this.rand() < 0.5
        ;(left ? s.earL : s.earR).v += 60
        this._emit('ear-tic', { side: left ? 'L' : 'R' })
      }
    }

    // rabo: balanca mais no feliz (so o perfil usa)
    const wag = eff === 'feliz' ? 3.4 : 1.6
    s.tail.t = rm ? 0 : Math.sin(this.world.t * wag * 2.2) * (eff === 'feliz' ? 14 : 6) + (ov.tail || 0) + clamp(-s.py.v * 0.05, -16, 16)
  }

  /** @param {(sp: Spring) => void} fn */
  _eachSpring(fn) {
    for (const k of STATE_KEYS) fn(this._p[k])
    for (const sp of Object.values(this._s)) fn(sp)
  }

  /**
   * Escreve a pose a partir das molas.
   * @param {boolean} rm movimento reduzido
   */
  _writePose(rm) {
    const pose = this._pose
    const p = this._p
    const s = this._s
    for (const k of STATE_KEYS) pose.e[k] = num(p[k].x)
    pose.e.cvL = num(clamp(p.cvL.x - s.wake.x * 0.45 + s.droop.x * 0.18, 0, 1))
    pose.e.cvR = num(clamp(p.cvR.x - s.wake.x * 0.45 + s.droop.x * 0.18, 0, 1))
    pose.px = num(s.px.x)
    pose.py = num(s.py.x)
    pose.sx = num(s.sx.x)
    pose.sy = num(s.sy.x)
    pose.rot = num(s.rot.x)
    pose.head = num(s.head.x)
    pose.earL = num(s.earL.x)
    pose.earR = num(s.earR.x)
    pose.tail = num(s.tail.x)
    pose.turn = num(s.turn.x)
    pose.blink = rm ? 0 : num(blinkEnv(this.world.t - this._bStart))
    // pupila presa dentro do olho: norma eliptica menor ou igual a 1
    let lx = s.lx.x
    let ly = s.ly.x
    const nn = Math.hypot(lx, ly)
    if (nn > 1) {
      lx /= nn
      ly /= nn
    }
    pose.look.x = num(lx)
    pose.look.y = num(ly)
    pose.gaze.x = num(this._gcx)
    pose.gaze.y = num(this._gcy)
    const lift = clamp(-pose.py / 50, 0, 1.2)
    pose.shadow.sx = 1 - 0.22 * lift
    pose.shadow.a = 0.12 * (1 - 0.45 * lift)
  }

  /**
   * Avanca o modelo por `dt` segundos (limitado a 1/30 s) e escreve a pose.
   * @param {number} dt
   */
  update(dt) {
    if (this.dead) return
    const h = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), MAX_DT)
    const rm = this._rm()
    this._targets(h, rm)
    this._eachSpring((sp) => sp.step(h, rm))
    this._writePose(rm)
  }

  /** Pula todas as molas para os alvos (entrada no viewport, testes). */
  snapPose() {
    const rm = this._rm()
    this._targets(0, rm)
    this._eachSpring((sp) => sp.snap(sp.t))
    this._writePose(rm)
  }

  /**
   * Todas as molas de expressao assentaram (e, em movimento reduzido, tambem as
   * de corpo). Em movimento normal as molas ambientes (respiracao, olhar, orelha,
   * rabo) nunca assentam por definicao e ficam de fora.
   * @returns {boolean}
   */
  isSettled() {
    /** @param {Spring} sp */
    const near = (sp) => Math.abs(sp.t - sp.x) < SETTLE_ERR && Math.abs(sp.v) < SETTLE_VEL
    for (const k of STATE_KEYS) if (!near(this._p[k])) return false
    const s = this._s
    if (!near(s.turn) || !near(s.wake) || !near(s.droop)) return false
    if (this._rm()) {
      for (const sp of Object.values(s)) if (!near(sp)) return false
    }
    return true
  }

  /** Marca o modelo como morto: nao avanca e as entradas pendentes viram nada. */
  destroy() {
    this.dead = true
    this.world.remove(this)
  }
}
