// @ts-check
// Molas amortecidas do Vintem (solver, tabela de molas, curva do piscar e
// gerador de acaso semeado). Sem relogio, sem pacote, sem DOM: o tempo entra por
// `dt` e o acaso entra por um gerador injetado (mulberry32), de modo que tudo e
// determinista e testavel em Node.

/** Rigidez minima no amortecimento critico (movimento reduzido). */
export const CRITICAL_MIN_K = 420

/**
 * Molas `[k, c]` (massa 1). Razao de amortecimento: zeta = c / (2 * sqrt(k)).
 * Uma mola `pp` por parametro de expressao, mais as molas de corpo.
 */
export const SPRING_PARAMS = Object.freeze({
  body: Object.freeze([200, 11]),
  pos: Object.freeze([160, 15]),
  rot: Object.freeze([140, 12]),
  head: Object.freeze([60, 13]),
  look: Object.freeze([4000, 126]),
  pp: Object.freeze([260, 21]),
  popIn: Object.freeze([360, 17]),
  popOut: Object.freeze([200, 29]),
  ear: Object.freeze([150, 6.5]),
  tail: Object.freeze([90, 4.5]),
  turn: Object.freeze([70, 12.5]),
  wake: Object.freeze([200, 18]),
  droop: Object.freeze([90, 13]),
  gauge: Object.freeze([60, 11]),
  bub: Object.freeze([300, 16]),
})

/**
 * Razao de amortecimento de uma mola de massa 1.
 * @param {number} k rigidez
 * @param {number} c amortecimento
 * @returns {number}
 */
export function springZeta(k, c) {
  return c / (2 * Math.sqrt(k))
}

/** Mola amortecida de uma dimensao, integrada em subpassos de 1/240 s. */
export class Spring {
  /**
   * @param {number} x valor inicial (o alvo comeca igual)
   * @param {number} k rigidez
   * @param {number} c amortecimento
   * @param {number} [m] massa (1 por padrao)
   */
  constructor(x, k, c, m = 1) {
    this.x = x
    this.v = 0
    this.t = x
    this.k = k
    this.c = c
    this.m = m
  }

  /**
   * Pula para o valor, sem velocidade.
   * @param {number} value
   */
  snap(value) {
    this.x = value
    this.t = value
    this.v = 0
  }

  /**
   * Avanca a mola. Integracao semi-implicita em subpassos de no maximo 1/240 s,
   * entao um `dt` grande (aba voltando do fundo) nao explode.
   * @param {number} dt segundos
   * @param {boolean} [critical] amortecimento critico (movimento reduzido)
   */
  step(dt, critical = false) {
    let k = this.k
    let c = this.c
    if (critical) {
      k = Math.max(k, CRITICAL_MIN_K)
      c = 2 * Math.sqrt(k * this.m)
    }
    const n = Math.max(1, Math.ceil(dt * 240))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      const a = ((this.t - this.x) * k - this.v * c) / this.m
      this.v += a * h
      this.x += this.v * h
    }
  }
}

/**
 * Curva do piscar, em segundos. A palpebra fecha em 80 ms, segura 40 ms e abre
 * em 170 ms de curva (cerca de 150 ms nominais), com um overshoot negativo de
 * 70 ms. Total 360 ms.
 */
export const BLINK = Object.freeze({ close: 0.08, hold: 0.04, open: 0.17, over: 0.07, total: 0.36 })

/**
 * Cobertura da palpebra (0 aberta, 1 fechada) `t` segundos depois do inicio do
 * piscar. Valor negativo e o overshoot de abertura (pico de -14%). Zero fora
 * de [0, total).
 * @param {number} t
 * @returns {number}
 */
export function blinkEnv(t) {
  if (t < 0 || t >= BLINK.total) return 0
  if (t < BLINK.close) {
    const u = t / BLINK.close
    return u * u * (3 - 2 * u)
  }
  if (t < BLINK.close + BLINK.hold) return 1
  const t2 = t - BLINK.close - BLINK.hold
  if (t2 < BLINK.open) return (1 + Math.cos((Math.PI * t2) / BLINK.open)) / 2
  return -0.14 * Math.sin((Math.PI * (t2 - BLINK.open)) / BLINK.over)
}

/**
 * Gerador de acaso determinista (mulberry32). Devolve uma funcao que, a cada
 * chamada, entrega um numero em [0, 1). O acaso do modelo entra sempre por
 * este gerador injetado, nunca por acaso nativo.
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
