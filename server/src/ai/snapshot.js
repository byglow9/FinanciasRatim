import { Timestamp } from 'firebase-admin/firestore'
import { DEFAULT_CATEGORY_DEFS, buildCategoryDefs } from '../../../shared/core/categories.js'
import { cycleMonths, cycleOf, shiftCycle } from '../../../shared/core/cycle.js'
import { normalizePersonConfig } from '../../../shared/core/limits.js'
import { openBillMonth } from '../../../shared/core/cardBills.js'
import { toCents } from '../../../shared/core/ledger.js'
import { TONES } from '../../../shared/core/aiPrompt.js'

const SETTINGS = 'settings'
const TRANSACTIONS = 'transactions'
const FIXED_EXPENSES = 'fixedExpenses'
const FIXED_PAYMENTS = 'fixedExpensePayments'
const GOALS = 'goals'
const SAVINGS = 'savings'
const CARDS = 'cards'
const CARD_SETTINGS = 'cardSettings'
const INSIGHTS = 'vintemInsights'
const EVENTS = 'events'
const NOTES = 'notes'
/** Quantos dias depois do fim do ciclo ainda entram na agenda, e quantas anotacoes sao lidas. */
const AGENDA_AHEAD_DAYS = 31
const NOTES_MAX = 20

/** Tom padrao e nomes padrao das abas (o mesmo do app) quando o documento falta ou e de outro casal. */
export const DEFAULT_TONE = 'sem-filtro'
const DEFAULT_TAB_NAMES = Object.freeze({ area1: 'Nirigue', area2: 'Nirigua' })

/** Ciclo atual fica em memoria por 10 minutos; o anterior por 12 horas (cota de leitura, T-07-53). */
export const CURRENT_TTL_MS = 10 * 60 * 1000
export const PREVIOUS_TTL_MS = 12 * 60 * 60 * 1000
/** Menor intervalo entre duas leituras frescas da mesma chave. */
export const FRESH_MIN_MS = 15 * 1000
/** Carga acima disto vira aviso no log (so a contagem, nunca o conteudo). */
export const BIG_SNAPSHOT_READS = 800
/** Maximo de insights fortes levados ao resumo. */
const INSIGHTS_MAX = 8
/** Uma fonte que falhou e relida logo, em vez de ficar vazia pelo TTL inteiro. */
const RETRY_AFTER_FAILURE_MS = FRESH_MIN_MS

/**
 * Nome de aba valido: texto curto nao vazio.
 * @param {unknown} v
 * @param {string} fallback
 * @returns {string}
 */
function tabName(v, fallback) {
  return typeof v === 'string' && v.trim() !== '' && v.length <= 40 ? v.trim() : fallback
}

/**
 * Data do documento (Timestamp, Date ou ausente) como Date valida, ou null.
 * @param {unknown} v
 * @returns {Date | null}
 */
function toDate(v) {
  const d = typeof (/** @type {any} */ (v)?.toDate) === 'function' ? /** @type {any} */ (v).toDate() : v
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
}

/**
 * Dia do mes valido (1 a 31) ou null.
 * @param {unknown} v
 * @returns {number | null}
 */
function dayOrNull(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31 ? v : null
}

/**
 * Lancamento do documento para a forma que o nucleo espera. So os campos que o resumo usa.
 * @param {string} id
 * @param {Record<string, any>} d
 * @returns {Record<string, any> | null}
 */
export function mapTransaction(id, d) {
  const date = toDate(d?.date)
  if (!date) return null
  return {
    id,
    type: d.type,
    amount: d.amount,
    category: d.category,
    categoryId: d.categoryId,
    description: d.description,
    source: d.source,
    bankImportId: d.bankImportId,
    transfer: d.transfer,
    // Cartao: o fato separa estorno, pagamento de fatura e compra parcelada.
    cardKind: d.cardKind,
    installment: d.installment,
    person: d.person,
    date,
  }
}

