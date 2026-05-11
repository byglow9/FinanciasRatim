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
import type { Note, PersonType } from '@/types'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'

type RawNote = Omit<Note, 'date' | 'createdAt'> & { date?: string; createdAt: string }

const COL = 'notes'

export async function getNotes(person: PersonType): Promise<Note[]> {
  if (MOCK) {
    return mList<RawNote>(COL)
      .filter((n) => n.person === person)
      .map((n) => ({
        ...n,
        date: n.date ? new Date(n.date) : undefined,
        createdAt: new Date(n.createdAt),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  const q = query(
    collection(db, COL),
    where('person', '==', person),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      date: data.date ? data.date.toDate() : undefined,
      createdAt: data.createdAt.toDate(),
    } as Note
  })
}

export async function addNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<string> {
  if (MOCK) {
    const id = mId()
    const all = mList<RawNote>(COL)
    all.push({
      ...note,
      id,
      date: note.date ? note.date.toISOString() : undefined,
      createdAt: new Date().toISOString(),
    })
    mSave(COL, all)
    return id
  }

  const docRef = await addDoc(collection(db, COL), {
    ...note,
    date: note.date ? Timestamp.fromDate(note.date) : null,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateNote(
  id: string,
  note: Partial<Omit<Note, 'id' | 'createdAt'>>
): Promise<void> {
  if (MOCK) {
    const all = mList<RawNote>(COL)
    const idx = all.findIndex((n) => n.id === id)
    if (idx !== -1) {
      const { date, ...rest } = note
      all[idx] = {
        ...all[idx],
        ...rest,
        ...'date' in note ? { date: date ? date.toISOString() : undefined } : {},
      }
      mSave(COL, all)
    }
    return
  }

  const { date, ...rest } = note
  const updateData: Record<string, unknown> = { ...rest }
  if ('date' in note) {
    updateData.date = date ? Timestamp.fromDate(date) : null
  }
  await updateDoc(doc(db, COL, id), updateData)
}

export async function deleteNote(id: string): Promise<void> {
  if (MOCK) {
    mSave(COL, mList<RawNote>(COL).filter((n) => n.id !== id))
    return
  }

  await deleteDoc(doc(db, COL, id))
}
