// @ts-check
// Adocao do lancamento manual pela compra importada do cartao (D-12, D-13).

/**
 * @param {unknown} manual
 * @param {unknown} bankDescription
 * @returns {boolean}
 */
export function descriptionMatches(manual, bankDescription) {
  return false
}

/**
 * @param {any} input
 * @returns {{ adoptions: { docId: string, bankId: string, legacy: boolean }[], nearMiss: number, ambiguous: number }}
 */
export function matchManualAdoptions(input) {
  return { adoptions: [], nearMiss: 0, ambiguous: 0 }
}

/**
 * @param {any} input
 * @returns {{ reverse: { docId: string, replacesDocId: string, bankId: string }[], ambiguous: number }}
 */
export function matchReverseAdoptions(input) {
  return { reverse: [], ambiguous: 0 }
}
