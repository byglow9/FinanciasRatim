import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ownerScope } from '@/lib/scope'
import type { PersonType } from '@/types'

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
            syncedAt: data.syncedAt?.toDate?.() ?? null,
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
