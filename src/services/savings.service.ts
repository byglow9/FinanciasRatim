import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { SavingsTransaction } from '@/types'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'

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

  const q = query(collection(db, COL), ...ownerScope(), orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as SavingsTransaction[]
}

/** ID de documento gerado no cliente, sem rede (WR-08): a mesma tentativa reaproveita o mesmo ID. */
export function newSavingsId(): string {
  return MOCK ? mId() : doc(collection(db, COL)).id
}

/** Com `id`, grava nesse documento (setDoc) e a repeticao nao duplica (WR-08); sem `id`, gera um. */
export async function addSavingsTransaction(
  transaction: Omit<SavingsTransaction, 'id' | 'createdAt'>,
  id?: string
): Promise<string> {
  if (MOCK) {
    const docId = id ?? mId()
    const all = mList<RawSavings>(COL).filter((t) => t.id !== docId)
    all.push({ ...transaction, id: docId, date: transaction.date.toISOString(), createdAt: new Date().toISOString() })
    mSave(COL, all)
    return docId
  }

  // Sempre por setDoc: sem `id` o ID e gerado aqui (sem rede), igual ao do addDoc.
  const docId = id ?? newSavingsId()
  await setDoc(doc(db, COL, docId), {
    ...transaction,
    ownerId: ownerId(),
    date: Timestamp.fromDate(transaction.date),
    createdAt: Timestamp.now(),
  })
  return docId
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
