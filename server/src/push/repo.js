import { Timestamp } from 'firebase-admin/firestore'
import { DEFAULT_CATEGORY_DEFS, buildCategoryDefs } from '../../../shared/core/categories.js'
import { normalizePersonConfig } from '../../../shared/core/limits.js'
import { TONES } from '../../../shared/core/vintemPhrases.js'
import { createPrefsStore } from './prefs.js'

const SETTINGS = 'settings'
const TRANSACTIONS = 'transactions'
const LIMIT_ALERTS = 'limitAlerts'
const EVENTS = 'pushEvents'
const REGISTRATIONS = 'pushRegistrations'
const CARDS = 'cards'
const CARD_SETTINGS = 'cardSettings'
const CONNECTIONS = 'bankConnections'

const DEFAULT_TONE = 'sem-filtro'
const DEFAULT_DAYS_BEFORE = 3
// Codigo gRPC 6 (ALREADY_EXISTS) do create() do Firestore.
const ALREADY_EXISTS = 6

/** Limite de marcadores pendentes lidos por rodada de entrega. */
const PENDING_LIMIT = 500

/**
 * Lancamento do documento para a forma que o nucleo de orcamento espera (a mesma do cliente).
 * Descricao, origem e id do banco ficam so em memoria, para decidir se a marca da loja pode
 * aparecer no aviso de limite (D-28, D-32); nunca sao gravados nem logados.
 * Documento sem data valida e ignorado.
 * @param {string} id
 * @param {Record<string, any>} d
 * @returns {Record<string, any> | null}
 */
function mapTransaction(id, d) {
  const date = typeof d?.date?.toDate === 'function' ? d.date.toDate() : d?.date instanceof Date ? d.date : null
  if (!date || Number.isNaN(date.getTime())) return null
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
    person: d.person,
    date,
  }
}

const dayOfMonth = (v) => (Number.isInteger(v) && v >= 1 && v <= 31 ? v : null)

/**
 * Junta cards e cardSettings na forma CalendarCard do nucleo, como o sino do app (AlertsBell).
 * @param {Array<Record<string, any>>} cards
 * @param {Array<Record<string, any>>} settings
 * @returns {Array<import('../../../shared/core/cardCalendar.js').CalendarCard>}
 */
export function joinBillCards(cards, settings) {
  const byAccount = new Map(settings.map((s) => [s.accountId, s]))
  return cards.map((card) => {
    const own = byAccount.get(card.id)
    const nickname = typeof own?.nickname === 'string' ? own.nickname.trim() : ''
    return {
      id: card.id,
      displayName: nickname || card.name,
      name: card.name,
      billTotals: card.billTotals,
      payments: card.payments,
      closingDay: dayOfMonth(own?.closingDay),
      dueDay: dayOfMonth(own?.dueDay),
      paidMonths: Array.isArray(own?.paidMonths) ? own.paidMonths : [],
    }
  })
}

/** Erro de create() que significa "o documento ja existe". */
function isAlreadyExists(err) {
  return err?.code === ALREADY_EXISTS || err?.code === 'already-exists' || /ALREADY_EXISTS/.test(String(err?.message ?? ''))
}

/**
 * Leituras e escritas do Firestore do notificador. O Admin SDK ignora as regras: toda consulta
 * filtra o dono (ownerId) e, quando e da pessoa, a pessoa. As consultas usam so igualdades
 * (mais a janela de data ja indexada dos lancamentos), entao nenhum indice novo e preciso.
 * @param {{ db: any, prefsStore?: { get(hid: string, person: string): Promise<any> } }} deps
 */
