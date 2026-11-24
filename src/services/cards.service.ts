import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ownerId, ownerScope } from '@/lib/scope'
import type { CardSettings, PersonType, Transaction } from '@/types'

/** Pagamento de fatura ligado a um cartao (preenchido pelo servidor, plano 06-08). */
export interface CardPaymentRecord {
  id: string
  billMonth: string | null
  cents: number
  atMs: number
  source: string
}

/** Cartao de credito vindo da Pluggy (cards/{accountId}); valores em centavos, null quando a Pluggy nao entrega. */
export interface Card {
  id: string
  itemId: string
  person: PersonType
  name: string
  brand: string | null
  level: string | null
  status: string | null
  creditLimitCents: number | null
  availableLimitCents: number | null
  balanceCents: number | null
  syncedAt: Date | null
  /** Total por mes de fatura (AAAA-MM para centavos), gravado pelo servidor. */
  billTotals?: Record<string, number>
  unassignedCents?: number
  pendingCount?: number
  firstPurchaseAt?: Date | null
  lastPurchaseAt?: Date | null
  historyBaselineAt?: Date | null
  payments?: CardPaymentRecord[]
}

const BILL_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const NICKNAME_MAX = 24
const PAID_MONTHS_MAX = 36
// Caracteres de controle (C0, DEL e C1): nunca entram no apelido.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/

function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null
  const v = value as { toDate?: () => Date }
  if (typeof v.toDate === 'function') return v.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function billTotalsOf(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const [month, cents] of Object.entries(value as Record<string, unknown>)) {
    if (BILL_MONTH.test(month) && typeof cents === 'number' && Number.isFinite(cents)) out[month] = cents
  }
  return out
}

function paymentsOf(value: unknown): CardPaymentRecord[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: CardPaymentRecord[] = []
  for (const p of value) {
    if (!p || typeof p !== 'object') continue
    const r = p as Record<string, unknown>
    if (typeof r.cents !== 'number' || !Number.isFinite(r.cents)) continue
    out.push({
      id: typeof r.id === 'string' ? r.id : '',
      billMonth: typeof r.billMonth === 'string' && BILL_MONTH.test(r.billMonth) ? r.billMonth : null,
      cents: r.cents,
      atMs: typeof r.atMs === 'number' && Number.isFinite(r.atMs) ? r.atMs : 0,
      source: typeof r.source === 'string' ? r.source : '',
    })
  }
  return out
}

/**
 * Cartoes do dono em tempo real. So leitura: a escrita e do servidor. Diferente das conexoes
 * bancarias, o erro chega ao chamador, para a tela separar "sem cartao" de "nao foi possivel
 * carregar". Em desenvolvimento simulado (sem Firestore) entrega a lista vazia.
 */
export function subscribeCards(
  onData: (list: Card[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }
  return onSnapshot(
    query(collection(db, 'cards'), ...ownerScope()),
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            itemId: data.itemId ?? '',
            person: data.person,
            name: data.name ?? '',
            brand: data.brand ?? null,
            level: data.level ?? null,
            status: data.status ?? null,
            creditLimitCents: data.creditLimitCents ?? null,
            availableLimitCents: data.availableLimitCents ?? null,
            balanceCents: data.balanceCents ?? null,
            syncedAt: toDateOrNull(data.syncedAt),
            billTotals: billTotalsOf(data.billTotals),
            unassignedCents: finiteOrUndefined(data.unassignedCents),
            pendingCount: finiteOrUndefined(data.pendingCount),
            firstPurchaseAt: toDateOrNull(data.firstPurchaseAt),
            lastPurchaseAt: toDateOrNull(data.lastPurchaseAt),
            historyBaselineAt: toDateOrNull(data.historyBaselineAt),
            payments: paymentsOf(data.payments),
          } as Card
        })
      )
    },
    (err) => {
      console.error('[cards] listener:', err.message)
      onError(err)
    }
  )
}

function normalizeSettings(accountId: string, data: Record<string, unknown>): CardSettings {
  const day = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31 ? v : null)
  return {
    accountId,
    closingDay: day(data.closingDay),
    dueDay: day(data.dueDay),
    nickname: typeof data.nickname === 'string' ? data.nickname : '',
    paidMonths: Array.isArray(data.paidMonths)
      ? data.paidMonths.filter((m): m is string => typeof m === 'string' && BILL_MONTH.test(m))
      : [],
  }
}

