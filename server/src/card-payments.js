// Pagamento da fatura no servidor (CARD-04, CARD-06, D-05). Duas funcoes:
// - ownerHasCard: o "tem cartao" vale para o dono todo, nao so para o item da conexao (o Bradesco,
//   sem conta CREDIT, paga a fatura do Nubank).
// - reconcileCardPayments: liga as evidencias de pagamento a fatura certa pelo nucleo do 06-05 e
//   grava cards/{id}.payments. Todo acesso e por consulta de igualdade com ownerId (o Admin SDK
//   ignora as regras) e a janela de data e filtrada em memoria, sem indice novo. O pagamento ja
//   guardado cuja evidencia saiu da janela continua em cards.payments (senao a fatura paga voltaria
//   a ficar em aberto).
// Nunca registra valores, descricoes nem ids em log.

import { partsOfDate, shiftBillMonth } from '../../shared/core/cardBills.js'
import { detectCardPayments } from '../../shared/core/cardPayments.js'

const CARDS = 'cards'
const CARD_SETTINGS = 'cardSettings'
const IMPORTS = 'bankImports'
const TRANSACTIONS = 'transactions'

const DAY_MS = 24 * 60 * 60 * 1000
/** Janela das evidencias lidas por rodada (em memoria). */
const WINDOW_DAYS = 90
/** Maximo de pagamentos guardados em cada cartao. */
export const MAX_PAYMENTS = 24
/** Mesma operacao vista por dois lados (a mesma janela de fusao do nucleo). */
const MERGE_WINDOW_MS = 3 * DAY_MS

function assertOwner(ownerId, who) {
  if (typeof ownerId !== 'string' || !ownerId) throw new Error(`${who} exige o ownerId do dono`)
}

// Verdadeiro se o dono tem ao menos um cartao em cards (so o dono: nunca o cartao de outro casal).
export async function ownerHasCard(db, ownerId) {
  assertOwner(ownerId, 'ownerHasCard')
  const snap = await db.collection(CARDS).where('ownerId', '==', ownerId).limit(1).get()
  return !snap.empty
}

const centsOf = (amount) => Math.round(Number(amount) * 100)

function evidenceOf(doc, sinceMs) {
  const d = doc.data()
  const dateMs = d.date?.toMillis?.()
  const cents = centsOf(d.amount)
  if (!Number.isFinite(dateMs) || dateMs < sinceMs || !Number.isFinite(cents) || cents <= 0) return null
  return { d, dateMs, cents }
}

// Pagamentos ja guardados cuja evidencia saiu da janela: nao da para recalcular, entao continuam.
function settledBefore(payments, sinceMs) {
  if (!Array.isArray(payments)) return []
  return payments.filter(
    (p) =>
      p && typeof p.id === 'string' && Number.isFinite(p.cents) && p.cents > 0 && Number.isFinite(p.atMs) && p.atMs < sinceMs
  )
}

// billTotals traz o historico inteiro (D-13), mas as evidencias so cobrem a janela: fica de fora a
// fatura que um pagamento da janela ja nao alcanca (anterior ao mes antes do inicio da janela),
// senao o pagamento parcial abateria uma fatura de anos atras. O que foi pago antes da janela ja
// vem abatido.
function reachableBillTotals(billTotals, settled, sinceMs) {
  const { year, month } = partsOfDate(sinceMs)
  const oldest = shiftBillMonth(`${year}-${String(month).padStart(2, '0')}`, -1)
  const totals = {}
  for (const [billMonth, total] of Object.entries(billTotals ?? {})) {
    if (billMonth >= oldest) totals[billMonth] = total
  }
  for (const p of settled) {
    if (totals[p.billMonth] !== undefined) totals[p.billMonth] -= p.cents
  }
  return totals
}

// Evidencia que e o outro lado de um pagamento ja guardado (borda da janela).
const sameOperation = (evidence, payment) =>
  evidence.cents === payment.cents && Math.abs(evidence.dateMs - payment.atMs) <= MERGE_WINDOW_MS

