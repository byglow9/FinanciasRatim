// @ts-check
// Tabela dos sete estados do Vintem (sketch 020 variante B, ja com as correcoes
// 1 e 2 do UI-SPEC). Sem relogio, sem pacote, sem DOM. Cada chave e uma mola
// propria (`pp`). Nao existem chaves de boca (sm, op) nem `cv` unico: o neutro
// precisa de cvL e cvR separados.
//
// Unidades: ew, eh, by, ba, py em unidades do viewBox; lt, bt, ea, rt em graus;
// cvL, cvR, cu, pr, arc, wet, ly, bc em fracao; es e sy em fator.
// lt e bt: positivo = ponta de dentro para baixo (bravo), negativo = para cima
// (triste). ea: abertura da orelha para fora (0 = em pe).

/** As 19 chaves de expressao, uma mola cada. */
export const STATE_KEYS = Object.freeze([
  'ew', 'eh', 'cvL', 'cvR', 'lt', 'cu', 'pr', 'arc', 'wet', 'by',
  'bt', 'bc', 'ba', 'ea', 'es', 'sy', 'py', 'ly', 'rt',
])

/** Os sete estados, na ordem de exibicao. */
export const VINTEM_STATES = Object.freeze([
  'neutro', 'feliz', 'triste', 'bravo', 'sonolento', 'surpreso', 'atento',
])

/** Padrao de cada chave; o estado so declara o que difere. */
export const STATE_DEFAULTS = Object.freeze({
  ew: 17, eh: 21, cvL: 0, cvR: 0, lt: 0, cu: 0, pr: 0.52, arc: 0, wet: 0, by: 0,
  bt: 0, bc: 0, ba: 0, ea: 16, es: 1, sy: 1, py: 0, ly: 0, rt: 0,
})

/**
 * Diferencas de cada estado em relacao a STATE_DEFAULTS (mesclar antes de usar).
 */
export const STATE_PARAMS = Object.freeze({
  // D-02: esperto e debochado. Palpebra esquerda mais baixa e sobrancelha direita mais alta.
  neutro: Object.freeze({ cvL: 0.3, cvR: 0.06, ba: -6, bc: 2 }),
})
