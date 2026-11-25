import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { readAiConfig } from '../src/ai/config.js'
import { createChain, createProviders } from '../src/ai/providers.js'
import { createAiRouter } from '../src/ai/routes.js'
import { createSpeech } from '../src/ai/speech.js'

// Testes HTTP da fala por IA com snapshot, provedor e fetch injetados (sem rede, sem Firestore).
const ORIGIN = 'https://app.exemplo.test'
const NOW = new Date('2026-11-17T15:00:00Z')

const CLAIMS = {
  'tok-a-ele': { uid: 'u-a-ele', hid: 'casalA', person: 'ele' },
  'tok-a-ela': { uid: 'u-a-ela', hid: 'casalA', person: 'ela' },
  'tok-semhid': { uid: 'u-sem' },
}

const verifyToken = async (token) => {
  const claims = CLAIMS[token]
  if (!claims) throw new Error('token invalido')
  return claims
}

const AI_ENV = {
  AI_PROVIDERS: 'groq',
  AI_GROQ_API_KEY: 'chave-secreta-de-teste-1234',
  AI_GROQ_MODEL: 'modelo-de-teste',
}

const GOOD = 'Mais um iFood, seu trouxa. Você vai ficar sem grana no fim do mês desse jeito.'
const WRONG_STORE = 'Mais um iFood e ainda o Uber, seu trouxa, que desperdício de dinheiro.'

function tx(id, description, amount, day, categoryId, category) {
  return {
    id,
    type: 'saida',
    amount,
    category,
    categoryId,
    description,
    source: 'bank',
    person: 'ele',
    date: new Date(Date.UTC(2026, 10, day, 15)),
  }
}

// Snapshot falso: registra cada chamada de load e devolve um resumo pequeno e fixo.
function fakeSnapshot() {
  const calls = []
  return {
    calls,
    failWith: null,
    async load(args) {
      calls.push(args)
      if (this.failWith) throw this.failWith
      return {
        input: {
          now: NOW,
          person: args.person,
          config: { salaryDay: 1, expectedIncomeCents: 500000 },
          categoryDefs: [
            { id: 'alimentacao', name: 'Alimentacao', kind: 'gasto' },
            { id: 'transporte', name: 'Transporte', kind: 'gasto' },
          ],
          transactions: [
            tx('t1', 'IFOOD *RESTAURANTE', 45.9, 16, 'alimentacao', 'Alimentacao'),
            tx('t2', 'UBER *TRIP', 23.5, 15, 'transporte', 'Transporte'),
          ],
        },
        reads: 3,
        tone: 'sem-filtro',
        tabNames: { area1: 'Nirigue', area2: 'Nirigua' },
      }
    },
  }
}

// fetch falso: responde pela fila (texto da IA ou { status }) e guarda cada pedido.
function fakeFetch(queue) {
  const requests = []
  const fn = async (url, init) => {
    requests.push({ url: String(url), init, body: JSON.parse(init.body) })
    const next = queue.length > 1 ? queue.shift() : queue[0]
    if (next && typeof next === 'object' && next.status) {
      return new Response(JSON.stringify({ errors: [{ code: next.code ?? 0 }] }), { status: next.status })
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: next } }] }), { status: 200 })
  }
  fn.requests = requests
  return fn
}

function captureLog() {
  const lines = []
  const push = (...a) => lines.push(a.map(String).join(' '))
  return { lines, info: push, log: push, warn: push, error: push }
}

