import { buildBudgetView } from '../../../shared/core/budget.js'
import { categoryDisplayName } from '../../../shared/core/categories.js'
import { cycleOf } from '../../../shared/core/cycle.js'
import { formatReais } from '../../../shared/core/format.js'
import { composePush } from '../../../shared/core/oincPush.js'
import { dueEvent, dueStages } from '../../../shared/core/pushDue.js'
import {
  collapseHeld,
  eventDayKey,
  limitEvents,
  spontaneousEvent,
} from '../../../shared/core/pushEvents.js'
import { deliveryDecision, inWindow, isQuiet } from '../../../shared/core/pushPrefs.js'
import { zonedParts } from '../../../shared/core/time.js'
import { buildPushPayload, hashSeed } from '../../../shared/core/vintemPhrasesPush.js'
import { readPushConfig } from './config.js'
import { joinBillCards } from './repo.js'

export { readMaxPerDay } from './config.js'

const PEOPLE = ['ele', 'ela']

/** Avisos fixos: saem por estagio (2 e 1 dia antes e no dia) e perdem a validade (D-21, D-24, D-25). */
const DUE_KINDS = ['conta', 'fatura', 'compromisso']

const GENDER = Object.freeze({ ele: 'm', ela: 'f' })

const isPair = (hid, person) => typeof hid === 'string' && hid !== '' && PEOPLE.includes(person)

const DAY_MINUTES = 24 * 60

const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/**
 * Ja passou do horario do dia deste espontaneo? O minuto alvo dentro da janela vem do id do evento
 * (muda por pessoa e por dia). O alvo deixa um intervalo do relogio livre no fim da janela, para
 * sempre haver uma rodada depois dele.
 * @param {string} id
 * @param {Date} at
 * @param {{ from: string, to: string }} window
 * @param {number} tickMinutes
 */
function pastSpontaneousTarget(id, at, window, tickMinutes) {
  const from = minutesOf(window.from)
  const length = (minutesOf(window.to) - from + DAY_MINUTES) % DAY_MINUTES
  const { hour, minute } = zonedParts(at)
  const elapsed = (hour * 60 + minute - from + DAY_MINUTES) % DAY_MINUTES
  return elapsed >= hashSeed(id) % Math.max(1, length - tickMinutes)
}

/** Situacao do banco de frases de push de um marcador de limite ou espontaneo. */
function situationOf(marker) {
  if (marker.kind === 'limite') return marker.threshold === 100 ? 'push-limite-100' : 'push-limite-80'
  return 'push-espontanea'
}

/**
 * Texto de um aviso fixo, montado com o estagio relido: valor, nome da conta e titulo do compromisso
 * so existem aqui e no corpo enviado (D-27, D-31). O nome do cartao nao entra.
 * @param {{ stage: import('../../../shared/core/pushDue.js').DueStage, person: string, tone: string, id: string }} args
 */
function dueText({ stage, person, tone, id }) {
  const { kind, daysLeft, nome, amountCents, hora } = stage
  /** @type {Record<string, unknown>} */
  const slots = {}
  if (amountCents !== null && amountCents > 0) slots.valor = formatReais(amountCents)
  if (kind === 'conta') slots.conta = nome
  if (kind === 'compromisso') {
    slots.titulo = nome
    slots.hora = hora
  }
  return composePush({ scene: `push-${kind}-d${daysLeft}`, tone, slots, gender: GENDER[person] ?? null, seed: id })
}

/** Log so com o codigo do erro: nunca valor, texto, loja nem nome (Pitfall 12). */
function logError(where, err) {
  console.error(`[push] ${where}:`, String(err?.code ?? 'erro'))
}

