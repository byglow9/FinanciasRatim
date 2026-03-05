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

const COLLECTION_NAME = 'transactions'

export async function getTransactions(
  person: PersonType,
  month: Date
): Promise<Transaction[]> {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const q = query(
    collection(db, COLLECTION_NAME),
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
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const q = query(
    collection(db, COLLECTION_NAME),
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
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
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
  const docRef = doc(db, COLLECTION_NAME, id)
  const updateData: Record<string, unknown> = { ...transaction }
  if (transaction.date) {
    updateData.date = Timestamp.fromDate(transaction.date)
  }
  await updateDoc(docRef, updateData)
}

export async function deleteTransaction(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}
