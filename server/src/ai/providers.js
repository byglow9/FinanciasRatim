// Adaptador unico de provedor de IA, compativel com o formato OpenAI (POST {baseUrl}/chat/completions).
// Atende Cloudflare, Groq e xAI: so mudam baseUrl, chave e modelo, todos vindos da configuracao.
// Nada de chave, prompt ou texto gerado em log ou em erro: so provedor, status, codigo e latencia.

const DEFAULT_TIMEOUT_MS = 4000

/**
 * Codigo numerico de erro do corpo da resposta (Cloudflare manda errors[0].code), sem a mensagem.
 * @param {any} body
 * @returns {number | null}
 */
function codeOf(body) {
  const candidates = [body?.errors?.[0]?.code, body?.error?.code, body?.code]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isInteger(n)) return n
  }
  return null
}

/**
 * Retry-After em milissegundos (so a forma em segundos), ou null.
 * @param {{ get?: (name: string) => string | null } | undefined} headers
 * @returns {number | null}
 */
function retryAfterOf(headers) {
  const raw = typeof headers?.get === 'function' ? headers.get('retry-after') : null
  const n = Number(raw)
  return raw !== null && raw !== '' && Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) : null
}

/**
 * Provedor unico. `call` faz uma requisicao e devolve sempre um objeto (nunca lanca):
 *   { ok: true, text, status, ms }
 *   { ok: false, reason: 'timeout' | 'rede' | 'vazio' | 'http', status, code, retryAfterMs, ms }
 * `reasoningEffort` so vai no corpo quando configurado; sem ele o pedido nao muda.
 * @param {{ id: string, baseUrl: string, apiKey: string, model: string, reasoningEffort?: string, fetch?: typeof fetch, timeoutMs?: number }} spec
 */
export function createProvider({ id, baseUrl, apiKey, model, reasoningEffort, fetch: fetchFn = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  /**
   * @param {{ messages: Array<{ role: string, content: string }>, maxTokens: number, temperature: number, timeoutMs?: number }} args
   */
  async function call({ messages, maxTokens, temperature, timeoutMs: callTimeout }) {
    const started = Date.now()
    const ms = () => Date.now() - started
    let res
    try {
      res = await fetchFn(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(callTimeout ?? timeoutMs),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        // Campo indefinido some no JSON.stringify.
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, reasoning_effort: reasoningEffort }),
      })
    } catch (err) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
      return { ok: false, reason: timedOut ? 'timeout' : 'rede', status: 0, code: null, retryAfterMs: null, ms: ms() }
    }

    /** @type {any} */
    let body = null
    try {
      body = await res.json()
    } catch {
      body = null
    }

    if (!res.ok) {
      return {
        ok: false,
        reason: 'http',
        status: res.status,
        code: codeOf(body),
        retryAfterMs: retryAfterOf(res.headers),
        ms: ms(),
      }
    }

    // Modelos que raciocinam podem gastar o max_tokens e devolver content vazio: conta como falha.
    const content = body?.choices?.[0]?.message?.content
    const text = typeof content === 'string' ? content.trim() : ''
    if (text === '') return { ok: false, reason: 'vazio', status: res.status, code: null, retryAfterMs: null, ms: ms() }
    return { ok: true, text, status: res.status, ms: ms() }
  }

  /**
   * Tenta este provedor e devolve { ok: true, text, providerId } quando `validate` aprova.
   * `validate` pode devolver boolean ou { ok, text } (o texto devolvido, normalizado, vence).
   * @param {{ messages: Array<{ role: string, content: string }>, maxTokens: number, temperature: number, validate?: (text: string) => any }} args
   * @returns {Promise<{ ok: true, text: string, providerId: string } | { ok: false }>}
   */
  async function complete({ messages, maxTokens, temperature, validate }) {
    const r = await call({ messages, maxTokens, temperature })
    if (!r.ok) return { ok: false }
    const text = approved(validate, r.text)
    return text === null ? { ok: false } : { ok: true, text, providerId: id }
  }

  return { id, call, complete }
}