/**
 * Consulta de lancamentos da pessoa numa janela (mesmo indice do cliente: ownerId, person, date desc).
 * @param {any} db
 * @param {string} hid
 * @param {'ele' | 'ela'} person
 * @param {{ start: Date, end: Date }} cycle
 */
function transactionsQuery(db, hid, person, cycle) {
  return db
    .collection(TRANSACTIONS)
    .where('ownerId', '==', hid)
    .where('person', '==', person)
    .where('date', '>=', Timestamp.fromDate(cycle.start))
    .where('date', '<=', Timestamp.fromDate(cycle.end))
    .orderBy('date', 'desc')
}

/**
 * Leitor do que a IA pode enxergar, sempre escopado pelo casal (hid) e pela pessoa do token.
 * `load` devolve { input, reads, tone, tabNames }: `input` e a entrada de buildAiSummary; `reads`
 * conta os documentos lidos NESTA carga (cache = 0); `tone` e `tabNames` sao para a fala e nunca
 * entram no resumo.
 *
 * Fontes (D-16): lancamentos do ciclo atual e do anterior, contas fixas e pagamentos, metas, so o
 * SALDO do Porquinho, fatura aberta do cartao, insights fortes, o ultimo lancamento, os eventos do
 * calendario (da pessoa e do casal) e as anotacoes da pessoa (D-24). Toda consulta
 * de dado pessoal leva ownerId e person do token; so o Porquinho e as contas do casal nao filtram
 * pessoa (D-14). O Admin SDK ignora as regras, entao o filtro e daqui.
 *
 * Cache em memoria (T-07-53): ciclo atual 10 minutos, anterior 12 horas; `fresh` ignora o TTL do
 * atual, no maximo uma leitura fresca a cada FRESH_MIN_MS por chave.
 * @param {{ db: any, now?: () => Date, log?: { warn?: (line: string) => void } }} deps
 */
