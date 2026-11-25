// @ts-check
// Adocao do lancamento manual pela compra importada do cartao (D-12, D-13), puro e sem relogio.
// O manual e adotado (vira a compra do banco) e nunca um segundo lancamento e criado. Casa por
// centavos iguais, data a ate DUPLICATE_WINDOW_DAYS dias e descricao equivalente ou generica.
// A idade nunca entra na regra: a janela e so entre as duas datas da compra (D-13).
// Na duvida nao adota: duplicado se ve e se apaga, juncao errada esconde um gasto real.

import { DUPLICATE_WINDOW_DAYS, normalize } from './classify.js'
import { isCardId } from './cardManual.js'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_CONTAINED = 5

// Forca da semelhanca de descricao: quanto maior, mais certo o par.
const GENERIC = 0
const CONTAINED = 1
const EXACT = 2

/**
 * @typedef {{
 *   docId: string, cents: number, description?: string, category?: string, dateMs: number,
 *   cardId?: string | null, person?: string, type?: string, transfer?: boolean, bankImportId?: string | null
 * }} ManualCandidate
 * @typedef {{
 *   bankId: string, cents: number, description: string, dateMs: number, cardId: string, person?: string
 * }} BankPurchase
 * @typedef {BankPurchase & {
 *   docId: string, adoptedFromManual?: boolean, matchedTransactionId?: string | null
 * }} ImportedPurchase
 */

/**
 * @param {unknown} manual
 * @param {unknown} bankDescription
 * @returns {number | null} forca do casamento; null quando as descricoes nao sao equivalentes
 */
function matchRank(manual, bankDescription) {
  if (!manual || typeof manual !== 'object') return null
  const m = /** @type {Record<string, unknown>} */ (manual)
  const mine = normalize(m.description)
  const bank = normalize(bankDescription)
  if (mine && mine === bank) return EXACT
  // Generica: o lancamento ficou sem descricao ou com o nome da categoria (padrao da folha).
  if (!mine || mine === normalize(m.category)) return GENERIC
  const [small, big] = mine.length <= bank.length ? [mine, bank] : [bank, mine]
  return small.length >= MIN_CONTAINED && big.includes(small) ? CONTAINED : null
}

/**
 * Verdadeiro quando o manual e generico (sem descricao ou igual a categoria) ou quando a
 * descricao dele e a do banco sao iguais ou uma contem a outra, a menor com 5 ou mais caracteres.
 * @param {unknown} manual objeto com `description` e `category`
 * @param {unknown} bankDescription
 * @returns {boolean}
 */
export function descriptionMatches(manual, bankDescription) {
  return matchRank(manual, bankDescription) !== null
}

/** @param {any} x */
const hasAmountAndDate = (x) => Number.isInteger(x.cents) && x.cents > 0 && Number.isFinite(x.dateMs)

/** @param {unknown} value */
const isId = (value) => typeof value === 'string' && value !== ''

// Entrada, transferencia e lancamento ja ligado ao banco nunca sao candidatos, mesmo que o
// chamador ja os tenha excluido.
/** @param {any} c */
const isCandidate = (c) =>
  !!c &&
  isId(c.docId) &&
  hasAmountAndDate(c) &&
  !c.bankImportId &&
  (c.type === undefined || c.type === 'saida') &&
  c.transfer !== true &&
  (c.cardId == null || isCardId(c.cardId))

/** @param {any} b */
const isBankPurchase = (b) => !!b && isId(b.bankId) && hasAmountAndDate(b)

/** @param {string} a @param {string} b */
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Pareamento um a um: menor diferenca de data, depois o manual do cartao antes do legado, depois
 * o menor docId. Um par escolhido cai por ambiguidade quando sobra, na mesma distancia (menos de
 * um dia a mais), outra compra de descricao diferente que casaria igual ou melhor.
 * @param {ManualCandidate[]} manuals
 * @param {BankPurchase[]} purchases
 */
