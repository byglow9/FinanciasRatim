import { Timestamp } from 'firebase-admin/firestore'
import { cardSnapshotFromAccount } from '../../shared/core/cards.js'

const CARDS = 'cards'

// Grava cards/{accountId} para uma conta CREDIT (CARD-02). O Admin SDK ignora as regras: sem
// dono explicito nada e gravado (mesma regra de FUND-04 do sync). Conta que nao e CREDIT nao
// grava nada. Nunca registra valores em log.
export async function syncCardSnapshot(db, { ownerId, person, itemId, account }) {
  if (typeof ownerId !== 'string' || !ownerId) {
    throw new Error('syncCardSnapshot exige o ownerId do dono')
  }
  const snapshot = cardSnapshotFromAccount(account, { itemId, person })
  if (!snapshot) return false
  await db
    .collection(CARDS)
    .doc(snapshot.accountId)
    .set({ ...snapshot, ownerId, syncedAt: Timestamp.now() }, { merge: true })
  return true
}
