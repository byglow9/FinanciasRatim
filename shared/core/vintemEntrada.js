// @ts-check
// Tabelas do Vintem de entrada (tela de Login), portadas do sketch 029 (engine.js, commit
// 25ae8e33). Variante opcional do mesmo motor: olhos simetricos (largos, palpebras iguais, sem
// sobrancelha clara), olhar neutro natural e seis estados: neutro, triste e dormindo (Login, plano
// 05-22) mais atento, surpreso e feliz (cenas do onboarding, plano 05-23; as reacoes susto e festa
// do motor forcam surpreso e feliz).
// O Vintem do resto do app nao muda (STATE_PARAMS, VINTEM_STATES e ACCESSORY_BY_STATE ficam
// como estao). Sem relogio, sem pacote, sem DOM.

import { STATE_DEFAULTS } from './vintemStates.js'

/** Os seis estados da variante de entrada. */
export const ENTRADA_STATES = Object.freeze(['neutro', 'triste', 'dormindo', 'atento', 'surpreso', 'feliz'])

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
  // plano 05-23 (POSE do sketch 029): `sl` e `bo` do sketch caem; o resto fica nos padroes de entrada.
  atento: Object.freeze({
    ew: 20, eh: 19, cvL: 0.08, cvR: 0.08, pr: 0.58, by: -8, sy: 1.12, ea: 0, es: 1.12,
  }),
  surpreso: Object.freeze({
    ew: 22, eh: 22, cvL: 0, cvR: 0, pr: 0.42, by: -13, sy: 1.04, py: -3, ea: 26, es: 1.2,
  }),
  feliz: Object.freeze({
    arc: 1, by: -5, sy: 1.02, ea: 8, es: 1.08,
  }),
})

/** Acessorio de cada estado de entrada (`null` = nenhum). */
export const ENTRADA_ACCESSORY = Object.freeze({
  neutro: null,
  triste: null,
  dormindo: 'zzz',
  atento: 'sweat',
  surpreso: 'excl',
  feliz: 'spark',
})

/** Posicao dos olhos: dx do centro (olhos do sketch em x 91 e 149) e y. */
export const ENTRADA_EYE = Object.freeze({ dx: 29, y: 109 })
