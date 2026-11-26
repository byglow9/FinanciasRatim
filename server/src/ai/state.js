import { findLine } from '../../../shared/core/oincLines.js'

// Estado do OINC por pessoa (07.1, D-12): falas reprovadas, aprovadas, geradas e servidas.
// Documento oincState/{hid}__{person} = { ownerId, person, rejected, liked, generated, served,
// pushRecent, updatedAt }. So o servidor le e escreve (a colecao fica negada ao cliente pelas regras).
// O app manda so o id e o voto: o texto de uma fala aprovada vem do acervo ou do proprio documento,
// nunca do corpo do pedido. Erro de banco nunca lanca: vira { ok: false } e o log leva so o codigo.

const STATE = 'oincState'
const TX_OPTIONS = Object.freeze({ maxAttempts: 10 })
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const LINE_ID_RE = /^[a-z0-9-]{3,64}$/
const PEOPLE = Object.freeze(['ele', 'ela'])
// Cortes para a lista nunca se aproximar do limite de tamanho do documento.
const MAX_REJECTED = 500
const MAX_LIKED = 100
const MAX_GENERATED = 200
const MAX_SERVED = 30
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Codigo curto do erro, nunca a mensagem (poderia carregar dado).
 * @param {any} err
 * @returns {string}
 */
function codeOf(err) {
  return String(err?.code ?? err?.name ?? 'erro').slice(0, 40)
}

const isPair = (hid, person) => typeof hid === 'string' && ID_RE.test(hid) && PEOPLE.includes(person)

/** Verdadeiro quando o documento existe e e deste casal e desta pessoa. */
const isMine = (snap, hid, person) => Boolean(snap?.exists) && snap.data()?.ownerId === hid && snap.data()?.person === person

/**
 * Lista de ids (so textos no formato de id de fala).
 * @param {unknown} value
 * @returns {string[]}
 */
function idsOf(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string' && LINE_ID_RE.test(v)) : []
}

/**
 * Lista de falas { id, cena, text } saneada. A gerada guarda tambem o lote (zero).
 * @param {unknown} value
 * @returns {Array<{ id: string, cena: string, text: string }>}
 */
function entriesOf(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const e of value) {
    if (e && typeof e.id === 'string' && LINE_ID_RE.test(e.id) && typeof e.text === 'string') {
      const entry = { id: e.id, cena: typeof e.cena === 'string' ? e.cena : '', text: e.text }
      out.push(Number.isInteger(e.lote) ? { ...entry, lote: e.lote } : entry)
    }
  }
  return out
}

/**
 * Dia da ultima reposicao por cena: so chaves de cena e dias no formato aaaa-mm-dd.
 * @param {unknown} value
 * @returns {Record<string, string>}
 */
function daysOf(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([cena, day]) => LINE_ID_RE.test(cena) && typeof day === 'string' && DAY_KEY_RE.test(day)),
  )
}

/**
 * Documento lido e conferido: de outro dono ou de outra pessoa vale vazio.
 * @param {any} snap
 * @param {string} hid
 * @param {string} person
 */
function stateOf(snap, hid, person) {
  const data = snap?.exists ? snap.data() : null
  if (!data || data.ownerId !== hid || data.person !== person) {
    return { rejected: [], liked: [], generated: [], served: [], pushRecent: [], refillDays: {} }
  }
  return {
    rejected: idsOf(data.rejected),
    liked: entriesOf(data.liked),
    generated: entriesOf(data.generated),
    served: entriesOf(data.served),
    pushRecent: idsOf(data.pushRecent),
    refillDays: daysOf(data.refillDays),
  }
}

/**
 * Estado por pessoa do OINC. Toda leitura e escrita e por casal e pessoa vindos do token.
 * @param {{ db: any, now?: () => Date, log?: { warn?: (line: string) => void } }} deps
 */
