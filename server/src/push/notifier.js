import { buildBudgetView } from '../../../shared/core/budget.js'
import { categoryDisplayName } from '../../../shared/core/categories.js'
import { cycleOf } from '../../../shared/core/cycle.js'
import { collapseHeld, eventDayKey, limitEvents } from '../../../shared/core/pushEvents.js'
import { deliveryDecision, isQuiet } from '../../../shared/core/pushPrefs.js'
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

/** Situacao do banco de frases de push de um marcador. */
function situationOf(marker) {
  if (marker.kind === 'limite') return marker.threshold === 100 ? 'push-limite-100' : 'push-limite-80'
  if (marker.kind === 'fatura') return 'push-fatura'
  return 'push-espontanea'
}

/** Log so com o codigo do erro: nunca valor, texto, loja nem nome (Pitfall 12). */
function logError(where, err) {
  console.error(`[push] ${where}:`, String(err?.code ?? 'erro'))
}

/**
 * Notificador de limites (PUSH-02, PUSH-03, PUSH-04). Uma so funcao idempotente por pessoa: calcula
 * os eventos pela mesma conta do cliente e reivindica um marcador por evento com create() do
 * Firestore. Quem perde a corrida nao envia (D-07). O marcador guarda so ids, categoria, limiar e
 * chaves de ciclo e de dia, nunca o texto do aviso: o texto e montado na hora do envio (D-05).
 *
 * Status do marcador: enviando, enviado, pendente (retido pelo silencio, D-21), desligado,
 * silencioso, teto, colapsado, sem-aparelho e falhou.
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
   * Envia o aviso de um marcador ja reivindicado (status enviando) e fecha o marcador com o
   * resultado. O texto e montado agora, no tom das configuracoes.
   * Falha transitoria (nenhum enviado e nenhum FID morto): no envio imediato o marcador e apagado
   * para o proximo check tentar de novo; no retido ele volta a pendente. FID morto nao apaga o
   * marcador (o sender ja apaga o registro).
   */
  async function dispatch({ hid, person, id, marker, tone, excludeFid, held = false, at = now() }) {

    // Teto diario por pessoa (T-07-41): passou do teto, o marcador vira `teto` e nada sai.
    if ((await repo.countSent(hid, person, eventDayKey(at))) >= maxPerDay) {
      await repo.updateEvent(id, { status: 'teto' })
      return { sent: 0, status: 'teto' }
    }

    const all = await repo.listFids(hid, person)
    const fids = all.filter((f) => f !== excludeFid)
    if (fids.length === 0) {
      // Sem aparelho, ou so o aparelho em uso (que ja mostra o aviso dentro da tela).
      await repo.updateEvent(id, { status: 'sem-aparelho', ...(all.length > 0 ? { motivo: 'aparelho-em-uso' } : {}) })
      return { sent: 0, status: 'sem-aparelho' }
    }

    const payload = buildPushPayload({
      situation: situationOf(marker),
      tone,
      categoryName: marker.categoryLabel,
      seed: id,
    })
    let result
    try {
      result = await sender.sendToFids(fids, {
        title: payload.title,
        body: payload.body,
        tag: marker.tag,
        url: marker.url,
      })
    } catch (err) {
      logError('envio', err)
      result = { sent: 0, dead: 0, failed: fids.length }
    }

    if (result.sent > 0) {
      await repo.updateEvent(id, { status: 'enviado', enviados: result.sent, sentAt: at })
      return { sent: result.sent, status: 'enviado' }
    }
    if (result.dead > 0) {
      await repo.updateEvent(id, { status: result.failed > 0 ? 'falhou' : 'sem-aparelho' })
      return { sent: 0, status: 'sem-aparelho' }
    }
    // Erro transitorio: o evento nao pode sumir (T-07-42).
    if (held) await repo.updateEvent(id, { status: 'pendente' })
    else await repo.deleteEvent(id)
    return { sent: 0, status: 'transitorio' }
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

      // Limiar menor que ficou para tras: marcador silencioso, sem envio.
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

      if (decision === 'desligado' || decision === 'reter') {
        // Desligado nao entrega depois; retido espera o silencio acabar (D-21). Sem texto no marcador.
        const status = decision === 'desligado' ? 'desligado' : 'pendente'
        if (await repo.claimEvent(event.id, { ...marker, status })) summary.claimed++
        continue
      }
      if (decision !== 'enviar') continue

      if (!(await repo.claimEvent(event.id, { ...marker, status: 'enviando' }))) continue
      summary.claimed++
      const out = await dispatch({ hid, person, id: event.id, marker, tone: settings.tone, excludeFid, at })
      summary.sent += out.sent
    }
    return summary
  }

  /**
   * Entrega os avisos retidos pelo silencio que ja podem sair (D-21). Agrupa por casal e pessoa; a
   * pessoa que ainda esta no silencio fica como esta. Fora dele confere se o tipo continua ligado,
   * colapsa 80 e 100 da mesma categoria no mais alto e envia com o texto montado agora, no tom
   * atual. A transicao pendente para enviando e por transacao: so um executor ganha.
   * @param {{ now?: Date }} [args]
   */
  async function deliverHeld({ now: at = now() } = {}) {
    const summary = { groups: 0, sent: 0, collapsed: 0, off: 0 }
    const pending = await repo.listPending()

    /** @type {Map<string, { hid: string, person: string, items: Array<Record<string, any>> }>} */
    const groups = new Map()
    for (const marker of pending) {
      const hid = marker.ownerId
      if (typeof hid !== 'string' || !hid || !PEOPLE.includes(marker.person)) continue
      const key = `${hid}\u0000${marker.person}`
      const group = groups.get(key) ?? { hid, person: marker.person, items: [] }
      group.items.push(marker)
      groups.set(key, group)
    }

    for (const { hid, person, items } of groups.values()) {
      try {
        const prefs = await repo.readPrefs(hid, person)
        if (isQuiet(prefs, at)) continue
        summary.groups++
        const settings = await repo.readSettings(hid, person)

        const enabled = []
        for (const marker of items) {
          const decision = deliveryDecision({
            prefs,
            kind: marker.kind,
            threshold: marker.threshold,
            faturaEnabled: settings.faturaEnabled,
            now: at,
          })
          if (decision === 'desligado') {
            if (await repo.transitionEvent(marker.id, 'pendente', { status: 'desligado' })) summary.off++
          } else if (decision === 'enviar') {
            enabled.push(marker)
          }
        }

        const { keep, drop } = collapseHeld(enabled)
        for (const marker of drop) {
          if (await repo.transitionEvent(marker.id, 'pendente', { status: 'colapsado' })) summary.collapsed++
        }
        for (const marker of keep) {
          const won = await repo.transitionEvent(marker.id, 'pendente', { status: 'enviando', dayKey: eventDayKey(at) })
          if (!won) continue
          const out = await dispatch({ hid, person, id: marker.id, marker, tone: settings.tone, held: true, at })
          summary.sent += out.sent
        }
      } catch (err) {
        // Um par que falha nao impede os outros.
        logError('entrega dos retidos', err)
      }
    }
    return summary
  }

  return { evaluateLimits, deliverHeld }
}
