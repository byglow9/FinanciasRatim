import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { LimitAlert, PersonType } from '@/types'
import { MOCK, mList, mSave } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'

// Avisos de limite (80% e 100%). O ID e deterministico (person__cycleKey__categoryId__threshold),
// entao criar duas vezes o mesmo aviso, em recarga ou em dois aparelhos, resulta em um so documento.
// O documento guarda so ids, centavos, limiar, chave de ciclo e datas: nunca nome de categoria,
// descricao de lancamento nem nome de loja (o nome e resolvido por categoryId na leitura).
// Erros de rede ou de regra sobem para quem chama: o alerta e melhor-esforco e o chamador engole.

export interface LimitAlertDraft {
  id: string
  person: PersonType
  categoryId: string
  threshold: 80 | 100
  cycleKey: string
  spentCents: number
  limitCents: number
  silent: boolean
}

type RawLimitAlert = Omit<LimitAlert, 'createdAt' | 'readAt'> & {
  createdAt: string
  readAt: string | null
}

const COL = 'limitAlerts'
const DEFAULT_MAX = 30

export async function getLimitAlerts(person: PersonType, max = DEFAULT_MAX): Promise<LimitAlert[]> {
  if (MOCK) {
    return mList<RawLimitAlert>(COL)
      .filter((a) => a.person === person)
      .map((a) => ({
        ...a,
        createdAt: new Date(a.createdAt),
        readAt: a.readAt ? new Date(a.readAt) : null,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, max)
  }

  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('person', '==', person),
    orderBy('createdAt', 'desc'),
    limit(max)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      readAt: data.readAt?.toDate?.() ?? null,
    }
  }) as LimitAlert[]
}

// Cria o marcador so se ele ainda nao existe. Devolve true se criou e false se ja existia
// (nesse caso nao escreve nada, preservando readAt).
export async function createLimitAlertIfAbsent(draft: LimitAlertDraft): Promise<boolean> {
  if (MOCK) {
    const all = mList<RawLimitAlert>(COL)
    if (all.some((a) => a.id === draft.id)) return false
    const { id, person, categoryId, threshold, cycleKey, spentCents, limitCents, silent } = draft
    all.push({
      id,
      person,
      categoryId,
      threshold,
      cycleKey,
      spentCents,
      limitCents,
      silent,
      createdAt: new Date().toISOString(),
      readAt: null,
    })
    mSave(COL, all)
    return true
  }

  return runTransaction(db, async (transaction) => {
    const ref = doc(db, COL, draft.id)
    const existing = await transaction.get(ref)
    if (existing.exists()) return false
    transaction.set(ref, {
      ownerId: ownerId(),
      person: draft.person,
      categoryId: draft.categoryId,
      threshold: draft.threshold,
      cycleKey: draft.cycleKey,
      spentCents: draft.spentCents,
      limitCents: draft.limitCents,
      silent: draft.silent,
      createdAt: Timestamp.now(),
      readAt: null,
    })
    return true
  })
}

export async function markLimitAlertRead(id: string): Promise<void> {
  if (MOCK) {
    const now = new Date().toISOString()
    mSave(
      COL,
      mList<RawLimitAlert>(COL).map((a) => (a.id === id ? { ...a, readAt: now } : a))
    )
    return
  }

  await updateDoc(doc(db, COL, id), { readAt: Timestamp.now() })
}

export async function markLimitAlertsRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => markLimitAlertRead(id)))
}
