// @ts-check
// Reconciliacao das compras do cartao entre o que o servidor ja gravou e o que
// a Pluggy devolveu agora (puro, sem I/O e sem relogio; o servidor aplica o
// resultado). Cobre pendente que vira confirmada com o mesmo id (so atualiza),
// id recriado pelo banco (religa por valor, descricao e data) e pendente que
// sumiu (candidata a remocao). CARD-07.

import { DUPLICATE_WINDOW_DAYS, normalize } from './classify.js'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_CONTAINED = 5

/**
 * @typedef {{ docId: string, bankId: string, cents: number, description: string, dateMs: number, status: string }} ExistingCardTx
 * @typedef {{ bankId: string, cents: number, description: string, dateMs: number, status: string }} IncomingCardTx
 */

/**
 * Descricao equivalente: normalizada igual, ou uma contida na outra com a
 * menor tendo 5 ou mais caracteres.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function equivalentDescription(a, b) {
  const x = normalize(a)
  const y = normalize(b)
  if (x === y) return true
  const [small, big] = x.length <= y.length ? [x, y] : [y, x]
  return small.length >= MIN_CONTAINED && big.includes(small)
}

/**
 * `existing` so admite lancamentos de origem banco (o servidor nunca passa
 * lancamento manual aqui, entao um manual nunca vira `vanished`; a adocao do
 * manual e do plano 06-18). `fetchedFromMs` e ate onde a busca olhou; com o
 * historico completo (D-13) o servidor passa 0 e nada e descartado por idade.
 * Pendente sem par dentro da janela vira `vanished`; confirmada nunca.
 * @param {{ existing: ExistingCardTx[], incoming: IncomingCardTx[], fetchedFromMs: number }} input
 * @returns {{
 *   updates: { docId: string, incoming: IncomingCardTx }[],
 *   rebinds: { docId: string, fromBankId: string, incoming: IncomingCardTx }[],
 *   creates: IncomingCardTx[],
 *   vanished: string[]
 * }}
 */
export function reconcileCardTxs({ existing, incoming, fetchedFromMs }) {
  /** @type {{ docId: string, incoming: IncomingCardTx }[]} */
  const updates = []
  /** @type {{ docId: string, fromBankId: string, incoming: IncomingCardTx }[]} */
  const rebinds = []

  // 1) Mesmo id: so atualiza.
  /** @type {Map<string, number>} */
  const byBankId = new Map()
  existing.forEach((e, i) => {
    if (!byBankId.has(e.bankId)) byBankId.set(e.bankId, i)
  })
  const usedExisting = new Set()
  const usedIncoming = new Set()
  incoming.forEach((n, j) => {
    const i = byBankId.get(n.bankId)
    if (i === undefined || usedExisting.has(i)) return
    usedExisting.add(i)
    usedIncoming.add(j)
    updates.push({ docId: existing[i].docId, incoming: n })
  })

  // 2) Id recriado: pares candidatos entre o que sobrou, atribuidos um a um
  // pela menor diferenca de data e, no empate, preferindo a existente pendente.
  /** @type {{ i: number, j: number, diff: number, pendingRank: number }[]} */
  const pairs = []
  existing.forEach((e, i) => {
    if (usedExisting.has(i)) return
    incoming.forEach((n, j) => {
      if (usedIncoming.has(j)) return
      if (e.cents !== n.cents) return
      const diff = Math.abs(e.dateMs - n.dateMs)
      if (diff > DUPLICATE_WINDOW_DAYS * DAY_MS) return
      if (!equivalentDescription(e.description, n.description)) return
      pairs.push({ i, j, diff, pendingRank: e.status === 'pending' ? 0 : 1 })
    })
  })
  pairs.sort((a, b) => a.diff - b.diff || a.pendingRank - b.pendingRank || a.i - b.i || a.j - b.j)
  for (const { i, j } of pairs) {
    if (usedExisting.has(i) || usedIncoming.has(j)) continue
    usedExisting.add(i)
    usedIncoming.add(j)
    rebinds.push({ docId: existing[i].docId, fromBankId: existing[i].bankId, incoming: incoming[j] })
  }

  // 3) Sem par: entrada vira criacao; pendente existente dentro da janela buscada some.
  const creates = incoming.filter((_, j) => !usedIncoming.has(j))
  const vanished = existing
    .filter((e, i) => !usedExisting.has(i) && e.status === 'pending' && e.dateMs >= fetchedFromMs)
    .map((e) => e.docId)

  return { updates, rebinds, creates, vanished }
}
