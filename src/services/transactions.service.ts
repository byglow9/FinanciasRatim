import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Transaction, PersonType } from '@/types'
import { startOfMonth, endOfMonth } from 'date-fns'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'
import { accumulatedBalance } from '@shared/core/ledger.js'
import { monthRangeOf } from '@shared/core/time.js'

type RawTransaction = Omit<Transaction, 'date' | 'createdAt'> & {
  date: string
  createdAt: string
}

const COL = 'transactions'

export async function getTransactions(
  person: PersonType,
  month: Date
): Promise<Transaction[]> {
  if (MOCK) {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    return mList<RawTransaction>(COL)
      .filter((t) => {
        const d = new Date(t.date)
        return t.person === person && d >= start && d <= end
      })
      .map((t) => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('person', '==', person),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as Transaction[]
}

// Lancamentos da janela exata do ciclo. start e end vem do nucleo (cycle.start e cycle.end,
// fuso de Sao Paulo): nada de date-fns aqui. Usa o indice (ownerId, person, date DESC).
export async function getTransactionsInRange(
  person: PersonType,
  start: Date,
  end: Date
): Promise<Transaction[]> {
  if (MOCK) {
    return mList<RawTransaction>(COL)
      .filter((t) => {
        const d = new Date(t.date)
        return t.person === person && d >= start && d <= end
      })
      .map((t) => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('person', '==', person),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as Transaction[]
}

export async function getAllTransactionsForMonth(month: Date): Promise<Transaction[]> {
  if (MOCK) {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    return mList<RawTransaction>(COL)
      .filter((t) => {
        const d = new Date(t.date)
        return d >= start && d <= end
      })
      .map((t) => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as Transaction[]
}

export async function addTransaction(
  transaction: Omit<Transaction, 'id' | 'createdAt'>
): Promise<string> {
  if (MOCK) {
    const id = mId()
    const all = mList<RawTransaction>(COL)
    all.push({ ...transaction, id, date: transaction.date.toISOString(), createdAt: new Date().toISOString() })
    mSave(COL, all)
    return id
  }

  const docRef = await addDoc(collection(db, COL), {
    ...transaction,
    ownerId: ownerId(),
    date: Timestamp.fromDate(transaction.date),
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateTransaction(
  id: string,
  transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>
): Promise<void> {
  if (MOCK) {
    const all = mList<RawTransaction>(COL)
    const idx = all.findIndex((t) => t.id === id)
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...transaction,
        date: transaction.date ? transaction.date.toISOString() : all[idx].date,
      }
      mSave(COL, all)
    }
    return
  }

  const docRef = doc(db, COL, id)
  const updateData: Record<string, unknown> = { ...transaction }
  if (transaction.date) updateData.date = Timestamp.fromDate(transaction.date)
  await updateDoc(docRef, updateData)
}

export async function deleteTransaction(id: string): Promise<void> {
  if (MOCK) {
    mSave(COL, mList<RawTransaction>(COL).filter((t) => t.id !== id))
    return
  }

  const docRef = doc(db, COL, id)
  await deleteDoc(docRef)
}

export async function getTransactionsByCategory(category: string): Promise<Transaction[]> {
  if (MOCK) {
    return mList<RawTransaction>(COL)
      .filter((t) => t.category === category)
      .map((t) => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt) }))
  }

  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('category', '==', category)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as Transaction[]
}

export async function getAccumulatedBalance(
  person: PersonType,
  untilMonth: Date
): Promise<number> {
  // Limite: ultimo milissegundo do mes em Sao Paulo (D-12); a soma em centavos vem do nucleo.
  const until = monthRangeOf(untilMonth.getFullYear(), untilMonth.getMonth() + 1).end

  if (MOCK) {
    return accumulatedBalance(
      mList<RawTransaction>(COL)
        .filter((t) => t.person === person)
        .map((t) => ({ type: t.type, amount: t.amount, date: new Date(t.date) })),
      until
    )
  }

  // Busca todas as transações da pessoa e filtra por data no nucleo
  // para evitar necessidade de índice composto no Firestore (so igualdade: ownerId e person)
  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('person', '==', person)
  )
  const snapshot = await getDocs(q)
  return accumulatedBalance(
    snapshot.docs.map((d) => {
      const data = d.data()
      return { type: data.type, amount: data.amount, date: data.date.toDate() }
    }),
    until
  )
}
