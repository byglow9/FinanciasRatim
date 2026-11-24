import { Timestamp } from 'firebase-admin/firestore'
import { cardSnapshotFromAccount } from '../../shared/core/cards.js'
import { classifyCardTx } from '../../shared/core/cardTx.js'
import { parseInstallment } from '../../shared/core/cardInstallments.js'
import { reconcileCardTxs } from '../../shared/core/cardReconcile.js'
import { sumBillTotals } from '../../shared/core/cardBills.js'
import { findDuplicate } from '../../shared/core/classify.js'

const CARDS = 'cards'
const CARD_SETTINGS = 'cardSettings'
const TRANSACTIONS = 'transactions'
const IMPORTS = 'bankImports'
const MAX_BATCH_OPS = 400

// Piso tecnico da busca do cartao na Pluggy (D-13). NAO e um corte por idade: e uma data muito
// antiga so para a Pluggy devolver tudo o que guarda, em vez de aplicar a janela padrao dela.
// Nunca trocar por importFrom da conexao nem por janela de dias.
export const CARD_HISTORY_FLOOR = '2000-01-01'

// Grava cards/{accountId} para uma conta CREDIT (CARD-02). O Admin SDK ignora as regras: sem
// dono explicito nada e gravado (mesma regra de FUND-04 do sync). Conta que nao e CREDIT nao
// grava nada. Nunca registra valores em log.
export async function syncCardSnapshot(db, { ownerId, person, itemId, account }) {
  if (typeof ownerId !== 'string' || !ownerId) {
    throw new Error('syncCardSnapshot exige o ownerId do dono')
  }
  const snapshot = cardSnapshotFromAccount(account, { itemId, person })
  if (!snapshot) return false
  await db
    .collection(CARDS)
    .doc(snapshot.accountId)
    .set({ ...snapshot, ownerId, syncedAt: Timestamp.now() }, { merge: true })
  return true
}

function assertOwner(ownerId, who) {
  if (typeof ownerId !== 'string' || !ownerId) throw new Error(`${who} exige o ownerId do dono`)
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Campos que pertencem ao banco e podem ser reescritos em lancamento ja existente. Descricao,
// categoria, categoryId e nota ficam sempre como o dono deixou (CARD-07, T-06-21).
function bankFields(entry, cents, cardId, kind) {
  return {
    amount: cents / 100,
    type: kind === 'refund' ? 'entrada' : 'saida',
    date: Timestamp.fromDate(entry.date),
    cardId,
    cardKind: kind,
    cardStatus: entry.status,
    billMonth: entry.billMonth ?? null,
    billMonthSource: entry.billMonthSource ?? null,
    installment: entry.installment ?? null,
    currency: entry.currency ?? null,
    ...(kind === 'refund' ? { transfer: true } : {}),
  }
}

function changedFields(data, patch) {
  const out = {}
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'date') {
      if (data.date?.toMillis?.() !== value.toMillis()) out.date = value
    } else if (key === 'amount') {
      if (Math.round(Number(data.amount) * 100) !== Math.round(value * 100)) out.amount = value
    } else if (!same(data[key], value)) {
      out[key] = value
    }
  }
  return out
}

// Aplica unidades de escrita em lotes de no maximo 400 operacoes (uma unidade nunca se divide).
async function commitUnits(db, units) {
  let batch = db.batch()
  let ops = 0
  for (const unit of units) {
    if (ops && ops + unit.weight > MAX_BATCH_OPS) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
    unit.run(batch)
    ops += unit.weight
  }
  if (ops) await batch.commit()
}

async function getAllDocs(db, collection, ids) {
  const out = new Map()
  for (let i = 0; i < ids.length; i += 300) {
    const refs = ids.slice(i, i + 300).map((id) => db.collection(collection).doc(id))
    if (!refs.length) continue
    for (const snap of await db.getAll(...refs)) if (snap.exists) out.set(snap.id, snap.data())
  }
  return out
}

