import { PCT_CAP } from '../../../shared/core/aiSummary.js'
import { buildBudgetView } from '../../../shared/core/budget.js'
import { categoryDisplayName } from '../../../shared/core/categories.js'
import { cycleOf, shiftCycle } from '../../../shared/core/cycle.js'
import { formatReais } from '../../../shared/core/format.js'
import { buildFacts, storeOf } from '../../../shared/core/oincFacts.js'
import { composePush } from '../../../shared/core/oincPush.js'
import { dueEvent, dueStages } from '../../../shared/core/pushDue.js'
import {
  collapseHeld,
  eventDayKey,
  limitEvents,
  spontaneousEvent,
  spontaneousSlot,
} from '../../../shared/core/pushEvents.js'
import { deliveryDecision, isQuiet } from '../../../shared/core/pushPrefs.js'
import { zonedParts } from '../../../shared/core/time.js'
import { readPushConfig } from './config.js'
import { joinBillCards } from './repo.js'

export { readMaxPerDay } from './config.js'

const PEOPLE = ['ele', 'ela']

/** Avisos fixos: saem por estagio (2 e 1 dia antes e no dia) e perdem a validade (D-21, D-24, D-25). */
const DUE_KINDS = ['conta', 'fatura', 'compromisso']

const GENDER = Object.freeze({ ele: 'm', ela: 'f' })

const isPair = (hid, person) => typeof hid === 'string' && hid !== '' && PEOPLE.includes(person)

/** Chave de compra ja narrada nos recentes do push (o resto sao ids de fala). */
const TX_KEY = 'tx:'

/** Linhas de limite do ciclo, pela mesma conta do cliente. */
function limitRows({ settings, cycle, transactions, at }) {
  return buildBudgetView({
    now: at,
    cycle,
    config: settings.personConfig,
    transactions,
    bills: [],
    payments: [],
    categoryDefs: settings.categoryDefs,
    suppressVerdict: false,
  }).spend.rows
}

/** A linha ainda esta no limiar do aviso? Mesma regra de thresholdsToFire. */
function stillReached(row, threshold) {
  return threshold === 100 ? row.spentCents > row.limitCents : row.spentCents * 100 >= row.limitCents * 80
}

/**
 * Texto de um aviso de limite (D-22, D-27): categoria, total gasto e, quando a compra mais recente da
 * categoria foi numa marca conhecida do banco, a marca (D-32). A descricao so decide a marca. Sem a
 * linha, ou com ela de volta abaixo do limiar (retido), nenhum numero entra. composePush filtra o nome
 * da categoria (D-28) e usa o banco de hoje em suave e direto (D-35).
 * @param {{ marker: Record<string, any>, row?: import('../../../shared/core/budget.js').BudgetRow,
 *   person: string, tone: string, id: string }} args
 */
