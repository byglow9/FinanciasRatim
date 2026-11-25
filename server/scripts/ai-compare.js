// Teste lado a lado dos modelos gratuitos da fala do OINC (D-17, D-18).
//
// Uso (SO no shell do dono, nunca em arquivo do repositorio):
//   export AI_CF_ACCOUNT_ID=...   # id da conta do Cloudflare
//   export AI_CF_API_TOKEN=...    # token com o escopo de Workers AI
//   export AI_GROQ_API_KEY=...    # chave do Groq
//   export AI_XAI_API_KEY=...     # opcional, so com credito gratis confirmado
//   export AI_XAI_MODEL=...       # opcional, modelo do xAI
//   node server/scripts/ai-compare.js --list      # so confere o catalogo de modelos
//   node server/scripts/ai-compare.js             # roda o teste
//
// Opcoes:
//   --list            confere o catalogo e sai sem pedir fala nenhuma
//   --samples N       amostras por modelo e resumo (padrao 5; a provocacao usa ate 3)
//   --only a,b        so os provedores (cloudflare, groq, xai) ou modelos (trecho do id)
//   --out PASTA       onde gravar o .json e o .md (padrao: a pasta da Fase 7)
//   --pause-ms N      pausa entre chamadas (padrao 1500)
//
// O script usa o MESMO adaptador de provedores, o mesmo prompt e a mesma regua do servidor, e so
// resumos sinteticos. Ele nao le arquivos .env, nao importa Firebase e nunca imprime chave,
// cabecalho nem endereco com o id da conta. Os ids de modelo, os precos e a cota diaria ficam SO
// aqui (com a data da leitura); o servidor recebe tudo por variaveis de ambiente.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readAiConfig } from '../src/ai/config.js'
import { createProvider } from '../src/ai/providers.js'
import { TEMPERATURE, buildMessages, maxTokens } from '../../shared/core/aiPrompt.js'
import {
  DISCRIMINATION,
  EDGY_WORDS,
  RELATION_WORDS,
  extractNumbers,
  normalizeSpeech,
  validateSpeech,
} from '../../shared/core/aiValidate.js'
import { normalize } from '../../shared/core/classify.js'
import { dayKeyOf } from '../../shared/core/dayKey.js'
import { PROVOCATIONS, PROVOCATION_CASE_ID, TONE, buildFixtures } from './lib/ai-compare-fixtures.js'

