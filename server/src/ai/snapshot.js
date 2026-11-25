import { Timestamp } from 'firebase-admin/firestore'
import { DEFAULT_CATEGORY_DEFS, buildCategoryDefs } from '../../../shared/core/categories.js'
import { cycleOf } from '../../../shared/core/cycle.js'
import { normalizePersonConfig } from '../../../shared/core/limits.js'
import { TONES } from '../../../shared/core/aiPrompt.js'

const SETTINGS = 'settings'
const TRANSACTIONS = 'transactions'

/** Tom padrao e nomes padrao das abas (o mesmo do app) quando o documento falta ou e de outro casal. */
export const DEFAULT_TONE = 'sem-filtro'
const DEFAULT_TAB_NAMES = Object.freeze({ area1: 'Nirigue', area2: 'Nirigua' })

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
 * Lancamento do documento para a forma que o nucleo espera. So os campos que o resumo usa.
 * @param {string} id
 * @param {Record<string, any>} d
 * @returns {Record<string, any> | null}
 */
export function mapTransaction(id, d) {
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

/**
 * Leitor do que a IA pode enxergar, sempre escopado pelo casal (hid) e pela pessoa do token.
 * `load` devolve { input, reads, tone, tabNames }: `input` e a entrada de buildAiSummary; `reads`
 * conta os documentos lidos; `tone` e `tabNames` sao para a fala e nunca entram no resumo.
 * Hoje le so as configuracoes e os lancamentos do ciclo atual da pessoa; os demais campos vao vazios
 * (a leitura completa e do 07-13, que tambem usa `fresh` para o TTL).
 * @param {{ db: any, now?: () => Date }} deps
 */
export function createSnapshotLoader({ db, now = () => new Date() }) {
  /**
   * @param {{ hid: string, person: 'ele' | 'ela', fresh?: boolean }} args
   */
  async function load({ hid, person }) {
    if (typeof hid !== 'string' || !hid || (person !== 'ele' && person !== 'ela')) {
      throw new Error('snapshot exige hid e pessoa validos')
    }
    const nowDate = now()

    // settings/main so vale sem dono ou com o dono igual ao casal (Admin SDK ignora as regras).
    const settingsSnap = await db.collection(SETTINGS).doc('main').get()
    const raw = settingsSnap.exists ? settingsSnap.data() : null
    const settings = raw && (raw.ownerId == null || raw.ownerId === hid) ? raw : null

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
    // Mesmo indice do cliente: ownerId, person, date desc. So a pessoa do token e so o ciclo atual.
    const txSnap = await db
      .collection(TRANSACTIONS)
      .where('ownerId', '==', hid)
      .where('person', '==', person)
      .where('date', '>=', Timestamp.fromDate(cycle.start))
      .where('date', '<=', Timestamp.fromDate(cycle.end))
      .orderBy('date', 'desc')
      .get()
    const transactions = []
    for (const doc of txSnap.docs) {
      const tx = mapTransaction(doc.id, doc.data())
      if (tx !== null) transactions.push(tx)
    }

    return {
      input: {
        now: nowDate,
        person,
        cycle,
        config,
        categoryDefs,
        transactions,
        prevTransactions: [],
        bills: [],
        payments: [],
        goals: [],
        porquinhoCents: null,
        cards: [],
        insights: [],
      },
      reads: 1 + txSnap.docs.length,
      tone,
      tabNames,
    }
  }

  return { load }
}
