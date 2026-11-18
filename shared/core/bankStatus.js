// @ts-check
// Frescor dos dados do banco e estado do consentimento (REV-07, D-08).
// Funcao pura: o "agora" e injetado, sem relogio implicito e sem pacotes, para dar
// o mesmo resultado em qualquer fuso do host. A Fase 3 (LIM-08) reutiliza esta
// funcao para nao elogiar nem dar bronca com numero velho.

const HOUR_MS = 3600 * 1000
const DAY_MS = 24 * HOUR_MS

// Estados do item em que o banco pede uma acao do usuario: so reconectando resolve.
const RECONNECT_STATUSES = ['LOGIN_ERROR', 'WAITING_USER_INPUT', 'WAITING_USER_ACTION']

/**
 * @typedef {Object} BankConnectionInput
 * @property {string} [status] status do item na Pluggy (UPDATED, OUTDATED, LOGIN_ERROR...)
 * @property {string | null} [executionStatus] resultado da ultima execucao (SUCCESS, PARTIAL_SUCCESS...)
 * @property {Date | null} [bankUpdatedAt] quando o banco atualizou (data da Pluggy)
 * @property {Date | null} [lastSyncAt] quando o nosso servidor rodou (so reserva)
 * @property {Date | null} [consentExpiresAt] fim do consentimento, se conhecido
 */

/**
 * @typedef {Object} BankFreshness
 * @property {Date | null} updatedAt
 * @property {'bank' | 'sync' | 'none'} updatedSource
 * @property {number | null} ageHours
 * @property {boolean} stale
 * @property {'none' | 'ok' | 'expiring' | 'expired'} consent
 * @property {number | null} daysToExpire
 * @property {boolean} needsReconnect
 * @property {'ok' | 'warn' | 'error'} level
 */

/**
 * Descreve o frescor e o consentimento de uma conexao bancaria.
 * @param {BankConnectionInput} conn
 * @param {Date} now instante atual, injetado
 * @param {{ staleHours?: number, expiringDays?: number }} [opts]
 * @returns {BankFreshness}
 */
export function describeBankFreshness(conn, now, opts = {}) {
  const { staleHours = 48, expiringDays = 30 } = opts
  const status = conn?.status ?? ''
  const executionStatus = conn?.executionStatus ?? null
  const nowMs = now.getTime()

  // A data do banco manda; lastSyncAt (quando o servidor rodou) so e reserva, porque
  // um item em erro de login sincroniza "com sucesso" sem trazer nada novo.
  /** @type {Date | null} */
  let updatedAt = null
  /** @type {'bank' | 'sync' | 'none'} */
  let updatedSource = 'none'
  if (conn?.bankUpdatedAt) {
    updatedAt = conn.bankUpdatedAt
    updatedSource = 'bank'
  } else if (conn?.lastSyncAt) {
    updatedAt = conn.lastSyncAt
    updatedSource = 'sync'
  }

  const ageHours = updatedAt ? (nowMs - updatedAt.getTime()) / HOUR_MS : null
  // Sem data alguma nao da para garantir frescor.
  const stale = ageHours === null ? true : ageHours > staleHours

  /** @type {'none' | 'ok' | 'expiring' | 'expired'} */
  let consent = 'none'
  /** @type {number | null} */
  let daysToExpire = null
  if (conn?.consentExpiresAt) {
    const remainingMs = conn.consentExpiresAt.getTime() - nowMs
    if (remainingMs <= 0) {
      consent = 'expired'
      daysToExpire = 0
    } else {
      daysToExpire = Math.ceil(remainingMs / DAY_MS)
      consent = daysToExpire <= expiringDays ? 'expiring' : 'ok'
    }
  }

  const needsReconnect = consent === 'expired' || RECONNECT_STATUSES.includes(status)

  /** @type {'ok' | 'warn' | 'error'} */
  let level = 'ok'
  if (needsReconnect) {
    level = 'error'
  } else if (
    stale ||
    consent === 'expiring' ||
    status === 'OUTDATED' ||
    executionStatus === 'PARTIAL_SUCCESS'
  ) {
    level = 'warn'
  }

  return { updatedAt, updatedSource, ageHours, stale, consent, daysToExpire, needsReconnect, level }
}

/**
 * Suprime elogio e bronca (veredito) quando qualquer conexao tem dado velho,
 * consentimento vencido ou precisa reconectar (LIM-08). Consentimento so perto
 * de vencer nao suprime. Lista vazia (usuario so manual) nao suprime.
 * @param {Array<Pick<BankFreshness, 'stale' | 'consent' | 'needsReconnect'>>} freshnessList resultados de describeBankFreshness
 * @returns {boolean}
 */
export function shouldSuppressVerdict(freshnessList) {
  return freshnessList.some((f) => f.stale || f.consent === 'expired' || f.needsReconnect)
}
