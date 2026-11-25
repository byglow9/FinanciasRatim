import { createHash } from 'node:crypto'

// Cache da fala por IA (D-02): ate K variantes por chave, TTL de 24 horas, Map em processo na frente
// do Firestore (aiCache/{sha256 cortado}). Guarda so o texto aprovado, a data e a chave: nunca
// resumo, descricao, prompt nem chave de API. Toda variante lida e revalidada pelo chamador contra
// o resumo atual antes de ser servida; a reprovada e removida do documento.
// Erro do Firestore nunca lanca: leitura vira miss e gravacao e ignorada (a memoria segue valendo).

const COLLECTION = 'aiCache'
const KEY_HEX_LEN = 40
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const PEOPLE = Object.freeze(['ele', 'ela'])
/** Limite de chaves em memoria; passou disso, sai a mais antiga. */
const MEMORY_MAX = 500

/**
 * Codigo curto do erro, nunca a mensagem.
 * @param {any} err
 * @returns {string}
 */
function codeOf(err) {
  return String(err?.code ?? err?.name ?? 'erro').slice(0, 40)
}

/**
 * Instante em milissegundos de um Timestamp do Firestore, Date ou numero.
 * @param {any} value
 * @returns {number}
 */
function millisOf(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Id do documento: sha256 de "hid|person|canonical", cortado em 40 caracteres hexadecimais.
 * @param {string} hid
 * @param {string} person
 * @param {string} canonical chave canonica (shared/core/aiCacheKey.js)
 * @returns {string}
 */
export function cacheKeyOf(hid, person, canonical) {
  return createHash('sha256').update(`${hid}|${person}|${canonical}`).digest('hex').slice(0, KEY_HEX_LEN)
}

/**
 * O acaso e injetado (o index.js passa Math.random; sem ele a escolha e sempre a primeira).
 * @param {{
 *   db: any,
 *   config: { cacheTtlHours?: number, cacheVariants?: number },
 *   now?: () => Date,
 *   rand?: () => number,
 *   log?: { warn?: (line: string) => void },
 * }} deps
 */
export function createCache({ db, config, now = () => new Date(), rand = () => 0, log = console }) {
  /** @type {Map<string, { ownerId: string, person: string, variants: string[], lastText: string | null, expiresAt: number }>} */
  const memory = new Map()
  /** @type {Map<string, Promise<any>>} */
  const flights = new Map()
  /** @type {Map<string, Promise<void>>} */
  const writes = new Map()

  const ttlMs = () => Math.max(1, Number(config.cacheTtlHours) || 24) * 3_600_000
  const maxVariants = () => Math.max(1, Math.trunc(Number(config.cacheVariants)) || 3)

  /** @param {string} key @param {any} entry */
  function remember(key, entry) {
    memory.delete(key)
    memory.set(key, entry)
    if (memory.size > MEMORY_MAX) memory.delete(/** @type {string} */ (memory.keys().next().value))
  }

  /**
   * Entrada valida (nao vencida) da chave: memoria primeiro, depois o Firestore.
   * @param {string} key
   * @returns {Promise<any | null>}
   */
  async function load(key) {
    const t = now().getTime()
    const mem = memory.get(key)
    if (mem) {
      if (mem.expiresAt > t) return mem
      memory.delete(key)
    }
    let data = null
    try {
      const snap = await db.collection(COLLECTION).doc(key).get()
      data = snap.exists ? snap.data() : null
    } catch (err) {
      log.warn?.(`[ai] cache indisponivel codigo=${codeOf(err)}`)
      return null
    }
    if (!data || !Array.isArray(data.variants)) return null
    const expiresAt = millisOf(data.expiresAt)
    if (expiresAt <= t) return null
    const entry = {
      ownerId: String(data.ownerId ?? ''),
      person: String(data.person ?? ''),
      variants: data.variants.filter((v) => typeof v === 'string' && v !== ''),
      lastText: typeof data.lastText === 'string' ? data.lastText : null,
      expiresAt,
    }
    if (entry.variants.length === 0) return null
    remember(key, entry)
    return entry
  }

  /**
   * Grava o estado atual da entrada, em fila por chave para uma gravacao antiga nunca vencer uma nova.
   * Nunca lanca.
   * @param {string} key
   */
  function persist(key) {
    const previous = writes.get(key) ?? Promise.resolve()
    const next = previous.then(async () => {
      const entry = memory.get(key)
      if (!entry) return
      try {
        await db.collection(COLLECTION).doc(key).set({
          ownerId: entry.ownerId,
          person: entry.person,
          variants: [...entry.variants],
          lastText: entry.lastText,
          expiresAt: new Date(entry.expiresAt),
          updatedAt: now(),
        })
      } catch (err) {
        log.warn?.(`[ai] cache nao gravado codigo=${codeOf(err)}`)
      }
    })
    writes.set(key, next)
    void next.then(() => {
      if (writes.get(key) === next) writes.delete(key)
    })
    return next
  }

  /**
   * Variante para servir. Cada candidata passa por `validate` (devolve o texto aprovado ou null)
   * contra o resumo atual; a reprovada sai do documento e nunca e mostrada. Entre as validas sorteia
   * uma que nao seja a ultima servida (se houver so uma, serve essa). `count` e o numero de variantes
   * validas guardadas, para o chamador decidir se ainda vale gerar mais uma.
   * @param {{ hid: string, person: string, canonical: string, validate: (text: string) => string | null }} args
   * @returns {Promise<{ text: string | null, count: number }>}
   */
  async function lookup({ hid, person, canonical, validate }) {
    if (!ID_RE.test(String(hid)) || !PEOPLE.includes(person)) return { text: null, count: 0 }
    const key = cacheKeyOf(hid, person, canonical)
    const entry = await load(key)
    if (!entry) return { text: null, count: 0 }

    /** @type {string[]} */
    const good = []
    let dropped = false
    for (const v of entry.variants) {
      let ok = null
      try {
        ok = validate(v)
      } catch {
        ok = null
      }
      if (typeof ok === 'string' && ok !== '') good.push(ok)
      else dropped = true
    }
    if (dropped) {
      entry.variants = good
      if (entry.lastText !== null && !good.includes(entry.lastText)) entry.lastText = null
      if (good.length === 0) {
        memory.delete(key)
        try {
          await db.collection(COLLECTION).doc(key).delete()
        } catch (err) {
          log.warn?.(`[ai] cache nao limpo codigo=${codeOf(err)}`)
        }
        return { text: null, count: 0 }
      }
    }
    const pool = good.length > 1 ? good.filter((v) => v !== entry.lastText) : good
    const text = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
    entry.lastText = text
    remember(key, entry)
    await persist(key)
    return { text, count: good.length }
  }

  /**
   * Guarda uma variante aprovada (so o texto). Passando de K, sai a mais antiga. Entrada vencida
   * recomeca; entrada viva mantem o vencimento de quando foi criada. Nunca lanca.
   * @param {{ hid: string, person: string, canonical: string, text: string }} args
   * @returns {Promise<void>}
   */
  async function store({ hid, person, canonical, text }) {
    if (!ID_RE.test(String(hid)) || !PEOPLE.includes(person) || typeof text !== 'string' || text === '') return
    const key = cacheKeyOf(hid, person, canonical)
    const live = await load(key)
    const entry = live ?? { ownerId: hid, person, variants: [], lastText: null, expiresAt: now().getTime() + ttlMs() }
    entry.variants = [...entry.variants.filter((v) => v !== text), text].slice(-maxVariants())
    entry.lastText = text
    remember(key, entry)
    await persist(key)
  }

  /**
   * Coalescencia: chamadas simultaneas com a mesma chave dividem uma unica execucao de `fn`. A
   * execucao segue ate o fim mesmo que quem a pediu tenha desistido (prazo da rota), e o que ela
   * grava no cache vale para a proxima vez.
   * @template T
   * @param {{ hid: string, person: string, canonical: string }} args
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  function coalesce({ hid, person, canonical }, fn) {
    const key = cacheKeyOf(hid, person, canonical)
    const running = flights.get(key)
    if (running) return running
    const p = (async () => fn())()
    flights.set(key, p)
    const clear = () => {
      if (flights.get(key) === p) flights.delete(key)
    }
    p.then(clear, clear)
    return p
  }

  return { lookup, store, coalesce }
}
