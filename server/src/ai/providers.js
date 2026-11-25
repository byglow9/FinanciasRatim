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
 * @param {{ id: string, baseUrl: string, apiKey: string, model: string, fetch?: typeof fetch, timeoutMs?: number }} spec
 */
export function createProvider({ id, baseUrl, apiKey, model, fetch: fetchFn = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
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
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
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
 * @param {{ providers: Array<{ id: string, baseUrl: string, apiKey: string, model: string }>, timeoutMs: number }} config
 * @param {{ fetch?: typeof fetch }} [deps]
 */
export function createProviders(config, { fetch: fetchFn = globalThis.fetch } = {}) {
  return config.providers.map((spec) => createProvider({ ...spec, fetch: fetchFn, timeoutMs: config.timeoutMs }))
}
