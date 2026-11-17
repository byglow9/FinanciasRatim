import { Timestamp } from 'firebase-admin/firestore'
import {
  classify,
  cleanDescription,
  findDuplicate,
  mapCategory,
  normalize,
  DUPLICATE_WINDOW_DAYS,
} from '../../shared/core/classify.js'
import { DEFAULT_CATEGORY_DEFS, buildCategoryDefs } from '../../shared/core/categories.js'

const DAY_MS = 24 * 60 * 60 * 1000
const CONNECTIONS = 'bankConnections'
const IMPORTS = 'bankImports'
const TRANSACTIONS = 'transactions'

let categoryChainCache = null

// id da categoria -> nomes [mais específica, ..., raiz]
async function getCategoryChains(pluggy) {
  if (categoryChainCache) return categoryChainCache
  const chains = new Map()
  try {
    const { results } = await pluggy.fetchCategories()
    const byId = new Map(results.map((c) => [c.id, c]))
    for (const c of results) {
      const names = []
      let cur = c
      while (cur && names.length < 5) {
        names.push(cur.description)
        cur = cur.parentId ? byId.get(cur.parentId) : null
      }
      chains.set(c.id, names)
    }
    categoryChainCache = chains
  } catch (err) {
    console.warn('[sync] nao foi possivel carregar categorias da Pluggy:', err.message)
  }
  return chains
}

async function getAppCategories(db) {
  const snap = await db.collection('settings').doc('main').get()
  const categories = snap.exists ? snap.data().categories : null
  // Definições com id estável; sem categorias salvas, usa as padrão.
  return Array.isArray(categories) && categories.length
    ? buildCategoryDefs(categories)
    : DEFAULT_CATEGORY_DEFS
}

async function getExisting(db, ids) {
  const existing = new Set()
  for (let i = 0; i < ids.length; i += 300) {
    const refs = ids.slice(i, i + 300).map((id) => db.collection(IMPORTS).doc(id))
    const snaps = await db.getAll(...refs)
    for (const s of snaps) if (s.exists) existing.add(s.id)
  }
  return existing
}

// Reescreve descrições já importadas no formato antigo (cru do banco).
// Idempotente; não mexe no nome de lançamentos que você editou no site.
export async function cleanExistingDescriptions(db) {
  let updated = 0
  let batch = db.batch()
  let ops = 0
  const flush = async () => {
    if (ops) await batch.commit()
    batch = db.batch()
    ops = 0
  }

  const imports = await db.collection(IMPORTS).get()
  for (const doc of imports.docs) {
    const d = doc.data()
    const raw = d.originalDescription ?? d.description
    const clean = cleanDescription(raw)
    if (d.description === clean && d.originalDescription === raw) continue
    batch.update(doc.ref, { description: clean, originalDescription: raw })
    ops++
    if (ops >= 400) await flush()
  }

  const txs = await db.collection(TRANSACTIONS).where('source', '==', 'bank').get()
  for (const doc of txs.docs) {
    const d = doc.data()
    const raw = d.originalDescription ?? d.bankDescription ?? d.description
    const clean = cleanDescription(raw)
    const untouched = d.description === raw || d.description === d.bankDescription
    const patch = { bankDescription: clean, originalDescription: raw }
    if (untouched) patch.description = clean
    if (d.bankDescription === clean && d.originalDescription === raw && (!untouched || d.description === clean)) continue
    batch.update(doc.ref, patch)
    ops++
    updated++
    if (ops >= 400) await flush()
  }
  await flush()
  return { transactions: updated, imports: imports.size }
}