function pairUp(manuals, purchases) {
  /** @typedef {{ i: number, j: number, diff: number, legacy: number, rank: number }} Pair */
  /** @type {Pair[]} */
  const pairs = []
  /** @type {Pair[]} */
  const loose = [] // valor, data e cartao batem, a descricao nao
  manuals.forEach((m, i) => {
    purchases.forEach((p, j) => {
      if (m.cents !== p.cents) return
      const diff = Math.abs(m.dateMs - p.dateMs)
      if (diff > DUPLICATE_WINDOW_DAYS * DAY_MS) return
      if (m.cardId != null && m.cardId !== p.cardId) return
      if (m.person != null && p.person != null && m.person !== p.person) return
      const rank = matchRank(m, p.description)
      const pair = { i, j, diff, legacy: m.cardId == null ? 1 : 0, rank: rank ?? -1 }
      ;(rank === null ? loose : pairs).push(pair)
    })
  })
  /** @param {Pair} a @param {Pair} b */
  const order = (a, b) =>
    a.diff - b.diff ||
    a.legacy - b.legacy ||
    byText(manuals[a.i].docId, manuals[b.i].docId) ||
    byText(purchases[a.j].bankId, purchases[b.j].bankId)
  pairs.sort(order)
  loose.sort(order)

  const usedManual = new Set()
  const usedPurchase = new Set()
  /** @type {Pair[]} */
  const chosen = []
  for (const pair of pairs) {
    if (usedManual.has(pair.i) || usedPurchase.has(pair.j)) continue
    usedManual.add(pair.i)
    usedPurchase.add(pair.j)
    chosen.push(pair)
  }

  const doubtful = (/** @type {Pair} */ p) =>
    pairs.some(
      (q) =>
        q.i === p.i &&
        !usedPurchase.has(q.j) &&
        q.diff - p.diff < DAY_MS &&
        q.rank >= p.rank &&
        normalize(purchases[q.j].description) !== normalize(purchases[p.j].description)
    )
  const accepted = chosen.filter((p) => !doubtful(p))
  const ambiguousIds = chosen.filter(doubtful).map((p) => manuals[p.i].docId)

  // Possiveis duplicados que ficaram: um a um, so entre quem nao teve par de descricao.
  let nearMiss = 0
  for (const pair of loose) {
    if (usedManual.has(pair.i) || usedPurchase.has(pair.j)) continue
    usedManual.add(pair.i)
    usedPurchase.add(pair.j)
    nearMiss++
  }

  return {
    accepted: accepted.map((p) => ({ manual: manuals[p.i], purchase: purchases[p.j] })),
    nearMiss,
    ambiguousIds,
  }
}

/**
 * Adocao para a frente: manuais contra as compras do cartao ainda sem par (as criacoes do sync).
 * `cardId` nulo no candidato e manual antigo (`legacy`).
 * @param {{ candidates?: ManualCandidate[], incoming?: BankPurchase[] } | null | undefined} input
 * @returns {{
 *   adoptions: { docId: string, bankId: string, legacy: boolean }[],
 *   nearMiss: number, ambiguous: number, ambiguousIds: string[]
 * }}
 */
export function matchManualAdoptions(input) {
  const { candidates, incoming } = input ?? {}
  const manuals = Array.isArray(candidates) ? candidates.filter(isCandidate) : []
  const purchases = Array.isArray(incoming) ? incoming.filter(isBankPurchase) : []
  const { accepted, nearMiss, ambiguousIds } = pairUp(manuals, purchases)
  return {
    adoptions: accepted.map(({ manual, purchase }) => ({
      docId: manual.docId,
      bankId: purchase.bankId,
      legacy: manual.cardId == null,
    })),
    nearMiss,
    ambiguous: ambiguousIds.length,
    ambiguousIds,
  }
}

/**
 * Reassentamento: a compra chegou antes e o manual foi lancado depois. So manual do cartao
 * (com `cardId`); importado ja adotado ou ja ligado a um manual fica de fora.
 * @param {{ candidates?: ManualCandidate[], imported?: ImportedPurchase[] } | null | undefined} input
 * @returns {{ reverse: { docId: string, replacesDocId: string, bankId: string }[], ambiguous: number }}
 */
export function matchReverseAdoptions(input) {
  const { candidates, imported } = input ?? {}
  const manuals = Array.isArray(candidates) ? candidates.filter((c) => isCandidate(c) && c.cardId != null) : []
  const purchases = Array.isArray(imported)
    ? imported.filter((p) => isBankPurchase(p) && isId(p.docId) && !p.adoptedFromManual && !p.matchedTransactionId)
    : []
  const { accepted, ambiguousIds } = pairUp(manuals, purchases)
  return {
    reverse: accepted.map(({ manual, purchase }) => ({
      docId: manual.docId,
      replacesDocId: /** @type {ImportedPurchase} */ (purchase).docId,
      bankId: purchase.bankId,
    })),
    ambiguous: ambiguousIds.length,
  }
}
