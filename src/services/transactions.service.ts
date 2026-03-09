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
