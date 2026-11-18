// @ts-check
// Alertas de limite (LIM-07): 80% e 100% por categoria, um por limiar e por
// ciclo. A idempotencia vem do ID do documento (deterministico), nao de contador
// em memoria: dois aparelhos que avaliam ao mesmo tempo geram o mesmo ID.
// Um rascunho so carrega ids, centavos e chaves de ciclo, nunca nome de
// categoria nem descricao de lancamento. Sem relogio, sem pacote, sem float nas
// fronteiras (80% e `gasto * 100 >= limite * 80`).

/** Limiares de aviso, do menor para o maior (PR-13: sem interruptor). */
export const THRESHOLDS = /** @type {const} */ ([80, 100])

/**
 * Rascunho de alerta. O alerta guardado acrescenta `createdAt` e `readAt`.
 * @typedef {{
 *   id: string,
 *   person: string,
 *   cycleKey: string,
 *   categoryId: string,
 *   threshold: 80 | 100,
 *   silent: boolean,
 *   spentCents: number,
 *   limitCents: number,
 * }} AlertDraft
 */

/**
 * Alerta guardado (rascunho mais controle de leitura).
 * @typedef {AlertDraft & { createdAt: Date, readAt: Date | null }} StoredAlert
 */

/**
 * Linha de limite de uma categoria no ciclo.
 * @typedef {{ categoryId: string, spentCents: number, limitCents: number | null }} LimitRow
 */

/**
 * ID deterministico e sem barra (serve de ID de documento).
 * @param {string} person
 * @param {string} cycleKey
 * @param {string} categoryId
 * @param {number} threshold
 * @returns {string}
 */
export function alertId(person, cycleKey, categoryId, threshold) {
  return `${person}__${cycleKey}__${categoryId}__${threshold}`
}

/**
 * @param {unknown} n
 * @returns {n is number}
 */
function isPositiveInt(n) {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

/**
 * Limiares atingidos e ainda sem marcador. So o mais alto de cada categoria e
 * visivel; os menores saem silenciosos (o gasto pode saltar de 50% para 130%).
 * @param {LimitRow[]} rows
 * @param {Set<string> | string[]} existingIds
 * @param {{ person: string, cycleKey: string }} ctx
 * @returns {AlertDraft[]}
 */
export function thresholdsToFire(rows, existingIds, ctx) {
  const taken = existingIds instanceof Set ? existingIds : new Set(existingIds)
  /** @type {AlertDraft[]} */
  const out = []
  for (const row of rows) {
    const limit = row?.limitCents
    const spent = row?.spentCents
    if (!isPositiveInt(limit)) continue
    if (typeof spent !== 'number' || !Number.isFinite(spent)) continue
    /** @type {Array<80 | 100>} */
    const reached = []
    if (spent * 100 >= limit * 80) reached.push(80)
    if (spent > limit) reached.push(100)
    const top = reached[reached.length - 1]
    for (const threshold of reached) {
      const id = alertId(ctx.person, ctx.cycleKey, row.categoryId, threshold)
      if (taken.has(id)) continue
      out.push({
        id,
        person: ctx.person,
        cycleKey: ctx.cycleKey,
        categoryId: row.categoryId,
        threshold,
        silent: threshold !== top,
        spentCents: spent,
        limitCents: limit,
      })
    }
  }
  return out
}

/**
 * Regrava como silenciosos os marcadores do ciclo antigo na chave do ciclo
 * novo (troca do dia do salario, PR-08), para o aviso ja enviado nao repetir.
 * @param {Array<Pick<AlertDraft, 'person' | 'cycleKey' | 'categoryId' | 'threshold' | 'spentCents' | 'limitCents'>>} existing
 * @param {{ person: string, fromKey: string, toKey: string }} opts
 * @returns {AlertDraft[]}
 */
export function rekeyAlerts(existing, opts) {
  const { person, fromKey, toKey } = opts
  if (fromKey === toKey) return []
  /** @type {Set<string>} */
  const seen = new Set()
  /** @type {AlertDraft[]} */
  const out = []
  for (const a of existing) {
    if (a.person !== person || a.cycleKey !== fromKey) continue
    const id = alertId(person, toKey, a.categoryId, a.threshold)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      person,
      cycleKey: toKey,
      categoryId: a.categoryId,
      threshold: a.threshold,
      silent: true,
      spentCents: a.spentCents,
      limitCents: a.limitCents,
    })
  }
  return out
}

/**
 * Alertas visiveis (sem os silenciosos), do mais recente para o mais antigo.
 * @param {StoredAlert[]} alerts
 * @returns {StoredAlert[]}
 */
export function visibleAlerts(alerts) {
  return alerts
    .filter((a) => !a.silent)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Quantidade de alertas visiveis ainda nao lidos.
 * @param {StoredAlert[]} alerts
 * @returns {number}
 */
export function unreadCount(alerts) {
  return alerts.filter((a) => !a.silent && a.readAt == null).length
}

/**
 * Aviso da Home: visivel e nao lido, 100 antes de 80 e, no mesmo limiar, o mais
 * recente. Sem candidato devolve null.
 * @param {StoredAlert[]} alerts
 * @returns {StoredAlert | null}
 */
export function topAlert(alerts) {
  const unread = visibleAlerts(alerts).filter((a) => a.readAt == null)
  if (unread.length === 0) return null
  return unread.reduce((best, a) => (a.threshold > best.threshold ? a : best))
}
