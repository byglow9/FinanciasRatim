import { Timestamp } from 'firebase-admin/firestore'
import {
  classify,
  cleanDescription,
  findDuplicate,
  mapCategory,
  normalize,
  DUPLICATE_WINDOW_DAYS,
} from '../../shared/core/classify.js'
import { syncCardSnapshot } from './card-sync.js'
import {
  DEFAULT_CATEGORY_DEFS,
  buildCategoryDefs,
  resolveCategoryId,
} from '../../shared/core/categories.js'

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

// Definições de categoria do dono. settings/main só vale se não tiver dono ou se o dono for o mesmo
// (Admin SDK ignora regras; nunca usar categorias de outro casal).
async function getAppCategories(db, ownerId) {
  const snap = await db.collection('settings').doc('main').get()
  const data = snap.exists ? snap.data() : null
  if (!data || (data.ownerId != null && data.ownerId !== ownerId)) return DEFAULT_CATEGORY_DEFS
  if (Array.isArray(data.categoryDefs) && data.categoryDefs.length) return data.categoryDefs
  // Definições com id estável; sem categorias salvas, usa as padrão.
  return Array.isArray(data.categories) && data.categories.length
    ? buildCategoryDefs(data.categories)
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
export async function cleanExistingDescriptions(db, hid) {
  if (typeof hid !== 'string' || !hid) throw new Error('cleanExistingDescriptions exige o hid do dono')
  let updated = 0
  let batch = db.batch()
  let ops = 0
  const flush = async () => {
    if (ops) await batch.commit()
    batch = db.batch()
    ops = 0
  }

  const imports = await db.collection(IMPORTS).where('ownerId', '==', hid).get()
  for (const doc of imports.docs) {
    const d = doc.data()
    const raw = d.originalDescription ?? d.description
    const clean = cleanDescription(raw)
    if (d.description === clean && d.originalDescription === raw) continue
    batch.update(doc.ref, { description: clean, originalDescription: raw })
    ops++
    if (ops >= 400) await flush()
  }

  const txs = await db
    .collection(TRANSACTIONS)
    .where('ownerId', '==', hid)
    .where('source', '==', 'bank')
    .get()
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
  const { itemId, person, ownerId } = connection
  const ref = db.collection(CONNECTIONS).doc(itemId)
  const summary = { itemId, person, imported: 0, review: 0, ignored: 0 }

  try {
    // O Admin SDK ignora as regras: sem dono explícito, nada é gravado (FUND-04).
    if (typeof ownerId !== 'string' || !ownerId) {
      throw new Error('Conexao sem dono (ownerId): rode o backfill antes de sincronizar')
    }
    const item = await pluggy.fetchItem(itemId)
    const { results: accounts } = await pluggy.fetchAccounts(itemId)
    const hasCreditCard = accounts.some((a) => a.type === 'CREDIT')

    const importFrom = connection.importFrom?.toDate?.() ?? new Date(Date.now() - 30 * DAY_MS)
    const dateFrom = importFrom.toISOString().slice(0, 10)
    const windowStart = new Date(importFrom.getTime() - DUPLICATE_WINDOW_DAYS * DAY_MS)

    const [chains, appCategories, personTxSnap, personImportsSnap] = await Promise.all([
      getCategoryChains(pluggy),
      getAppCategories(db, ownerId),
      db
        .collection(TRANSACTIONS)
        .where('ownerId', '==', ownerId)
        .where('person', '==', person)
        .where('date', '>=', Timestamp.fromDate(windowStart))
        .orderBy('date', 'desc')
        .get(),
      db.collection(IMPORTS).where('ownerId', '==', ownerId).where('person', '==', person).get(),
    ])

    const manual = []
    // descrição -> { categoryId, category } já usado (aprende com as correções feitas no site);
    // categoria arquivada ou desconhecida não é reaproveitada, e o nome é sempre o atual (D-07, D-09)
    const learned = new Map()
    for (const doc of personTxSnap.docs) {
      const d = doc.data()
      if (d.source === 'bank') {
        const key = normalize(d.bankDescription ?? d.description)
        if (!key || learned.has(key)) continue
        const id = d.categoryId ?? resolveCategoryId(d.category, appCategories)
        const def = appCategories.find((c) => c.id === id)
        if (def && !def.archived) learned.set(key, { categoryId: def.id, category: def.name })
      } else {
        manual.push({ id: doc.id, type: d.type, amount: d.amount, date: d.date.toDate() })
      }
    }
    const usedManualIds = new Set(
      personImportsSnap.docs.map((d) => d.data().matchedTransactionId).filter(Boolean)
    )

    for (const account of accounts) {
      // Limite e fatura atual do cartao (CARD-02). Falha aqui nunca derruba a importacao do
      // banco: so a mensagem vai para o log, sem valores nem dados pessoais.
      if (account.type === 'CREDIT') {
        try {
          if (await syncCardSnapshot(db, { ownerId, person, itemId, account })) {
            summary.cards = (summary.cards ?? 0) + 1
          }
        } catch (err) {
          console.warn(`[sync] cartao nao gravado no item ${itemId}:`, err?.message ?? String(err))
        }
      }
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

        const mapped = mapCategory(categoryNames, appCategories)
        const { categoryId, category } = learned.get(normalize(entry.description)) ?? {
          categoryId: mapped.id,
          category: mapped.name,
        }
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
          ownerId,
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
          categoryId,
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
            ownerId,
            person,
            type: entry.type,
            amount: entry.amount,
            description: entry.description,
            category,
            categoryId,
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
        // Consentimento e estado de execucao para a tela de Bancos (REV-07, D-08).
        // Item sem consentimento grava null; so o codigo do erro, nunca a mensagem.
        executionStatus: item.executionStatus ?? null,
        consentExpiresAt: item.consentExpiresAt ? Timestamp.fromDate(new Date(item.consentExpiresAt)) : null,
        errorCode: item.error?.code ?? null,
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

// Execuções em andamento por chave (hid ou todas): a mesma chave reaproveita a execução.
// Chaves diferentes entram numa fila única para nunca processar duas conexões ao mesmo tempo.
const runs = new Map()
let tail = Promise.resolve()

export function syncAll(db, pluggy, { hid } = {}) {
  // hid vazio nunca pode virar "todas as conexões": só ausente (agendador) sincroniza tudo.
  if (hid !== undefined && (typeof hid !== 'string' || !hid)) {
    return Promise.reject(new Error('syncAll: hid invalido'))
  }
  const key = hid ?? '*'
  if (!runs.has(key)) {
    const job = tail.then(async () => {
      const col = db.collection(CONNECTIONS)
      const snap = await (hid ? col.where('ownerId', '==', hid) : col).get()
      const results = []
      for (const doc of snap.docs) {
        results.push(await syncConnection(db, pluggy, { itemId: doc.id, ...doc.data() }))
      }
      return results
    })
    const run = job.finally(() => runs.delete(key))
    tail = run.catch(() => {})
    runs.set(key, run)
  }
  return runs.get(key)
}

// Sincroniza uma unica conexao (webhook da Pluggy, REV-06) na MESMA fila do syncAll, para nunca
// haver duas conexoes em processamento ao mesmo tempo. Rajadas do mesmo item coalescem: uma
// execucao em andamento mais uma repeticao final (o evento que chegou no meio nao se perde).
const itemRuns = new Map()

export function syncItem(db, pluggy, itemId) {
  if (typeof itemId !== 'string' || !itemId) {
    return Promise.reject(new Error('syncItem: itemId invalido'))
  }
  const current = itemRuns.get(itemId)
  if (current) {
    current.again = true
    return current.promise
  }
  const state = { again: false, promise: null }
  state.promise = (async () => {
    let result = null
    try {
      do {
        state.again = false
        const job = tail.then(async () => {
          const snap = await db.collection(CONNECTIONS).doc(itemId).get()
          if (!snap.exists) return null
          return syncConnection(db, pluggy, { itemId, ...snap.data() })
        })
        tail = job.catch(() => {})
        result = await job
      } while (state.again)
    } finally {
      // Sem await entre a checagem de again e esta remocao: nenhum evento se perde.
      itemRuns.delete(itemId)
    }
    return result
  })()
  itemRuns.set(itemId, state)
  return state.promise
}