function limitText({ marker, row, person, tone, id }) {
  /** @type {Record<string, unknown>} */
  const slots = { categoria: marker.categoryLabel }
  if (row && stillReached(row, marker.threshold)) {
    slots.valor = formatReais(row.spentCents)
    slots.restante = formatReais(row.remainingCents)
    slots.pct = `${Math.min(row.pct, PCT_CAP)}%`
    slots.loja = storeOf(row.txs[0])
  }
  const scene = marker.threshold === 100 ? 'push-limite-100' : 'push-limite-80'
  return composePush({ scene, tone, slots, gender: GENDER[person] ?? null, seed: id })
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

/**
 * Assunto parado ha mais tempo primeiro: o nunca usado, na ordem dada, e depois o usado ha mais
 * tempo. A cena de cada fala usada sai do id dela.
 * @template {{ scene: string }} T
 * @param {T[]} topics
 * @param {string[]} used ids de fala, do mais antigo ao mais novo
 * @returns {T}
 */
function restedTopic(topics, used) {
  const lastUse = (/** @type {T} */ t) => used.findLastIndex((id) => id.startsWith(`${t.scene}-`))
  return [...topics].sort((a, b) => lastUse(a) - lastUse(b))[0]
}

/**
 * Texto do aviso aleatorio com assunto (D-20, D-26), so no sem filtro: uma compra de hoje ou de ontem
 * ainda nao narrada; sem ela, ritmo, meta ou do nada. Os fatos saem com a superficie do push, a
 * descricao do lancamento nunca vai ao texto, a loja e so marca conhecida (D-32) e composePush filtra
 * categoria e meta (D-28). Compra que a fala nao conseguiria datar como de ontem fica de fora.
 * @param {{ input: Record<string, any>, args: Record<string, any>, narrated: string[] }} data
 * @returns {{ payload: { title: string, body: string, phraseId: string }, txId: string | null }}
 */
function topicText({ input, args, narrated }) {
  const facts = buildFacts(/** @type {any} */ (input), { surface: 'push', narrated })
  const txs = new Map([...(input.transactions ?? []), ...(input.prevTransactions ?? [])].map((t) => [t.id, t]))

  // Os fatos ja vem com os de hoje antes dos de ontem.
  for (const fact of facts) {
    if (!fact.key.startsWith('tx:') || (fact.quando !== 'hoje' && fact.quando !== 'ontem')) continue
    const tx = fact.txId === null ? null : txs.get(fact.txId)
    if (tx?.type !== 'saida') continue
    const slots = {
      quando: fact.quando,
      valor: fact.slots.valor,
      loja: storeOf(tx),
      categoria: categoryDisplayName(tx, input.categoryDefs),
    }
    const payload = composePush({ ...args, scene: 'push-compra', slots })
    if (fact.quando === 'ontem' && !/ontem/i.test(payload.body)) continue
    return { payload, txId: fact.txId }
  }

  const month = facts.find((f) => f.cena === 'do-nada')?.slots
  const goal = facts.find((f) => f.cena === 'meta-status')?.slots
  const topics = [
    ...(month?.restante ? [{ scene: 'push-ritmo', slots: { restante: month.restante, dias: month.dias } }] : []),
    ...(goal ? [{ scene: 'push-meta', slots: { meta: goal.meta, restante: goal.restante } }] : []),
    { scene: 'push-nada', slots: {} },
  ]
  const topic = restedTopic(topics, args.recent)
  return { payload: composePush({ ...args, ...topic }), txId: null }
}

/** Log so com o codigo do erro: nunca valor, texto, loja nem nome (Pitfall 12). */
function logError(where, err) {
  console.error(`[push] ${where}:`, String(err?.code ?? 'erro'))
}

/**
 * Notificador (PUSH-02, PUSH-03, PUSH-04): limites, avisos fixos (conta, fatura e compromisso) e os
 * avisos aleatorios. Cada funcao e idempotente por pessoa: calcula os eventos pela mesma conta do
 * cliente e reivindica um marcador por evento com create() do Firestore. Quem perde a corrida nao
 * envia (D-07). O marcador guarda so referencias (ids, categoria, limiar, estagio, vaga e chaves de
 * ciclo, de vencimento e de dia), nunca o texto, o valor, a loja, o nome ou o titulo: o texto e
 * montado na hora do envio, com os dados relidos. O servidor so le os dados do casal; a unica escrita
 * fora dos marcadores sao os recentes do aviso aleatorio. O push nao chama a IA.
 *
 * Status do marcador: enviando, enviado, pendente (retido pelo silencio, D-21), expirado (retido que
 * perdeu a validade), desligado, silencioso, teto, colapsado, sem-aparelho e falhou.
 *
 * `loadDue` le contas, pagamentos e compromissos (server/src/ai/snapshot.js). Sem ele, so as faturas
 * sao avisadas. `loadSnapshot` e o `load` do mesmo leitor, para o assunto dos avisos aleatorios; sem
 * ele sai a fala do nada. `oincState` guarda o que ja saiu (server/src/ai/state.js).
 * @param {{
 *   repo: ReturnType<typeof import('./repo.js').createRepo>,
 *   sender: { sendToFids(fids: string[], payload: object): Promise<{ sent: number, dead: number, failed: number }> },
 *   now?: () => Date,
 *   config?: { maxPerDay?: number, dueHour?: number, spontPerDay?: number, spontWindow?: { from: string, to: string }, tickMinutes?: number },
 *   loadDue?: (args: { hid: string, person: string }) => Promise<{ bills: unknown[], payments: unknown[], events: unknown[] }>,
 *   loadSnapshot?: (args: { hid: string, person: string }) => Promise<{ input: Record<string, any> }>,
 *   oincState?: {
 *     read(args: { hid: string, person: string }): Promise<{ pushRecent: string[], rejected: string[] }>,
 *     addPushRecent(args: { hid: string, person: string, keys: string[] }): Promise<{ ok: boolean }>,
 *   },
 * }} deps
 */
export function createNotifier({ repo, sender, now = () => new Date(), config = {}, loadDue, loadSnapshot, oincState }) {
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
   * Linhas de limite relidas para os retidos, para o texto sair com os valores do momento da entrega.
   * Cada aviso usa o ciclo em que nasceu (o atual ou o anterior); fora disso sai sem numero. Sem
   * conseguir ler os lancamentos, os de limite ficam pendentes e o resto segue.
   * @returns {Promise<{ live: Array<Record<string, any>>, rows: Map<string, any> }>}
   */
  async function readHeldRows(hid, person, markers, settings, at) {
    const rows = new Map()
    const limits = markers.filter((m) => m.kind === 'limite')
    if (limits.length === 0) return { live: markers, rows }
    try {
      const current = cycleOf(at, settings.personConfig?.salaryDay)
      for (const cycle of [current, shiftCycle(current, -1)]) {
        const own = limits.filter((m) => m.cycleKey === cycle.key)
        if (own.length === 0) continue
        const transactions = await repo.readCycleTransactions(hid, person, cycle)
        const list = limitRows({ settings, cycle, transactions, at })
        for (const marker of own) rows.set(marker.id, list.find((r) => r.categoryId === marker.categoryId))
      }
    } catch (err) {
      logError('limites retidos', err)
      return { live: markers.filter((m) => m.kind !== 'limite'), rows }
    }
    return { live: markers, rows }
  }

  /**
   * Envia o aviso de um marcador ja reivindicado (status enviando) e fecha o marcador com o
   * resultado. O texto e montado agora, no tom das configuracoes; o do aviso aleatorio ja vem pronto
   * em `ready`, porque o marcador leva o id da fala (e ele nunca fica retido).
   * Falha transitoria (nenhum enviado e nenhum FID morto): no envio imediato o marcador e apagado
   * para o proximo check tentar de novo; no retido ele volta a pendente. FID morto nao apaga o
   * marcador (o sender ja apaga o registro).
   */
  async function dispatch({ hid, person, id, marker, tone, stage, row, ready, excludeFid, held = false, at = now() }) {
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

    const payload = ready ?? (stage ? dueText({ stage, person, tone, id }) : limitText({ marker, row, person, tone, id }))
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
  async function claimAndDeliver({ hid, person, id, marker, decision, tone, stage, row, ready, excludeFid, at }) {
    if (decision === 'desligado' || decision === 'reter') {
      const status = decision === 'desligado' ? 'desligado' : 'pendente'
      return { claimed: await repo.claimEvent(id, { ...marker, status }), sent: 0 }
    }
    if (decision !== 'enviar' || !(await repo.claimEvent(id, { ...marker, status: 'enviando' }))) {
      return { claimed: false, sent: 0 }
    }
    const out = await dispatch({ hid, person, id, marker, tone, stage, row, ready, excludeFid, at })
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
    const rows = limitRows({ settings, cycle, transactions, at })
    const events = limitEvents({
      hid,
      person,
      cycleKey: cycle.key,
      rows,
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

      const row = rows.find((r) => r.categoryId === event.categoryId)
      const out = await claimAndDeliver({ hid, person, id: event.id, marker, decision, tone: settings.tone, row, excludeFid, at })
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
   * Texto do aviso aleatorio. Em suave e direto e o banco de aviso de hoje, sem ler dado nenhum
   * (D-35); no sem filtro os dados do mes sao carregados para achar o assunto. Os recentes da pessoa
   * evitam repetir fala e compra.
   */
  async function spontaneousText({ hid, person, tone, id }) {
    const state = oincState ? await oincState.read({ hid, person }) : null
    const recent = state?.pushRecent ?? []
    const args = {
      tone,
      gender: GENDER[person] ?? null,
      seed: id,
      recent: recent.filter((k) => !k.startsWith(TX_KEY)),
      rejected: state?.rejected ?? [],
    }
    if (tone === 'suave' || tone === 'direto' || !loadSnapshot) {
      return { payload: composePush({ ...args, scene: 'push-nada' }), txId: null }
    }
    const { input } = await loadSnapshot({ hid, person })
    const narrated = recent.filter((k) => k.startsWith(TX_KEY)).map((k) => k.slice(TX_KEY.length))
    return topicText({ input, args, narrated })
  }

  /**
   * Avisos aleatorios (D-20, D-23): um por faixa da janela do servidor, em horario sorteado, fora do
   * silencio e so para quem tem aparelho. No silencio ou com o tipo desligado apenas pula, sem
   * marcador, e a vaga que passou nao volta. Como o relogio chama isto a cada rodada, as checagens vao
   * da mais barata a mais cara: vaga (sem leitura), preferencias, aparelhos e marcador da vaga; os
   * dados completos so sao lidos com a vaga livre.
   * @param {{ hid: string, person: string }} args
   */
  async function evaluateSpontaneous({ hid, person }) {
    const summary = { events: 0, claimed: 0, sent: 0 }
    if (!isPair(hid, person)) return summary

    const at = now()
    const vacancy = spontaneousSlot({ now: at, window: spontWindow, total: spontPerDay, tickMinutes, hid, person })
    if (!vacancy?.due) return summary

    const prefs = await repo.readPrefs(hid, person)
    if (deliveryDecision({ prefs, kind: 'espontanea', now: at }) !== 'enviar') return summary
    if ((await repo.listFids(hid, person)).length === 0) return summary
    const event = spontaneousEvent({ hid, person, now: at, slot: vacancy.slot })
    if (await repo.eventExists(event.id)) return summary

    summary.events = 1
    const { tone } = await repo.readSettings(hid, person)
    const { payload, txId } = await spontaneousText({ hid, person, tone, id: event.id })
    // So ids: a vaga, a fala e a compra narrada.
    const marker = {
      ownerId: hid,
      person,
      kind: 'espontanea',
      slot: vacancy.slot,
      phraseId: payload.phraseId,
      ...(txId ? { txId } : {}),
      tag: event.tag,
      url: event.url,
      dayKey: eventDayKey(at),
      createdAt: at,
    }
    const out = await claimAndDeliver({ hid, person, id: event.id, marker, decision: 'enviar', tone, ready: payload, at })
    if (out.claimed) summary.claimed++
    summary.sent += out.sent
    // So o que chegou a um aparelho conta como dito: a falha transitoria tenta de novo na mesma faixa.
    if (out.sent > 0 && oincState) {
      await oincState.addPushRecent({ hid, person, keys: [payload.phraseId, ...(txId ? [`${TX_KEY}${txId}`] : [])] })
    }
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
   * atual e, nos de limite, com os lancamentos relidos. A transicao pendente para enviando e por
   * transacao: so um executor ganha.
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
        // Leitura antes da transicao: uma falha aqui nao deixa marcador preso em enviando.
        const ready = await readHeldRows(hid, person, keep, settings, at)
        for (const marker of ready.live) {
          const won = await repo.transitionEvent(marker.id, 'pendente', { status: 'enviando', dayKey: eventDayKey(at) })
          if (!won) continue
          const stage = stages.get(marker.id)
          const row = ready.rows.get(marker.id)
          const out = await dispatch({ hid, person, id: marker.id, marker, tone: settings.tone, stage, row, held: true, at })
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