/**
 * Notificador (PUSH-02, PUSH-03, PUSH-04): limites, avisos fixos (conta, fatura e compromisso) e o
 * push espontaneo. Cada funcao e idempotente por pessoa: calcula os eventos pela mesma conta do
 * cliente e reivindica um marcador por evento com create() do Firestore. Quem perde a corrida nao
 * envia (D-07). O marcador guarda so referencias (ids, categoria, limiar, estagio e chaves de ciclo,
 * de vencimento e de dia), nunca o texto, o valor, o nome ou o titulo: o texto e montado na hora do
 * envio, com os dados relidos. O servidor so le contas e pagamentos.
 *
 * Status do marcador: enviando, enviado, pendente (retido pelo silencio, D-21), expirado (retido que
 * perdeu a validade), desligado, silencioso, teto, colapsado, sem-aparelho e falhou.
 *
 * `loadDue` le contas, pagamentos e compromissos (server/src/ai/snapshot.js). Sem ele, so as faturas
 * sao avisadas.
 * @param {{
 *   repo: ReturnType<typeof import('./repo.js').createRepo>,
 *   sender: { sendToFids(fids: string[], payload: object): Promise<{ sent: number, dead: number, failed: number }> },
 *   now?: () => Date,
 *   config?: { maxPerDay?: number, dueHour?: number, spontPerDay?: number, spontWindow?: { from: string, to: string }, tickMinutes?: number },
 *   loadDue?: (args: { hid: string, person: string }) => Promise<{ bills: unknown[], payments: unknown[], events: unknown[] }>,
 * }} deps
 */
