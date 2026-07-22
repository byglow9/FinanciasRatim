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
import type { EventCategory } from '@/types'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'

type RawEventCategory = Omit<EventCategory, 'createdAt'> & { createdAt: string }

const COL = 'eventCategories'

export async function getEventCategories(): Promise<EventCategory[]> {
  if (MOCK) {
    return mList<RawEventCategory>(COL)
      .map((c) => ({ ...c, createdAt: new Date(c.createdAt) }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  const q = query(collection(db, COL), orderBy('createdAt', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt.toDate(),
    } as EventCategory
  })
}

export async function addEventCategory(
  category: Omit<EventCategory, 'id' | 'createdAt'>
): Promise<string> {
  if (MOCK) {
    const id = mId()
    const all = mList<RawEventCategory>(COL)
    all.push({ ...category, id, createdAt: new Date().toISOString() })
    mSave(COL, all)
    return id
  }

  const docRef = await addDoc(collection(db, COL), {
    ...category,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateEventCategory(
  id: string,
  category: Partial<Omit<EventCategory, 'id' | 'createdAt'>>
): Promise<void> {
  if (MOCK) {
    const all = mList<RawEventCategory>(COL)
    const idx = all.findIndex((c) => c.id === id)
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...category }
      mSave(COL, all)
    }
    return
  }

  await updateDoc(doc(db, COL, id), category)
}

export async function deleteEventCategory(id: string): Promise<void> {
  if (MOCK) {
    mSave(COL, mList<RawEventCategory>(COL).filter((c) => c.id !== id))
    return
  }

  await deleteDoc(doc(db, COL, id))
}
