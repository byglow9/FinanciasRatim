import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  documentId,
  deleteDoc,
  Timestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GoalContribution } from '@/types'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'
import { addAmount } from '@shared/core/goals.js'

type RawContribution = Omit<GoalContribution, 'date' | 'createdAt'> & {
  date: string
  createdAt: string
}

const COL = 'goalContributions'
const GOALS_COL = 'goals'

// Aportes da janela exata do ciclo. start e end vem do nucleo (cycle.start e cycle.end): nada de
// date-fns aqui. Consulta so por ownerId e data.
export async function getContributionsInRange(start: Date, end: Date): Promise<GoalContribution[]> {
  if (MOCK) {
    return mList<RawContribution>(COL)
      .filter((c) => {
        const d = new Date(c.date)
        return d >= start && d <= end
      })
      .map((c) => ({
        ...c,
        date: new Date(c.date),
        createdAt: new Date(c.createdAt),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as GoalContribution[]
}

export async function getContributions(goalId: string): Promise<GoalContribution[]> {
  if (MOCK) {
    return mList<RawContribution>(COL)
      .filter((c) => c.goalId === goalId)
      .map((c) => ({
        ...c,
        date: new Date(c.date),
        createdAt: new Date(c.createdAt),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('goalId', '==', goalId),
    orderBy('date', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as GoalContribution[]
}

/** ID de aporte gerado no cliente, sem rede (WR-12): a mesma tentativa reaproveita o mesmo ID. */
export function newContributionId(): string {
  return MOCK ? mId() : doc(collection(db, COL)).id
}

// As regras negam a leitura direta de documento que ainda nao existe (ownsExisting), entao a pergunta
// "esse aporte ja foi gravado?" vai por consulta com o escopo do dono, nao por getDoc.
async function contributionExists(id: string): Promise<boolean> {
  const snapshot = await getDocs(query(collection(db, COL), ...ownerScope(), where(documentId(), '==', id)))
  return !snapshot.empty
}

/**
 * Grava o aporte e soma na meta. Com `id` (gerado uma vez por abertura do formulario), repetir a chamada
 * depois de uma falha de rede ambigua nao duplica o aporte nem soma duas vezes na meta (WR-12).
 */
export async function addContribution(
  goalId: string,
  amount: number,
  currentGoalAmount: number,
  description?: string,
  id?: string
): Promise<string> {
  const now = new Date()

  if (MOCK) {
    const contributions = mList<RawContribution>(COL)
    if (id && contributions.some((c) => c.id === id)) return id
    id = id ?? mId()
    contributions.push({
      id,
      goalId,
      amount,
      description,
      date: now.toISOString(),
      createdAt: now.toISOString(),
    })
    mSave(COL, contributions)

    // Atualizar currentAmount da meta
    const goals = mList<{ id: string; currentAmount: number }>(GOALS_COL)
    const goalIdx = goals.findIndex((g) => g.id === goalId)
    if (goalIdx !== -1) {
      goals[goalIdx].currentAmount = addAmount(currentGoalAmount, amount)
      mSave(GOALS_COL, goals)
    }

    return id
  }

  const contributionId = id ?? newContributionId()
  // Tentativa anterior com o mesmo ID que chegou ao servidor: nada a fazer.
  if (id && (await contributionExists(contributionId))) return contributionId

  // Usar transacao para garantir consistencia
  await runTransaction(db, async (transaction) => {
    const goalRef = doc(db, GOALS_COL, goalId)
    const goalDoc = await transaction.get(goalRef)

    if (!goalDoc.exists()) {
      throw new Error('Meta nao encontrada')
    }

    const currentAmount = goalDoc.data().currentAmount || 0
    const newAmount = addAmount(currentAmount, amount)

    // Atualizar meta
    transaction.update(goalRef, { currentAmount: newAmount })

    // Criar contribuicao
    const contributionRef = doc(db, COL, contributionId)
    transaction.set(contributionRef, {
      ownerId: ownerId(),
      goalId,
      amount,
      description: description || null,
      date: Timestamp.fromDate(now),
      createdAt: Timestamp.now(),
    })
  })

  return contributionId
}

export async function deleteContributionsByGoalId(goalId: string): Promise<void> {
  if (MOCK) {
    const filtered = mList<RawContribution>(COL).filter((c) => c.goalId !== goalId)
    mSave(COL, filtered)
    return
  }

  const q = query(collection(db, COL), ...ownerScope(), where('goalId', '==', goalId))
  const snapshot = await getDocs(q)

  const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref))
  await Promise.all(deletePromises)
}
