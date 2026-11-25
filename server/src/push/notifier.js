import { buildBudgetView } from '../../../shared/core/budget.js'
import { categoryDisplayName } from '../../../shared/core/categories.js'
import { cycleOf } from '../../../shared/core/cycle.js'
import { eventDayKey, limitEvents } from '../../../shared/core/pushEvents.js'
import { deliveryDecision } from '../../../shared/core/pushPrefs.js'
import { buildPushPayload } from '../../../shared/core/vintemPhrasesPush.js'

const PEOPLE = ['ele', 'ela']
const DEFAULT_MAX_PER_DAY = 8

/**
 * Teto diario de avisos por pessoa (PUSH_MAX_PER_DAY). Valor ausente ou invalido vale o padrao.
 * @param {Record<string, string | undefined>} [env]
 * @returns {number}
 */
export function readMaxPerDay(env = {}) {
  const n = Number(env.PUSH_MAX_PER_DAY)
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : DEFAULT_MAX_PER_DAY
}

/** Situacao do banco de frases de push de um marcador de limite. */
function limitSituation(threshold) {
  return threshold === 100 ? 'push-limite-100' : 'push-limite-80'
}

/**
 * Notificador de limites (PUSH-02, PUSH-04). Uma so funcao idempotente por pessoa: calcula os
 * eventos pela mesma conta do cliente e reivindica um marcador por evento com create() do
 * Firestore. Quem perde a corrida nao envia (D-07). O marcador guarda so ids, categoria, limiar e
 * chaves de ciclo e de dia, nunca o texto do aviso: o texto e montado na hora do envio (D-05).
 * @param {{
 *   repo: ReturnType<typeof import('./repo.js').createRepo>,
 *   sender: { sendToFids(fids: string[], payload: object): Promise<{ sent: number, dead: number, failed: number }> },
 *   now?: () => Date,
 *   config?: { maxPerDay?: number },
 * }} deps
 */
export function createNotifier({ repo, sender, now = () => new Date(), config = {} }) {
  const maxPerDay = Number.isInteger(config.maxPerDay) && config.maxPerDay >= 1 ? config.maxPerDay : DEFAULT_MAX_PER_DAY

  /**
   * Envia o aviso de um marcador ja reivindicado e fecha o marcador com o resultado.
   * Texto montado agora, no tom das configuracoes.
   */
  async function dispatch({ hid, person, id, marker, tone, excludeFid }) {
    const payload = buildPushPayload({
      situation: limitSituation(marker.threshold),
      tone,
      categoryName: marker.categoryLabel,
      seed: id,
    })
    const all = await repo.listFids(hid, person)
    const fids = all.filter((f) => f !== excludeFid)
    if (fids.length === 0) {
      await repo.updateEvent(id, { status: 'sem-aparelho' })
      return { sent: 0 }
    }
    let result
    try {
      result = await sender.sendToFids(fids, {
        title: payload.title,
        body: payload.body,
        tag: marker.tag,
        url: marker.url,
      })
    } catch {
      result = { sent: 0, dead: 0, failed: fids.length }
    }
    if (result.sent > 0) {
      await repo.updateEvent(id, { status: 'enviado', enviados: result.sent, sentAt: now() })
      return { sent: result.sent }
    }
    await repo.updateEvent(id, { status: 'sem-aparelho' })
    return { sent: 0 }
  }

  /**
   * Avalia os limites da pessoa e envia o que for novo. `excludeFid` e o aparelho em uso, que ja
   * mostra o aviso dentro da tela.
   * @param {{ hid: string, person: string, excludeFid?: string }} args
   */
  async function evaluateLimits({ hid, person, excludeFid }) {
    const summary = { events: 0, claimed: 0, sent: 0 }
    if (typeof hid !== 'string' || !hid || !PEOPLE.includes(person)) return summary

    const at = now()
    const settings = await repo.readSettings(hid, person)
    const cycle = cycleOf(at, settings.personConfig.salaryDay)
    const [transactions, silentIds, eventIds] = await Promise.all([
      repo.readCycleTransactions(hid, person, cycle),
      repo.readSilentAlertIds(hid, person, cycle.key),
      repo.listEventIds(hid, person, cycle.key),
    ])

    // Mesma conta do cliente: so as linhas de limite interessam.
    const view = buildBudgetView({
      now: at,
      cycle,
      config: settings.personConfig,
      transactions,
      bills: [],
      payments: [],
      categoryDefs: settings.categoryDefs,
      suppressVerdict: false,
    })
    const events = limitEvents({
      hid,
      person,
      cycleKey: cycle.key,
      rows: view.spend.rows,
      knownAlertIds: new Set([...silentIds, ...eventIds]),
    })
    summary.events = events.length
    if (events.length === 0) return summary

    const dayKey = eventDayKey(at)
    let prefs = null
    for (const event of events) {
      const marker = {
        ownerId: hid,
        person,
        kind: 'limite',
        threshold: event.threshold,
        categoryId: event.categoryId,
        categoryLabel: categoryDisplayName({ categoryId: event.categoryId }, settings.categoryDefs),
        cycleKey: event.cycleKey,
        tag: event.tag,
        url: event.url,
        dayKey,
        status: 'silencioso',
        createdAt: at,
      }

      if (event.silent) {
        if (await repo.claimEvent(event.id, marker)) summary.claimed++
        continue
      }

      prefs ??= await repo.readPrefs(hid, person)
      const decision = deliveryDecision({
        prefs,
        kind: 'limite',
        threshold: event.threshold,
        faturaEnabled: settings.faturaEnabled,
        now: at,
      })
      // Tracer: so o caminho de envio imediato; as demais decisoes entram na tarefa seguinte.
      if (decision !== 'enviar') continue

      if (!(await repo.claimEvent(event.id, { ...marker, status: 'enviando' }))) continue
      summary.claimed++
      const out = await dispatch({ hid, person, id: event.id, marker, tone: settings.tone, excludeFid })
      summary.sent += out.sent
    }
    return summary
  }

  return { evaluateLimits, maxPerDay }
}
