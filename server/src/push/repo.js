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

const DEFAULT_TONE = 'sem-filtro'
const DEFAULT_DAYS_BEFORE = 3
// Codigo gRPC 6 (ALREADY_EXISTS) do create() do Firestore.
const ALREADY_EXISTS = 6

/**
 * Lancamento do documento para a forma que o nucleo de orcamento espera (a mesma do cliente).
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
    transfer: d.transfer,
    person: d.person,
    date,
  }
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
  }
}