export function createNotifier({ repo, sender, now = () => new Date(), config = {}, loadDue }) {
  const defaults = readPushConfig()
  const maxPerDay = Number.isInteger(config.maxPerDay) && config.maxPerDay >= 1 ? config.maxPerDay : defaults.maxPerDay
  const dueHour =
    Number.isInteger(config.dueHour) && config.dueHour >= 0 && config.dueHour <= 23 ? config.dueHour : defaults.dueHour
  const spontPerDay = config.spontPerDay ?? defaults.spontPerDay
  const spontWindow = config.spontWindow ?? defaults.spontWindow
  const tickMinutes = config.tickMinutes ?? defaults.tickMinutes

  /**
   * Teto diario (T-07-41). Aleatorias e fixas nao disputam o mesmo espaco (D-23): a aleatoria conta
   * so as aleatorias; limites e avisos fixos contam o total do dia menos elas.
   */
  async function overDailyCap(hid, person, kind, at) {
    const day = eventDayKey(at)
    if (kind === 'espontanea') return (await repo.countSent(hid, person, day, 'espontanea')) >= maxPerDay
    const [all, random] = await Promise.all([
      repo.countSent(hid, person, day),
      repo.countSent(hid, person, day, 'espontanea'),
    ])
    return all - random >= maxPerDay
  }

  /**
   * Estagios que valem agora para a pessoa, com os dados relidos. `complete` falso significa que
   * contas e compromissos nao puderam ser lidos: so a fatura (cartoes) foi conferida.
   */
  async function readStages(hid, person, at) {
    let due = null
    if (loadDue) {
      try {
        due = await loadDue({ hid, person })
      } catch (err) {
        logError('contas e compromissos', err)
      }
    }
    const cards = await repo.readCards(hid, person)
    const cardSettings = cards.length > 0 ? await repo.readCardSettings(hid) : []
    const stages = dueStages({
      now: at,
      person,
      bills: due?.bills,
      payments: due?.payments,
      events: due?.events,
      cards: joinBillCards(cards, cardSettings),
    })
    return { stages, complete: due !== null }
  }

  /**
   * Envia o aviso de um marcador ja reivindicado (status enviando) e fecha o marcador com o
   * resultado. O texto e montado agora, no tom das configuracoes.
   * Falha transitoria (nenhum enviado e nenhum FID morto): no envio imediato o marcador e apagado
   * para o proximo check tentar de novo; no retido ele volta a pendente. FID morto nao apaga o
   * marcador (o sender ja apaga o registro).
   */
  async function dispatch({ hid, person, id, marker, tone, stage, excludeFid, held = false, at = now() }) {
    // Teto diario por pessoa: passou do teto, o marcador vira `teto` e nada sai.
    if (await overDailyCap(hid, person, marker.kind, at)) {
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

    const payload = stage
      ? dueText({ stage, person, tone, id })
      : buildPushPayload({ situation: situationOf(marker), tone, categoryName: marker.categoryLabel, seed: id })
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
   * Reivindica o marcador ja com o status da decisao e envia quando for o caso. Desligado nao
   * entrega depois; retido espera o silencio acabar (D-21). Sem texto no marcador.
   */
  async function claimAndDeliver({ hid, person, id, marker, decision, tone, stage, excludeFid, at }) {
    if (decision === 'desligado' || decision === 'reter') {
      const status = decision === 'desligado' ? 'desligado' : 'pendente'
      return { claimed: await repo.claimEvent(id, { ...marker, status }), sent: 0 }
    }
    if (decision !== 'enviar' || !(await repo.claimEvent(id, { ...marker, status: 'enviando' }))) {
      return { claimed: false, sent: 0 }
    }
    const out = await dispatch({ hid, person, id, marker, tone, stage, excludeFid, at })
    return { claimed: true, sent: out.sent }
  }

  /**
   * Avalia os limites da pessoa e envia o que for novo. `excludeFid` e o aparelho em uso, que ja
   * mostra o aviso dentro da tela.
   * @param {{ hid: string, person: string, excludeFid?: string }} args
   */
  async function evaluateLimits({ hid, person, excludeFid }) {
    const summary = { events: 0, claimed: 0, sent: 0 }
    if (!isPair(hid, person)) return summary

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

      const out = await claimAndDeliver({ hid, person, id: event.id, marker, decision, tone: settings.tone, excludeFid, at })
      if (out.claimed) summary.claimed++
      summary.sent += out.sent
    }
    return summary
  }

  /**
   * Avisos fixos da pessoa e do casal (D-21, D-24, D-25): conta, fatura e compromisso 2 e 1 dia antes,
   * conta e fatura tambem no dia se nao pagas. Um marcador por coisa, vencimento e estagio, e um aviso
   * por marcador (sem agrupar). Nada sai antes de `dueHour` de Sao Paulo, e antes disso nada e lido.
   * Sem excluir o aparelho em uso: estes avisos nao aparecem dentro da tela. Nunca le lancamentos.
   * @param {{ hid: string, person: string }} args
   */
  async function evaluateDue({ hid, person }) {
    const summary = { events: 0, claimed: 0, sent: 0 }
    if (!isPair(hid, person)) return summary

    const at = now()
    if (zonedParts(at).hour < dueHour) return summary
    const { stages } = await readStages(hid, person, at)
    summary.events = stages.length
    if (stages.length === 0) return summary

    const [settings, prefs] = await Promise.all([repo.readSettings(hid, person), repo.readPrefs(hid, person)])
    const dayKey = eventDayKey(at)
    for (const stage of stages) {
      const event = dueEvent({ hid, person, stage })
      // So referencias: o texto e montado na hora do envio.
      const marker = {
        ownerId: hid,
        person,
        kind: event.kind,
        refId: event.refId,
        dueKey: event.dueKey,
        daysLeft: event.daysLeft,
        tag: event.tag,
        url: event.url,
        dayKey,
        createdAt: at,
      }
      const decision = deliveryDecision({ prefs, kind: event.kind, faturaEnabled: settings.faturaEnabled, now: at })
      const out = await claimAndDeliver({ hid, person, id: event.id, marker, decision, tone: settings.tone, stage, at })
      if (out.claimed) summary.claimed++
      summary.sent += out.sent
    }
    return summary
  }

  /**
   * Cutucada espontanea (D-12 c, D-21): no maximo uma por pessoa por dia de Sao Paulo, dentro da
   * janela do servidor, fora do silencio e so para quem tem aparelho. No silencio ou com o tipo
   * desligado apenas pula, sem marcador. Frase do banco de push: sem IA e sem dado financeiro.
   * As checagens sem leitura vem primeiro, porque o relogio chama isto a cada rodada.
   * @param {{ hid: string, person: string }} args
   */
  async function evaluateSpontaneous({ hid, person }) {
    const summary = { events: 0, claimed: 0, sent: 0 }
    if (!isPair(hid, person) || spontPerDay !== 1) return summary

    const at = now()
    if (!inWindow(at, spontWindow)) return summary
    const event = spontaneousEvent({ hid, person, now: at })
    if (!pastSpontaneousTarget(event.id, at, spontWindow, tickMinutes)) return summary

    const prefs = await repo.readPrefs(hid, person)
    if (deliveryDecision({ prefs, kind: 'espontanea', now: at }) !== 'enviar') return summary
    if ((await repo.listFids(hid, person)).length === 0) return summary

    summary.events = 1
    const settings = await repo.readSettings(hid, person)
    const marker = {
      ownerId: hid,
      person,
      kind: 'espontanea',
      tag: event.tag,
      url: event.url,
      dayKey: eventDayKey(at),
      createdAt: at,
    }
    const out = await claimAndDeliver({ hid, person, id: event.id, marker, decision: 'enviar', tone: settings.tone, at })
    if (out.claimed) summary.claimed++
    summary.sent += out.sent
    return summary
  }

  /**
   * Dos retidos que podem sair, tira os avisos fixos que perderam a validade (pago, dia passado ou
   * item apagado): viram expirado. Sem conseguir ler os dados, o aviso continua pendente.
   * @returns {Promise<{ live: Array<Record<string, any>>, stages: Map<string, any> }>}
   */
  async function stillValid(hid, person, markers, at, summary) {
    const stages = new Map()
    if (!markers.some((m) => DUE_KINDS.includes(m.kind))) return { live: markers, stages }

    let read = null
    try {
      read = await readStages(hid, person, at)
    } catch (err) {
      // Os de limite seguem mesmo assim.
      logError('vencimentos retidos', err)
    }
    for (const stage of read?.stages ?? []) stages.set(dueEvent({ hid, person, stage }).id, stage)

    const live = []
    for (const marker of markers) {
      if (!DUE_KINDS.includes(marker.kind) || stages.has(marker.id)) {
        live.push(marker)
      } else if (read && (read.complete || marker.kind === 'fatura')) {
        if (await repo.transitionEvent(marker.id, 'pendente', { status: 'expirado' })) summary.expired++
      }
    }
    return { live, stages }
  }

  /**
   * Entrega os avisos retidos pelo silencio que ja podem sair (D-21). Agrupa por casal e pessoa; a
   * pessoa que ainda esta no silencio fica como esta. Fora dele confere se o tipo continua ligado e,
   * nos avisos fixos, se o estagio ainda existe (senao vira expirado),
   * colapsa 80 e 100 da mesma categoria no mais alto e envia com o texto montado agora, no tom
   * atual. A transicao pendente para enviando e por transacao: so um executor ganha.
   * @param {{ now?: Date }} [args]
   */
  async function deliverHeld({ now: at = now() } = {}) {
    const summary = { groups: 0, sent: 0, collapsed: 0, off: 0, expired: 0 }
    const pending = await repo.listPending()

    /** @type {Map<string, { hid: string, person: string, items: Array<Record<string, any>> }>} */
    const groups = new Map()
    for (const marker of pending) {
      const hid = marker.ownerId
      if (!isPair(hid, marker.person)) continue
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

        const { live, stages } = await stillValid(hid, person, enabled, at, summary)
        const { keep, drop } = collapseHeld(live)
        for (const marker of drop) {
          if (await repo.transitionEvent(marker.id, 'pendente', { status: 'colapsado' })) summary.collapsed++
        }
        for (const marker of keep) {
          const won = await repo.transitionEvent(marker.id, 'pendente', { status: 'enviando', dayKey: eventDayKey(at) })
          if (!won) continue
          const stage = stages.get(marker.id)
          const out = await dispatch({ hid, person, id: marker.id, marker, tone: settings.tone, stage, held: true, at })
          summary.sent += out.sent
        }
      } catch (err) {
        // Um par que falha nao impede os outros.
        logError('entrega dos retidos', err)
      }
    }
    return summary
  }

  return { evaluateLimits, evaluateDue, evaluateSpontaneous, deliverHeld }
}
