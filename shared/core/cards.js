// @ts-check
// Cartao de credito vindo da Pluggy (CARD-02, CENT-03): snapshot da conta CREDIT e visao do
// limite. Tudo em centavos inteiros, sem relogio e sem pacote. Valor que a Pluggy nao entrega
// vira null, nunca um zero inventado (D-06). Privacidade: so campos nomeados entram no snapshot
// (lista fechada); numero do cartao, titular, documento e cartoes adicionais nunca sao copiados.

import { toCents } from './ledger.js'
import { limitState } from './limits.js'

/**
 * Documento cards/{accountId} (sem os campos de dono e de gravacao, que sao do servidor).
 * @typedef {{
 *   accountId: string,
 *   itemId: string,
 *   person: string,
 *   name: string,
 *   brand: string | null,
 *   level: string | null,
 *   status: string | null,
 *   isLimitFlexible: boolean | null,
 *   creditLimitCents: number | null,
 *   availableLimitCents: number | null,
 *   balanceCents: number | null,
 * }} CardSnapshot
 */

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function centsOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? toCents(v) : null
}

/**
 * @param {unknown} v
 * @returns {string | null}
 */
function textOrNull(v) {
  return typeof v === 'string' && v ? v : null
}

/**
 * Snapshot de uma conta CREDIT. Conta de outro tipo devolve null. O `balance` da conta CREDIT
 * e a fatura atual do cartao (D-08).
 * @param {any} account conta como a Pluggy entrega
 * @param {{ itemId: string, person: string }} ctx
 * @returns {CardSnapshot | null}
 */
export function cardSnapshotFromAccount(account, { itemId, person }) {
  if (!account || account.type !== 'CREDIT') return null
  const credit = account.creditData && typeof account.creditData === 'object' ? account.creditData : {}
  return {
    accountId: account.id,
    itemId,
    person,
    name: textOrNull(account.marketingName) ?? textOrNull(account.name) ?? '',
    brand: textOrNull(credit.brand),
    level: textOrNull(credit.level),
    status: textOrNull(credit.status),
    isLimitFlexible: typeof credit.isLimitFlexible === 'boolean' ? credit.isLimitFlexible : null,
    creditLimitCents: centsOrNull(credit.creditLimit),
    availableLimitCents: centsOrNull(credit.availableCreditLimit),
    balanceCents: centsOrNull(account.balance),
  }
}

/**
 * Visao do limite: usado = limite menos disponivel, porcentagem usada inteira arredondada ao
 * mais proximo (pode passar de 100) e estado pelos mesmos cortes de 80 e 100 dos limites.
 * Dado faltando vira null no campo correspondente.
 * @param {{ creditLimitCents?: number | null, availableLimitCents?: number | null, balanceCents?: number | null } | null | undefined} snapshot
 * @returns {{
 *   limitCents: number | null,
 *   availableCents: number | null,
 *   usedCents: number | null,
 *   usedPct: number | null,
 *   state: 'ok' | 'warn' | 'over' | null,
 *   billCents: number | null,
 * }}
 */
export function cardLimitView(snapshot) {
  const limit = snapshot?.creditLimitCents
  const available = snapshot?.availableLimitCents
  const bill = snapshot?.balanceCents
  const limitCents = typeof limit === 'number' && Number.isInteger(limit) ? limit : null
  const availableCents = typeof available === 'number' && Number.isInteger(available) ? available : null
  const billCents = typeof bill === 'number' && Number.isInteger(bill) ? bill : null

  /** @type {number | null} */
  let usedCents = null
  /** @type {number | null} */
  let usedPct = null
  /** @type {'ok' | 'warn' | 'over' | null} */
  let state = null
  if (limitCents !== null && limitCents > 0 && availableCents !== null) {
    usedCents = Math.max(limitCents - availableCents, 0)
    usedPct = Math.round((usedCents * 100) / limitCents)
    state = limitState(usedCents, limitCents)?.state ?? null
  }
  return { limitCents, availableCents, usedCents, usedPct, state, billCents }
}
