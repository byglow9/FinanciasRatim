import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Goal, PersonType } from '@/types'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'
import { deleteContributionsByGoalId } from './goalContributions.service'

type RawGoal = Omit<Goal, 'deadline' | 'createdAt'> & {
  deadline: string | null
  createdAt: string
  person?: PersonType // opcional para migracao de dados antigos
}

const COL = 'goals'

export async function getGoals(person?: PersonType): Promise<Goal[]> {
  if (MOCK) {
    const goals = mList<RawGoal>(COL)
      .map((g) => ({
        ...g,
        person: g.person || 'ele', // metas antigas sem person sao de 'ele'
        deadline: g.deadline ? new Date(g.deadline) : undefined,
        createdAt: new Date(g.createdAt),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return person ? goals.filter((g) => g.person === person) : goals
  }

  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  const goals = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    person: doc.data().person || 'ele', // metas antigas sem person sao de 'ele'
    deadline: doc.data().deadline?.toDate() || null,
    createdAt: doc.data().createdAt.toDate(),
  })) as Goal[]

  return person ? goals.filter((g) => g.person === person) : goals
}

export async function addGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<string> {
  if (MOCK) {
    const id = mId()
    const all = mList<RawGoal>(COL)
    all.push({
      ...goal,
      id,
      deadline: goal.deadline ? goal.deadline.toISOString() : null,
      createdAt: new Date().toISOString(),
    })
    mSave(COL, all)
    return id
  }

  const docRef = await addDoc(collection(db, COL), {
    ...goal,
    deadline: goal.deadline ? Timestamp.fromDate(goal.deadline) : null,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateGoal(
  id: string,
  goal: Partial<Omit<Goal, 'id' | 'createdAt'>>
): Promise<void> {
  if (MOCK) {
    const all = mList<RawGoal>(COL)
    const idx = all.findIndex((g) => g.id === id)
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...goal,
        deadline: goal.deadline !== undefined
          ? (goal.deadline ? goal.deadline.toISOString() : null)
          : all[idx].deadline,
      }
      mSave(COL, all)
    }
    return
  }

  const updateData: Record<string, unknown> = { ...goal }
  if (goal.deadline) updateData.deadline = Timestamp.fromDate(goal.deadline)
  await updateDoc(doc(db, COL, id), updateData)
}

export async function deleteGoal(id: string): Promise<void> {
  // Primeiro, deletar todas as contribuições associadas
  await deleteContributionsByGoalId(id)

  if (MOCK) {
    mSave(COL, mList<RawGoal>(COL).filter((g) => g.id !== id))
    return
  }

  await deleteDoc(doc(db, COL, id))
}

export async function updateGoalProgress(id: string, currentAmount: number): Promise<void> {
  if (MOCK) {
    const all = mList<RawGoal>(COL)
    const idx = all.findIndex((g) => g.id === id)
    if (idx !== -1) { all[idx] = { ...all[idx], currentAmount }; mSave(COL, all) }
    return
  }

  await updateDoc(doc(db, COL, id), { currentAmount })
}