function kindOfDoc(d) {
  return d.cardKind === 'refund' || (d.cardKind == null && d.type === 'entrada') ? 'refund' : 'purchase'
}

// Importa as compras, estornos e pagamentos de uma conta CREDIT (CARD-03, CARD-06, CARD-07).
// Historico inteiro, sem limite de idade (D-13): a busca usa so o piso tecnico e o `connection`
// (com o importFrom da conexao) nao e consultado. Nunca registra valores, descricoes nem ids.
export async function syncCardTransactions(
  db,
  { ownerId, person, itemId, account, bankName, now, categorize, manual = [], usedManualIds = new Set(), pluggy, chains = new Map() }
) {
  assertOwner(ownerId, 'syncCardTransactions')
  const cardId = account.id
  const stamp = now instanceof Date ? Timestamp.fromDate(now) : Timestamp.now()
  const counts = { created: 0, updated: 0, rebound: 0, removed: 0, skippedNoBrl: 0, payments: 0 }

  const raws = await pluggy.fetchAllTransactions(cardId, { dateFrom: CARD_HISTORY_FLOOR })
  // Resposta vazia da Pluggy nunca apaga nada: pode ser uma falha passageira.
  if (!raws.length) return counts

  // 1) classifica a resposta; so entram campos de lista fechada.
  const purchases = []
  const refunds = []
  const payments = []
  for (const tx of raws) {
    if (!tx?.id) continue
    const categoryNames = [...(chains.get(tx.categoryId) ?? []), tx.category, tx.merchant?.category].filter(Boolean)
    const entry = classifyCardTx(tx, { categoryNames })
    if (!entry) continue
    if (entry.cents === null) {
      counts.skippedNoBrl++
      continue
    }
    entry.installment = entry.kind === 'purchase' ? parseInstallment(tx) : null
    const item = { id: String(tx.id), entry, cents: entry.cents, categoryNames }
    if (entry.kind === 'payment') payments.push(item)
    else if (entry.kind === 'refund') refunds.push(item)
    else purchases.push(item)
  }

  // 2) lancamentos do cartao ja ligados ao banco (so igualdade, sem janela de data). O manual (D-12)
  // sem bankImportId nunca entra aqui e nunca vira candidato a remocao.
  const existingSnap = await db
    .collection(TRANSACTIONS)
    .where('ownerId', '==', ownerId)
    .where('cardId', '==', cardId)
    .get()
  const existingDocs = new Map()
  for (const doc of existingSnap.docs) {
    const d = doc.data()
    if (d.bankImportId) existingDocs.set(doc.id, d)
  }
  const knownBankIds = new Set([...existingDocs.values()].map((d) => d.bankImportId))

  // 3) bankImports dos ids ainda desconhecidos; e a adocao das linhas do caminho antigo (D-08).
  const allItems = [...purchases, ...refunds, ...payments]
  const unknownIds = allItems.map((i) => i.id).filter((id) => !knownBankIds.has(id))
  const importsById = await getAllDocs(db, IMPORTS, unknownIds)
  // Importacao de outro dono (id repetido) nunca e tocada: conta como existente e fica de fora.
  const foreignIds = new Set()
  for (const [id, d] of importsById) {
    if (d.ownerId === ownerId) continue
    foreignIds.add(id)
    importsById.delete(id)
  }
  const legacyIds = [...importsById].filter(([, d]) => !d.cardId).map(([id]) => `bank_${id}`)
  const legacyDocs = await getAllDocs(db, TRANSACTIONS, legacyIds)
  for (const [docId, d] of legacyDocs) {
    if (d.ownerId === ownerId && d.source === 'bank') existingDocs.set(docId, { ...d, bankImportId: d.bankImportId ?? docId.slice(5) })
  }

  const units = []
  const incomingOf = (i) => ({ bankId: i.id, cents: i.cents, description: i.entry.description, dateMs: i.entry.date.getTime(), status: i.entry.status })
  const itemById = new Map(allItems.map((i) => [i.id, i]))

  for (const kind of ['purchase', 'refund']) {
    const items = kind === 'purchase' ? purchases : refunds
    const existing = [...existingDocs]
      .filter(([, d]) => kindOfDoc(d) === kind)
      .map(([docId, d]) => ({
        docId,
        bankId: d.bankImportId,
        cents: Math.round(Number(d.amount) * 100),
        description: d.bankDescription ?? d.description ?? '',
        dateMs: d.date?.toMillis?.() ?? 0,
        status: d.cardStatus ?? 'posted',
      }))
    const result = reconcileCardTxs({ existing, incoming: items.map(incomingOf), fetchedFromMs: 0 })

    for (const { docId, incoming } of result.updates) {
      const item = itemById.get(incoming.bankId)
      const data = existingDocs.get(docId)
      const patch = changedFields(data, bankFields(item.entry, item.cents, cardId, kind))
      const imp = importsById.get(incoming.bankId)
      const impPatch = imp && !imp.cardId ? { cardId, cardKind: kind, amount: item.cents / 100 } : null
      if (!Object.keys(patch).length && !impPatch) continue
      counts.updated++
      units.push({
        weight: 1 + (impPatch ? 1 : 0),
        run: (batch) => {
          if (Object.keys(patch).length) batch.update(db.collection(TRANSACTIONS).doc(docId), patch)
          if (impPatch) batch.set(db.collection(IMPORTS).doc(incoming.bankId), impPatch, { merge: true })
        },
      })
    }

    for (const { docId, fromBankId, incoming } of result.rebinds) {
      const item = itemById.get(incoming.bankId)
      const data = existingDocs.get(docId)
      const patch = { ...changedFields(data, bankFields(item.entry, item.cents, cardId, kind)), bankImportId: incoming.bankId }
      counts.rebound++
      units.push({
        weight: 3,
        run: (batch) => {
          batch.update(db.collection(TRANSACTIONS).doc(docId), patch)
          batch.set(db.collection(IMPORTS).doc(fromBankId), { supersededBy: incoming.bankId }, { merge: true })
          batch.set(
            db.collection(IMPORTS).doc(incoming.bankId),
            importDoc({ ownerId, person, itemId, account, bankName, item, kind, categorize, status: 'imported', reason: null, transactionId: docId, matched: null, stamp })
          )
        },
      })
    }

    for (const incoming of result.creates) {
      const item = itemById.get(incoming.bankId)
      // Importacao ja existente (o dono apagou o lancamento, ou revisao pendente do caminho
      // antigo): o sync nao recria nem sobrescreve.
      if (importsById.has(item.id) || foreignIds.has(item.id)) continue
      let matched = null
      let status = 'imported'
      let reason = null
      if (kind === 'purchase') {
        matched = findDuplicate({ type: 'saida', amount: item.cents / 100, date: item.entry.date }, manual, usedManualIds)
        if (matched) {
          status = 'review'
          reason = 'duplicate'
          usedManualIds.add(matched)
        }
      }
      const transactionId = `bank_${item.id}`
      const picked = categorize(item.entry, item.categoryNames)
      counts.created += status === 'imported' ? 1 : 0
      units.push({
        weight: status === 'imported' ? 2 : 1,
        run: (batch) => {
          batch.set(
            db.collection(IMPORTS).doc(item.id),
            importDoc({ ownerId, person, itemId, account, bankName, item, kind, categorize, picked, status, reason, transactionId: status === 'imported' ? transactionId : null, matched, stamp })
          )
          if (status !== 'imported') return
          batch.set(db.collection(TRANSACTIONS).doc(transactionId), {
            ownerId,
            person,
            ...bankFields(item.entry, item.cents, cardId, kind),
            description: item.entry.description,
            category: picked.category,
            categoryId: picked.categoryId,
            createdAt: stamp,
            source: 'bank',
            bankImportId: item.id,
            bankName,
            bankDescription: item.entry.description,
            originalDescription: item.entry.raw,
          })
        },
      })
    }

    // So pendente sem par some; confirmada nunca (T-06-21).
    for (const docId of result.vanished) {
      const data = existingDocs.get(docId)
      counts.removed++
      units.push({
        weight: 2,
        run: (batch) => {
          batch.delete(db.collection(TRANSACTIONS).doc(docId))
          batch.delete(db.collection(IMPORTS).doc(data.bankImportId))
        },
      })
    }
  }

  // 4) pagamento da fatura visto no cartao: so bankImports ignorado, para a deteccao do 06-08.
  for (const item of payments) {
    const imp = importsById.get(item.id)
    if (imp?.cardId || foreignIds.has(item.id)) continue
    const picked = categorize(item.entry, item.categoryNames)
    counts.payments++
    units.push({
      weight: 1,
      run: (batch) =>
        batch.set(
          db.collection(IMPORTS).doc(item.id),
          importDoc({ ownerId, person, itemId, account, bankName, item, kind: 'payment', categorize, picked, status: 'ignored', reason: 'card_payment', transactionId: null, matched: null, stamp }),
          { merge: true }
        ),
    })
  }

  await commitUnits(db, units)
  return counts
}