/**
 * Aplica o validador: devolve o texto aprovado (normalizado se o validador o devolver) ou null.
 * Um validador que lanca conta como reprovacao.
 * @param {((text: string) => any) | undefined} validate
 * @param {string} text
 * @returns {string | null}
 */
export function approved(validate, text) {
  if (typeof validate !== 'function') return text
  try {
    const v = validate(text)
    if (v === true) return text
    if (v && typeof v === 'object' && v.ok === true) return typeof v.text === 'string' && v.text !== '' ? v.text : text
  } catch {
    return null
  }
  return null
}

/**
 * Provedores ligados da configuracao, na ordem de AI_PROVIDERS.
 * @param {{ providers: Array<{ id: string, baseUrl: string, apiKey: string, model: string, reasoningEffort?: string }>, timeoutMs: number }} config
 * @param {{ fetch?: typeof fetch }} [deps]
 */
export function createProviders(config, { fetch: fetchFn = globalThis.fetch } = {}) {
  return config.providers.map((spec) => createProvider({ ...spec, fetch: fetchFn, timeoutMs: config.timeoutMs }))
}

// ---------------------------------------------------------------------------------------------
// Cadeia de provedores com prazo e freio
// ---------------------------------------------------------------------------------------------

/** Cloudflare: 429 com este codigo e a cota diaria esgotada (zera as 00:00 UTC). */
const CODE_DAILY_QUOTA = 3036
/** Cloudflare: modelo so do plano pago, inexistente, nome invalido ou descontinuado. */
const CODES_BAD_MODEL = Object.freeze([5035, 5007, 3042, 5028])

const PAUSE_SHORT_MS = 60_000
const PAUSE_RETRY_AFTER_MAX_MS = 15 * 60_000
const PAUSE_KEY_REFUSED_MS = 10 * 60_000

/**
 * Proximo 00:00 UTC depois do instante.
 * @param {number} t
 * @returns {number}
 */
function nextUtcMidnight(t) {
  const d = new Date(t)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
}

/**
 * Cadeia que tenta os provedores na ordem da configuracao, cada um com prazo proprio e dentro de um
 * orcamento total, com freios por provedor guardados em memoria (relogio injetado). Reprovacao do
 * validador, resposta vazia, timeout e erro passam ao proximo; no fim devolve { ok: false } e o app
 * usa o banco de frases. Nunca guarda nem registra texto, prompt, chave ou resumo.
 * @param {{
 *   providers: Array<{ id: string, call: Function }>,
 *   config: { timeoutMs: number, totalBudgetMs: number },
 *   now?: () => Date,
 *   log?: { log?: (line: string) => void, warn?: (line: string) => void },
 *   gate?: (args: { providerId: string }) => Promise<{ ok: boolean }>,
 * }} deps
 * `gate` e o freio global por provedor do 07-12 (teto diario proprio no Firestore): negado, o
 * provedor e pulado sem rede e fica fora do resto do dia UTC.
 */
