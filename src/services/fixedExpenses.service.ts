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
import type { FixedExpense, FixedExpensePayment, PersonType } from '@/types'

const COLLECTION_NAME = 'fixedExpenses'
const PAYMENTS_COLLECTION = 'fixedExpensePayments'

export async function getFixedExpenses(
  person?: PersonType | 'conjunto'
): Promise<FixedExpense[]> {
  let q = query(
    collection(db, COLLECTION_NAME),
    where('isActive', '==', true),
    orderBy('dueDay', 'asc')
  )

  if (person) {
    q = query(
      collection(db, COLLECTION_NAME),
      where('person', '==', person),
      where('isActive', '==', true),
      orderBy('dueDay', 'asc')
    )
  }

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
  })) as FixedExpense[]
}

export async function addFixedExpense(
  expense: Omit<FixedExpense, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...expense,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateFixedExpense(
  id: string,
  expense: Partial<Omit<FixedExpense, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, expense)
}

export async function deleteFixedExpense(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, { isActive: false })
}

// Payments

export async function getPaymentsForMonth(
  month: number,
  year: number
): Promise<FixedExpensePayment[]> {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('month', '==', month),
    where('year', '==', year)
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    paidAt: doc.data().paidAt.toDate(),
  })) as FixedExpensePayment[]
}

export async function markAsPaid(
  fixedExpenseId: string,
  month: number,
  year: number,
  paidAmount: number
): Promise<string> {
  const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
    fixedExpenseId,
    month,
    year,
    paidAmount,
    paidAt: Timestamp.now(),
  })
  return docRef.id
}

export async function unmarkAsPaid(paymentId: string): Promise<void> {
  const docRef = doc(db, PAYMENTS_COLLECTION, paymentId)
  await deleteDoc(docRef)
}
