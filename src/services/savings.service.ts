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

const COLLECTION_NAME = 'savings'

export async function getSavingsTransactions(): Promise<SavingsTransaction[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('date', 'desc')
  )

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
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...transaction,
    date: Timestamp.fromDate(transaction.date),
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function deleteSavingsTransaction(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}

export function calculateSavingsBalance(transactions: SavingsTransaction[]): number {
  return transactions.reduce((balance, t) => {
    if (t.type === 'deposito') {
      return balance + t.amount
    } else {
      return balance - t.amount
    }
  }, 0)
}
