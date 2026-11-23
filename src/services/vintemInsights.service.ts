import { collection, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PersonType } from '@/types'
import { MOCK, mList, mSave } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'
import { toStoredInsight } from '@shared/core/insights.js'
import type { Insight } from '@shared/core/insights.js'

// Insights guardados do Vintem (D-15, plano 04-18): so os fortes (severidade 2 ou 3), para a IA da
// Fase 7 le-los depois. O ID do documento e o id deterministico do insight, entao gravar de novo o
// mesmo insight, em recarga ou em dois aparelhos, resulta em um so documento (setDoc cria ou repete
// com o mesmo dono; as regras aceitam os dois). O documento e montado SO por toStoredInsight: ids,
// chaves de ciclo e de dia, tipo, severidade e numeros; nunca descricao de lancamento, nome de loja,
// de categoria ou de pessoa, CPF, conta, cartao nem e-mail.
// A leitura usa so igualdades (dono, pessoa, ciclo), sem orderBy nem limit: nenhum indice novo.
// A gravacao e melhor esforco: qualquer erro de rede ou de regra e engolido, sem registrar nada.

export type StoredInsight = NonNullable<ReturnType<typeof toStoredInsight>>

export type VintemInsightDoc = StoredInsight & { updatedAt: Date }

type RawVintemInsight = StoredInsight & { updatedAt: string }

const COL = 'vintemInsights'
const WRITTEN_PREFIX = 'vintem:written:v1:'
const WRITTEN_MAX = 100
const MAX_WRITES_PER_CALL = 8
const MIN_SEVERITY = 2

// Ids ja tentados nesta carga da pagina: com a regra ainda nao publicada, cada id e tentado uma vez
// por visita e nao a cada recalculo da Home.
const attempted = new Set<string>()

function writtenKey(person: PersonType, cycleKey: string): string {
  return `${WRITTEN_PREFIX}${person}:${cycleKey}`
}

function readWritten(person: PersonType, cycleKey: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(writtenKey(person, cycleKey)) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(-WRITTEN_MAX)
  } catch {
    return []
  }
}

function saveWritten(person: PersonType, cycleKey: string, ids: string[]): void {
  try {
    localStorage.setItem(writtenKey(person, cycleKey), JSON.stringify(ids.slice(-WRITTEN_MAX)))
  } catch {
    // Sem armazenamento: so deixa de lembrar o que ja foi gravado.
  }
}

function bySeverity(a: { severity: number; id: string }, b: { severity: number; id: string }): number {
  if (b.severity !== a.severity) return b.severity - a.severity
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export async function getVintemInsights(person: PersonType, cycleKey: string): Promise<VintemInsightDoc[]> {
  if (MOCK) {
    return mList<RawVintemInsight>(COL)
      .filter((d) => d.person === person && d.cycleKey === cycleKey)
      .map((d) => ({ ...d, updatedAt: new Date(d.updatedAt) }))
      .sort(bySeverity)
  }

  const q = query(
    collection(db, COL),
    ...ownerScope(),
    where('person', '==', person),
    where('cycleKey', '==', cycleKey)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => {
      const data = { ...d.data() }
      delete data.ownerId
      return { ...data, id: d.id, updatedAt: data.updatedAt?.toDate?.() ?? new Date(0) } as VintemInsightDoc
    })
    .sort(bySeverity)
}

// Melhor esforco: nunca lanca. Filtra severidade 2 ou 3, projeta por toStoredInsight (descarta o que
// fugir do formato), pula o que este aparelho ja gravou no ciclo e grava no maximo 8 por chamada.
export async function saveVintemInsights(
  person: PersonType,
  cycleKey: string,
  insights: Insight[]
): Promise<void> {
  try {
    const picked: StoredInsight[] = []
    for (const insight of insights) {
      if (!(insight.severity >= MIN_SEVERITY)) continue
      const stored = toStoredInsight(insight)
      if (stored === null || stored.person !== person || stored.cycleKey !== cycleKey) continue
      picked.push(stored)
    }
    if (picked.length === 0) return

    const written = readWritten(person, cycleKey)
    const todo = picked
      .filter((s) => !written.includes(s.id) && !attempted.has(`${person}:${cycleKey}:${s.id}`))
      .slice(0, MAX_WRITES_PER_CALL)
    if (todo.length === 0) return
    for (const s of todo) attempted.add(`${person}:${cycleKey}:${s.id}`)

    if (MOCK) {
      const ids = new Set(todo.map((s) => s.id))
      const now = new Date().toISOString()
      const rest = mList<RawVintemInsight>(COL).filter((d) => !ids.has(d.id))
      mSave(COL, [...rest, ...todo.map((s) => ({ ...s, updatedAt: now }))])
      saveWritten(person, cycleKey, [...written, ...todo.map((s) => s.id)])
      return
    }

    const results = await Promise.allSettled(
      todo.map((s) => setDoc(doc(db, COL, s.id), { ...s, ownerId: ownerId(), updatedAt: Timestamp.now() }))
    )
    const done = todo.filter((_, i) => results[i].status === 'fulfilled').map((s) => s.id)
    if (done.length > 0) saveWritten(person, cycleKey, [...written, ...done])
  } catch {
    // Melhor esforco: falha de rede, de regra ou de armazenamento nunca aparece nem muda a tela.
  }
}