export async function syncConnection(db, pluggy, connection) {
  const { itemId, person } = connection
  const ref = db.collection(CONNECTIONS).doc(itemId)
  const summary = { itemId, person, imported: 0, review: 0, ignored: 0 }

  try {
    const item = await pluggy.fetchItem(itemId)
    const { results: accounts } = await pluggy.fetchAccounts(itemId)
    const hasCreditCard = accounts.some((a) => a.type === 'CREDIT')

    const importFrom = connection.importFrom?.toDate?.() ?? new Date(Date.now() - 30 * DAY_MS)
    const dateFrom = importFrom.toISOString().slice(0, 10)
    const windowStart = new Date(importFrom.getTime() - DUPLICATE_WINDOW_DAYS * DAY_MS)

    const [chains, appCategories, personTxSnap, personImportsSnap] = await Promise.all([
      getCategoryChains(pluggy),
      getAppCategories(db),
      db
        .collection(TRANSACTIONS)
        .where('person', '==', person)
        .where('date', '>=', Timestamp.fromDate(windowStart))
        .orderBy('date', 'desc')
        .get(),
      db.collection(IMPORTS).where('person', '==', person).get(),
    ])

    const manual = []
    // descrição -> categoria já usada (aprende com as correções feitas no site)
    const learned = new Map()
    for (const doc of personTxSnap.docs) {
      const d = doc.data()
      if (d.source === 'bank') {
        const key = normalize(d.bankDescription ?? d.description)
        if (key && !learned.has(key)) learned.set(key, d.category)
      } else {
        manual.push({ id: doc.id, type: d.type, amount: d.amount, date: d.date.toDate() })
      }
    }
    const usedManualIds = new Set(
      personImportsSnap.docs.map((d) => d.data().matchedTransactionId).filter(Boolean)
    )

    for (const account of accounts) {
      const txs = await pluggy.fetchAllTransactions(account.id, { dateFrom })
      const existing = await getExisting(db, txs.map((t) => t.id))
      let batch = db.batch()
      let ops = 0

      for (const tx of txs) {
        if (existing.has(tx.id)) continue
        const categoryNames = [
          ...(chains.get(tx.categoryId) ?? []),
          tx.category,
          tx.merchant?.category,
        ].filter(Boolean)
        const entry = classify(tx, { accountType: account.type, hasCreditCard, categoryNames })
        if (!entry) continue

        const category =
          learned.get(normalize(entry.description)) ?? mapCategory(categoryNames, appCategories).name
        let { status, reason } = entry
        let matchedTransactionId = null
        if (status === 'imported') {
          matchedTransactionId = findDuplicate(entry, manual, usedManualIds)
          if (matchedTransactionId) {
            status = 'review'
            reason = 'duplicate'
            usedManualIds.add(matchedTransactionId)
          }
        }

        const date = Timestamp.fromDate(entry.date)
        const transactionId = `bank_${tx.id}`
        const bankName = item.connector?.name ?? connection.connectorName ?? 'Banco'

        batch.set(db.collection(IMPORTS).doc(tx.id), {
          person,
          itemId,
          accountId: account.id,
          accountType: account.type,
          accountName: account.marketingName || account.name || '',
          bankName,
          type: entry.type,
          amount: entry.amount,
          description: entry.description,
          originalDescription: entry.raw,
          category,
          date,
          status,
          reason,
          matchedTransactionId,
          transactionId: status === 'imported' ? transactionId : null,
          createdAt: Timestamp.now(),
        })
        ops++

        if (status === 'imported') {
          batch.set(db.collection(TRANSACTIONS).doc(transactionId), {
            person,
            type: entry.type,
            amount: entry.amount,
            description: entry.description,
            category,
            date,
            createdAt: Timestamp.now(),
            source: 'bank',
            bankImportId: tx.id,
            bankName,
            bankDescription: entry.description,
            originalDescription: entry.raw,
          })
          ops++
        }
        summary[status]++

        if (ops >= 400) {
          await batch.commit()
          batch = db.batch()
          ops = 0
        }
      }
      if (ops) await batch.commit()
    }

    await ref.set(
      {
        status: item.status,
        connectorName: item.connector?.name ?? null,
        connectorImageUrl: item.connector?.imageUrl ?? null,
        accounts: accounts.map((a) => ({
          id: a.id,
          type: a.type,
          name: a.marketingName || a.name || '',
        })),
        bankUpdatedAt: item.lastUpdatedAt ? Timestamp.fromDate(new Date(item.lastUpdatedAt)) : null,
        lastSyncAt: Timestamp.now(),
        lastSyncError: null,
      },
      { merge: true }
    )
  } catch (err) {
    const message = err?.message ?? String(err)
    console.error(`[sync] falha no item ${itemId}:`, message)
    summary.error = message
    await ref.set({ lastSyncAt: Timestamp.now(), lastSyncError: message }, { merge: true })
  }
  return summary
}

let running = null

// Uma sincronização por vez: chamadas simultâneas reaproveitam a que já está rodando.
export function syncAll(db, pluggy) {
  if (!running) {
    running = (async () => {
      const snap = await db.collection(CONNECTIONS).get()
      const results = []
      for (const doc of snap.docs) {
        results.push(await syncConnection(db, pluggy, { itemId: doc.id, ...doc.data() }))
      }
      return results
    })().finally(() => {
      running = null
    })
  }
  return running
}
