import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { readAiConfig } from '../src/ai/config.js'
import { createChain, createProviders } from '../src/ai/providers.js'
import { createLimiter } from '../src/limiter.js'
import { createAiRouter } from '../src/ai/routes.js'
import { createBudget } from '../src/ai/budget.js'
import { createCache } from '../src/ai/cache.js'
import { createMemoryDb } from './_ai-memory-db.js'
import { createSpeech } from '../src/ai/speech.js'
import { hintsOf } from '../src/ai/topics.js'
import { createFakeFirestore } from './_fake-firestore.js'

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
    extra: {},
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
          ...this.extra,
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
  let db
  let clock
  let usage

  async function start(env = AI_ENV, opts = {}) {
    snapshot = fakeSnapshot()
    log = captureLog()
    fetchFn = fakeFetch(queue)
    db = createFakeFirestore()
    clock = { t: NOW.getTime() }
    const config = readAiConfig(env, log)
    const providers = createProviders(config, { fetch: fetchFn })
    const chain = opts.chain ?? createChain({ providers, config, now: () => NOW, log })
    // Com opts.spontaneous entram o teto do dia e o cache de verdade (banco em memoria).
    usage = createMemoryDb()
    const budget = opts.spontaneous ? createBudget({ db: usage, config, now: () => NOW, log }) : null
    const cache = opts.spontaneous ? createCache({ db: usage, config, now: () => NOW, log }) : null
    const speech = createSpeech({ snapshot, providers: chain, config, budget, cache, log })
    const limiter = createLimiter({ max: config.burstPerMin, windowMs: 60_000, now: () => clock.t })
    const router = createAiRouter({ speech, config, db, limiter, log })
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

  const putTx = (id, data) =>
    db.store.set(`transactions/${id}`, {
      type: 'saida',
      amount: 30,
      category: 'Alimentacao',
      categoryId: 'alimentacao',
      source: 'bank',
      date: new Date(Date.UTC(2026, 10, 17, 12)),
      ...data,
    })

  test('transactionId de outro casal, de outra pessoa e inexistente dao a mesma resposta 404', async () => {
    await start()
    putTx('mine', { ownerId: 'casalA', person: 'ele', description: 'RAPPI *PEDIDO' })
    putTx('outro-casal', { ownerId: 'casalB', person: 'ele', description: 'RAPPI *PEDIDO' })
    putTx('outra-pessoa', { ownerId: 'casalA', person: 'ela', description: 'RAPPI *PEDIDO' })
    const bodies = []
    for (const transactionId of ['outro-casal', 'outra-pessoa', 'nao-existe', '../x', 'a/b', 7]) {
      const res = await post('tok-a-ele', { situation: 'lancamento', transactionId })
      assert.equal(res.status, 404, String(transactionId))
      bodies.push(await res.text())
    }
    assert.equal(new Set(bodies).size, 1, 'a mesma mensagem para todos')
    assert.equal(snapshot.calls.length, 0, 'nada foi gerado')
    assert.equal(fetchFn.requests.length, 0)
    await stop()
  })

  test('transactionId proprio vira o lancamento da fala', async () => {
    queue = ['Mais um Rappi, seu trouxa. Assim o mês acaba antes de começar.']
    await start()
    putTx('mine', { ownerId: 'casalA', person: 'ele', description: 'RAPPI *PEDIDO' })
    const res = await post('tok-a-ele', { situation: 'lancamento', transactionId: 'mine' })
    assert.equal(res.status, 200)
    assert.equal((await res.json()).text, 'Mais um Rappi, seu trouxa. Assim o mês acaba antes de começar.')
    const prompt = fetchFn.requests[0].body.messages.map((m) => m.content).join('\n')
    assert.ok(prompt.includes('"loja":"Rappi"'), 'o ultimoLancamento e o do id')
    await stop()
  })

  test('campos extras do corpo (texto, valores, hid) sao ignorados e nunca chegam ao resumo', async () => {
    await start()
    const res = await post('tok-a-ele', {
      situation: 'lancamento',
      text: 'texto-injetado-pelo-cliente',
      summary: { ultimoLancamento: { loja: 'LojaInventada' } },
      amount: 987654,
      valor: 'R$ 1.234,56',
      hid: 'casalB',
      ownerId: 'casalB',
      person: 'ela',
    })
    assert.equal(res.status, 200)
    const prompt = fetchFn.requests[0].body.messages.map((m) => m.content).join('\n')
    for (const bad of ['texto-injetado-pelo-cliente', 'LojaInventada', '987654', '1.234,56']) {
      assert.ok(!prompt.includes(bad), bad)
    }
    assert.deepEqual(snapshot.calls[0], { hid: 'casalA', person: 'ele', fresh: true })
    await stop()
  })

  test('categoryId invalido ou desconhecido e ignorado e a fala sai normal', async () => {
    await start()
    for (const categoryId of ['Cat/../x', 'x'.repeat(41), 42, 'naoexiste', 'transporte']) {
      const res = await post('tok-a-ele', { situation: 'limite', categoryId })
      assert.equal(res.status, 200, String(categoryId))
    }
    await stop()
  })

  test('rajada acima de AI_BURST_PER_MIN responde 429 e libera depois de um minuto', async () => {
    await start({ ...AI_ENV, AI_BURST_PER_MIN: '2' })
    assert.equal((await post('tok-a-ele', { situation: 'abertura' })).status, 200)
    assert.equal((await post('tok-a-ele', { situation: 'abertura' })).status, 200)
    const res = await post('tok-a-ele', { situation: 'abertura' })
    assert.equal(res.status, 429)
    assert.deepEqual(await res.json(), { error: 'Muitos pedidos' })
    assert.ok(Number(res.headers.get('retry-after')) >= 1)
    assert.equal(snapshot.calls.length, 2, 'o pedido barrado nao gera nada')
    // outro usuario nao e afetado
    assert.equal((await post('tok-a-ela', { situation: 'abertura' })).status, 200)
    clock.t += 61_000
    assert.equal((await post('tok-a-ele', { situation: 'abertura' })).status, 200)
    await stop()
  })

  test('falha interna de geracao da 200 com text null e nao vaza a mensagem', async () => {
    await start()
    snapshot.failWith = new Error('segredo-interno-do-banco')
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { text: null })
    assert.ok(!log.lines.join('\n').includes('segredo-interno-do-banco'))
    await stop()
  })

  test('prazo total da rota estourado devolve text null sem esperar o provedor', async () => {
    const never = { complete: () => new Promise(() => {}) }
    await start({ ...AI_ENV, AI_TOTAL_BUDGET_MS: '60' }, { chain: never })
    const started = Date.now()
    const res = await post('tok-a-ele', { situation: 'abertura' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { text: null })
    assert.ok(Date.now() - started < 2000)
    await stop()
  })

  test('o log capturado nao tem nada do resumo, da descricao, do texto gerado nem da chave', async () => {
    await start()
    putTx('mine', { ownerId: 'casalA', person: 'ele', description: 'RAPPI *PEDIDO' })
    await post('tok-a-ele', { situation: 'lancamento' })
    await post('tok-a-ele', { situation: 'lancamento', transactionId: 'mine' })
    queue.splice(0, queue.length, WRONG_STORE)
    await post('tok-a-ela', { situation: 'abertura' })
    const everything = log.lines.join('\n')
    assert.ok(everything.length > 0)
    for (const secret of ['chave-secreta-de-teste', GOOD, 'trouxa', 'iFood', 'IFOOD', 'Rappi', 'R$', 'alimentacao', 'Alimentacao', 'casalA', 'u-a-ele', 'tok-a-ele']) {
      assert.ok(!everything.includes(secret), `vazou no log: ${secret}`)
    }
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

  const getHints = (token) =>
    fetch(`${base}/api/vintem/hints`, { headers: token ? { authorization: `Bearer ${token}` } : {} })

  test('GET /hints devolve as frequencias e o prazo da configuracao do servidor', async () => {
    await start({
      ...AI_ENV,
      VINTEM_PEEK_MIN_MS: '120000',
      VINTEM_PEEK_MAX_MS: '240000',
      AI_PEEK_PER_DAY: '4',
      AI_OPEN_PER_DAY: '2',
      AI_REACTION_TIMEOUT_MS: '3200',
    })
    const res = await getHints('tok-a-ele')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), {
      peekMinMs: 120000,
      peekMaxMs: 240000,
      peekPerDay: 4,
      openPerDay: 2,
      reactionTimeoutMs: 3200,
    })
    assert.equal(snapshot.calls.length, 0, 'hints nao le dado nenhum')
    assert.equal((await getHints(null)).status, 401)
    await stop()
  })

  test('GET /hints sem configuracao devolve os padroes (prazo de 2500 ms)', async () => {
    await start()
    assert.deepEqual(await (await getHints('tok-a-ela')).json(), {
      peekMinMs: 360000,
      peekMaxMs: 900000,
      peekPerDay: 6,
      openPerDay: 3,
      reactionTimeoutMs: 2500,
    })
    await stop()
  })

  test('o prazo das reacoes fica entre 1500 e 4000: fora disso volta a 2500', async () => {
    const cases = [
      ['1500', 1500],
      ['4000', 4000],
      ['1499', 2500],
      ['4001', 2500],
      ['0', 2500],
      ['99999999', 2500],
      ['abc', 2500],
      ['2000.5', 2500],
    ]
    for (const [raw, expected] of cases) {
      await start({ ...AI_ENV, AI_REACTION_TIMEOUT_MS: raw })
      const out = await (await getHints('tok-a-ele')).json()
      assert.equal(out.reactionTimeoutMs, expected, `AI_REACTION_TIMEOUT_MS=${raw}`)
      await stop()
    }
    // A rota sanea mesmo que receba uma configuracao que nao passou pelo readAiConfig.
    for (const [value, expected] of [[100, 2500], [60000, 2500], [undefined, 2500], [3999, 3999]]) {
      assert.equal(hintsOf({ reactionTimeoutMs: value }).reactionTimeoutMs, expected, String(value))
    }
  })

  test('intervalo absurdo e saneado: piso de 60 s e maximo nunca abaixo do minimo', async () => {
    await start({ ...AI_ENV, VINTEM_PEEK_MIN_MS: '1', VINTEM_PEEK_MAX_MS: '2' })
    let out = await (await getHints('tok-a-ele')).json()
    assert.deepEqual([out.peekMinMs, out.peekMaxMs], [60000, 60000])
    await stop()

    await start({ ...AI_ENV, VINTEM_PEEK_MIN_MS: '600000', VINTEM_PEEK_MAX_MS: '120000' })
    out = await (await getHints('tok-a-ele')).json()
    assert.deepEqual([out.peekMinMs, out.peekMaxMs], [600000, 600000])
    await stop()

    await start({ ...AI_ENV, VINTEM_PEEK_MIN_MS: '9000000000', VINTEM_PEEK_MAX_MS: '-5', AI_PEEK_PER_DAY: '0' })
    out = await (await getHints('tok-a-ele')).json()
    assert.deepEqual([out.peekMinMs, out.peekMaxMs, out.peekPerDay], [86400000, 86400000, 0])
    await stop()
  })

  // Resumo com sete assuntos, para o teto de espiadas acabar antes dos assuntos.
  const MANY_TOPICS = {
    goals: [{ name: 'Viagem', targetCents: 100000, currentCents: 25000 }],
    porquinhoCents: 123400,
    insights: [{ id: 'i1', type: 'delivery-heavy', severity: 3, subject: { kind: 'category', key: 'alimentacao' }, metrics: {} }],
  }
  const usageDoc = (person = 'ele') => usage.read('aiUsage', `casalA__${person}__2026-11-17`)
  const say = async (situation, token = 'tok-a-ele', body = {}) => (await post(token, { situation, ...body })).json()

  test('a sexta espiada do dia passa e a setima devolve null; padrao notado sai mais longo', async () => {
    await start(AI_ENV, { spontaneous: true })
    snapshot.extra = MANY_TOPICS
    for (let i = 1; i <= 6; i += 1) assert.equal((await say('espiar')).text, GOOD, `espiada ${i}`)
    const day = usageDoc()
    assert.equal(day.espiar, 6)
    assert.equal(day.abertura, undefined)
    assert.equal(new Set(day.assuntos).size, 6)
    assert.equal(day.calls, 6, 'a fala espontanea conta no teto diario da pessoa (D-03)')
    assert.deepEqual(await say('espiar'), { text: null })
    assert.equal(fetchFn.requests.length, 6)
    assert.equal(day.assuntos[0], 'padroes')
    assert.equal(fetchFn.requests[0].body.max_tokens, 200, 'padrao notado pede fala longa (D-15)')
    assert.equal(fetchFn.requests[day.assuntos.indexOf('ritmo')].body.max_tokens, 120)
    const prompt = fetchFn.requests[0].body.messages.map((m) => m.content).join('\n')
    assert.ok(prompt.includes('espiando o app'), 'o prompt e o da espiada')
    await stop()
  })

  test('abertura e espiada dividem a lista de assuntos do dia', async () => {
    await start(AI_ENV, { spontaneous: true })
    snapshot.extra = MANY_TOPICS
    await say('abertura')
    await say('espiar')
    const day = usageDoc()
    assert.deepEqual([day.abertura, day.espiar], [1, 1])
    assert.equal(day.assuntos.length, 2)
    assert.notEqual(day.assuntos[0], day.assuntos[1], 'o assunto da abertura voltou na espiada')
    await stop()
  })

  test('o teto diario da pessoa vale para a espiada e o acerto de cache nao conta', async () => {
    await start({ ...AI_ENV, AI_DAILY_CAP_PER_USER: '1', AI_CACHE_VARIANTS: '1' }, { spontaneous: true })
    snapshot.extra = MANY_TOPICS
    assert.equal((await say('espiar')).text, GOOD)
    assert.deepEqual(await say('espiar'), { text: null })
    assert.equal(fetchFn.requests.length, 1)
    // Sem o contador do dia, o mesmo assunto sai do cache: conta a espiada, nao a chamada.
    await usage.collection('aiUsage').doc('casalA__ele__2026-11-17').delete()
    assert.equal((await say('espiar')).text, GOOD)
    assert.equal(fetchFn.requests.length, 1)
    assert.deepEqual([usageDoc().espiar, usageDoc().calls], [1, 0])
    await stop()
  })

  test('na fala espontanea pessoa e casal vem so do token', async () => {
    await start(AI_ENV, { spontaneous: true })
    snapshot.extra = MANY_TOPICS
    await say('espiar', 'tok-a-ele', { person: 'ela', hid: 'casalB', ownerId: 'casalB', topic: 'porquinho' })
    assert.deepEqual(Object.keys(usage.all('aiUsage')), ['casalA__ele__2026-11-17'])
    assert.deepEqual(snapshot.calls, [{ hid: 'casalA', person: 'ele', fresh: false }])
    assert.deepEqual(usageDoc().assuntos, ['padroes'])
    await stop()
  })

  test('app que desiste antes da resposta nao consome a espiada nem o assunto', async () => {
    let release
    const held = new Promise((resolve) => {
      release = resolve
    })
    let asked
    const reached = new Promise((resolve) => {
      asked = resolve
    })
    const slow = {
      complete: async () => {
        asked()
        await held
        return { ok: true, text: GOOD }
      },
    }
    await start(AI_ENV, { spontaneous: true, chain: slow })
    snapshot.extra = MANY_TOPICS
    const control = new AbortController()
    const pending = fetch(`${base}/api/vintem/fala`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer tok-a-ele' },
      body: JSON.stringify({ situation: 'espiar' }),
      signal: control.signal,
    })
    await reached
    control.abort()
    await assert.rejects(pending)
    await new Promise((resolve) => setTimeout(resolve, 50))
    release()
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.equal(usageDoc().espiar, undefined)
    assert.equal(usageDoc().assuntos, undefined)
    await stop()
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
