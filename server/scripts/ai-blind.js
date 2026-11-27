// Teste cego das falas do OINC (07.1, D-14, D-15, D-33): os mesmos fatos sinteticos falados pelo
// prompt atual e pelo novo, em cada modelo candidato gratis.
//
// Uso (SO no shell do dono, nunca em arquivo do repositorio):
//   export AI_GROQ_API_KEY=...    # chave do Groq
//   export AI_CF_ACCOUNT_ID=...   # id da conta do Cloudflare
//   export AI_CF_API_TOKEN=...    # token com o escopo de Workers AI
//   node server/scripts/ai-blind.js --list      # so confere o catalogo de modelos
//   node server/scripts/ai-blind.js             # roda os modelos padrao
//
// Opcoes:
//   --list            confere o catalogo e sai sem pedir fala nenhuma
//   --novo            so o prompt de hoje (metade das falas)
//   --only a,b        provedores (groq, cloudflare) ou trechos do id do modelo (sem isso, os padroes)
//   --out PASTA       onde gravar os dois arquivos (padrao: a pasta cego da 07.1)
//   --pause-ms N      pausa entre chamadas (padrao 1500)
//
// Saidas:
//   cego-votos.json   o que o dono vota: id opaco, cenario, situacao e texto, em ordem embaralhada
//   cego-chave.json   liga cada id a prompt, provedor e modelo. NAO ABRIR antes de votar.
//
// Rodar de novo na mesma pasta pede so o que ainda nao esta na chave (cota do dia, falha de rede).
// O script nao le arquivos de ambiente, nao importa o banco e nunca imprime chave, cabecalho nem
// endereco com o id da conta. Os ids de modelo ficam SO aqui.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readAiConfig } from '../src/ai/config.js'
import { createProvider } from '../src/ai/providers.js'
import { fetchCatalog, parseArgs } from './ai-compare.js'
import { buildMessages as buildMessagesV1, maxTokens as maxTokensV1 } from './lib/ai-prompt-v1.js'
import { prepareCase } from './lib/ai-compare-fixtures.js'
import { blindCases } from './lib/ai-blind-fixtures.js'
import { ADAPT_TEMPERATURE, TEMPERATURE, buildMessages, examplesFor, keepsBase, looseSuffix, maxTokens, promptFact, speechContext, speechPlan } from '../../shared/core/aiPrompt.js'
import { findLeaks } from '../../shared/core/aiPrivacy.js'
import { normalizeSpeech, validateSpeech } from '../../shared/core/aiValidate.js'
import { buildFacts, factOfTransaction } from '../../shared/core/oincFacts.js'
import { isNearCopy } from '../../shared/core/oincRules.js'

/**
 * Candidatos gratis. `padrao` entra na rodada sem --only; `preview` vai marcado na chave (D-33).
 * `reasoningEffort` e `tokensFactor` sao os mesmos que o servidor receberia por variavel: quem
 * raciocina gasta parte do limite antes de escrever.
 */
