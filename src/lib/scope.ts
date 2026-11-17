import { where, type QueryConstraint } from 'firebase/firestore'
import type { PersonType } from '@/types'

// Escopo de dono do cliente (D-06): unico ponto que fornece ownerId ao resto do app.
// Estado de modulo, sem React: o AuthContext chama setScope antes de setUser, para que
// qualquer efeito que dependa do usuario ja encontre o escopo definido.

export interface Scope {
  hid: string
  person: PersonType
}

// Release A do cutover: leituras sem filtro de dono ate o backfill (build:release-a).
// As escritas sempre gravam ownerId; so as leituras sao afetadas por este flag.
export const SCOPED_READS = import.meta.env.VITE_OWNER_SCOPED_READS !== 'false'

let current: Scope | null = null

export function setScope(scope: Scope | null): void {
  current = scope
}

export function getScope(): Scope | null {
  return current
}

export function ownerId(): string {
  if (!current) {
    throw new Error('Sem escopo de dono (login necessario)')
  }
  return current.hid
}

export function ownerScope(): QueryConstraint[] {
  return SCOPED_READS ? [where('ownerId', '==', ownerId())] : []
}
