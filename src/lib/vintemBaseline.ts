import type { CategoryDef, PersonType, Transaction } from '@/types'
import { getTransactionsInRange } from '@/services/transactions.service'
import { isInCycle, shiftCycle } from '@shared/core/cycle.js'
import type { Cycle } from '@shared/core/cycle.js'
import { INSIGHT_RULES, buildBaseline } from '@shared/core/insights.js'
import type { Baseline } from '@shared/core/insights.js'

// Linha de base dos ciclos anteriores para o detector de insights do Vintem (plano 04-14).
// Uma unica consulta de intervalo por ciclo e aparelho; depois o resultado vem do localStorage.
// O cache guarda so o que buildBaseline devolve: ids de categoria e numeros. Nenhum texto de
// lancamento, nome de estabelecimento ou de pessoa entra no valor nem na chave.

const CACHE_PREFIX = 'vintem:baseline:v1:'

/** Chave do cache: so pessoa (ele ou ela), chave do ciclo e dia do salario. */
export function baselineKey(person: PersonType, cycle: Cycle): string {
  return `${CACHE_PREFIX}${person}:${cycle.key}:${cycle.salaryDay}`
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isEntry(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const e = value as Record<string, unknown>
  if (!isNumber(e.cycles) || !isNumber(e.samples) || !isNumber(e.ticketAvgCents)) return false
  const lists = e.cumulative
  if (!Array.isArray(lists)) return false
  return lists.every((list) => Array.isArray(list) && list.every(isNumber))
}

/** Valida versao e formato: qualquer divergencia vale como ausente. */
function parseBaseline(text: string | null): Baseline | null {
  if (text === null) return null
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const obj = parsed as Record<string, unknown>
    if (obj.v !== 1) return null
    const map = obj.byCategory
    if (map === null || typeof map !== 'object' || Array.isArray(map)) return null
    for (const entry of Object.values(map as Record<string, unknown>)) {
      if (!isEntry(entry)) return null
    }
    return { v: 1, byCategory: map as Baseline['byCategory'] }
  } catch {
    return null
  }
}

/** Le a linha de base guardada; sem cache, com versao antiga ou adulterado devolve nulo. */
export function readCachedBaseline(person: PersonType, cycle: Cycle): Baseline | null {
  try {
    return parseBaseline(localStorage.getItem(baselineKey(person, cycle)))
  } catch {
    return null
  }
}

/** Guarda a linha de base; sem armazenamento so deixa de guardar. */
export function writeCachedBaseline(person: PersonType, cycle: Cycle, baseline: Baseline): void {
  try {
    localStorage.setItem(baselineKey(person, cycle), JSON.stringify(baseline))
  } catch {
    // Sem armazenamento (cota cheia ou bloqueado): a proxima visita consulta de novo.
  }
}

/** Consultas em andamento por chave, para a mesma linha de base nunca ser pedida duas vezes ao mesmo tempo. */
const inFlight = new Map<string, Promise<Baseline>>()

/**
 * Linha de base dos ciclos anteriores. Le o cache; se faltar, faz UMA chamada a getTransactionsInRange
 * cobrindo do inicio do mais antigo dos ciclos anteriores ao fim do ciclo anterior, reparte por ciclo,
 * monta com buildBaseline do nucleo, grava o cache e devolve.
 */
export function loadBaseline(
  person: PersonType,
  cycle: Cycle,
  categoryDefs: CategoryDef[] = [],
): Promise<Baseline> {
  const cached = readCachedBaseline(person, cycle)
  if (cached !== null) return Promise.resolve(cached)

  const key = baselineKey(person, cycle)
  const running = inFlight.get(key)
  if (running) return running

  const pastCycles: Cycle[] = Array.from({ length: INSIGHT_RULES.BASELINE_CYCLES }, (_, i) => shiftCycle(cycle, -(i + 1)))
  const oldest = pastCycles[pastCycles.length - 1]
  const previous = pastCycles[0]

  const task = getTransactionsInRange(person, oldest.start, previous.end)
    .then((all: Transaction[]) => {
      const baseline = buildBaseline({
        pastCycles: pastCycles.map((c) => ({ cycle: c, transactions: all.filter((t) => isInCycle(t.date, c)) })),
        categoryDefs,
      })
      writeCachedBaseline(person, cycle, baseline)
      return baseline
    })
    .finally(() => {
      inFlight.delete(key)
    })
  inFlight.set(key, task)
  return task
}
