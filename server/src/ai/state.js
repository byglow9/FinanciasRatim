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

/**
 * Codigo curto do erro, nunca a mensagem (poderia carregar dado).
 * @param {any} err
 * @returns {string}
 */
function codeOf(err) {
  return String(err?.code ?? err?.name ?? 'erro').slice(0, 40)
}

const isPair = (hid, person) => typeof hid === 'string' && ID_RE.test(hid) && PEOPLE.includes(person)

/**
 * Lista de ids (so textos no formato de id de fala).
 * @param {unknown} value
 * @returns {string[]}
 */
function idsOf(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string' && LINE_ID_RE.test(v)) : []
}

/**
 * Lista de falas { id, cena, text } saneada.
 * @param {unknown} value
 * @returns {Array<{ id: string, cena: string, text: string }>}
 */
function entriesOf(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const e of value) {
    if (e && typeof e.id === 'string' && LINE_ID_RE.test(e.id) && typeof e.text === 'string') {
      out.push({ id: e.id, cena: typeof e.cena === 'string' ? e.cena : '', text: e.text })
    }
  }
  return out
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
    return { rejected: [], liked: [], generated: [], served: [], pushRecent: [] }
  }
  return {
    rejected: idsOf(data.rejected),
    liked: entriesOf(data.liked),
    generated: entriesOf(data.generated),
    served: entriesOf(data.served),
    pushRecent: idsOf(data.pushRecent),
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
          const mine = snap.exists && snap.data()?.ownerId === hid && snap.data()?.person === person
          if (mine) tx.update(ref, patch)
          else tx.set(ref, { ownerId: hid, person, ...patch })
          return { ok: true }
        }, TX_OPTIONS)
      } catch (err) {
        log.warn?.(`[ai] voto do OINC nao gravado codigo=${codeOf(err)}`)
        return { ok: false, reason: 'erro' }
      }
    },
  }
}