export const BLIND_CANDIDATES = Object.freeze(
  [
    { provider: 'groq', model: 'qwen/qwen3.8-27b', reasoningEffort: 'none', tokensFactor: 1, preview: true, padrao: true },
    { provider: 'groq', model: 'openai/gpt-oss-120b', reasoningEffort: 'low', tokensFactor: 4, preview: false, padrao: true },
    { provider: 'groq', model: 'openai/gpt-oss-20b', reasoningEffort: 'low', tokensFactor: 4, preview: false, padrao: false },
    { provider: 'cloudflare', model: '@cf/google/gemma-4-26b-a4b-it', tokensFactor: 4, preview: false, padrao: true },
    { provider: 'cloudflare', model: '@cf/mistralai/mistral-small-3.1-24b-instruct', tokensFactor: 1, preview: false, padrao: false },
    { provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', tokensFactor: 1, preview: false, padrao: false },
    { provider: 'cloudflare', model: '@cf/qwen/qwen3.8-27b', reasoningEffort: 'low', tokensFactor: 4, preview: true, padrao: false },
  ].map((c) => Object.freeze(c)),
)

/** Os dois bracos de prompt: o congelado antes da 07.1 e o de hoje. */
export const BLIND_PROMPTS = Object.freeze(['atual', 'novo'])

export const VOTES_FILE = 'cego-votos.json'
export const KEY_FILE = 'cego-chave.json'

/** O teste e no tom sem filtro, o unico que muda de voz na 07.1. */
const TONE = 'sem-filtro'
const PHASE_DIR = '.planning/phases/07.1-falas-do-oinc-com-qualidade/cego'
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const PREFIX = '[ai-blind]'

const TIMEOUT_MS = 20000
/** 429 com espera curta e limite por minuto: espera e repete. Sem isso (ou acima), e cota. */
const SHORT_RETRY_MAX_MS = 60000
const MAX_WAITS_PER_CALL = 3
const MAX_CONSECUTIVE_FAILS = 5
/** Cloudflare: cota diaria esgotada e falta de capacidade (os dois vem como 429). */
const CODE_DAILY_QUOTA = 3036
const CODE_BUSY = 3040
/** Cloudflare: modelo so do plano pago, inexistente, nome invalido ou descontinuado. */
const CODES_BAD_MODEL = [5035, 5007, 3042, 5028]

const PROVIDER_VARS = Object.freeze({
  groq: ['AI_GROQ_API_KEY'],
  cloudflare: ['AI_CF_ACCOUNT_ID', 'AI_CF_API_TOKEN'],
})
const SECRET_VARS = ['AI_GROQ_API_KEY', 'AI_CF_ACCOUNT_ID', 'AI_CF_API_TOKEN']

const USAGE = [
  'Teste cego das falas do OINC.',
  '',
  'Exporte as chaves no SEU shell (nunca em arquivo do projeto):',
  '  export AI_GROQ_API_KEY=...',
  '  export AI_CF_ACCOUNT_ID=...',
  '  export AI_CF_API_TOKEN=...',
  '',
  'Depois:',
  '  node server/scripts/ai-blind.js --list',
  '  node server/scripts/ai-blind.js',
  '',
  'Opções: --list, --only provedor-ou-modelo[,outro], --out PASTA, --pause-ms N',
].join('\n')

// ---------------------------------------------------------------------------------------------
// Pedido de cada braco
// ---------------------------------------------------------------------------------------------

/** Nome que o prompt usa para cada situacao da rota (igual a speech.js). */
const PROMPT_SITUATION = Object.freeze({
  lancamento: 'lancamento',
  limite: 'limite',
  sync: 'sync',
  abertura: 'abertura',
  espiar: 'espiada',
})

/** Mesma regua para os dois bracos: o palavrao nao e exigido (07.1, D-04). */
const REQUIRE_PROFANITY = false

const verdict = (v) => ({ valido: v.ok, motivo: v.ok ? null : v.reason })

/** Braco do prompt atual: o resumo do mes, como o speech.js antigo montava o pedido. */
function oldRequest(raw, seed) {
  const c = prepareCase(raw)
  if (findLeaks(c.summaryText).length > 0) throw new Error(`${raw.id}: resumo com vazamento`)
  const ctx = {
    length: c.length,
    tone: TONE,
    edgy: c.edgy,
    allowed: c.allowed,
    partnerLabels: [],
    requireProfanity: REQUIRE_PROFANITY,
    ...c.labels,
  }
  return {
    cena: raw.cena,
    messages: buildMessagesV1({
      tone: TONE,
      length: c.length,
      situation: c.promptSituation,
      topic: c.topic,
      summaryText: c.summaryText,
      person: raw.pessoa,
      seed,
    }),
    length: c.length,
    maxTokens: maxTokensV1(c.length),
    judge: (text) => verdict(validateSpeech(text, ctx)),
  }
}

/** O fato que o servidor escolheria para este pedido. */
function factOf(raw) {
  const { input } = raw
  if (raw.situation === 'lancamento' || raw.situation === 'sync') {
    return factOfTransaction(input.latestTx, input.categoryDefs, { surface: 'ia', now: input.now })
  }
  const facts = buildFacts(input, { surface: 'ia' })
  return (
    facts.find(
      (f) => f.cena === raw.cena && (raw.situation !== 'limite' || f.key.endsWith(`:${raw.categoryId}`)),
    ) ?? null
  )
}

/** Braco do prompt novo: um fato, os exemplos da cena e a regua do servidor. */
function newRequest(raw, seed) {
  const fact = factOf(raw)
  if (!fact || fact.cena !== raw.cena) throw new Error(`${raw.id}: sem o fato da cena`)
  if (findLeaks(JSON.stringify(promptFact(fact))).length > 0) throw new Error(`${raw.id}: fato com vazamento`)
  const ctx = speechContext(fact, { tone: TONE, partnerLabels: [], requireProfanity: REQUIRE_PROFANITY })
  const examples = examplesFor({
    cena: fact.cena,
    person: raw.pessoa,
    slots: fact.slots,
    conds: fact.conds,
    tone: TONE,
    seed,
  })
  // O mesmo plano do servidor: adaptar uma fala aprovada ou criar do zero.
  const plan = speechPlan({ tone: TONE, examples, seed })
  const adapting = plan?.mode === 'adaptar'
  return {
    cena: fact.cena,
    temperature: adapting ? ADAPT_TEMPERATURE : TEMPERATURE,
    messages: buildMessages({
      plan,
      tone: TONE,
      fact,
      examples,
      person: raw.pessoa,
      length: ctx.length,
      situation: PROMPT_SITUATION[raw.situation],
    }),
    length: ctx.length,
    maxTokens: maxTokens(ctx.length),
    judge: (text) => {
      const v = validateSpeech(text, ctx)
      if (v.ok && !adapting && isNearCopy(v.text, examples)) return { valido: false, motivo: 'copia' }
      if (v.ok && looseSuffix(v.text)) return { valido: false, motivo: 'sufixo' }
      if (v.ok && adapting && !keepsBase(v.text, plan?.base ?? '')) return { valido: false, motivo: 'desviou' }
      return verdict(v)
    },
  }
}

/**
 * Pedido de um braco para um caso. A semente e a posicao do caso: igual para todos os modelos.
 * @param {ReturnType<typeof blindCases>[number]} raw
 * @param {'atual' | 'novo'} prompt
 * @param {number} seed
 */
export function armRequest(raw, prompt, seed) {
  return prompt === 'atual' ? oldRequest(raw, seed) : newRequest(raw, seed)
}

// ---------------------------------------------------------------------------------------------
// Candidatos e arquivos
// ---------------------------------------------------------------------------------------------

function selectBlind(only) {
  if (only.length === 0) return BLIND_CANDIDATES.filter((c) => c.padrao)
  return BLIND_CANDIDATES.filter((c) =>
    only.some((term) => (Object.hasOwn(PROVIDER_VARS, term) ? c.provider === term : c.model.includes(term))),
  )
}

/** Mesma montagem de endereco, chave e validacao do servidor (readAiConfig). */
function specFor(env, { provider, model }) {
  const config = readAiConfig(
    {
      AI_PROVIDERS: provider,
      AI_CF_ACCOUNT_ID: env.AI_CF_ACCOUNT_ID,
      AI_CF_API_TOKEN: env.AI_CF_API_TOKEN,
      AI_CF_MODEL: model,
      AI_GROQ_API_KEY: env.AI_GROQ_API_KEY,
      AI_GROQ_MODEL: model,
    },
    { warn: () => {} },
  )
  return config.providers[0] ?? null
}

const labelOf = (c) => `${c.provider}:${c.model}`
const comboOf = (caseId, prompt, c) => `${caseId}|${prompt}|${c.provider}|${c.model}`

/**
 * Le o que ja foi gerado na pasta. Os dois arquivos andam juntos: so um deles (ou um ilegivel) para
 * tudo, para nao misturar rodadas nem apagar votos.
 */
function loadRound(dir) {
  const votesPath = path.join(dir, VOTES_FILE)
  const keyPath = path.join(dir, KEY_FILE)
  const has = [existsSync(votesPath), existsSync(keyPath)]
  if (!has[0] && !has[1]) return { votos: [], falas: [] }
  if (!has[0] || !has[1]) return { error: `a pasta tem só um dos arquivos (${VOTES_FILE} e ${KEY_FILE})` }
  try {
    const votos = JSON.parse(readFileSync(votesPath, 'utf8'))
    const falas = JSON.parse(readFileSync(keyPath, 'utf8')).falas
    if (!Array.isArray(votos) || !Array.isArray(falas)) return { error: 'arquivo da rodada com formato inesperado' }
    return { votos, falas }
  } catch {
    return { error: 'arquivo da rodada ilegível' }
  }
}

/** Grava inteiro ou nada: uma interrupcao nao deixa arquivo pela metade. */
function writeWhole(file, text) {
  writeFileSync(`${file}.tmp`, text)
  renameSync(`${file}.tmp`, file)
}

// ---------------------------------------------------------------------------------------------
// Rodada
// ---------------------------------------------------------------------------------------------

/**
 * @returns {Promise<number>} codigo de saida
 */
export async function main({
  env = process.env,
  argv = process.argv.slice(2),
  fetch: fetchFn = globalThis.fetch,
  clock = () => performance.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  cwd = process.cwd(),
  log = console.log,
  logError = console.error,
} = {}) {
  const secrets = SECRET_VARS.map((name) => (env[name] ?? '').trim()).filter((v) => v.length >= 6)
  const redact = (text) => secrets.reduce((t, s) => t.split(s).join('[oculto]'), String(text))
  const say = (text) => log(redact(text))
  const warn = (text) => logError(redact(`${PREFIX} ${text}`))

  // --novo: so o prompt de hoje (o antigo ja foi medido).
  const prompts = argv.includes('--novo') ? ['novo'] : BLIND_PROMPTS
  argv = argv.filter((a) => a !== '--novo')
  const foreign = argv.find((a) => /^--(samples|geral)(=|$)/.test(a))
  const opts = foreign ? { error: `opção desconhecida: ${foreign.split('=')[0]}` } : parseArgs(argv)
  if (opts.error) {
    warn(opts.error)
    return 1
  }
  if (opts.help) {
    say(USAGE)
    return 0
  }

  const wanted = selectBlind(opts.only)
  if (wanted.length === 0) {
    warn('nenhum candidato casa com --only')
    return 1
  }

  // 1. Chaves: so provedor com todas as variaveis no ambiente. Sem nenhum, nao ha rede.
  const ready = []
  const warned = new Set()
  for (const c of wanted) {
    const missing = PROVIDER_VARS[c.provider].filter((name) => (env[name] ?? '').trim() === '')
    const spec = missing.length === 0 ? specFor(env, c) : null
    if (spec) {
      ready.push({ ...c, spec })
      continue
    }
    if (!warned.has(c.provider)) {
      warn(`${c.provider} fora da rodada: ${missing.length > 0 ? `falta ${missing.join(' e ')}` : 'variável com formato inválido'}`)
    }
    warned.add(c.provider)
  }
  if (ready.length === 0) {
    say(USAGE)
    warn('nenhuma chave no ambiente: nada foi chamado')
    return 1
  }

  // 2. O que ainda falta. Por caso, cobrindo os dois prompts e todos os modelos antes de seguir.
  const dir = path.resolve(cwd, opts.out ?? path.join(REPO_ROOT, PHASE_DIR))
  const round = loadRound(dir)
  if (round.error) {
    warn(`${round.error}; nada foi chamado`)
    return 1
  }
  const { votos, falas } = round
  const done = new Set(falas.map((f) => comboOf(f.caso, f.prompt, f)))
  const cases = blindCases()
  let tasks = []
  cases.forEach((raw, index) => {
    for (const prompt of prompts) {
      for (const c of ready) if (!done.has(comboOf(raw.id, prompt, c))) tasks.push({ raw, index, prompt, c })
    }
  })
  if (tasks.length === 0 && !opts.list) {
    say(`${PREFIX} nada a fazer: todas as falas desses modelos já estão na pasta`)
    return 0
  }

  // 3. Catalogo: id inexistente e avisado e nunca chamado.
  const gone = new Set()
  let checked = 0
  for (const provider of new Set(ready.map((c) => c.provider))) {
    const mine = ready.filter((c) => c.provider === provider)
    const catalog = await fetchCatalog(mine[0].spec, fetchFn)
    if (!catalog.ok) {
      warn(`${provider}: catálogo não conferido (status ${catalog.status}); os modelos serão chamados assim mesmo`)
      continue
    }
    checked += 1
    for (const c of mine) {
      if (catalog.ids.has(c.model)) say(`${PREFIX} existe: ${labelOf(c)}${c.preview ? ' (preview)' : ''}`)
      else {
        warn(`não existe no catálogo: ${labelOf(c)}`)
        gone.add(labelOf(c))
      }
    }
  }
  if (opts.list) return checked > 0 ? 0 : 1
  tasks = tasks.filter((t) => !gone.has(labelOf(t.c)))
  if (tasks.length === 0) {
    warn('nenhum modelo para chamar')
    return 1
  }

  // 4. Rodada.
  mkdirSync(dir, { recursive: true })
  const clients = new Map(
    ready.map((c) => [
      labelOf(c),
      createProvider({ ...c.spec, reasoningEffort: c.reasoningEffort, fetch: fetchFn, timeoutMs: TIMEOUT_MS }),
    ]),
  )
  const stoppedModels = new Set()
  const stoppedProviders = new Set()
  const fails = new Map()
  let calls = 0
  let added = 0

  // A chave e os votos sao gravados a cada fala. O id e aleatorio: ordenar por ele embaralha.
  const save = () => {
    votos.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    writeWhole(path.join(dir, KEY_FILE), redact(`${JSON.stringify({ versao: 1, falas }, null, 2)}\n`))
    writeWhole(path.join(dir, VOTES_FILE), redact(`${JSON.stringify(votos, null, 2)}\n`))
  }

  const keep = (task, request, result, ms) => {
    const { raw, prompt, c } = task
    const id = `c${randomBytes(6).toString('hex')}`
    const text = result.ok ? redact(normalizeSpeech(result.text)) : ''
    const judged = text === '' ? { valido: false, motivo: 'vazio' } : request.judge(result.text)
    falas.push({
      id,
      caso: raw.id,
      cena: raw.cena,
      pessoa: raw.pessoa,
      prompt,
      provider: c.provider,
      model: c.model,
      reasoningEffort: c.reasoningEffort ?? null,
      tokensFactor: c.tokensFactor,
      preview: c.preview,
      valido: judged.valido,
      motivo: judged.motivo,
      ms,
      vazio: text === '',
    })
    if (text !== '') votos.push({ id, cenario: raw.cenario, situacao: raw.situacao, texto: text, voto: '', comentario: '' })
    added += 1
    save()
  }

  const stopProvider = (c, why) => {
    stoppedProviders.add(c.provider)
    warn(`${c.provider} parado: ${why}`)
  }
  const stopModel = (c, why) => {
    stoppedModels.add(labelOf(c))
    warn(`${labelOf(c)} parado: ${why}`)
  }
  const isStopped = (c) => stoppedProviders.has(c.provider) || stoppedModels.has(labelOf(c))

  const runOne = async (task) => {
    const { raw, index, prompt, c } = task
    const request = armRequest(raw, prompt, index)
    let waits = 0
    for (;;) {
      if (calls > 0) await sleep(opts.pauseMs)
      calls += 1
      const started = clock()
      const r = await clients.get(labelOf(c)).call({
        messages: request.messages,
        maxTokens: request.maxTokens * c.tokensFactor,
        temperature: request.temperature ?? TEMPERATURE,
      })
      const ms = Math.round(clock() - started)

      const perMinute =
        !r.ok && r.status === 429 && r.code !== CODE_DAILY_QUOTA && r.code !== CODE_BUSY &&
        r.retryAfterMs !== null && r.retryAfterMs <= SHORT_RETRY_MAX_MS
      if (perMinute && waits < MAX_WAITS_PER_CALL) {
        waits += 1
        say(`${PREFIX} ${c.provider}: limite por minuto, esperando ${Math.ceil(r.retryAfterMs / 1000)} s`)
        await sleep(r.retryAfterMs + 500)
        continue
      }

      if (r.ok || r.reason === 'vazio') {
        fails.set(labelOf(c), 0)
        return keep(task, request, r, ms)
      }
      // Erro nao e gravado: a proxima rodada pede de novo.
      const code = r.code === null ? '' : `, código ${r.code}`
      if (r.status === 429 && r.code !== CODE_BUSY) return stopProvider(c, `cota ou limite atingido (status 429${code})`)
      if (r.status === 401 || (r.status === 403 && !CODES_BAD_MODEL.includes(r.code))) {
        return stopProvider(c, `chave recusada (status ${r.status}${code})`)
      }
      if (CODES_BAD_MODEL.includes(r.code) || [400, 404, 410].includes(r.status)) {
        return stopModel(c, `modelo recusado pelo provedor (status ${r.status}${code})`)
      }
      const n = (fails.get(labelOf(c)) ?? 0) + 1
      fails.set(labelOf(c), n)
      warn(`${labelOf(c)}: falha ${r.reason === 'http' ? `http ${r.status}` : r.reason}`)
      if (n >= MAX_CONSECUTIVE_FAILS) stopModel(c, `${n} falhas seguidas`)
      return
    }
  }

  say(`${PREFIX} ${tasks.length} fala(s) a pedir`)
  for (let i = 0; i < tasks.length; i += 1) {
    if (isStopped(tasks[i].c)) continue
    await runOne(tasks[i])
    if ((i + 1) % 20 === 0) say(`${PREFIX} ${i + 1} de ${tasks.length}`)
  }

  const have = new Set(falas.map((f) => comboOf(f.caso, f.prompt, f)))
  const usable = ready.filter((c) => !gone.has(labelOf(c)))
  const missing = cases
    .flatMap((raw) => BLIND_PROMPTS.flatMap((prompt) => usable.map((c) => comboOf(raw.id, prompt, c))))
    .filter((combo) => !have.has(combo)).length
  say(`${PREFIX} ${added} fala(s) nova(s); ${votos.length} no arquivo de voto`)
  if (missing > 0) say(`${PREFIX} faltam ${missing}: rode de novo (amanhã, se foi cota) que continua daqui`)
  if (votos.length > 0) {
    say(`${PREFIX} vote sem abrir ${KEY_FILE}: node scripts/oinc-votos.mjs pagina ${path.join(dir, VOTES_FILE)}`)
  }
  return added > 0 ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      // So o tipo do erro: a mensagem de terceiros poderia ecoar endereco ou chave.
      console.error(`${PREFIX} erro inesperado: ${err?.code ?? err?.name ?? 'desconhecido'}`)
      process.exit(1)
    })
}