export function createSnapshotLoader({ db, now = () => new Date(), log = console }) {
  /**
   * @typedef {{ at: number, expires: number, done: boolean, run: Promise<{ value: any, reads: number, partial?: boolean }> }} Entry
   */
  /** @type {Map<string, Entry>} */
  const settingsCache = new Map()
  /** @type {Map<string, Entry>} */
  const currentCache = new Map()
  /** @type {Map<string, Entry>} */
  const previousCache = new Map()

  /**
   * Devolve o valor em cache ou le de novo. Leituras simultaneas da mesma chave dividem a mesma
   * busca; so quem disparou a busca contabiliza as leituras.
   * @param {Map<string, Entry>} map
   * @param {string} key
   * @param {{ ttl: number, force: boolean }} opts
   * @param {() => Promise<{ value: any, reads: number, partial?: boolean }>} fetcher
   * @returns {Promise<{ value: any, reads: number }>}
   */
  async function cached(map, key, { ttl, force }, fetcher) {
    const t = now().getTime()
    const hit = map.get(key)
    if (hit) {
      const usable = !hit.done || (t < hit.expires && !(force && t - hit.at >= FRESH_MIN_MS))
      if (usable) return { value: (await hit.run).value, reads: 0 }
    }
    // Limpa o que ja venceu para o mapa nao crescer.
    for (const [k, e] of map) if (e.done && e.expires <= t) map.delete(k)

    /** @type {Entry} */
    const entry = { at: t, expires: t + ttl, done: false, run: /** @type {any} */ (null) }
    entry.run = fetcher().then(
      (res) => {
        entry.done = true
        if (res.partial) entry.expires = t + RETRY_AFTER_FAILURE_MS
        return res
      },
      (err) => {
        if (map.get(key) === entry) map.delete(key)
        throw err
      },
    )
    map.set(key, entry)
    const res = await entry.run
    return { value: res.value, reads: res.reads }
  }

  /**
   * Fonte tolerante: erro de consulta devolve a parte vazia e marca a carga como parcial. So o
   * nome da fonte vai ao log, nunca o conteudo.
   * @template T
   * @param {string} name
   * @param {T} empty
   * @param {() => Promise<{ value: T, reads: number }>} fn
   * @returns {Promise<{ value: T, reads: number, failed: boolean }>}
   */
  async function safe(name, empty, fn) {
    try {
      const r = await fn()
      return { value: r.value, reads: r.reads, failed: false }
    } catch {
      log.warn?.(`[ai] snapshot: fonte ${name} falhou, segue sem ela`)
      return { value: empty, reads: 0, failed: true }
    }
  }

  /**
   * @param {string} hid
   * @returns {Promise<{ value: Record<string, any> | null, reads: number }>}
   */
  async function fetchSettings(hid) {
    // settings/main so vale sem dono ou com o dono igual ao casal (Admin SDK ignora as regras).
    const snap = await db.collection(SETTINGS).doc('main').get()
    const raw = snap.exists ? snap.data() : null
    const value = raw && (raw.ownerId == null || raw.ownerId === hid) ? raw : null
    return { value, reads: 1 }
  }

  /**
   * Contas fixas ativas da pessoa (a do tipo conjunto fica fora) no formato do nucleo.
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   */
  async function fetchBills(hid, person) {
    const snap = await db
      .collection(FIXED_EXPENSES)
      .where('ownerId', '==', hid)
      .where('person', '==', person)
      .where('isActive', '==', true)
      .get()
    const bills = []
    for (const doc of snap.docs) {
      const d = doc.data() ?? {}
      const amount = Number(d.amount)
      const dueDay = dayOrNull(d.dueDay)
      if (d.person !== person || d.isActive !== true || typeof d.name !== 'string' || dueDay === null) continue
      if (!Number.isFinite(amount)) continue
      bills.push({ id: doc.id, name: d.name, dueDay, amountCents: toCents(amount) })
    }
    bills.sort((a, b) => a.dueDay - b.dueDay || (a.id < b.id ? -1 : 1))
    return { value: bills, reads: snap.docs.length }
  }

  /**
   * Pagamentos dos meses do ciclo, so os das contas da pessoa (o resto nem chega ao resumo).
   * @param {string} hid
   * @param {any} cycle
   * @param {Set<string>} billIds
   */
  async function fetchPayments(hid, cycle, billIds) {
    const snaps = await Promise.all(
      cycleMonths(cycle).map((m) =>
        db
          .collection(FIXED_PAYMENTS)
          .where('ownerId', '==', hid)
          .where('month', '==', m.month)
          .where('year', '==', m.year)
          .get(),
      ),
    )
    const payments = []
    let reads = 0
    for (const snap of snaps) {
      reads += snap.docs.length
      for (const doc of snap.docs) {
        const d = doc.data() ?? {}
        const paid = Number(d.paidAmount)
        if (typeof d.fixedExpenseId !== 'string' || !billIds.has(d.fixedExpenseId)) continue
        if (!Number.isInteger(d.month) || !Number.isInteger(d.year) || !Number.isFinite(paid)) continue
        payments.push({ billId: d.fixedExpenseId, month: d.month, year: d.year, paidCents: toCents(paid) })
      }
    }
    return { value: payments, reads }
  }

  /**
   * Metas da pessoa, em centavos.
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   */
  async function fetchGoals(hid, person) {
    const snap = await db.collection(GOALS).where('ownerId', '==', hid).where('person', '==', person).get()
    const goals = []
    for (const doc of snap.docs) {
      const d = doc.data() ?? {}
      const target = Number(d.targetAmount)
      const current = Number(d.currentAmount)
      if (typeof d.name !== 'string' || !Number.isFinite(target) || target <= 0) continue
      goals.push({
        name: d.name,
        targetCents: toCents(target),
        currentCents: Number.isFinite(current) ? Math.max(toCents(current), 0) : 0,
        person,
      })
    }
    return { value: goals, reads: snap.docs.length }
  }

  /**
   * Saldo do Porquinho do casal, em centavos. So tipo e valor saem do banco (select): quem guardou
   * e a descricao nunca chegam a memoria (T-07-51). Null quando nao ha lancamento valido.
   * @param {string} hid
   */
  async function fetchPorquinho(hid) {
    const snap = await db.collection(SAVINGS).where('ownerId', '==', hid).select('type', 'amount').get()
    let balance = 0
    let valid = 0
    for (const doc of snap.docs) {
      const d = doc.data() ?? {}
      const amount = Number(d.amount)
      if ((d.type !== 'deposito' && d.type !== 'saque') || !Number.isFinite(amount)) continue
      balance += d.type === 'deposito' ? toCents(amount) : -toCents(amount)
      valid += 1
    }
    return { value: valid > 0 ? balance : null, reads: snap.docs.length }
  }

  /**
   * Cartoes da pessoa com a configuracao do dono (cardSettings/{id}, so se for do casal) e os totais
   * por fatura. A fatura aberta e calculada na hora da carga (depende do relogio).
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   */
  async function fetchCards(hid, person) {
    const snap = await db.collection(CARDS).where('ownerId', '==', hid).where('person', '==', person).get()
    let reads = snap.docs.length
    const cards = []
    for (const doc of snap.docs) {
      const d = doc.data() ?? {}
      const totals = d.billTotals && typeof d.billTotals === 'object' ? d.billTotals : {}
      const set = await db.collection(CARD_SETTINGS).doc(doc.id).get()
      reads += 1
      const s = set.exists ? set.data() : null
      const own = s && s.ownerId === hid ? s : null
      const nickname = own && typeof own.nickname === 'string' ? own.nickname.trim() : ''
      const name = nickname !== '' ? nickname : typeof d.name === 'string' ? d.name : ''
      cards.push({
        name,
        closingDay: own ? dayOrNull(own.closingDay) : null,
        dueDay: own ? dayOrNull(own.dueDay) : null,
        billTotals: totals,
        person,
      })
    }
    return { value: cards, reads }
  }

  /**
   * Insights fortes (severidade 2 ou 3) do ciclo, so da pessoa, ate INSIGHTS_MAX.
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   * @param {string} cycleKey
   */
  async function fetchInsights(hid, person, cycleKey) {
    const snap = await db
      .collection(INSIGHTS)
      .where('ownerId', '==', hid)
      .where('person', '==', person)
      .where('cycleKey', '==', cycleKey)
      .get()
    const out = []
    for (const doc of snap.docs) {
      const d = doc.data() ?? {}
      if (d.severity !== 2 && d.severity !== 3) continue
      out.push({
        id: doc.id,
        type: d.type,
        severity: d.severity,
        subjectKind: d.subjectKind,
        subjectKey: d.subjectKey,
        metrics: d.metrics && typeof d.metrics === 'object' ? d.metrics : {},
        cycleKey,
        person,
      })
    }
    out.sort((a, b) => b.severity - a.severity || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    return { value: out.slice(0, INSIGHTS_MAX), reads: snap.docs.length }
  }

  /**
   * Eventos do calendario desde o comeco do ciclo ate um mes depois do fim (D-24). A consulta usa o
   * indice do app (ownerId, date); a pessoa e o 'conjunto' sao filtrados aqui, e o evento so da
   * outra pessoa nunca segue adiante.
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   * @param {{ start: Date, end: Date }} cycle
   */
  async function fetchEvents(hid, person, cycle) {
    const until = new Date(cycle.end.getTime() + AGENDA_AHEAD_DAYS * 24 * 60 * 60 * 1000)
    const snap = await db
      .collection(EVENTS)
      .where('ownerId', '==', hid)
      .where('date', '>=', Timestamp.fromDate(cycle.start))
      .where('date', '<=', Timestamp.fromDate(until))
      .orderBy('date', 'asc')
      .get()
    const events = []
    for (const doc of snap.docs) {
      const d = doc.data() ?? {}
      const date = toDate(d.date)
      if (!date || (d.person !== person && d.person !== 'conjunto')) continue
      events.push({ title: d.title, date, time: d.time, location: d.location, notes: d.notes, person: d.person })
    }
    return { value: events, reads: snap.docs.length }
  }

  /**
   * Anotacoes mais novas da pessoa (D-24).
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   */
  async function fetchNotes(hid, person) {
    const snap = await db
      .collection(NOTES)
      .where('ownerId', '==', hid)
      .where('person', '==', person)
      .orderBy('createdAt', 'desc')
      .limit(NOTES_MAX)
      .get()
    const notes = snap.docs.map((doc) => {
      const d = doc.data() ?? {}
      return { title: d.title, content: d.content, date: toDate(d.date), person }
    })
    return { value: notes, reads: snap.docs.length }
  }

  /**
   * Tudo do ciclo atual alem das configuracoes. Lancamentos sao essenciais (erro sobe e a fala vira
   * banco de frases); as demais fontes sao toleradas.
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   * @param {any} cycle
   */
  async function fetchCurrent(hid, person, cycle) {
    const [txSnap, bills, goals, porquinho, cards, insights, events, notes] = await Promise.all([
      transactionsQuery(db, hid, person, cycle).get(),
      safe('contas', /** @type {any[]} */ ([]), () => fetchBills(hid, person)),
      safe('metas', /** @type {any[]} */ ([]), () => fetchGoals(hid, person)),
      safe('porquinho', /** @type {number | null} */ (null), () => fetchPorquinho(hid)),
      safe('cartoes', /** @type {any[]} */ ([]), () => fetchCards(hid, person)),
      safe('insights', /** @type {any[]} */ ([]), () => fetchInsights(hid, person, cycle.key)),
      safe('agenda', /** @type {any[]} */ ([]), () => fetchEvents(hid, person, cycle)),
      safe('anotacoes', /** @type {any[]} */ ([]), () => fetchNotes(hid, person)),
    ])
    const billIds = new Set(bills.value.map((b) => b.id))
    const payments = await safe('pagamentos', /** @type {any[]} */ ([]), () => fetchPayments(hid, cycle, billIds))

    /** @type {any[]} */
    const transactions = []
    let latest = null
    let latestMs = -Infinity
    for (const doc of txSnap.docs) {
      const raw = doc.data() ?? {}
      const tx = mapTransaction(doc.id, raw)
      if (tx === null) continue
      transactions.push(tx)
      // Ultimo lancamento = maior createdAt (sem ele, a data do lancamento).
      const created = toDate(raw.createdAt) ?? tx.date
      const ms = created.getTime()
      if (ms > latestMs || (ms === latestMs && latest !== null && tx.date.getTime() > latest.date.getTime())) {
        latest = tx
        latestMs = ms
      }
    }

    const parts = [bills, goals, porquinho, cards, insights, payments, events, notes]
    return {
      value: {
        transactions,
        latestTx: latest,
        bills: bills.value,
        payments: payments.value,
        goals: goals.value,
        porquinhoCents: porquinho.value,
        cards: cards.value,
        insights: insights.value,
        events: events.value,
        notes: notes.value,
      },
      reads: txSnap.docs.length + parts.reduce((sum, p) => sum + p.reads, 0),
      partial: parts.some((p) => p.failed),
    }
  }

  /**
   * Lancamentos do ciclo anterior (so para a tendencia). Falha deixa a comparacao de fora.
   * @param {string} hid
   * @param {'ele' | 'ela'} person
   * @param {any} prevCycle
   */
  async function fetchPrevious(hid, person, prevCycle) {
    const r = await safe('ciclo anterior', /** @type {any[]} */ ([]), async () => {
      const snap = await transactionsQuery(db, hid, person, prevCycle).get()
      const txs = []
      for (const doc of snap.docs) {
        const tx = mapTransaction(doc.id, doc.data() ?? {})
        if (tx !== null) txs.push(tx)
      }
      return { value: txs, reads: snap.docs.length }
    })
    return { value: r.value, reads: r.reads, partial: r.failed }
  }

  /**
   * Cartoes com fatura aberta: fecha na hora (depende do relogio), sem fechamento ou vencimento do
   * dono nao ha fatura (nada e inventado).
   * @param {any[]} cards
   * @param {Date} nowDate
   */
  function openBills(cards, nowDate) {
    const out = []
    for (const c of cards) {
      if (c.closingDay === null || c.dueDay === null) continue
      const month = openBillMonth(nowDate, c.closingDay)
      const total = month ? c.billTotals?.[month] : undefined
      if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) continue
      out.push({ name: c.name, openBillCents: Math.round(total), dueDay: c.dueDay, person: c.person })
    }
    return out
  }

  /**
   * @param {{ hid: string, person: 'ele' | 'ela', fresh?: boolean }} args
   */
  async function load({ hid, person, fresh = false }) {
    if (typeof hid !== 'string' || !hid || (person !== 'ele' && person !== 'ela')) {
      throw new Error('snapshot exige hid e pessoa validos')
    }
    const nowDate = now()
    const force = fresh === true

    const settingsRes = await cached(settingsCache, hid, { ttl: CURRENT_TTL_MS, force }, () => fetchSettings(hid))
    const settings = settingsRes.value
    let reads = settingsRes.reads

    /** @type {import('../../../shared/core/categories.js').CategoryDef[]} */
    let categoryDefs = DEFAULT_CATEGORY_DEFS
    if (settings) {
      if (Array.isArray(settings.categoryDefs) && settings.categoryDefs.length) categoryDefs = settings.categoryDefs
      else if (Array.isArray(settings.categories) && settings.categories.length) {
        categoryDefs = buildCategoryDefs(settings.categories)
      }
    }
    const config = normalizePersonConfig(settings?.personConfig?.[person])
    const tone = TONES.includes(settings?.vintemTone) ? settings.vintemTone : DEFAULT_TONE
    const tabNames = {
      area1: tabName(settings?.tabNames?.area1, DEFAULT_TAB_NAMES.area1),
      area2: tabName(settings?.tabNames?.area2, DEFAULT_TAB_NAMES.area2),
    }

    const cycle = cycleOf(nowDate, config.salaryDay)
    const prevCycle = shiftCycle(cycle, -1)

    const [cur, prev] = await Promise.all([
      cached(currentCache, `${hid}|${person}|${cycle.key}`, { ttl: CURRENT_TTL_MS, force }, () =>
        fetchCurrent(hid, person, cycle),
      ),
      cached(previousCache, `${hid}|${person}|${prevCycle.key}`, { ttl: PREVIOUS_TTL_MS, force: false }, () =>
        fetchPrevious(hid, person, prevCycle),
      ),
    ])
    reads += cur.reads + prev.reads
    // So a contagem vai ao log, e so quando a carga e grande.
    if (reads > BIG_SNAPSHOT_READS) log.warn?.(`[ai] snapshot grande: ${reads} leituras`)

    const data = cur.value
    return {
      input: {
        now: nowDate,
        person,
        cycle,
        config,
        categoryDefs,
        transactions: data.transactions,
        prevTransactions: prev.value,
        bills: data.bills,
        payments: data.payments,
        goals: data.goals,
        porquinhoCents: data.porquinhoCents,
        cards: openBills(data.cards, nowDate),
        insights: data.insights,
        events: data.events,
        notes: data.notes,
        ...(data.latestTx ? { latestTx: data.latestTx } : {}),
      },
      reads,
      tone,
      tabNames,
    }
  }

  return { load }
}
