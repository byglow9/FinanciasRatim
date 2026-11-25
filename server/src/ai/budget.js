import { dayKeyOf } from '../../../shared/core/dayKey.js'

// Teto diario da fala por IA (D-03, IA-01) e freio diario por provedor (D-02), persistidos no
// Firestore e incrementados por transacao: sobrevivem a reinicio e duas chamadas simultaneas no
// ultimo lugar do teto deixam passar so uma. Nenhum documento daqui guarda resumo, descricao,
// prompt, texto ou chave: so ids, o dia e a contagem.

const USAGE = 'aiUsage'
// Contencao alta (varias falas ao mesmo tempo no ultimo lugar): mais tentativas que as 5 padrao.
const TX_OPTIONS = Object.freeze({ maxAttempts: 25 })
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const PEOPLE = Object.freeze(['ele', 'ela'])

/**
 * Codigo curto do erro, nunca a mensagem (poderia carregar dado).
 * @param {any} err
 * @returns {string}
 */
function codeOf(err) {
  return String(err?.code ?? err?.name ?? 'erro').slice(0, 40)
}

/**
 * Contadores diarios: um por pessoa (dia de Sao Paulo) e um por provedor (dia UTC, o mesmo do reset
 * do Cloudflare). Erro de transacao nunca lanca: vira { ok: false } e a fala cai no banco de frases.
 * @param {{
 *   db: any,
 *   config: { dailyCapPerUser?: number, providerCaps?: Record<string, number> },
 *   now?: () => Date,
 *   log?: { warn?: (line: string) => void },
 * }} deps
 */
export function createBudget({ db, config, now = () => new Date(), log = console }) {
  /**
   * Incrementa o contador do documento se ainda houver lugar abaixo do teto.
   * @param {string} id
   * @param {number} cap
   * @param {Record<string, any>} fresh campos de um documento novo (sem a contagem)
   * @returns {Promise<{ ok: boolean, calls: number }>}
   */
  async function bump(id, cap, fresh) {
    const ref = db.collection(USAGE).doc(id)
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const calls = snap.exists ? Math.max(0, Math.trunc(Number(snap.data()?.calls)) || 0) : 0
      if (calls >= cap) return { ok: false, calls }
      if (snap.exists) tx.update(ref, { calls: calls + 1, updatedAt: now() })
      else tx.set(ref, { ...fresh, calls: 1, updatedAt: now() })
      return { ok: true, calls: calls + 1 }
    }, TX_OPTIONS)
  }

  /**
   * Gasta uma fala do dia da pessoa. So chamada real ao provedor deve passar por aqui.
   * @param {{ hid: string, person: string }} args
   * @returns {Promise<{ ok: boolean, calls: number }>}
   */
  async function consume({ hid, person }) {
    const cap = Number(config.dailyCapPerUser)
    if (!(cap > 0)) return { ok: false, calls: 0 }
    if (typeof hid !== 'string' || !ID_RE.test(hid) || !PEOPLE.includes(person)) return { ok: false, calls: 0 }
    const dayKey = dayKeyOf(now())
    try {
      return await bump(`${hid}__${person}__${dayKey}`, cap, { ownerId: hid, person, dayKey })
    } catch (err) {
      log.warn?.(`[ai] teto diario indisponivel codigo=${codeOf(err)}`)
      return { ok: false, calls: 0 }
    }
  }

  /**
   * Conta uma tentativa do provedor no dia UTC e compara com o teto proprio opcional
   * (AI_PROVIDER_CAP_*; ausente ou zero = sem teto, so o freio por 429). Sem teto, falha do banco
   * deixa passar (o contador e so informativo); com teto, falha do banco fecha o provedor.
   * @param {{ providerId: string }} args
   * @returns {Promise<{ ok: boolean, calls: number }>}
   */
  async function consumeProvider({ providerId }) {
    if (typeof providerId !== 'string' || !ID_RE.test(providerId)) return { ok: false, calls: 0 }
    const cap = Number(config.providerCaps?.[providerId]) || 0
    const day = now().toISOString().slice(0, 10)
    try {
      return await bump(`provider__${providerId}__${day}`, cap > 0 ? cap : Number.MAX_SAFE_INTEGER, { providerId, day })
    } catch (err) {
      log.warn?.(`[ai] contador do provedor indisponivel codigo=${codeOf(err)}`)
      return cap > 0 ? { ok: false, calls: 0 } : { ok: true, calls: 0 }
    }
  }

  return { consume, consumeProvider }
}
