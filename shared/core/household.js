// @ts-check
// Nucleo de grupo (casal ou pessoa sozinha): ids com dono e perfil, compartilhado por cliente e
// servidor. Puro: sem rede, sem relogio, sem nomes de pessoas.

/** Id de grupo valido: o mesmo alfabeto que as regras do Firestore assumem para o hid. */
const HID_RE = /^[A-Za-z0-9_-]{8,64}$/

/** Separador entre o hid e o id logico. */
const SEP = '__'

/**
 * Id de documento com dono: hid, dois sublinhados e o id logico.
 * @param {string} hid
 * @param {string} id
 * @returns {string}
 */
export function scopedId(hid, id) {
  if (typeof hid !== 'string' || !HID_RE.test(hid)) throw new Error('hid invalido')
  if (typeof id !== 'string' || id.length === 0) throw new Error('id vazio')
  return `${hid}${SEP}${id}`
}

/**
 * Remove o prefixo do grupo quando presente; documento antigo (sem prefixo) volta intacto.
 * @param {string} hid
 * @param {string} docId
 * @returns {string}
 */
export function unscopedId(hid, docId) {
  const prefix = `${hid}${SEP}`
  return typeof docId === 'string' && docId.startsWith(prefix) && docId.length > prefix.length
    ? docId.slice(prefix.length)
    : docId
}
