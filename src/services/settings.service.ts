import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PersonConfig, PersonType, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { MOCK, mGetDoc, mSetDoc } from '@/lib/mockStorage'
import { ownerId } from '@/lib/scope'

const DOC_KEY = 'settings::main'
const SETTINGS_DOC_ID = 'main'

// Unico lugar que monta a referencia de settings. O ID continua fixo (main) nesta fase;
// a troca por um documento por hid fica para a Fase 8 (operacao de dados).
const settingsRef = () => doc(db, 'settings', SETTINGS_DOC_ID)

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

  const docRef = settingsRef()
  const docSnap = await getDoc(docRef)
  // Tolera documento parcial (por exemplo o criado pelo backfill): o que faltar vem do padrao.
  if (docSnap.exists()) return { id: docSnap.id, ...DEFAULT_SETTINGS, ...docSnap.data() } as Settings
  const defaultSettings = { ...DEFAULT_SETTINGS }
  await setDoc(docRef, { ...DEFAULT_SETTINGS, ownerId: ownerId() })
  return { id: SETTINGS_DOC_ID, ...defaultSettings }
}

export async function updateSettings(settings: Partial<Omit<Settings, 'id'>>): Promise<void> {
  if (MOCK) {
    const existing = mGetDoc<Settings>(DOC_KEY) ?? { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
    mSetDoc(DOC_KEY, { ...existing, ...settings })
    return
  }

  await updateDoc(settingsRef(), settings)
}

// Grava so o no da propria pessoa (a interface do parceiro e somente leitura). O caminho pontilhado
// vai ate o nivel da pessoa, nunca ate a categoria, e nao menciona ownerId (o dono e imutavel).
export async function updatePersonConfig(person: PersonType, config: PersonConfig): Promise<void> {
  if (MOCK) {
    // mSetDoc faz mescla rasa: o objeto aninhado e montado a mao para nao apagar o no do parceiro.
    const existing = mGetDoc<Settings>(DOC_KEY) ?? { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
    mSetDoc(DOC_KEY, {
      ...existing,
      personConfig: { ...existing.personConfig, [person]: config },
    })
    return
  }

  await updateDoc(settingsRef(), { ['personConfig.' + person]: config })
}
