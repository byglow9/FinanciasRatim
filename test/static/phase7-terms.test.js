// Guarda do registro de termos de dados da IA (07-17, IA-05, D-10) e de que nenhum modelo, preco
// ou cota fica fixo no codigo do servidor: tudo vem das variaveis AI_*. A lista de candidatos e a
// tabela de precos so existem no script do teste lado a lado, com a data.
// Rodar: node --test test/static/phase7-terms.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, exists, listSrc, read } from './helpers/phase3-1.js'

const TERMS = '.planning/phases/07-push-e-vint-m-com-ia/07-AI-TERMS.md'
const SCRIPT = 'server/scripts/ai-compare.js'
const FIXTURES = 'server/scripts/lib/ai-compare-fixtures.js'
const AI_FILES = listSrc('server/src/ai')

test('o registro existe e cita os tres provedores, treino, retencao e a data', () => {
  assert.ok(exists(TERMS), `sem ${TERMS}`)
  const text = read(TERMS)
  for (const part of ['Cloudflare', 'Groq', 'xAI', '2026-11-25', 'Gemini']) {
    assert.ok(text.includes(part), `registro sem "${part}"`)
  }
  assert.match(text, /treino/i)
  assert.match(text, /retenção/i)
  assert.match(text, /10\.000 Neurons/)
  assert.match(text, /00:00 UTC/)
  assert.match(text, /300 requisições por minuto/)
})

test('cada provedor tem sua tabela com treino, retencao, fonte e data', () => {
  const text = read(TERMS)
  for (const provider of ['Cloudflare Workers AI', 'Groq', 'xAI (Grok)']) {
    const start = text.indexOf(`### ${provider}`)
    assert.ok(start >= 0, `sem a tabela de ${provider}`)
    const table = text.slice(start, text.indexOf('\n#', start + 4))
    for (const row of [/\| Treino \|.*\| 2026-11-25 \|/, /\| Retenção \|.*\| 2026-11-25 \|/, /\| Região \|.*\| 2026-11-25 \|/]) {
      assert.match(table, row, `${provider}: ${row}`)
    }
  }
})

test('o registro tem as quatro secoes do checkpoint humano', () => {
  const text = read(TERMS)
  for (const title of [
    'Releitura na data da escolha',
    'Teste lado a lado',
    'Calibragem do prazo do cliente',
    'Decisão do dono',
  ]) {
    assert.ok(text.includes(`\n## ${title}\n`), `sem a secao "${title}"`)
  }
  for (const part of ['AI_REACTION_TIMEOUT_MS', 'p50', 'p95', 'AI_PROVIDERS', 'AI_REQUIRE_PROFANITY']) {
    assert.ok(text.includes(part), `registro sem "${part}"`)
  }
})

test('o registro nao traz chave nem id de conta', () => {
  const text = read(TERMS)
  assert.doesNotMatch(text, /gsk_[A-Za-z0-9]{10,}|xai-[A-Za-z0-9]{10,}|Bearer\s+\S{10,}/)
  assert.doesNotMatch(text, /(?<![A-Za-z0-9])[a-f0-9]{32}(?![A-Za-z0-9])/, 'parece um id de conta')
  assert.doesNotMatch(text, /AI_(CF_API_TOKEN|CF_ACCOUNT_ID|GROQ_API_KEY|XAI_API_KEY)\s*[=:]\s*\S{8,}/)
})

test('server/src/ai nao fixa modelo, preco, Neurons nem cota diaria de provedor', () => {
  assert.ok(AI_FILES.length >= 7, `poucos arquivos em server/src/ai: ${AI_FILES.length}`)
  for (const f of AI_FILES) {
    // Texto bruto, comentarios inclusive.
    const src = read(f)
    assert.doesNotMatch(src, /llama|gpt-oss|qwen|gemma|mistral|@cf\/|grok-\d/i, `${f}: id de modelo`)
    assert.doesNotMatch(src, /neuron/i, `${f}: Neurons`)
    assert.doesNotMatch(src, /US\$|USD|price|preco/i, `${f}: preco`)
    // 1000 fica de fora: e a conversao de segundos para milissegundos. Os tetos por provedor sao
    // conferidos no teste de config.js, logo abaixo.
    assert.doesNotMatch(code(f), /(?<![\d_])(10_?000|14_?400)(?![\d_])/, `${f}: numero com cara de cota diaria`)
  }
})

test('config.js le a ordem e os modelos do ambiente, sem padrao', () => {
  const src = code('server/src/ai/config.js')
  assert.match(src, /export function readAiConfig\(env = process\.env/)
  assert.match(src, /e\.AI_PROVIDERS/)
  for (const name of ['AI_CF_MODEL', 'AI_GROQ_MODEL', 'AI_XAI_MODEL']) {
    assert.match(src, new RegExp(`model = e\\.${name}\\b(?!\\s*(\\?\\?|\\|\\|))`), `${name} com padrao fixo`)
  }
  for (const id of ['CLOUDFLARE', 'GROQ', 'XAI']) {
    assert.match(src, new RegExp(`AI_PROVIDER_CAP_${id}, 0,`), `teto de ${id} com valor fixo`)
  }
})

test('o script e os fixtures nao leem .env nem importam o Admin SDK', () => {
  for (const f of [SCRIPT, FIXTURES]) {
    assert.ok(exists(f), `sem ${f}`)
    const src = code(f)
    assert.doesNotMatch(src, /readFile|createReadStream|openSync|loadEnvFile|dotenv|env-file|\.env['"`]/, f)
    assert.doesNotMatch(src, /firebase|getFirestore|lib\/admin/i, f)
  }
})

test('o script usa o adaptador, o prompt e a regua do servidor e nao grava em server/src', () => {
  const src = code(SCRIPT)
  for (const part of [
    "from '../src/ai/providers.js'",
    "from '../src/ai/config.js'",
    "from './lib/ai-prompt-v1.js'",
    "from '../../shared/core/aiValidate.js'",
    'buildMessages',
    'validateSpeech',
    'CANDIDATES',
  ]) {
    assert.ok(src.includes(part), `script sem "${part}"`)
  }
  assert.doesNotMatch(src, /(writeFileSync|appendFileSync|mkdirSync)\([^)]*src/, 'escrita em server/src')
  assert.doesNotMatch(src, /appendFileSync|rmSync|unlinkSync|renameSync/, 'o script so cria relatorios')
  assert.ok(code(FIXTURES).includes('buildAiSummary'), 'fixtures sem buildAiSummary')
})

test('nada em server/src importa o script nem os fixtures', () => {
  for (const f of listSrc('server/src')) {
    assert.doesNotMatch(read(f), /ai-compare/, `${f} depende do teste lado a lado`)
  }
})