export function createChain({ providers, config, now = () => new Date(), log = console, gate = undefined }) {
  /** @type {Map<string, { disabled: boolean, blockedUntil: number }>} */
  const state = new Map()
  /** @type {Map<string, { calls: number, ok: number, fail: Record<string, number> }>} */
  const counts = new Map()
  for (const p of providers) {
    state.set(p.id, { disabled: false, blockedUntil: 0 })
    counts.set(p.id, { calls: 0, ok: 0, fail: {} })
  }

  /** @param {string} id @param {string} reason */
  function countFail(id, reason) {
    const c = counts.get(id)
    if (c) c.fail[reason] = (c.fail[reason] ?? 0) + 1
  }

  /** Linha de log so com provedor, status, codigo, latencia e um motivo de lista fechada. */
  function line(id, r, extra = '') {
    const code = r.code === null || r.code === undefined ? '' : ` codigo=${r.code}`
    log.log?.(`[ai] provedor=${id} status=${r.status ?? 0}${code} ms=${r.ms ?? 0}${extra}`)
  }

  /**
   * Aplica o freio da falha e devolve o motivo de contagem.
   * @param {string} id
   * @param {any} r resultado de call com ok falso
   * @param {number} t
   * @returns {string}
   */
  function brake(id, r, t) {
    const st = /** @type {{ disabled: boolean, blockedUntil: number }} */ (state.get(id))
    if (r.reason !== 'http') return r.reason
    if (CODES_BAD_MODEL.includes(r.code)) {
      st.disabled = true
      log.warn?.(`[ai] modelo invalido: provedor=${id} desligado ate reiniciar`)
      return 'modelo-invalido'
    }
    if (r.status === 429 && r.code === CODE_DAILY_QUOTA) {
      st.blockedUntil = nextUtcMidnight(t)
      return 'cota-diaria'
    }
    if (r.status === 401 || r.status === 403) {
      st.blockedUntil = t + PAUSE_KEY_REFUSED_MS
      return 'chave'
    }
    if (r.status === 429 || r.status >= 500 || r.code === 3040) {
      const wait = r.retryAfterMs === null || r.retryAfterMs === undefined ? PAUSE_SHORT_MS : Math.min(r.retryAfterMs, PAUSE_RETRY_AFTER_MAX_MS)
      st.blockedUntil = t + wait
      return r.code === 3040 ? 'capacidade' : r.status === 429 ? 'limite' : 'servidor'
    }
    return 'http'
  }

  /**
   * @param {{ messages: Array<{ role: string, content: string }>, maxTokens: number, temperature: number, validate?: (text: string) => any }} args
   * @returns {Promise<{ ok: true, text: string, providerId: string } | { ok: false }>}
   */
  async function complete({ messages, maxTokens, temperature, validate }) {
    const startedAt = now().getTime()
    for (const p of providers) {
      const t = now().getTime()
      const remaining = config.totalBudgetMs - (t - startedAt)
      if (remaining <= 0) break
      const st = /** @type {{ disabled: boolean, blockedUntil: number }} */ (state.get(p.id))
      if (st.disabled || st.blockedUntil > t) continue

      if (gate) {
        let allowed = { ok: false }
        try {
          allowed = await gate({ providerId: p.id })
        } catch {
          allowed = { ok: false }
        }
        if (!allowed.ok) {
          st.blockedUntil = nextUtcMidnight(now().getTime())
          countFail(p.id, 'teto-proprio')
          continue
        }
      }
      const left = config.totalBudgetMs - (now().getTime() - startedAt)
      if (left <= 0) break

      const c = /** @type {{ calls: number, ok: number, fail: Record<string, number> }} */ (counts.get(p.id))
      c.calls += 1
      const r = await p.call({ messages, maxTokens, temperature, timeoutMs: Math.min(config.timeoutMs, left) })
      line(p.id, r)
      if (!r.ok) {
        countFail(p.id, brake(p.id, r, now().getTime()))
        continue
      }
      const text = approved(validate, r.text)
      if (text === null) {
        // Recusa, fala mansa ou fora da regua: cai no proximo provedor (D-17). So a contagem fica.
        countFail(p.id, 'reprovada')
        continue
      }
      c.ok += 1
      return { ok: true, text, providerId: p.id }
    }
    return { ok: false }
  }

  /**
   * Ha ao menos um provedor que a cadeia tentaria agora (nao desligado nem em pausa)? Serve para a
   * fala nao gastar o teto da pessoa quando nenhuma chamada real vai acontecer.
   * @returns {boolean}
   */
  function available() {
    const t = now().getTime()
    for (const p of providers) {
      const st = /** @type {{ disabled: boolean, blockedUntil: number }} */ (state.get(p.id))
      if (!st.disabled && st.blockedUntil <= t) return true
    }
    return false
  }

  /** Contagens para o dono diagnosticar. Nunca guarda texto. */
  function stats() {
    /** @type {Record<string, { calls: number, ok: number, fail: Record<string, number>, disabled: boolean, paused: boolean }>} */
    const out = {}
    const t = now().getTime()
    for (const [id, c] of counts) {
      const st = /** @type {{ disabled: boolean, blockedUntil: number }} */ (state.get(id))
      out[id] = { calls: c.calls, ok: c.ok, fail: { ...c.fail }, disabled: st.disabled, paused: st.blockedUntil > t }
    }
    return out
  }

  return { complete, stats, available }
}
