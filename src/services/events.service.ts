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
import type { AgendaEvent } from '@/types'
import { startOfMonth, endOfMonth } from 'date-fns'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'

type RawEvent = Omit<AgendaEvent, 'date' | 'createdAt'> & { date: string; createdAt: string }

const COL = 'events'

export async function getEventsForMonth(month: Date): Promise<AgendaEvent[]> {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  if (MOCK) {
    return mList<RawEvent>(COL)
      .filter((e) => {
        const d = new Date(e.date)
        return d >= start && d <= end
      })
      .map((e) => ({ ...e, date: new Date(e.date), createdAt: new Date(e.createdAt) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const q = query(
    collection(db, COL),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
    } as AgendaEvent
  })
}

export async function addEvent(
  event: Omit<AgendaEvent, 'id' | 'createdAt'>
): Promise<string> {
  if (MOCK) {
    const id = mId()
    const all = mList<RawEvent>(COL)
    all.push({ ...event, id, date: event.date.toISOString(), createdAt: new Date().toISOString() })
    mSave(COL, all)
    return id
  }

  const docRef = await addDoc(collection(db, COL), {
    ...event,
    date: Timestamp.fromDate(event.date),
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateEvent(
  id: string,
  event: Partial<Omit<AgendaEvent, 'id' | 'createdAt'>>
): Promise<void> {
  if (MOCK) {
    const all = mList<RawEvent>(COL)
    const idx = all.findIndex((e) => e.id === id)
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...event,
        date: event.date ? event.date.toISOString() : all[idx].date,
      }
      mSave(COL, all)
    }
    return
  }

  const updateData: Record<string, unknown> = { ...event }
  if (event.date) updateData.date = Timestamp.fromDate(event.date)
  await updateDoc(doc(db, COL, id), updateData)
}

export async function deleteEvent(id: string): Promise<void> {
  if (MOCK) {
    mSave(COL, mList<RawEvent>(COL).filter((e) => e.id !== id))
    return
  }

  await deleteDoc(doc(db, COL, id))
}
