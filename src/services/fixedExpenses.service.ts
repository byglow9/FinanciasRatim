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
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'

type RawExpense = Omit<FixedExpense, 'createdAt'> & { createdAt: string }
type RawPayment = Omit<FixedExpensePayment, 'paidAt'> & { paidAt: string }

const COL = 'fixedExpenses'
const PAY_COL = 'fixedExpensePayments'

export async function getFixedExpenses(
  person?: PersonType | 'conjunto'
): Promise<FixedExpense[]> {
  if (MOCK) {
    return mList<RawExpense>(COL)
      .filter((e) => e.isActive && (!person || e.person === person))
      .map((e) => ({ ...e, createdAt: new Date(e.createdAt) }))
      .sort((a, b) => a.dueDay - b.dueDay)
  }

  let q = query(
    collection(db, COL),
    ...ownerScope(),
    where('isActive', '==', true),
    orderBy('dueDay', 'asc')
  )
  if (person) {
    q = query(
      collection(db, COL),
      ...ownerScope(),
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
  if (MOCK) {
    const id = mId()
    const all = mList<RawExpense>(COL)
    all.push({ ...expense, id, createdAt: new Date().toISOString() })
    mSave(COL, all)
    return id
  }

  const docRef = await addDoc(collection(db, COL), {
    ...expense,
    ownerId: ownerId(),
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateFixedExpense(
  id: string,
  expense: Partial<Omit<FixedExpense, 'id' | 'createdAt'>>
): Promise<void> {
  if (MOCK) {
    const all = mList<RawExpense>(COL)
    const idx = all.findIndex((e) => e.id === id)
    if (idx !== -1) { all[idx] = { ...all[idx], ...expense }; mSave(COL, all) }
    return
  }

  await updateDoc(doc(db, COL, id), expense)
}

export async function deleteFixedExpense(id: string): Promise<void> {
  if (MOCK) {
    const all = mList<RawExpense>(COL)
    const idx = all.findIndex((e) => e.id === id)
    if (idx !== -1) { all[idx] = { ...all[idx], isActive: false }; mSave(COL, all) }
    // Remove todos os pagamentos associados
    const payments = mList<RawPayment>(PAY_COL).filter((p) => p.fixedExpenseId !== id)
    mSave(PAY_COL, payments)
    return
  }

  await updateDoc(doc(db, COL, id), { isActive: false })
  // Remove todos os pagamentos associados
  const paymentsQuery = query(
    collection(db, PAY_COL),
    ...ownerScope(),
    where('fixedExpenseId', '==', id)
  )
  const paymentsSnapshot = await getDocs(paymentsQuery)
  const deletePromises = paymentsSnapshot.docs.map((d) => deleteDoc(doc(db, PAY_COL, d.id)))
  await Promise.all(deletePromises)
}

export async function getPaymentsForMonth(
  month: number,
  year: number
): Promise<FixedExpensePayment[]> {
  if (MOCK) {
    return mList<RawPayment>(PAY_COL)
      .filter((p) => p.month === month && p.year === year)
      .map((p) => ({ ...p, paidAt: new Date(p.paidAt) }))
  }

  const q = query(
    collection(db, PAY_COL),
    ...ownerScope(),
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

// Pagamentos dos ate dois meses que um ciclo cobre (o ciclo pode atravessar a virada do mes).
// Sem consulta nova: reaproveita getPaymentsForMonth; pares repetidos sao consultados uma vez.
export async function getPaymentsForMonths(
  pairs: Array<{ month: number; year: number }>
): Promise<FixedExpensePayment[]> {
  const unique = new Map<string, { month: number; year: number }>()
  for (const p of pairs) unique.set(`${p.year}-${p.month}`, p)
  const lists = await Promise.all(
    [...unique.values()].map((p) => getPaymentsForMonth(p.month, p.year))
  )
  return lists.flat()
}

export async function markAsPaid(
  fixedExpenseId: string,
  month: number,
  year: number,
  paidAmount: number
): Promise<string> {
  if (MOCK) {
    const id = mId()
    const all = mList<RawPayment>(PAY_COL)
    all.push({ id, fixedExpenseId, month, year, paidAmount, paidAt: new Date().toISOString() })
    mSave(PAY_COL, all)
    return id
  }

  const docRef = await addDoc(collection(db, PAY_COL), {
    ownerId: ownerId(), fixedExpenseId, month, year, paidAmount, paidAt: Timestamp.now(),
  })
  return docRef.id
}

export async function unmarkAsPaid(paymentId: string): Promise<void> {
  if (MOCK) {
    mSave(PAY_COL, mList<RawPayment>(PAY_COL).filter((p) => p.id !== paymentId))
    return
  }

  await deleteDoc(doc(db, PAY_COL, paymentId))
}

export async function getFixedExpensesByCategory(category: string): Promise<FixedExpense[]> {
  if (MOCK) {
    return mList<RawExpense>(COL)
      .filter((e) => e.category === category && e.isActive)
      .map((e) => ({ ...e, createdAt: new Date(e.createdAt) }))
  }

  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('category', '==', category),
    where('isActive', '==', true)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
  })) as FixedExpense[]
}