/**
 * Configuracao dos cartoes do dono em tempo real (cardSettings/{accountId}). O erro chega ao
 * chamador. Em desenvolvimento simulado (sem Firestore) entrega a lista vazia.
 */
export function subscribeCardSettings(
  onData: (list: CardSettings[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }
  return onSnapshot(
    query(collection(db, 'cardSettings'), ...ownerScope()),
    (snap) => onData(snap.docs.map((d) => normalizeSettings(d.id, d.data()))),
    (err) => {
      console.error('[cards] settings listener:', err.message)
      onError(err)
    }
  )
}

export type CardSettingsPatch = Partial<Pick<CardSettings, 'closingDay' | 'dueDay' | 'nickname' | 'paidMonths'>>

function validDay(value: unknown, label: string): number | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31) return value
  throw new Error(`${label} invalido: use um dia de 1 a 31`)
}

/**
 * Valida o que o dono digitou: dia inteiro de 1 a 31 ou null, apelido aparado de ate 24 caracteres
 * sem caracteres de controle e meses de fatura AAAA-MM (no maximo 36, sem repetir). As regras do
 * Firestore nao validam formato, entao a validacao e daqui. Devolve so os campos informados.
 */
export function validateCardSettingsPatch(patch: CardSettingsPatch): CardSettingsPatch {
  const clean: CardSettingsPatch = {}
  if (patch.closingDay !== undefined) clean.closingDay = validDay(patch.closingDay, 'Dia de fechamento')
  if (patch.dueDay !== undefined) clean.dueDay = validDay(patch.dueDay, 'Dia de vencimento')
  if (patch.nickname !== undefined) {
    if (typeof patch.nickname !== 'string') throw new Error('Apelido invalido')
    const nickname = patch.nickname.trim()
    if (nickname.length > NICKNAME_MAX) throw new Error(`Apelido com mais de ${NICKNAME_MAX} caracteres`)
    if (CONTROL_CHARS.test(nickname)) throw new Error('Apelido com caracteres invalidos')
    clean.nickname = nickname
  }
  if (patch.paidMonths !== undefined) {
    if (!Array.isArray(patch.paidMonths)) throw new Error('Meses pagos invalidos')
    const months = [...new Set(patch.paidMonths)]
    if (months.length > PAID_MONTHS_MAX) throw new Error(`Mais de ${PAID_MONTHS_MAX} meses pagos`)
    for (const m of months) {
      if (typeof m !== 'string' || !BILL_MONTH.test(m)) throw new Error('Mes de fatura invalido: use AAAA-MM')
    }
    clean.paidMonths = months.sort()
  }
  return clean
}

/**
 * Grava a configuracao do cartao (cardSettings/{accountId}) com mescla: so os campos informados
 * mudam. O dono vem do escopo, nunca de parametro. Sem Firestore (desenvolvimento simulado) recusa.
 */
export async function saveCardSettings(accountId: string, patch: CardSettingsPatch): Promise<void> {
  if (typeof accountId !== 'string' || accountId.length === 0 || accountId.includes('/')) {
    throw new Error('Cartao invalido')
  }
  const clean = validateCardSettingsPatch(patch)
  if (!db) throw new Error('Sem Firestore: configuracao do cartao indisponivel neste ambiente')
  await setDoc(
    doc(db, 'cardSettings', accountId),
    { ...clean, accountId, ownerId: ownerId(), updatedAt: serverTimestamp() },
    { merge: true }
  )
}

/**
 * Compras do cartao desde `from`, mais recentes primeiro (indice ownerId, cardId, date DESC).
 * Sem Firestore (desenvolvimento simulado) devolve vazio.
 */
export async function getCardTransactions(cardId: string, from: Date): Promise<Transaction[]> {
  if (!db) return []
  const snapshot = await getDocs(
    query(
      collection(db, 'transactions'),
      ...ownerScope(),
      where('cardId', '==', cardId),
      where('date', '>=', Timestamp.fromDate(from)),
      orderBy('date', 'desc')
    )
  )
  return snapshot.docs.map((d) => {
    const data = d.data()
    const date = toDateOrNull(data.date) ?? new Date(0)
    return { id: d.id, ...data, date, createdAt: toDateOrNull(data.createdAt) ?? date } as Transaction
  })
}