describe('ai fala', () => {
  let server
  let base
  let snapshot
  let queue
  let fetchFn
  let log

  async function start(env = AI_ENV) {
    snapshot = fakeSnapshot()
    log = captureLog()
    fetchFn = fakeFetch(queue)
    const config = readAiConfig(env, log)
    const providers = createProviders(config, { fetch: fetchFn })
    const chain = createChain({ providers, config, now: () => NOW, log })
    const speech = createSpeech({ snapshot, providers: chain, config, log })
    const router = createAiRouter({ speech, log })
    const app = createApp({
      verifyToken,
      db: {},
      pluggy: {},
      sync: {},
      origins: [ORIGIN],
      features: [{ mounts: [{ path: '/api/vintem', router }] }],
    })
    await new Promise((resolve) => {
      server = app.listen(0, resolve)
    })
    base = `http://127.0.0.1:${server.address().port}`
  }

  beforeEach(() => {
    queue = [GOOD]
  })

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve))
  })

  const stop = () => new Promise((resolve) => server.close(resolve))

  const post = (token, body) =>
    fetch(`${base}/api/vintem/fala`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })

  test('pedido de lancamento percorre snapshot, prompt, provedor e validacao e devolve o texto', async () => {
    await start()
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    const out = await res.json()
    assert.equal(out.text, GOOD)
    assert.equal(fetchFn.requests.length, 1)
    const req = fetchFn.requests[0]
    assert.equal(req.url, 'https://api.groq.com/openai/v1/chat/completions')
    assert.equal(req.init.headers.authorization, 'Bearer chave-secreta-de-teste-1234')
    assert.equal(req.body.model, 'modelo-de-teste')
    assert.ok(req.body.max_tokens > 0)
    const prompt = req.body.messages.map((m) => m.content).join('\n')
    assert.ok(prompt.includes('iFood'), 'o resumo do lancamento vai no prompt')
    assert.ok(!prompt.includes('IFOOD *RESTAURANTE'), 'a descricao crua nunca vai ao provedor')
    await stop()
  })

  test('a pessoa do token e a unica consultada, mesmo com campos extras no corpo', async () => {
    await start()
    await post('tok-a-ele', { situation: 'lancamento', person: 'ela', hid: 'casalB', ownerId: 'casalB' })
    await post('tok-a-ela', { situation: 'abertura' })
    assert.deepEqual(
      snapshot.calls.map((c) => [c.hid, c.person]),
      [
        ['casalA', 'ele'],
        ['casalA', 'ela'],
      ]
    )
    await stop()
  })

  test('situacoes com dado novo pedem snapshot fresco; abertura e espiar nao', async () => {
    await start()
    for (const situation of ['lancamento', 'limite', 'sync', 'abertura', 'espiar']) {
      await post('tok-a-ele', { situation })
    }
    assert.deepEqual(
      snapshot.calls.map((c) => c.fresh),
      [true, true, true, false, false]
    )
    await stop()
  })

  test('saida de lancamento que cita outra loja do resumo e reprovada e a resposta e text null', async () => {
    queue = [WRONG_STORE]
    await start()
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { text: null })
    await stop()
  })

  test('saida reprovada cai no proximo provedor da lista e a fala aprovada dele e a resposta', async () => {
    queue = [WRONG_STORE, GOOD]
    await start({ ...AI_ENV, AI_PROVIDERS: 'groq,xai', AI_XAI_API_KEY: 'chave-xai-de-teste-1234', AI_XAI_MODEL: 'modelo-xai' })
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.deepEqual(await res.json(), { text: GOOD })
    assert.deepEqual(
      fetchFn.requests.map((r) => new URL(r.url).host),
      ['api.groq.com', 'api.x.ai']
    )
    await stop()
  })

  test('sem provedor configurado a rota responde text null e avisa no log', async () => {
    await start({})
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { text: null })
    assert.equal(fetchFn.requests.length, 0)
    await stop()
  })

  test('provedor com erro 5xx nao vira erro para o cliente', async () => {
    queue = [{ status: 503 }]
    await start()
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { text: null })
    await stop()
  })

  test('sem token a resposta e 401 e nada e gerado', async () => {
    await start()
    const res = await post(null, { situation: 'lancamento' })
    assert.equal(res.status, 401)
    assert.equal(snapshot.calls.length, 0)
    await stop()
  })

  test('situacao fora da lista ou ausente da 400', async () => {
    await start()
    for (const body of [{ situation: 'xingar' }, {}, { situation: 7 }, { situation: 'espiada' }]) {
      const res = await post('tok-a-ele', body)
      assert.equal(res.status, 400, JSON.stringify(body))
    }
    assert.equal(snapshot.calls.length, 0)
    await stop()
  })

  test('a configuracao desliga provedor sem chave ou sem modelo sem lancar', () => {
    const lines = []
    const config = readAiConfig(
      {
        AI_PROVIDERS: 'cloudflare,groq,xai,inexistente',
        AI_CF_ACCOUNT_ID: 'conta123456',
        AI_CF_API_TOKEN: 'token-cloudflare-1234',
        // sem modelo do Cloudflare
        AI_GROQ_API_KEY: 'chave-groq-1234567',
        AI_GROQ_MODEL: 'modelo-a',
        // sem chave do xAI
        AI_XAI_MODEL: 'modelo-b',
      },
      { warn: (l) => lines.push(l) }
    )
    assert.deepEqual(
      config.providers.map((p) => p.id),
      ['groq']
    )
    assert.ok(lines.some((l) => l.includes('cloudflare')))
    assert.ok(lines.some((l) => l.includes('xai')))
    assert.ok(!lines.some((l) => l.includes('token-cloudflare') || l.includes('chave-groq')))
  })

  test('a configuracao usa os padroes e volta ao padrao com numero invalido', () => {
    const c = readAiConfig({ AI_TIMEOUT_MS: 'abc', AI_REACTION_TIMEOUT_MS: '99999', AI_BURST_PER_MIN: '-3' }, { warn() {} })
    assert.equal(c.timeoutMs, 4000)
    assert.equal(c.totalBudgetMs, 6000)
    assert.equal(c.dailyCapPerUser, 100)
    assert.equal(c.cacheTtlHours, 24)
    assert.equal(c.cacheVariants, 3)
    assert.equal(c.requireProfanity, true)
    assert.equal(c.openPerDay, 3)
    assert.equal(c.peekPerDay, 6)
    assert.equal(c.peekMinMs, 360000)
    assert.equal(c.peekMaxMs, 900000)
    assert.equal(c.burstPerMin, 20)
    assert.equal(c.reactionTimeoutMs, 2500)
    assert.deepEqual(c.providers, [])
    assert.equal(readAiConfig({ AI_REACTION_TIMEOUT_MS: '3000' }, { warn() {} }).reactionTimeoutMs, 3000)
    assert.equal(readAiConfig({ AI_REACTION_TIMEOUT_MS: '1000' }, { warn() {} }).reactionTimeoutMs, 2500)
  })

  test('o id da conta do Cloudflare so entra na baseUrl se for seguro (SSRF)', () => {
    const base = { AI_PROVIDERS: 'cloudflare', AI_CF_API_TOKEN: 'token-cloudflare-1234', AI_CF_MODEL: 'modelo-a' }
    const ok = readAiConfig({ ...base, AI_CF_ACCOUNT_ID: 'abc123def456' }, { warn() {} })
    assert.equal(ok.providers[0].baseUrl, 'https://api.cloudflare.com/client/v4/accounts/abc123def456/ai/v1')
    for (const bad of ['evil.com/x', 'a/../b', 'abc123@evil.com', '']) {
      const c = readAiConfig({ ...base, AI_CF_ACCOUNT_ID: bad }, { warn() {} })
      assert.equal(c.providers.length, 0, bad)
    }
  })
})