export function createOincState({ db, now = () => new Date(), log = console }) {
  const refOf = (hid, person) => db.collection(STATE).doc(`${hid}__${person}`)

  return {
    /**
     * Estado da pessoa. Falha de banco ou par invalido devolve listas vazias.
     * @param {{ hid: string, person: string }} who
     */
    async read({ hid, person }) {
      if (!isPair(hid, person)) return stateOf(null, '', '')
      try {
        return stateOf(await refOf(hid, person).get(), hid, person)
      } catch (err) {
        log.warn?.(`[ai] estado do OINC nao lido codigo=${codeOf(err)}`)
        return stateOf(null, '', '')
      }
    },

    /**
     * Marca a cena como reposta no dia, por transacao: so o primeiro pedido do dia recebe ok. Falha de
     * banco nega, para a duvida nunca gastar cota.
     * @param {{ hid: string, person: string, cena: string, dayKey: string }} args
     * @returns {Promise<{ ok: boolean }>}
     */
    async claimRefill({ hid, person, cena, dayKey }) {
      if (!isPair(hid, person) || typeof cena !== 'string' || !LINE_ID_RE.test(cena)) return { ok: false }
      if (typeof dayKey !== 'string' || !DAY_KEY_RE.test(dayKey)) return { ok: false }
      try {
        const ref = refOf(hid, person)
        return await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref)
          const state = stateOf(snap, hid, person)
          if (state.refillDays[cena] === dayKey) return { ok: false }
          const refillDays = { ...state.refillDays, [cena]: dayKey }
          if (isMine(snap, hid, person)) tx.update(ref, { refillDays, updatedAt: now() })
          else tx.set(ref, { ownerId: hid, person, ...state, refillDays, updatedAt: now() })
          return { ok: true }
        }, TX_OPTIONS)
      } catch (err) {
        log.warn?.(`[ai] reposicao nao marcada codigo=${codeOf(err)}`)
        return { ok: false }
      }
    },

    /**
     * Guarda falas geradas e ja conferidas; id repetido nao entra e ficam as ultimas 200.
     * @param {{ hid: string, person: string, lines: Array<{ id: string, cena: string, text: string, lote: number }> }} args
     * @returns {Promise<{ ok: boolean, added: number }>}
     */
    async addGenerated({ hid, person, lines }) {
      if (!isPair(hid, person)) return { ok: false, added: 0 }
      const incoming = entriesOf(lines)
      if (incoming.length === 0) return { ok: true, added: 0 }
      try {
        const ref = refOf(hid, person)
        return await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref)
          const state = stateOf(snap, hid, person)
          const have = new Set(state.generated.map((g) => g.id))
          const fresh = incoming.filter((g) => !have.has(g.id))
          const generated = [...state.generated, ...fresh].slice(-MAX_GENERATED)
          if (isMine(snap, hid, person)) tx.update(ref, { generated, updatedAt: now() })
          else tx.set(ref, { ownerId: hid, person, ...state, generated, updatedAt: now() })
          return { ok: true, added: fresh.length }
        }, TX_OPTIONS)
      } catch (err) {
        log.warn?.(`[ai] falas geradas nao guardadas codigo=${codeOf(err)}`)
        return { ok: false, added: 0 }
      }
    },

    /**
     * Grava o voto 'sim' ou 'nao' numa fala conhecida. O texto vem sempre do servidor.
     * @param {{ hid: string, person: string, id: string, voto: string }} args
     * @returns {Promise<{ ok: boolean, reason?: string }>}
     */
    async vote({ hid, person, id, voto }) {
      if (!isPair(hid, person)) return { ok: false, reason: 'invalida' }
      if (typeof id !== 'string' || !LINE_ID_RE.test(id)) return { ok: false, reason: 'desconhecida' }
      if (voto !== 'sim' && voto !== 'nao') return { ok: false, reason: 'invalida' }
      try {
        const ref = refOf(hid, person)
        return await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref)
          const state = stateOf(snap, hid, person)
          // Fala conhecida: do acervo, ou gerada ou servida para esta mesma pessoa.
          const line = findLine(id)
          const own = state.generated.find((g) => g.id === id) ?? state.served.find((s) => s.id === id)
          if (!line && !own) return { ok: false, reason: 'desconhecida' }
          const cena = line ? line.cena : own.cena
          const text = line ? line.t : own.text

          const rejected = state.rejected.filter((x) => x !== id)
          const liked = state.liked.filter((x) => x.id !== id)
          if (voto === 'nao') rejected.push(id)
          else liked.push({ id, cena, text })

          const patch = {
            rejected: rejected.slice(-MAX_REJECTED),
            liked: liked.slice(-MAX_LIKED),
            generated: state.generated.slice(-MAX_GENERATED),
            served: state.served.slice(-MAX_SERVED),
            pushRecent: state.pushRecent,
            updatedAt: now(),
          }
          if (isMine(snap, hid, person)) tx.update(ref, patch)
          else tx.set(ref, { ownerId: hid, person, ...patch })
          return { ok: true }
        }, TX_OPTIONS)
      } catch (err) {
        log.warn?.(`[ai] voto do OINC nao gravado codigo=${codeOf(err)}`)
        return { ok: false, reason: 'erro' }
      }
    },

    /**
     * Guarda a fala de IA que vai ser mostrada, para ela poder receber voto e nao voltar tao cedo.
     * A repetida vai para o fim da lista; ficam as ultimas 30. Nunca lanca.
     * @param {{ hid: string, person: string, id: string, cena: string, text: string }} args
     * @returns {Promise<{ ok: boolean }>}
     */
    async recordServed({ hid, person, id, cena, text }) {
      if (!isPair(hid, person)) return { ok: false }
      if (typeof id !== 'string' || !LINE_ID_RE.test(id) || typeof text !== 'string' || text === '') return { ok: false }
      try {
        const ref = refOf(hid, person)
        return await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref)
          const state = stateOf(snap, hid, person)
          const entry = { id, cena: typeof cena === 'string' ? cena : '', text }
          const served = [...state.served.filter((x) => x.id !== id), entry].slice(-MAX_SERVED)
          // So `served` muda no documento que ja e da pessoa: os votos nao sao regravados.
          if (isMine(snap, hid, person)) tx.update(ref, { served, updatedAt: now() })
          else tx.set(ref, { ownerId: hid, person, ...state, served, updatedAt: now() })
          return { ok: true }
        }, TX_OPTIONS)
      } catch (err) {
        log.warn?.(`[ai] fala servida nao guardada codigo=${codeOf(err)}`)
        return { ok: false }
      }
    },
  }
}
