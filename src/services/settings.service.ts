import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

const SETTINGS_DOC_ID = 'main'

export async function getSettings(): Promise<Settings | null> {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Settings
  }

  // Create default settings if not exists
  const defaultSettings = { ...DEFAULT_SETTINGS }
  await setDoc(docRef, defaultSettings)
  return { id: SETTINGS_DOC_ID, ...defaultSettings }
}

export async function updateSettings(settings: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID)
  await updateDoc(docRef, settings)
}
