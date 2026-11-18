// IDs de documento deterministicos: a mesma entrada gera sempre o mesmo ID, entao gravar duas vezes
// sobrescreve o mesmo documento em vez de duplicar.

/**
 * ID do pagamento manual de uma conta fixa num mes: `<billId>__<ano>-<mm>`.
 * @param {string} billId
 * @param {number} year
 * @param {number} month mes de 1 a 12
 * @returns {string}
 */
export function paymentDocId(billId, year, month) {
  return `${billId}__${year}-${String(month).padStart(2, '0')}`
}
