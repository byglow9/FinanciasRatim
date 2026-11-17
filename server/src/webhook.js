import { createHash, timingSafeEqual } from 'node:crypto'

// Pecas puras do webhook da Pluggy (REV-06). Nada aqui toca rede, banco ou log.

// Eventos que disparam a sincronizacao do item (D-06). Qualquer outro evento valido
// recebe 200 e e ignorado.
export const HANDLED_EVENTS = new Set([
  'item/updated',
  'transactions/created',
  'transactions/updated',
  'transactions/deleted',
])

// Formato aceito de itemId (a Pluggy usa UUID). Barra, espaco e curtos demais ficam de fora.
export const ITEM_ID_RE = /^[A-Za-z0-9-]{8,64}$/

const digest = (value) => createHash('sha256').update(value).digest()

// Compara o segredo recebido com um ou mais segredos esperados (a lista serve a janela de
// rotacao). Comparacao em tempo constante sobre digests sha256, e todas as entradas da lista
// sao avaliadas para nao vazar qual delas bateu.
export function secretMatches(given, expected) {
  if (typeof given !== 'string' || !given) return false
  const list = (Array.isArray(expected) ? expected : [expected]).filter(
    (s) => typeof s === 'string' && s
  )
  if (list.length === 0) return false
  const givenDigest = digest(given)
  let matched = false
  for (const secret of list) {
    if (timingSafeEqual(givenDigest, digest(secret))) matched = true
  }
  return matched
}

// Valida o corpo do evento. O corpo so e tratado como sinal: nada dele define o dono.
export function validateWebhookBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false }
  const { event, eventId, itemId } = body
  if (typeof event !== 'string') return { ok: false }
  if (typeof eventId !== 'string' || !eventId || eventId.length > 200) return { ok: false }
  if (typeof itemId !== 'string' || !ITEM_ID_RE.test(itemId)) return { ok: false }
  return { ok: true, event, eventId, itemId }
}

// Memoria curta dos eventId ja vistos (reenvios da Pluggy). Somente em memoria: a idempotencia
// de dado ja existe nos ids deterministicos de bankImports e transactions (D-06).
export function createSeenEvents(limit = 500) {
  const ids = new Set()
  return {
    seen(eventId) {
      if (ids.has(eventId)) return true
      ids.add(eventId)
      if (ids.size > limit) ids.delete(ids.values().next().value)
      return false
    },
  }
}
