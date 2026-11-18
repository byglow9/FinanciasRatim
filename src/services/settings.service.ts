import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { CategoryDef, PersonConfig, PersonType, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { MOCK, mGetDoc, mSetDoc } from '@/lib/mockStorage'
import { ownerId } from '@/lib/scope'
import { activeCategoryNames, reconcileCategoryDefs } from '@shared/core/categories.js'
import { normalizePersonConfig } from '@shared/core/limits.js'

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
// WR-01: o atualizador e aplicado, dentro de uma transacao, sobre o que o documento tem AGORA (nunca
// sobre o snapshot velho do contexto), entao uma edicao feita em outro aparelho nao e perdida. O
// atualizador precisa ser puro: a transacao pode repeti-lo. Devolve o no gravado.
export async function updatePersonConfig(
  person: PersonType,
  updater: (current: PersonConfig) => PersonConfig
): Promise<PersonConfig> {
  if (MOCK) {
    // mSetDoc faz mescla rasa: o objeto aninhado e montado a mao para nao apagar o no do parceiro.
    const existing = mGetDoc<Settings>(DOC_KEY) ?? { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
    const next = updater(normalizePersonConfig(existing.personConfig?.[person]))
    mSetDoc(DOC_KEY, {
      ...existing,
      personConfig: { ...existing.personConfig, [person]: next },
    })
    return next
  }

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(settingsRef())
    const data = snap.data() as Partial<Settings> | undefined
    const next = updater(normalizePersonConfig(data?.personConfig?.[person]))
    transaction.update(settingsRef(), { ['personConfig.' + person]: next })
    return next
  })
}

// Categorias do casal (categoryDefs e categories, gravadas juntas). Mesma regra do WR-01: le o
// documento atual dentro da transacao, reconcilia com a mesma funcao do nucleo que o contexto usa,
// aplica o atualizador puro e grava as duas coisas. Devolve as definicoes gravadas.
export async function updateCategoryDefs(
  updater: (current: CategoryDef[]) => CategoryDef[]
): Promise<CategoryDef[]> {
  if (MOCK) {
    const existing = mGetDoc<Settings>(DOC_KEY) ?? { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
    const next = updater(reconcileCategoryDefs(existing.categories ?? [], existing.categoryDefs ?? []))
    mSetDoc(DOC_KEY, { ...existing, categoryDefs: next, categories: activeCategoryNames(next) })
    return next
  }

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(settingsRef())
    // Tolera documento parcial, como o getSettings: o que faltar vem do padrao.
    const data = { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<Settings> | undefined) }
    const next = updater(reconcileCategoryDefs(data.categories ?? [], data.categoryDefs ?? []))
    transaction.update(settingsRef(), { categoryDefs: next, categories: activeCategoryNames(next) })
    return next
  })
}
