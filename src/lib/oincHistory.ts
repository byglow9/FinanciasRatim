import type { PersonType } from '@/types'

// Historico local de uso das falas do OINC (07.1, D-05): id da fala e instante do ultimo uso, mais se a
// ultima fala teve risada. Fica so neste aparelho; nada daqui vai ao servidor. Leitura e escrita sempre em
// try e catch, e o que e lido e validado antes de valer (armazenamento adulterado nunca quebra a fala).

const PREFIX = 'oinc:usadas:v1:'
/** Acima disto as entradas mais antigas saem. */
export const USED_MAX = 400
const ID_RE = /^[a-z0-9-]{3,64}$/

export interface OincHistory {
  /** Id da fala para o instante (ms) do ultimo uso. */
  seen: Record<string, number>
  /** A ultima fala sorteada tinha a risada do personagem. */
  lastRisada: boolean
}

function keyOf(person: PersonType): string {
  return `${PREFIX}${person}`
}

/** Le o historico da pessoa. Qualquer problema (sem armazenamento, texto quebrado, formato errado) vale como vazio. */
export function readOincHistory(person: PersonType): OincHistory {
  try {
    const raw = localStorage.getItem(keyOf(person))
    if (!raw) return { seen: {}, lastRisada: false }
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { seen: {}, lastRisada: false }
    const sent = parsed as { seen?: unknown; lastRisada?: unknown }
    const seen: Record<string, number> = {}
    if (sent.seen !== null && typeof sent.seen === 'object' && !Array.isArray(sent.seen)) {
      for (const [id, at] of Object.entries(sent.seen as Record<string, unknown>)) {
        if (ID_RE.test(id) && typeof at === 'number' && Number.isFinite(at) && at > 0) seen[id] = at
      }
    }
    return { seen, lastRisada: sent.lastRisada === true }
  } catch {
    return { seen: {}, lastRisada: false }
  }
}

/** Marca o uso de uma fala e guarda se ela teve risada. Corta as mais antigas acima de USED_MAX. */
export function markOincUsed(person: PersonType, id: string, risada: boolean, nowMs: number): void {
  try {
    if (!ID_RE.test(id) || !Number.isFinite(nowMs)) return
    const current = readOincHistory(person)
    const entries = Object.entries({ ...current.seen, [id]: nowMs }).sort((a, b) => a[1] - b[1])
    const kept = Object.fromEntries(entries.slice(-USED_MAX))
    localStorage.setItem(keyOf(person), JSON.stringify({ seen: kept, lastRisada: risada }))
  } catch {
    // Sem armazenamento local: so deixa de lembrar o que ja foi dito neste aparelho.
  }
}