export function createRepo({ db, prefsStore = createPrefsStore(db) }) {
  return {
    /**
     * Configuracoes do casal para a pessoa. settings/main so vale sem dono ou com dono igual ao casal;
     * outro dono volta aos padroes (Admin SDK ignora regras).
     * @param {string} hid
     * @param {string} person
     */
    async readSettings(hid, person) {
      const snap = await db.collection(SETTINGS).doc('main').get()
      const raw = snap.exists ? snap.data() : null
      const data = raw && (raw.ownerId == null || raw.ownerId === hid) ? raw : null

      let categoryDefs = DEFAULT_CATEGORY_DEFS
      if (data) {
        if (Array.isArray(data.categoryDefs) && data.categoryDefs.length) categoryDefs = data.categoryDefs
        else if (Array.isArray(data.categories) && data.categories.length) categoryDefs = buildCategoryDefs(data.categories)
      }
      const days = data?.daysBeforeDueDate
      return {
        tone: TONES.includes(data?.vintemTone) ? data.vintemTone : DEFAULT_TONE,
        categoryDefs,
        personConfig: normalizePersonConfig(data?.personConfig?.[person]),
        // Interruptor legado "Avisos de vencimento": vira o tipo fatura (D-21); padrao ligado.
        faturaEnabled: data?.notificationsEnabled !== false,
        daysBeforeDueDate: Number.isInteger(days) && days >= 0 && days <= 30 ? days : DEFAULT_DAYS_BEFORE,
      }
    },

    /**
     * Lancamentos da pessoa no ciclo, do mais novo ao mais antigo (mesmo indice do cliente).
     * @param {string} hid
     * @param {string} person
     * @param {{ start: Date, end: Date }} cycle
     */
    async readCycleTransactions(hid, person, cycle) {
      const snap = await db
        .collection(TRANSACTIONS)
        .where('ownerId', '==', hid)
        .where('person', '==', person)
        .where('date', '>=', Timestamp.fromDate(cycle.start))
        .where('date', '<=', Timestamp.fromDate(cycle.end))
        .orderBy('date', 'desc')
        .get()
      const out = []
      for (const doc of snap.docs) {
        const tx = mapTransaction(doc.id, doc.data())
        if (tx !== null) out.push(tx)
      }
      return out
    },

    /**
     * Ids dos avisos silenciosos que o proprio app ja registrou no ciclo (troca do dia do salario).
     * @param {string} hid
     * @param {string} person
     * @param {string} cycleKey
     * @returns {Promise<string[]>}
     */
    async readSilentAlertIds(hid, person, cycleKey) {
      const snap = await db
        .collection(LIMIT_ALERTS)
        .where('ownerId', '==', hid)
        .where('person', '==', person)
        .where('cycleKey', '==', cycleKey)
        .where('silent', '==', true)
        .get()
      return snap.docs.map((d) => d.id)
    },

    /**
     * Ids de aviso (sem o prefixo do casal) dos marcadores de limite ja criados no ciclo.
     * @param {string} hid
     * @param {string} person
     * @param {string} cycleKey
     * @returns {Promise<string[]>}
     */
    async listEventIds(hid, person, cycleKey) {
      const snap = await db
        .collection(EVENTS)
        .where('ownerId', '==', hid)
        .where('person', '==', person)
        .where('cycleKey', '==', cycleKey)
        .where('kind', '==', 'limite')
        .get()
      const prefix = `${hid}__limite__`
      return snap.docs.map((d) => (d.id.startsWith(prefix) ? d.id.slice(prefix.length) : d.id))
    },

    /**
     * Cartoes da pessoa (cards/{accountId}). Dois filtros de igualdade: o cartao da outra pessoa
     * nunca entra (D-14).
     * @param {string} hid
     * @param {string} person
     * @returns {Promise<Array<Record<string, any>>>}
     */
    async readCards(hid, person) {
      const snap = await db.collection(CARDS).where('ownerId', '==', hid).where('person', '==', person).get()
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }))
    },

    /**
     * Configuracao dos cartoes do casal (cardSettings/{accountId}: fechamento, vencimento, apelido
     * e meses marcados como pagos). Nao tem pessoa: a juncao com os cartoes da pessoa resolve.
     * @param {string} hid
     * @returns {Promise<Array<Record<string, any>>>}
     */
    async readCardSettings(hid) {
      const snap = await db.collection(CARD_SETTINGS).where('ownerId', '==', hid).get()
      return snap.docs.map((d) => ({ ...d.data(), accountId: d.id }))
    },

    /**
     * Casal dono de uma conexao bancaria (bankConnections/{itemId}), para o gancho
     * pos-sincronizacao quando a chamada nao traz o casal.
     * @param {string} itemId
     * @returns {Promise<string | null>}
     */
    async readConnectionOwner(itemId) {
      if (typeof itemId !== 'string' || !itemId) return null
      const snap = await db.collection(CONNECTIONS).doc(itemId).get()
      return snap.exists ? (snap.data().ownerId ?? null) : null
    },

    /** Preferencias de aviso da pessoa (padroes quando nao ha documento). */
    readPrefs(hid, person) {
      return prefsStore.get(hid, person)
    },

    /**
     * FIDs dos aparelhos da pessoa. Dois filtros de igualdade: a outra pessoa nunca entra.
     * @param {string} hid
     * @param {string} person
     * @returns {Promise<string[]>}
     */
    async listFids(hid, person) {
      const snap = await db
        .collection(REGISTRATIONS)
        .where('ownerId', '==', hid)
        .where('person', '==', person)
        .get()
      return snap.docs.map((d) => d.id)
    },

    /**
     * Reivindica o marcador com create(): atomico no Firestore, sobrevive a reinicio e a varias
     * instancias. Devolve false quando o documento ja existe; qualquer outro erro sobe.
     * @param {string} id
     * @param {Record<string, any>} data
     * @returns {Promise<boolean>}
     */
    async claimEvent(id, data) {
      try {
        await db.collection(EVENTS).doc(id).create(data)
        return true
      } catch (err) {
        if (isAlreadyExists(err)) return false
        throw err
      }
    },

    /** @param {string} id @param {Record<string, any>} patch */
    async updateEvent(id, patch) {
      await db.collection(EVENTS).doc(id).update(patch)
    },

    /** @param {string} id */
    async deleteEvent(id) {
      await db.collection(EVENTS).doc(id).delete()
    },

    /**
     * Avisos ja enviados a pessoa no dia de Sao Paulo (base do teto diario). Contagem agregada:
     * nao le os documentos. So igualdades, entao nenhum indice novo e preciso.
     * @param {string} hid
     * @param {string} person
     * @param {string} dayKey
     * @param {string} [kind] conta so este tipo; sem ele conta todos os enviados do dia
     * @returns {Promise<number>}
     */
    async countSent(hid, person, dayKey, kind) {
      let query = db
        .collection(EVENTS)
        .where('ownerId', '==', hid)
        .where('person', '==', person)
        .where('dayKey', '==', dayKey)
        .where('status', '==', 'enviado')
      if (kind) query = query.where('kind', '==', kind)
      const snap = await query.count().get()
      return snap.data().count
    },

    /**
     * Consulta de sistema: todos os marcadores pendentes (retidos pelo silencio), de qualquer casal.
     * E a unica consulta sem filtro de dono; cada marcador carrega o proprio ownerId e person, e
     * tudo depois dela e feito por casal e pessoa.
     * @returns {Promise<Array<Record<string, any>>>}
     */
    async listPending() {
      const snap = await db.collection(EVENTS).where('status', '==', 'pendente').limit(PENDING_LIMIT).get()
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }))
    },

    /**
     * Consulta de sistema: todas as inscricoes, sem filtro de dono, porque o relogio atende todos
     * os casais. Cada inscricao carrega o proprio ownerId e person.
     * @returns {Promise<Array<{ fid: string, ownerId: string, person: string, updatedAt: Date | null }>>}
     */
    async listRegistrations() {
      const snap = await db.collection(REGISTRATIONS).get()
      return snap.docs.map((d) => {
        const data = d.data()
        const at = typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt
        return { fid: d.id, ownerId: data.ownerId, person: data.person, updatedAt: at instanceof Date ? at : null }
      })
    },

    /** @param {string} fid */
    async deleteRegistration(fid) {
      await db.collection(REGISTRATIONS).doc(fid).delete()
    },

    /**
     * Transicao de status por transacao: so aplica o patch se o marcador ainda esta em `from`.
     * Dois executores disputando o mesmo marcador: so um ganha. Devolve se este ganhou.
     * @param {string} id
     * @param {string} from
     * @param {Record<string, any>} patch
     * @returns {Promise<boolean>}
     */
    async transitionEvent(id, from, patch) {
      const ref = db.collection(EVENTS).doc(id)
      return db.runTransaction(async (t) => {
        const snap = await t.get(ref)
        if (!snap.exists || snap.data().status !== from) return false
        t.update(ref, patch)
        return true
      })
    },
  }
}
