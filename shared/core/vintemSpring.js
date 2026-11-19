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
