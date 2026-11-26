// @ts-check
// Acervo aprovado de falas do OINC (07.1, D-10, D-12, D-17): indice dos tres grupos de modelos com
// lacunas {nome} que o dono ja aprovou na leitura dos lotes. Dado puro, sem relogio, sem acaso e sem pacote.
//   oincLinesGastos.js    compras por tipo e lugar
//   oincLinesDinheiro.js  ciclo, limites, comparacao e contas
//   oincLinesVida.js      agenda, metas, Porquinho, entrada no app e falas do nada
// Cada linha traz:
//   id        estavel (cena-NNN); o voto e o historico usam so ele
//   t         modelo com lacunas (encaixes de phrasePicker: restante, dias, valor, loja ...)
//   g         genero de quem le: 'm', 'f' ou 'x' (serve a qualquer um)
//   risada    tem a risada esquisita do personagem
//   fumo      tem referencia a fumo (D-29)
//   lote      lote de votacao de onde veio (4 tambem para o que ainda vai a voto)
//   origem    "lote:id" no JSON de falas aprovadas (os ids de la se repetem entre lotes)
//   se        condicoes que a cena precisa trazer (dia, tema da conta); opcional
//   exagero   deixa passar numero escrito que e brincadeira, nao fato; opcional
//   reescrita fala nova ou alterada, ainda a votar (D-34); opcional
// O valor em reais vira {valor}, {restante} ou {total}; a contagem de dias e de vezes traz a unidade.
import { mergeGroups } from './vintemPhrases.js'
import { OINC_GASTOS } from './oincLinesGastos.js'
import { OINC_DINHEIRO } from './oincLinesDinheiro.js'
import { OINC_VIDA } from './oincLinesVida.js'

/**
 * @typedef {{ id: string, t: string, g: 'm' | 'f' | 'x', risada: boolean, fumo: boolean, lote: number,
 *   origem: string, se?: ReadonlyArray<string>, exagero?: boolean, reescrita?: boolean }} OincLine
 */

/** @type {Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>} */
export const OINC_LINES = mergeGroups([OINC_GASTOS, OINC_DINHEIRO, OINC_VIDA])

/**
 * Falas aprovadas que nao entraram no acervo, com o motivo (D-13): nao ha como torna-las verdadeiras
 * so com os encaixes que o codigo conhece.
 * @type {ReadonlyArray<Readonly<{ origem: string, motivo: string }>>}
 */
export const OINC_DESCARTADAS = Object.freeze([
  Object.freeze({
    origem: '2:s19-1',
    motivo: 'afirma que houve pedido de comida hoje, fato que a cena da agenda nao informa',
  }),
  Object.freeze({
    origem: '2:s19-2',
    motivo: 'afirma que a pessoa anotou e depois pediu comida, fato que a cena da agenda nao informa',
  }),
  Object.freeze({
    origem: '1:s19-5',
    motivo: 'afirma que chegou comida agora, fato que a cena da agenda nao informa',
  }),
])

/** @type {Map<string, { id: string, cena: string, t: string }> | null} */
let index = null

/**
 * Busca uma fala do acervo pelo id.
 * @param {unknown} id
 * @returns {{ id: string, cena: string, t: string } | null}
 */
export function findLine(id) {
  if (typeof id !== 'string') return null
  if (index === null) {
    index = new Map()
    for (const [cena, lines] of Object.entries(OINC_LINES)) {
      for (const line of lines) index.set(line.id, { id: line.id, cena, t: line.t })
    }
  }
  const hit = index.get(id)
  return hit ? { ...hit } : null
}

/**
 * Tira da lista as falas reprovadas (so pelo id). Nao altera a lista de entrada.
 * @template {{ id: string }} T
 * @param {ReadonlyArray<T>} lines
 * @param {ReadonlyArray<string> | null | undefined} rejected
 * @returns {T[]}
 */
export function withoutRejected(lines, rejected) {
  const out = new Set(Array.isArray(rejected) ? rejected : [])
  return lines.filter((line) => !out.has(line.id))
}
