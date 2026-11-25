// Configuracao da IA lida so de variaveis de ambiente do servidor (D-10, IA-05).
// Nada de modelo, cota ou limite diario de provedor fica fixo no codigo: sem modelo configurado o
// provedor fica desligado. A baseUrl de cada tipo de provedor e fixa aqui (SSRF, T-07-34): so o id
// da conta do Cloudflare vem da configuracao do servidor, e e validado antes de entrar na URL.

/** Tipos de provedor conhecidos, na ordem em que o padrao de exemplo os lista. */
export const PROVIDER_IDS = Object.freeze(['cloudflare', 'groq', 'xai'])

const GROQ_BASE = 'https://api.groq.com/openai/v1'
const XAI_BASE = 'https://api.x.ai/v1'

const ACCOUNT_RE = /^[A-Za-z0-9]{6,64}$/
// Chave: caracteres imprimiveis sem espaco (cabecalho Authorization).
const KEY_RE = /^[\x21-\x7E]{8,512}$/
// Id de modelo: letras, numeros e os sinais usuais de caminho e versao.
const MODEL_RE = /^[A-Za-z0-9@._:/+-]{1,120}$/

/**
 * Inteiro lido do ambiente: valor invalido ou fora da faixa volta ao padrao.
 * @param {unknown} raw
 * @param {number} fallback
 * @param {{ min?: number, max?: number }} [range]
 * @returns {number}
 */
function intOf(raw, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof raw !== 'string' || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback
}

/**
 * @param {unknown} raw
 * @param {boolean} fallback
 * @returns {boolean}
 */
function boolOf(raw, fallback) {
  if (typeof raw !== 'string') return fallback
  const v = raw.trim().toLowerCase()
  if (['false', '0', 'nao', 'no', 'off'].includes(v)) return false
  if (['true', '1', 'sim', 'yes', 'on'].includes(v)) return true
  return fallback
}

/**
 * Nome do provedor para o log: so letras e numeros, curto.
 * @param {string} name
 * @returns {string}
 */
function logName(name) {
  return name.replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || '?'
}

/**
 * Le TODAS as variaveis AI_* de uma vez, com padroes. Provedor da lista sem chave ou sem modelo
 * fica de fora, com um aviso de so o nome do provedor. Nunca lanca.
 * @param {Record<string, string | undefined>} [env]
 * @param {{ warn?: (line: string) => void }} [log]
 */
export function readAiConfig(env = process.env, log = console) {
  const warn = (line) => (typeof log?.warn === 'function' ? log.warn(line) : undefined)
  const e = env ?? {}

  const wanted = String(e.AI_PROVIDERS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const providers = []
  const seen = new Set()
  for (const id of wanted) {
    if (seen.has(id)) continue
    seen.add(id)
    if (!PROVIDER_IDS.includes(id)) {
      warn(`[ai] provedor desconhecido na lista: ${logName(id)}`)
      continue
    }
    const spec = providerSpec(id, e)
    if (spec === null) {
      warn(`[ai] provedor desligado, falta configuracao: ${id}`)
      continue
    }
    providers.push(spec)
  }

  const peekMin = intOf(e.VINTEM_PEEK_MIN_MS, 360_000)
  const peekMax = Math.max(intOf(e.VINTEM_PEEK_MAX_MS, 900_000), peekMin)

  return {
    providers,
    timeoutMs: intOf(e.AI_TIMEOUT_MS, 4000),
    totalBudgetMs: intOf(e.AI_TOTAL_BUDGET_MS, 6000),
    dailyCapPerUser: intOf(e.AI_DAILY_CAP_PER_USER, 100, { min: 0 }),
    cacheTtlHours: intOf(e.AI_CACHE_TTL_HOURS, 24),
    cacheVariants: intOf(e.AI_CACHE_VARIANTS, 3),
    // Teto diario proprio por provedor (dia UTC, 07-12): ausente ou zero = so o freio por 429.
    providerCaps: {
      cloudflare: intOf(e.AI_PROVIDER_CAP_CLOUDFLARE, 0, { min: 0 }),
      groq: intOf(e.AI_PROVIDER_CAP_GROQ, 0, { min: 0 }),
      xai: intOf(e.AI_PROVIDER_CAP_XAI, 0, { min: 0 }),
    },
    requireProfanity: boolOf(e.AI_REQUIRE_PROFANITY, true),
    openPerDay: intOf(e.AI_OPEN_PER_DAY, 3, { min: 0 }),
    peekPerDay: intOf(e.AI_PEEK_PER_DAY, 6, { min: 0 }),
    peekMinMs: peekMin,
    peekMaxMs: peekMax,
    burstPerMin: intOf(e.AI_BURST_PER_MIN, 20),
    // Prazo que o app espera a IA nas reacoes a lancamento e a limite (devolvido em GET /hints, 07-16).
    reactionTimeoutMs: intOf(e.AI_REACTION_TIMEOUT_MS, 2500, { min: 1500, max: 4000 }),
  }
}

/**
 * Especificacao de um provedor ligado, ou null se faltar chave, modelo ou id de conta valido.
 * @param {string} id
 * @param {Record<string, string | undefined>} e
 * @returns {{ id: string, baseUrl: string, apiKey: string, model: string } | null}
 */
function providerSpec(id, e) {
  /** @type {string | undefined} */
  let key
  /** @type {string | undefined} */
  let model
  /** @type {string} */
  let baseUrl
  if (id === 'cloudflare') {
    const account = (e.AI_CF_ACCOUNT_ID ?? '').trim()
    if (!ACCOUNT_RE.test(account)) return null
    key = e.AI_CF_API_TOKEN
    model = e.AI_CF_MODEL
    baseUrl = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`
  } else if (id === 'groq') {
    key = e.AI_GROQ_API_KEY
    model = e.AI_GROQ_MODEL
    baseUrl = GROQ_BASE
  } else {
    key = e.AI_XAI_API_KEY
    model = e.AI_XAI_MODEL
    baseUrl = XAI_BASE
  }
  const apiKey = (key ?? '').trim()
  const modelId = (model ?? '').trim()
  if (!KEY_RE.test(apiKey) || !MODEL_RE.test(modelId)) return null
  return { id, baseUrl, apiKey, model: modelId }
}