// Liga os pagamentos do dono as faturas de cada cartao e grava cards/{id}.payments.
// Devolve so contagens: { cards, payments, linked }.
export async function reconcileCardPayments(db, { ownerId, now = new Date() }) {
  assertOwner(ownerId, 'reconcileCardPayments')
  const sinceMs = now.getTime() - WINDOW_DAYS * DAY_MS
  const result = { cards: 0, payments: 0, linked: 0 }

  const cardsSnap = await db.collection(CARDS).where('ownerId', '==', ownerId).get()
  if (cardsSnap.empty) return result

  // Saidas da conta com texto de pagamento (lancamentos com cardKind payment) e transferencias
  // proprias de saida (bankImports sem lancamento): comuns a todos os cartoes do dono.
  const [textSnap, selfSnap] = await Promise.all([
    db.collection(TRANSACTIONS).where('ownerId', '==', ownerId).where('cardKind', '==', 'payment').get(),
    db.collection(IMPORTS).where('ownerId', '==', ownerId).where('reason', '==', 'self_transfer').get(),
  ])
  const outflows = []
  for (const doc of textSnap.docs) {
    const ev = evidenceOf(doc, sinceMs)
    const id = ev?.d.bankImportId
    if (!ev || ev.d.type !== 'saida' || typeof id !== 'string' || !id) continue
    outflows.push({ id, cents: ev.cents, dateMs: ev.dateMs, origin: 'text' })
  }
  for (const doc of selfSnap.docs) {
    const ev = evidenceOf(doc, sinceMs)
    if (!ev || ev.d.type !== 'saida') continue
    outflows.push({ id: doc.id, cents: ev.cents, dateMs: ev.dateMs, origin: 'self' })
  }

  const claimed = new Set() // saidas ja ligadas a um cartao: nunca contam em dois
  const links = new Map() // id do lancamento do pagamento -> { cardId, billMonth }
  const manyCards = cardsSnap.size > 1

  for (const cardDoc of cardsSnap.docs) {
    const cardId = cardDoc.id
    const card = cardDoc.data()

    // closingDay so vale se a configuracao e do mesmo dono.
    const settingsSnap = await db.collection(CARD_SETTINGS).doc(cardId).get()
    const settings = settingsSnap.exists ? settingsSnap.data() : null
    const closingDay = settings && settings.ownerId === ownerId ? settings.closingDay ?? null : null

    const creditsSnap = await db
      .collection(IMPORTS)
      .where('ownerId', '==', ownerId)
      .where('cardId', '==', cardId)
      .get()
    const settled = settledBefore(card.payments, sinceMs)
    const cardCredits = []
    for (const doc of creditsSnap.docs) {
      if (doc.data().reason !== 'card_payment') continue
      const ev = evidenceOf(doc, sinceMs)
      if (!ev) continue
      const credit = { id: doc.id, cents: ev.cents, dateMs: ev.dateMs }
      if (settled.some((p) => p.source !== 'card' && sameOperation(credit, p))) continue
      cardCredits.push(credit)
    }

    const detected = detectCardPayments({
      billTotals: reachableBillTotals(card.billTotals, settled, sinceMs),
      closingDay,
      cardCredits,
      bankOutflows: outflows.filter(
        (o) => !claimed.has(o.id) && !settled.some((p) => p.source === 'card' && sameOperation(o, p))
      ),
    })

    const kept = []
    for (const p of detected) {
      // Com mais de um cartao, saida sem fatura certa nao pode ser atribuida a nenhum deles.
      if (manyCards && p.source !== 'card' && p.billMonth === null) continue
      // linkedBankId e o lado da conta (ou o proprio id quando a evidencia ja e da conta)
      if (p.linkedBankId && (p.billMonth !== null || !manyCards)) claimed.add(p.linkedBankId)
      if (p.linkedBankId && p.billMonth) links.set(`bank_${p.linkedBankId}`, { cardId, billMonth: p.billMonth })
      kept.push(p)
    }

    const all = [...kept, ...settled].sort((a, b) => b.atMs - a.atMs)
    const payments = all.slice(0, MAX_PAYMENTS).map((p) => ({
      id: p.id,
      billMonth: p.billMonth,
      cents: p.cents,
      atMs: p.atMs,
      source: p.source,
    }))
    await cardDoc.ref.set({ payments }, { mergeFields: ['payments'] })
    result.cards++
    result.payments += payments.length
  }

  // O lancamento do pagamento recebe cardId e billMonth da ligacao (so quando mudou).
  const ids = [...links.keys()]
  for (let i = 0; i < ids.length; i += 300) {
    const slice = ids.slice(i, i + 300)
    const snaps = await db.getAll(...slice.map((id) => db.collection(TRANSACTIONS).doc(id)))
    const batch = db.batch()
    let ops = 0
    for (const snap of snaps) {
      if (!snap.exists) continue
      const d = snap.data()
      if (d.ownerId !== ownerId || d.cardKind !== 'payment') continue
      const link = links.get(snap.id)
      if (d.cardId === link.cardId && d.billMonth === link.billMonth) continue
      batch.update(snap.ref, { cardId: link.cardId, billMonth: link.billMonth })
      ops++
    }
    if (ops) await batch.commit()
    result.linked += ops
  }
  return result
}
