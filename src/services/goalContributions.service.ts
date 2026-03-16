import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  Timestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GoalContribution } from '@/types'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'
import { startOfMonth, endOfMonth } from 'date-fns'

type RawContribution = Omit<GoalContribution, 'date' | 'createdAt'> & {
  date: string
  createdAt: string
}

const COL = 'goalContributions'
const GOALS_COL = 'goals'

export async function getContributionsForMonth(month: Date): Promise<GoalContribution[]> {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  if (MOCK) {
    return mList<RawContribution>(COL)
      .filter((c) => {
        const d = new Date(c.date)
        return d >= start && d <= end
      })
      .map((c) => ({
        ...c,
        date: new Date(c.date),
        createdAt: new Date(c.createdAt),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

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
  })) as GoalContribution[]
}

export async function getContributions(goalId: string): Promise<GoalContribution[]> {
  if (MOCK) {
    return mList<RawContribution>(COL)
      .filter((c) => c.goalId === goalId)
      .map((c) => ({
        ...c,
        date: new Date(c.date),
        createdAt: new Date(c.createdAt),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const q = query(
    collection(db, COL),
    where('goalId', '==', goalId),
    orderBy('date', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as GoalContribution[]
}

export async function addContribution(
  goalId: string,
  amount: number,
  currentGoalAmount: number,
  description?: string
): Promise<string> {
  const now = new Date()

  if (MOCK) {
    const id = mId()
    const contributions = mList<RawContribution>(COL)
    contributions.push({
      id,
      goalId,
      amount,
      description,
      date: now.toISOString(),
      createdAt: now.toISOString(),
    })
    mSave(COL, contributions)

    // Atualizar currentAmount da meta
    const goals = mList<{ id: string; currentAmount: number }>(GOALS_COL)
    const goalIdx = goals.findIndex((g) => g.id === goalId)
    if (goalIdx !== -1) {
      goals[goalIdx].currentAmount = currentGoalAmount + amount
      mSave(GOALS_COL, goals)
    }

    return id
  }

  // Usar transacao para garantir consistencia
  const contributionId = await runTransaction(db, async (transaction) => {
    const goalRef = doc(db, GOALS_COL, goalId)
    const goalDoc = await transaction.get(goalRef)

    if (!goalDoc.exists()) {
      throw new Error('Meta nao encontrada')
    }

    const currentAmount = goalDoc.data().currentAmount || 0
    const newAmount = currentAmount + amount

    // Atualizar meta
    transaction.update(goalRef, { currentAmount: newAmount })

    // Criar contribuicao
    const contributionRef = doc(collection(db, COL))
    transaction.set(contributionRef, {
      goalId,
      amount,
      description: description || null,
      date: Timestamp.fromDate(now),
      createdAt: Timestamp.now(),
    })

    return contributionRef.id
  })

  return contributionId
}

export async function deleteContributionsByGoalId(goalId: string): Promise<void> {
  if (MOCK) {
    const filtered = mList<RawContribution>(COL).filter((c) => c.goalId !== goalId)
    mSave(COL, filtered)
    return
  }

  const q = query(collection(db, COL), where('goalId', '==', goalId))
  const snapshot = await getDocs(q)

  const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref))
  await Promise.all(deletePromises)
}
