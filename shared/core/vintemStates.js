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
  // Olhos em arco de sorriso (arc 1); a esclera some.
  feliz: Object.freeze({ arc: 1, cu: 0, by: -5, bc: 3, sy: 1.02, ea: 8, es: 1.08 }),
  // Correcao 2: achata menos, desce o corpo, cabeca tomba e as orelhas dobram.
  triste: Object.freeze({
    ew: 16, eh: 21, cvL: 0.3, cvR: 0.3, lt: -15, cu: 0.1, pr: 0.74, wet: 1, ly: 0.7,
    by: 6, bt: -22, sy: 0.93, py: 5, rt: 5, ea: 70, es: 0.72,
  }),
  bravo: Object.freeze({
    ew: 16, eh: 20, cvL: 0.38, cvR: 0.38, lt: 22, pr: 0.4,
    by: 5, bt: 24, sy: 0.95, ea: 60, es: 0.9,
  }),
  sonolento: Object.freeze({
    eh: 21, cvL: 0.62, cvR: 0.62, lt: 0, pr: 0.6, ly: 0.3,
    by: 4, bt: -4, sy: 0.96, ea: 42, es: 0.95,
  }),
  surpreso: Object.freeze({
    ew: 21, eh: 27, pr: 0.2, by: -13, bc: 6, sy: 1.04, py: -3, ea: 26, es: 1.2,
  }),
  // Setimo estado: 75% a 100% do limite. Esticado, orelhas em pe.
  atento: Object.freeze({
    ew: 18, eh: 25, pr: 0.3, ly: -0.25, by: -8, sy: 1.12, ea: 0, es: 1.12,
  }),
})

/** Acessorio de cada estado (`null` = nenhum). */
export const ACCESSORY_BY_STATE = Object.freeze({
  neutro: null,
  feliz: 'spark',
  triste: 'tear',
  bravo: 'anger',
  sonolento: 'zzz',
  surpreso: 'excl',
  atento: 'sweat',
})

/**
 * Humor de fundo pela porcentagem do limite usado (nao satura em 100).
 * @param {number} pct
 * @returns {'neutro' | 'feliz' | 'triste' | 'bravo' | 'atento'}
 */
export function stateFromPct(pct) {
  if (pct < 40) return 'feliz'
  if (pct < 75) return 'neutro'
  if (pct <= 100) return 'atento'
  if (pct <= 130) return 'bravo'
  return 'triste'
}