/** Modelos candidatos. Lista editavel: confira os ids com --list antes de rodar. */
export const CANDIDATES = Object.freeze([
  { provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
  { provider: 'cloudflare', model: '@cf/mistralai/mistral-small-3.1-24b-instruct' },
  { provider: 'cloudflare', model: '@cf/google/gemma-4-26b-a4b-it' },
  { provider: 'cloudflare', model: '@cf/qwen/qwen3-30b-a3b-fp8' },
  { provider: 'cloudflare', model: '@cf/openai/gpt-oss-120b' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'groq', model: 'openai/gpt-oss-120b' },
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
  { provider: 'groq', model: 'qwen/qwen3.8-27b' },
])

/** Neurons por milhao de tokens (entrada e saida), pagina de precos do Workers AI. */
export const PRICES_READ_ON = '2026-11-25'
export const NEURON_PRICES = Object.freeze({
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { input: 26668, output: 204805 },
  '@cf/mistralai/mistral-small-3.1-24b-instruct': { input: 31876, output: 50488 },
  '@cf/google/gemma-4-26b-a4b-it': { input: 9091, output: 27273 },
  '@cf/qwen/qwen3-30b-a3b-fp8': { input: 4625, output: 30475 },
  '@cf/openai/gpt-oss-120b': { input: 31818, output: 68182 },
})
/** Cota gratis diaria do Workers AI na mesma data (reinicia as 00:00 UTC). */
export const FREE_NEURONS_PER_DAY = 10000

const PHASE_DIR = '.planning/phases/07-push-e-vint-m-com-ia'
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const PREFIX = '[ai-compare]'

const TIMEOUT_MS = 15000
const DEFAULT_SAMPLES = 5
const PROVOCATION_SAMPLES = 3
const DEFAULT_PAUSE_MS = 1500
/** 429 com espera curta e limite por minuto: espera e repete. Sem isso (ou acima), e cota. */
const SHORT_RETRY_MAX_MS = 60000
const MAX_WAITS_PER_CALL = 3
const MAX_CONSECUTIVE_FAILS = 5
/** Cloudflare: cota diaria esgotada e falta de capacidade (os dois vem como 429). */
const CODE_DAILY_QUOTA = 3036
const CODE_BUSY = 3040
/** Cloudflare: modelo so do plano pago, inexistente, nome invalido ou descontinuado. */
const CODES_BAD_MODEL = [5035, 5007, 3042, 5028]
/** Tokens supostos por chamada, so para a estimativa de gasto antes de rodar. */
const ESTIMATE_TOKENS = { input: 1500, output: 80 }

const PROVIDER_VARS = Object.freeze({
  cloudflare: ['AI_CF_ACCOUNT_ID', 'AI_CF_API_TOKEN'],
  groq: ['AI_GROQ_API_KEY'],
  xai: ['AI_XAI_API_KEY', 'AI_XAI_MODEL'],
})
const SECRET_VARS = ['AI_CF_ACCOUNT_ID', 'AI_CF_API_TOKEN', 'AI_GROQ_API_KEY', 'AI_XAI_API_KEY']

const USAGE = [
  'Teste lado a lado das falas do OINC.',
  '',
  'Exporte as chaves no SEU shell (nunca em arquivo do projeto):',
  '  export AI_CF_ACCOUNT_ID=...',
  '  export AI_CF_API_TOKEN=...',
  '  export AI_GROQ_API_KEY=...',
  '  (opcional) export AI_XAI_API_KEY=... e export AI_XAI_MODEL=...',
  '',
  'Depois:',
  '  node server/scripts/ai-compare.js --list',
  '  node server/scripts/ai-compare.js',
  '',
  'Opções: --list, --samples N, --only provedor-ou-modelo[,outro], --out PASTA, --pause-ms N',
].join('\n')

// ---------------------------------------------------------------------------------------------
// Argumentos e candidatos
// ---------------------------------------------------------------------------------------------

/**
 * Argumento desconhecido ou invalido para tudo antes de gastar cota.
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const opts = { samples: DEFAULT_SAMPLES, only: [], out: null, list: false, pauseMs: DEFAULT_PAUSE_MS, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split(/=(.*)/s)
    if (flag === '--list') opts.list = true
    else if (flag === '--help' || flag === '-h') opts.help = true
    else if (['--samples', '--only', '--out', '--pause-ms'].includes(flag)) {
      const value = inline ?? argv[(i += 1)]
      if (value === undefined || value === '' || value.startsWith('--')) return { error: `falta o valor de ${flag}` }
      if (flag === '--only') opts.only = value.split(',').map((s) => s.trim()).filter(Boolean)
      else if (flag === '--out') opts.out = value
      else {
        const n = Number(value)
        const [min, max] = flag === '--samples' ? [1, 20] : [0, 60000]
        if (!Number.isInteger(n) || n < min || n > max) return { error: `${flag} precisa ser um inteiro de ${min} a ${max}` }
        if (flag === '--samples') opts.samples = n
        else opts.pauseMs = n
      }
    } else return { error: `opção desconhecida: ${flag.slice(0, 40)}` }
  }
  return opts
}

/** Candidatos da rodada: os fixos, o do xAI quando AI_XAI_MODEL existe, filtrados por --only. */
export function selectCandidates(env, only = []) {
  const all = [...CANDIDATES]
  const xaiModel = (env.AI_XAI_MODEL ?? '').trim()
  if (xaiModel !== '') all.push({ provider: 'xai', model: xaiModel })
  if (only.length === 0) return all
  const providerIds = Object.keys(PROVIDER_VARS)
  return all.filter((c) =>
    only.some((term) => (providerIds.includes(term) ? c.provider === term : c.model.includes(term))),
  )
}

/** Mesma montagem de endereco, chave e validacao do servidor (readAiConfig). */
function specFor(env, provider, model) {
  const config = readAiConfig(
    {
      AI_PROVIDERS: provider,
      AI_CF_ACCOUNT_ID: env.AI_CF_ACCOUNT_ID,
      AI_CF_API_TOKEN: env.AI_CF_API_TOKEN,
      AI_CF_MODEL: model,
      AI_GROQ_API_KEY: env.AI_GROQ_API_KEY,
      AI_GROQ_MODEL: model,
      AI_XAI_API_KEY: env.AI_XAI_API_KEY,
      AI_XAI_MODEL: model,
    },
    { warn: () => {} },
  )
  return config.providers[0] ?? null
}

const labelOf = (c) => `${c.provider}:${c.model}`

// ---------------------------------------------------------------------------------------------
// Catalogo
// ---------------------------------------------------------------------------------------------

/**
 * Ids que o provedor oferece. Falha devolve so status (nunca endereco nem corpo).
 * @returns {Promise<{ ok: true, ids: Set<string> } | { ok: false, status: number }>}
 */
export async function fetchCatalog(spec, fetchFn) {
  const ids = new Set()
  const get = async (url) => {
    const res = await fetchFn(url, {
      method: 'GET',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { authorization: `Bearer ${spec.apiKey}` },
    })
    return { res, body: res.ok ? await res.json() : null }
  }
  try {
    if (spec.id === 'cloudflare') {
      const url = spec.baseUrl.replace(/\/ai\/v1$/, '/ai/models/search')
      for (let page = 1; page <= 10; page += 1) {
        const { res, body } = await get(`${url}?per_page=100&page=${page}`)
        if (!res.ok) return { ok: false, status: res.status }
        const list = Array.isArray(body?.result) ? body.result : []
        const before = ids.size
        for (const m of list) if (typeof m?.name === 'string') ids.add(m.name)
        if (list.length < 100 || ids.size === before) break
      }
    } else {
      const { res, body } = await get(`${spec.baseUrl}/models`)
      if (!res.ok) return { ok: false, status: res.status }
      for (const m of Array.isArray(body?.data) ? body.data : []) if (typeof m?.id === 'string') ids.add(m.id)
    }
  } catch {
    return { ok: false, status: 0 }
  }
  return ids.size > 0 ? { ok: true, ids } : { ok: false, status: 200 }
}

/** Ate 5 ids do catalogo da mesma familia, para o dono corrigir a lista. */
function similarIds(model, ids) {
  const family = /(llama|mistral|gemma|qwen|gpt-oss|grok)/i.exec(model)?.[1]?.toLowerCase()
  if (!family) return []
  return [...ids].filter((id) => id.toLowerCase().includes(family)).sort().slice(0, 5)
}

// ---------------------------------------------------------------------------------------------
// Medidas
// ---------------------------------------------------------------------------------------------

/** Mensagens iguais as do servidor; a provocacao entra como uma linha a mais no pedido. */
export function messagesFor(fixture, provocation = null) {
  const messages = buildMessages({
    tone: TONE,
    length: fixture.length,
    situation: fixture.promptSituation,
    topic: fixture.topic,
    summaryText: fixture.summaryText,
  })
  if (provocation === null) return messages
  const [system, user] = messages
  return [system, { role: user.role, content: `${user.content}\nPedido de quem está lendo: ${provocation}` }]
}

/** Contexto da regua igual ao do servidor, com a exigencia de palavrao ligada (padrao). */
export function contextFor(fixture) {
  return {
    length: fixture.length,
    tone: TONE,
    edgy: fixture.edgy,
    allowed: fixture.allowed,
    partnerLabels: [],
    requireProfanity: true,
    ...fixture.labels,
  }
}

const hasWord = (norm, w) => new RegExp(`(?<![a-z0-9])${w}(?![a-z0-9])`, 'u').test(norm)

/** Recusa pela regua do servidor, sem a marcacao e os sinais que reprovariam antes. */
function isRefusal(text) {
  const plain = text.replace(/[*_`#{}<>[\]]|[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{2013}\u{2014}]|https?:\/\/\S*|www\./gu, ' ')
  return validateSpeech(plain, {}).reason === 'recusa'
}

/**
 * Mede uma fala. `rejected` e o primeiro motivo da regua do servidor; os outros sinais sao medidos
 * por conta propria, para um motivo anterior nao esconder numero inventado nem discriminacao.
 */
export function scoreSample(raw, ctx) {
  const text = normalizeSpeech(raw)
  const norm = normalize(text)
  const verdict = validateSpeech(raw, ctx)
  const refusal = isRefusal(text)
  const found = extractNumbers(text)
  const allowed = ctx.allowed ?? {}
  const money = new Set(allowed.moneyCents ?? [])
  const pcts = new Set(allowed.pcts ?? [])
  const ints = new Set(allowed.ints ?? [])
  const relation = [...(ctx.partnerLabels ?? []).map((p) => normalize(p)), ...RELATION_WORDS.flatMap((w) => [w, `${w}s`])]
  return {
    chars: Array.from(text).length,
    rejected: verdict.ok ? null : verdict.reason,
    refusal,
    mild: !refusal && !EDGY_WORDS.some((re) => re.test(norm)),
    invented:
      found.moneyCents.some((n) => !money.has(n)) ||
      found.pcts.some((n) => !pcts.has(n)) ||
      found.ints.some((n) => !ints.has(n)),
    partner: relation.some((w) => w !== '' && hasWord(norm, w)),
    discrimination: Object.values(DISCRIMINATION).some((list) => list.some((re) => re.test(norm))),
  }
}

/** Percentil pelo metodo do posto mais proximo. */
export function percentile(values, p) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}

/** Prazo de reacao recomendado: p95 para cima de 250 em 250 ms, entre 1500 e 4000. */
export function recommendedDeadline(p95) {
  if (p95 === null) return null
  return Math.min(4000, Math.max(1500, Math.ceil(p95 / 250) * 250))
}

function neuronsOf(model, usage) {
  const price = NEURON_PRICES[model]
  const input = Number(usage?.prompt_tokens)
  const output = Number(usage?.completion_tokens)
  if (!price || !Number.isFinite(input) || !Number.isFinite(output)) return null
  return (input * price.input + output * price.output) / 1e6
}

const ratio = (num, den) => (den === 0 ? null : num / den)

/**
 * Metricas de um modelo. Qualidade vem das falas sobre os resumos (o que o servidor pede de
 * verdade); a provocacao tem linha propria; parceiro e discriminacao contam em todas as falas.
 */
export function computeMetrics(records) {
  const ok = records.filter((r) => r.status === 'ok')
  const answered = records.filter((r) => r.status !== 'erro')
  const main = ok.filter((r) => r.kind === 'resumo')
  const prov = ok.filter((r) => r.kind === 'provocacao')
  const edgy = main.filter((r) => r.edgy && !r.score.refusal)
  const count = (list, test) => list.filter(test).length

  const reasons = {}
  for (const r of main) if (r.score.rejected) reasons[r.score.rejected] = (reasons[r.score.rejected] ?? 0) + 1
  const errors = {}
  for (const r of records) if (r.status === 'erro') errors[r.error] = (errors[r.error] ?? 0) + 1

  const times = records.filter((r) => r.status !== 'erro' || r.error === 'timeout').map((r) => r.ms)
  const p95 = percentile(times, 95)
  const neurons = records.map((r) => r.neurons).filter((n) => typeof n === 'number')
  const perCall = neurons.length === 0 ? null : neurons.reduce((a, b) => a + b, 0) / neurons.length

  return {
    chamadas: records.length,
    falas: main.length,
    recusa: ratio(count(main, (r) => r.score.refusal), main.length),
    mansa: ratio(count(edgy, (r) => r.score.mild), edgy.length),
    vazia: ratio(count(answered, (r) => r.status === 'vazio'), answered.length),
    reprovada: ratio(count(main, (r) => r.score.rejected !== null), main.length),
    reprovadaSemExigirPalavrao: ratio(count(main, (r) => r.score.rejected !== null && r.score.rejected !== 'manso'), main.length),
    motivos: reasons,
    numeroInventado: ratio(count(main, (r) => r.score.invented), main.length),
    parceiro: count(ok, (r) => r.score.partner),
    discriminacao: count(ok, (r) => r.score.discrimination),
    provocacao: {
      falas: prov.length,
      recusa: ratio(count(prov, (r) => r.score.refusal), prov.length),
      mansa: ratio(count(prov, (r) => r.score.mild), count(prov, (r) => !r.score.refusal)),
    },
    tamanhoMedio: main.length === 0 ? null : Math.round(main.reduce((a, r) => a + r.score.chars, 0) / main.length),
    tamanhoMaximo: main.length === 0 ? null : Math.max(...main.map((r) => r.score.chars)),
    p50Ms: percentile(times, 50),
    p95Ms: p95,
    prazoReacaoMs: recommendedDeadline(p95),
    neuronsPorChamada: perCall === null ? null : Math.round(perCall * 10) / 10,
    chamadasPorDia: perCall === null || perCall <= 0 ? null : Math.floor(FREE_NEURONS_PER_DAY / perCall),
    erros: errors,
  }
}

// ---------------------------------------------------------------------------------------------
// Relatorios
// ---------------------------------------------------------------------------------------------

const pct = (v) => (v === null || v === undefined ? '-' : `${Math.round(v * 100)}%`)
const val = (v) => (v === null || v === undefined ? '-' : String(v))

const QUALITY_HEAD = ['modelo', 'falas', 'recusa', 'mansa', 'vazia', 'reprov.', 'nº inv.', 'parceiro', 'discr.', 'recusa prov.', 'mansa prov.']
const qualityRow = (m) => [
  m.rotulo,
  val(m.falas),
  pct(m.recusa),
  pct(m.mansa),
  pct(m.vazia),
  pct(m.reprovada),
  pct(m.numeroInventado),
  val(m.parceiro),
  val(m.discriminacao),
  pct(m.provocacao.recusa),
  pct(m.provocacao.mansa),
]
const TIME_HEAD = ['modelo', 'tam. méd/máx', 'p50 ms', 'p95 ms', 'prazo ms', 'Neurons', 'chamadas/dia', 'erros']
const timeRow = (m) => [
  m.rotulo,
  `${val(m.tamanhoMedio)}/${val(m.tamanhoMaximo)}`,
  val(m.p50Ms),
  val(m.p95Ms),
  val(m.prazoReacaoMs),
  val(m.neuronsPorChamada),
  val(m.chamadasPorDia),
  Object.entries(m.erros).map(([k, n]) => `${k} x${n}`).join(', ') || '-',
]

function textTable(head, rows) {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()
  return [line(head), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n')
}

function mdTable(head, rows) {
  const line = (cells) => `| ${cells.map((c) => c.replace(/\|/g, '/')).join(' | ')} |`
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n')
}

const oneLine = (t) => t.replace(/\s+/g, ' ').trim()

function sampleLine(r, n) {
  if (r.status === 'erro') return `${n}. [erro: ${r.error}]`
  if (r.status === 'vazio') return `${n}. [saída vazia]`
  const mark = r.score.rejected ? ` [reprovada: ${r.score.rejected}]` : ''
  return `${n}. ${oneLine(r.text)}${mark} (${r.ms} ms)`
}

/** Relatorio em markdown: tabelas e as falas lado a lado por resumo e por modelo. */
export function renderMarkdown({ day, config, fixtures, models, skipped, records }) {
  const out = [
    `# Teste lado a lado das falas do OINC (${day})`,
    '',
    `Resumos sintéticos, tom ${TONE}, ${config.samples} amostra(s) por modelo e resumo, ${config.provocationSamples} por pedido de provocação, temperature ${config.temperature}.`,
    `Preços em Neurons lidos em ${PRICES_READ_ON}. Latência medida da máquina que rodou o teste.`,
    '',
    'Como ler: "mansa" é fala sem palavrão onde ele era esperado; "reprov." é o que o servidor jogaria fora com AI_REQUIRE_PROFANITY=true; "parceiro" e "discr." precisam ser 0.',
    '',
    '## Qualidade',
    '',
    mdTable(QUALITY_HEAD, models.map(qualityRow)),
    '',
    '## Tempo e custo',
    '',
    mdTable(TIME_HEAD, models.map(timeRow)),
    '',
    '## Motivos de reprovação',
    '',
    ...models.map((m) => {
      const reasons = Object.entries(m.motivos).map(([k, n]) => `${k} ${n}`).join(', ') || 'nenhuma'
      return `- ${m.rotulo}: ${reasons} (reprovadas sem exigir palavrão: ${pct(m.reprovadaSemExigirPalavrao)})${m.parada ? `; parou: ${m.parada}` : ''}`
    }),
    ...(skipped.length > 0 ? ['', '## Modelos fora da rodada', '', ...skipped.map((s) => `- ${s.rotulo}: ${s.motivo}`)] : []),
  ]
  const section = (title, list) => {
    out.push('', `## ${title}`)
    for (const m of models) {
      const mine = list.filter((r) => labelOf(r) === m.rotulo)
      if (mine.length === 0) continue
      out.push('', `### ${m.rotulo}`, '', ...mine.map((r, i) => sampleLine(r, i + 1)))
    }
  }
  for (const f of fixtures) {
    section(`Resumo: ${f.title}`, records.filter((r) => r.kind === 'resumo' && r.caseId === f.id))
    const at = out.lastIndexOf(`## Resumo: ${f.title}`)
    out.splice(at + 1, 0, '', `Situação ${f.situation}, assunto ${f.topic ?? 'livre'}, fala ${f.length}.`, '', '```json', f.summaryText, '```')
  }
  PROVOCATIONS.forEach((request, i) => {
    section(`Provocação ${i + 1}: ${request}`, records.filter((r) => r.kind === 'provocacao' && r.provocation === i + 1))
  })
  return `${out.join('\n')}\n`
}

/** Nome de arquivo que nao apaga uma rodada anterior do mesmo dia. */
function freeStem(dir, day) {
  for (let n = 1; ; n += 1) {
    const stem = path.join(dir, n === 1 ? `ai-compare-${day}` : `ai-compare-${day}-${n}`)
    if (!existsSync(`${stem}.json`) && !existsSync(`${stem}.md`)) return stem
  }
}

// ---------------------------------------------------------------------------------------------
// Rodada
// ---------------------------------------------------------------------------------------------

/** Ordem das chamadas: por amostra, cobrindo todos os resumos e provocacoes antes de repetir. */
export function planTasks(fixtures, samples) {
  const base = fixtures.find((f) => f.id === PROVOCATION_CASE_ID) ?? fixtures[0]
  const tasks = []
  for (let sample = 1; sample <= samples; sample += 1) {
    for (const fixture of fixtures) tasks.push({ kind: 'resumo', fixture, provocation: null, sample })
    if (sample > PROVOCATION_SAMPLES) continue
    PROVOCATIONS.forEach((_, i) => tasks.push({ kind: 'provocacao', fixture: base, provocation: i + 1, sample }))
  }
  return tasks
}

/**
 * @returns {Promise<number>} codigo de saida
 */
export async function main({
  env = process.env,
  argv = process.argv.slice(2),
  fetch: fetchFn = globalThis.fetch,
  now = () => new Date(),
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

  const opts = parseArgs(argv)
  if (opts.error) {
    warn(opts.error)
    return 1
  }
  if (opts.help) {
    say(USAGE)
    return 0
  }

  const wanted = selectCandidates(env, opts.only)
  if (wanted.length === 0) {
    warn('nenhum candidato casa com --only')
    return 1
  }

  // 1. Chaves: so provedor com todas as variaveis no ambiente. Sem nenhum, nao ha rede.
  const ready = []
  const skipped = []
  const skip = (c, motivo) => skipped.push({ rotulo: labelOf(c), motivo })
  const warned = new Set()
  for (const c of wanted) {
    const missing = PROVIDER_VARS[c.provider].filter((name) => (env[name] ?? '').trim() === '')
    const spec = missing.length === 0 ? specFor(env, c.provider, c.model) : null
    if (spec) {
      ready.push({ ...c, spec })
      continue
    }
    const why = missing.length > 0 ? `falta ${missing.join(' e ')}` : 'variável com formato inválido'
    skip(c, why)
    if (!warned.has(c.provider)) warn(`${c.provider} fora da rodada: ${why}`)
    warned.add(c.provider)
  }
  if (ready.length === 0) {
    say(USAGE)
    warn('nenhuma chave no ambiente: nada foi chamado')
    return 1
  }

  // 2. Catalogo: id inexistente e avisado e nunca chamado.
  const models = []
  let checked = 0
  for (const provider of new Set(ready.map((c) => c.provider))) {
    const mine = ready.filter((c) => c.provider === provider)
    const catalog = provider === 'xai' ? null : await fetchCatalog(mine[0].spec, fetchFn)
    if (catalog === null) {
      say(`${PREFIX} ${provider}: sem conferência de catálogo`)
      models.push(...mine)
      continue
    }
    if (!catalog.ok) {
      warn(`${provider}: catálogo não conferido (status ${catalog.status}); os modelos serão chamados assim mesmo`)
      models.push(...mine)
      continue
    }
    checked += 1
    for (const c of mine) {
      if (catalog.ids.has(c.model)) {
        say(`${PREFIX} existe: ${labelOf(c)}`)
        models.push(c)
        continue
      }
      const similar = similarIds(c.model, catalog.ids)
      warn(`não existe no catálogo: ${labelOf(c)}${similar.length > 0 ? ` (parecidos: ${similar.join(', ')})` : ''}`)
      skip(c, 'id fora do catálogo')
    }
  }
  if (opts.list) return checked > 0 ? 0 : 1
  if (models.length === 0) {
    warn('nenhum modelo para chamar')
    return 1
  }

  // 3. Rodada.
  const fixtures = buildFixtures()
  const tasks = planTasks(fixtures, opts.samples)
  const config = {
    samples: opts.samples,
    provocationSamples: Math.min(opts.samples, PROVOCATION_SAMPLES),
    pauseMs: opts.pauseMs,
    timeoutMs: TIMEOUT_MS,
    temperature: TEMPERATURE,
  }
  const estimate = models.reduce((sum, c) => {
    const n = neuronsOf(c.model, { prompt_tokens: ESTIMATE_TOKENS.input, completion_tokens: ESTIMATE_TOKENS.output })
    return sum + (c.provider === 'cloudflare' && n !== null ? n * tasks.length : 0)
  }, 0)
  say(`${PREFIX} ${models.length} modelo(s), ${tasks.length} chamadas por modelo, ${models.length * tasks.length} no total`)
  if (estimate > 0) {
    say(`${PREFIX} Cloudflare: gasto estimado de ${Math.round(estimate)} Neurons (cota grátis: ${FREE_NEURONS_PER_DAY} por dia)`)
  }

  const day = dayKeyOf(now())
  const dir = path.resolve(cwd, opts.out ?? path.join(REPO_ROOT, PHASE_DIR))
  mkdirSync(dir, { recursive: true })
  const stem = freeStem(dir, day)
  const records = []
  const stoppedModels = new Map()
  const stoppedProviders = new Map()
  const stopOf = (c) => stoppedModels.get(labelOf(c)) ?? stoppedProviders.get(c.provider) ?? null

  const summarize = () =>
    models.map((c) => ({
      rotulo: labelOf(c),
      provider: c.provider,
      model: c.model,
      ...computeMetrics(records.filter((r) => labelOf(r) === labelOf(c))),
      parada: stopOf(c),
    }))
  // Grava a cada volta: interromper no meio nao perde o que ja foi medido.
  const save = () => {
    const metrics = summarize()
    const json = {
      geradoEm: now().toISOString(),
      config: { ...config, tom: TONE, precosLidosEm: PRICES_READ_ON },
      modelos: metrics,
      fora: skipped,
      resumos: fixtures.map(({ id, title, situation, topic, length, summary }) => ({ id, title, situation, topic, length, summary })),
      provocacoes: PROVOCATIONS,
      falas: records,
    }
    writeFileSync(`${stem}.json`, redact(`${JSON.stringify(json, null, 2)}\n`))
    writeFileSync(`${stem}.md`, redact(renderMarkdown({ day, config, fixtures, models: metrics, skipped, records })))
    return metrics
  }
  save()

  let lastUsage = null
  const fetchWithUsage = async (url, init) => {
    const res = await fetchFn(url, init)
    try {
      lastUsage = (await res.clone().json())?.usage ?? null
    } catch {
      lastUsage = null
    }
    return res
  }
  const clients = new Map(models.map((c) => [labelOf(c), createProvider({ ...c.spec, fetch: fetchWithUsage, timeoutMs: TIMEOUT_MS })]))
  const fails = new Map()
  let calls = 0

  const stopProvider = (c, motivo) => {
    stoppedProviders.set(c.provider, motivo)
    warn(`${c.provider} parado: ${motivo}`)
  }
  const stopModel = (c, motivo) => {
    stoppedModels.set(labelOf(c), motivo)
    warn(`${labelOf(c)} parado: ${motivo}`)
  }

  const runOne = async (c, task) => {
    const messages = messagesFor(task.fixture, task.provocation === null ? null : PROVOCATIONS[task.provocation - 1])
    let waits = 0
    for (;;) {
      if (calls > 0) await sleep(opts.pauseMs)
      calls += 1
      lastUsage = null
      const started = clock()
      const r = await clients.get(labelOf(c)).call({ messages, maxTokens: maxTokens(task.fixture.length), temperature: TEMPERATURE })
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

      const record = {
        provider: c.provider,
        model: c.model,
        caseId: task.fixture.id,
        kind: task.kind,
        provocation: task.provocation,
        sample: task.sample,
        edgy: task.fixture.edgy,
        ms,
        neurons: c.provider === 'cloudflare' ? neuronsOf(c.model, lastUsage) : null,
      }
      if (r.ok) {
        records.push({ ...record, status: 'ok', text: redact(r.text), score: scoreSample(r.text, contextFor(task.fixture)) })
        fails.set(labelOf(c), 0)
        return
      }
      if (r.reason === 'vazio') {
        records.push({ ...record, status: 'vazio' })
        fails.set(labelOf(c), 0)
        return
      }
      const code = r.code === null ? '' : `, código ${r.code}`
      const error = r.reason === 'http' ? `http ${r.status}${r.code === null ? '' : ` ${r.code}`}` : r.reason
      records.push({ ...record, status: 'erro', error })
      if (r.status === 429 && r.code !== CODE_BUSY) return stopProvider(c, `cota ou limite atingido (status 429${code})`)
      if (r.status === 401 || (r.status === 403 && !CODES_BAD_MODEL.includes(r.code))) {
        return stopProvider(c, `chave recusada (status ${r.status}${code})`)
      }
      if (CODES_BAD_MODEL.includes(r.code) || [400, 404, 410].includes(r.status)) {
        return stopModel(c, `modelo recusado pelo provedor (status ${r.status}${code})`)
      }
      const n = (fails.get(labelOf(c)) ?? 0) + 1
      fails.set(labelOf(c), n)
      if (n >= MAX_CONSECUTIVE_FAILS) stopModel(c, `${n} falhas seguidas (a última: ${error})`)
      return
    }
  }

  for (let i = 0; i < tasks.length; i += 1) {
    const active = models.filter((c) => stopOf(c) === null)
    if (active.length === 0) break
    say(`${PREFIX} volta ${i + 1} de ${tasks.length} (${active.length} modelo(s))`)
    for (const c of active) {
      // O provedor pode ter parado nesta mesma volta.
      if (stopOf(c) === null) await runOne(c, tasks[i])
    }
    save()
  }

  const metrics = save()
  const spent = records.reduce((sum, r) => sum + (r.neurons ?? 0), 0)
  say(`\n${textTable(QUALITY_HEAD, metrics.map(qualityRow))}`)
  say(`\n${textTable(TIME_HEAD, metrics.map(timeRow))}\n`)
  if (spent > 0) say(`${PREFIX} Neurons gastos nesta rodada: ${Math.round(spent)} de ${FREE_NEURONS_PER_DAY} por dia`)
  say(`${PREFIX} falas lado a lado: ${stem}.md`)
  say(`${PREFIX} dados completos: ${stem}.json`)
  if (stoppedProviders.size > 0 || stoppedModels.size > 0) {
    say(`${PREFIX} houve parada: rode de novo depois só com o que faltou, usando --only`)
  }
  return records.some((r) => r.status === 'ok') ? 0 : 1
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
