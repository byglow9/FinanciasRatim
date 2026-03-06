import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { SavingsTransaction } from '@/types'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'

type RawSavings = Omit<SavingsTransaction, 'date' | 'createdAt'> & {
  date: string
  createdAt: string
}

const COL = 'savings'

export async function getSavingsTransactions(): Promise<SavingsTransaction[]> {
  if (MOCK) {
    return mList<RawSavings>(COL)
      .map((t) => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const q = query(collection(db, COL), orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as SavingsTransaction[]
}

export async function addSavingsTransaction(
  transaction: Omit<SavingsTransaction, 'id' | 'createdAt'>
): Promise<string> {
  if (MOCK) {
    const id = mId()
    const all = mList<RawSavings>(COL)
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

export async function deleteSavingsTransaction(id: string): Promise<void> {
  if (MOCK) {
    mSave(COL, mList<RawSavings>(COL).filter((t) => t.id !== id))
    return
  }

  await deleteDoc(doc(db, COL, id))
}

export function calculateSavingsBalance(transactions: SavingsTransaction[]): number {
  return transactions.reduce((balance, t) => {
    return t.type === 'deposito' ? balance + t.amount : balance - t.amount
  }, 0)
}