// Documento de bankImports do cartao, em lista fechada de campos.
function importDoc({ ownerId, person, itemId, account, bankName, item, kind, categorize, picked, status, reason, transactionId, matched, stamp }) {
  const cat = picked ?? categorize(item.entry, item.categoryNames)
  return {
    ownerId,
    person,
    itemId,
    accountId: account.id,
    accountType: account.type,
    accountName: account.marketingName || account.name || '',
    bankName,
    type: kind === 'purchase' ? 'saida' : 'entrada',
    amount: item.cents / 100,
    description: item.entry.description,
    originalDescription: item.entry.raw,
    category: cat.category,
    categoryId: cat.categoryId,
    date: Timestamp.fromDate(item.entry.date),
    status,
    reason,
    matchedTransactionId: matched,
    transactionId,
    cardId: account.id,
    cardKind: kind,
    createdAt: stamp,
  }
}

// Recalcula os agregados de cards/{accountId} a partir de todos os lancamentos do cartao
// (consulta so de igualdade por dono e cartao, sem janela de data, D-13). Usa a mesma
// sumBillTotals do cliente. billTotals e gravado por mergeFields para substituir o mapa inteiro.
export async function refreshCardAggregates(db, { ownerId, accountId, now }) {
  assertOwner(ownerId, 'refreshCardAggregates')
  const [snap, settingsSnap] = await Promise.all([
    db.collection(TRANSACTIONS).where('ownerId', '==', ownerId).where('cardId', '==', accountId).get(),
    db.collection(CARD_SETTINGS).doc(accountId).get(),
  ])
  const settings = settingsSnap.exists ? settingsSnap.data() : null
  const closingDay = settings && settings.ownerId === ownerId ? settings.closingDay : undefined

  const txs = []
  let pendingCount = 0
  let first = null
  let last = null
  for (const doc of snap.docs) {
    const d = doc.data()
    if (d.cardKind !== 'purchase' && d.cardKind !== 'refund') continue
    const date = d.date?.toDate?.() ?? null
    txs.push({ cardKind: d.cardKind, amount: d.amount, billMonth: d.billMonth ?? null, date })
    if (d.cardKind !== 'purchase') continue
    if (d.cardStatus === 'pending') pendingCount++
    if (date && (!first || date < first)) first = date
    if (date && (!last || date > last)) last = date
  }
  const { totals, unassignedCents } = sumBillTotals(txs, { closingDay })
  const stamp = now instanceof Date ? Timestamp.fromDate(now) : Timestamp.now()
  const data = {
    ownerId,
    billTotals: totals,
    unassignedCents,
    pendingCount,
    firstPurchaseAt: first ? Timestamp.fromDate(first) : null,
    lastPurchaseAt: last ? Timestamp.fromDate(last) : null,
    aggregatesAt: stamp,
  }
  await db
    .collection(CARDS)
    .doc(accountId)
    .set(data, { mergeFields: Object.keys(data) })
  return { billTotals: totals, unassignedCents, pendingCount }
}
