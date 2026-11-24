// @ts-check
// Tabelas do Vintem de entrada (tela de Login), portadas do sketch 029 (engine.js, commit
// 25ae8e33). Variante opcional do mesmo motor: olhos simetricos (largos, palpebras iguais, sem
// sobrancelha clara), olhar neutro natural e tres estados: neutro, triste e dormindo.
// O Vintem do resto do app nao muda (STATE_PARAMS, VINTEM_STATES e ACCESSORY_BY_STATE ficam
// como estao). Sem relogio, sem pacote, sem DOM.

import { STATE_DEFAULTS } from './vintemStates.js'

/** Os tres estados da variante de entrada. */
export const ENTRADA_STATES = Object.freeze(['neutro', 'triste', 'dormindo'])

/**
 * Padrao da variante: os do app com os numeros do sketch (olho 21 por 18, palpebras iguais em
 * 0,20, pupila 0,64) e as chaves sem par no sketch neutras e simetricas.
 */
export const ENTRADA_DEFAULTS = Object.freeze({
  ...STATE_DEFAULTS,
  ew: 21,
  eh: 18,
  cvL: 0.2,
  cvR: 0.2,
  pr: 0.64,
  cu: 0,
  wet: 0,
  ly: 0,
  bc: 0,
  ba: 0,
})

/**
 * Diferencas de cada estado em relacao a ENTRADA_DEFAULTS. As chaves `sl` e `bo` do sketch nao
 * existem no app: o sono vem de cvL e cvR em 1 e o acessorio Zzz.
 */
export const ENTRADA_PARAMS = Object.freeze({
  neutro: Object.freeze({}),
  triste: Object.freeze({
    ew: 18, eh: 15.5, cvL: 0.42, cvR: 0.42, lt: -15, pr: 0.7,
    by: 6, bt: -8, sy: 1.04, py: 5, rt: 5, ea: 70, es: 0.72,
  }),
  dormindo: Object.freeze({
    cvL: 1, cvR: 1, pr: 0.6, by: 7, bt: 3, ea: 38, es: 0.96,
  }),
})

/** Acessorio de cada estado de entrada (`null` = nenhum). */
export const ENTRADA_ACCESSORY = Object.freeze({
  neutro: null,
  triste: null,
  dormindo: 'zzz',
})

/** Posicao dos olhos: dx do centro (olhos do sketch em x 91 e 149) e y. */
export const ENTRADA_EYE = Object.freeze({ dx: 29, y: 109 })
