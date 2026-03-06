import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { MOCK, mGetDoc, mSetDoc } from '@/lib/mockStorage'

const DOC_KEY = 'settings::main'
const SETTINGS_DOC_ID = 'main'

export async function getSettings(): Promise<Settings | null> {
  if (MOCK) {
    const stored = mGetDoc<Settings>(DOC_KEY)
    if (stored) {
      if (stored.tabNames.area1 === 'Ele') stored.tabNames.area1 = 'Nirigue'
      if (stored.tabNames.area2 === 'Ela') stored.tabNames.area2 = 'Nirigua'
      return stored
    }
    const defaults = { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
    mSetDoc(DOC_KEY, defaults)
    return defaults
  }

  const docRef = doc(db, 'settings', SETTINGS_DOC_ID)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Settings
  const defaultSettings = { ...DEFAULT_SETTINGS }
  await setDoc(docRef, defaultSettings)
  return { id: SETTINGS_DOC_ID, ...defaultSettings }
}

export async function updateSettings(settings: Partial<Omit<Settings, 'id'>>): Promise<void> {
  if (MOCK) {
    const existing = mGetDoc<Settings>(DOC_KEY) ?? { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
    mSetDoc(DOC_KEY, { ...existing, ...settings })
    return
  }

  await updateDoc(doc(db, 'settings', SETTINGS_DOC_ID), settings)
}
