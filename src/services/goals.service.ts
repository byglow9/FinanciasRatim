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
import type { Goal } from '@/types'

const COLLECTION_NAME = 'goals'

export async function getGoals(): Promise<Goal[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    deadline: doc.data().deadline?.toDate() || null,
    createdAt: doc.data().createdAt.toDate(),
  })) as Goal[]
}

export async function addGoal(
  goal: Omit<Goal, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
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
  const docRef = doc(db, COLLECTION_NAME, id)
  const updateData: Record<string, unknown> = { ...goal }
  if (goal.deadline) {
    updateData.deadline = Timestamp.fromDate(goal.deadline)
  }
  await updateDoc(docRef, updateData)
}

export async function deleteGoal(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}

export async function updateGoalProgress(id: string, currentAmount: number): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, { currentAmount })
}
