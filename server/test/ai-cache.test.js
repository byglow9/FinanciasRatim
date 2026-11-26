import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readAiConfig } from '../src/ai/config.js'
import { createBudget } from '../src/ai/budget.js'
import { cacheKeyOf, createCache } from '../src/ai/cache.js'
import { createChain, createProviders } from '../src/ai/providers.js'
import { createSpeech } from '../src/ai/speech.js'
import { createMemoryDb } from './_ai-memory-db.js'

// Variantes, revalidacao, coalescencia e freio por provedor (07-12), sem rede e com relogio e acaso injetados.
const NOW = new Date('2026-11-17T15:00:00Z')
const HID = 'casal-teste-1'
const HOUR = 3_600_000
const quiet = { log() {}, warn() {}, info() {}, error() {} }

const T1 = 'Mais um iFood, seu trouxa. Você vai ficar sem grana no fim do mês desse jeito.'
const T2 = 'Outro iFood, seu trouxa. Seu bolso já pediu socorro faz tempo.'
const T3 = 'iFood de novo, seu trouxa. Cozinhar em casa não mata ninguém.'
const T_MONEY = 'Mais um iFood de R$ 45,90, seu trouxa. Isso aqui vira hábito rapidinho.'
const T_UBER = 'Mais um Uber, seu trouxa. Você vai ficar sem grana no fim do mês desse jeito.'
const T_RAPPI = 'Mais um Rappi, seu trouxa. Você vai ficar sem grana no fim do mês desse jeito.'
// Sem marca: servem ao fato de anotacao (a regua reprova marca fora do fato).
const N1 = 'Segura a onda, teu bucho agradece e o cofre também.'
const N2 = 'Anota aí e cumpre, porque o cofre está de olho em você.'

function tx(id, description, amount, day, categoryId, category) {
  return { id, type: 'saida', amount, category, categoryId, description, source: 'bank', person: 'ele', date: new Date(Date.UTC(2026, 10, day, 15)) }
}

// Snapshot falso e mutavel: os testes trocam os lancamentos entre uma fala e outra.
function mutableSnapshot(clock) {
  const state = {
    txs: [tx('t1', 'IFOOD *RESTAURANTE', 45.9, 16, 'alimentacao', 'Alimentacao'), tx('t2', 'UBER *TRIP', 23.5, 15, 'transporte', 'Transporte')],
    loads: 0,
    async load(args) {
      state.loads += 1
      return {
        input: {
          now: new Date(clock.t),
          person: args.person,
          config: { salaryDay: 1, expectedIncomeCents: 500000 },
          categoryDefs: [
            { id: 'alimentacao', name: 'Alimentacao', kind: 'gasto' },
            { id: 'transporte', name: 'Transporte', kind: 'gasto' },
          ],
          transactions: state.txs,
          notes: [
            { title: 'Parar de pedir comida', content: 'ate sexta', date: null },
            { title: 'Guardar um pouco', content: 'todo mes', date: null },
          ],
        },
        reads: 1,
        tone: 'sem-filtro',
        tabNames: { area1: 'Nirigue', area2: 'Nirigua' },
      }
    },
  }
  return state
}

// fetch falso: responde pela fila (o ultimo item se repete), com atraso opcional.
function fakeFetch(queue, { delayMs = 0 } = {}) {
  const requests = []
  const fn = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(init.body) })
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    const next = queue.length > 1 ? queue.shift() : queue[0]
    return new Response(JSON.stringify({ choices: [{ message: { content: next } }] }), { status: 200 })
  }
  fn.requests = requests
  return fn
}

function build(envExtra = {}, { queue = [T1], delayMs = 0, rand = () => 0.5 } = {}) {
  const env = {
    AI_PROVIDERS: 'groq',
    AI_GROQ_API_KEY: 'chave-secreta-de-teste-1234',
    AI_GROQ_MODEL: 'modelo-de-teste',
    ...envExtra,
  }
  const db = createMemoryDb()
  const clock = { t: NOW.getTime() }
  const now = () => new Date(clock.t)
  const config = readAiConfig(env, quiet)
  const fetchFn = fakeFetch(queue, { delayMs })
  const budget = createBudget({ db, config, now, log: quiet })
  const realCache = createCache({ db, config, now, rand, log: quiet })
  // Espia as chaves canonicas pedidas, para os testes olharem a chave sem refazer a conta.
  const canonicals = []
  const cache = {
    ...realCache,
    lookup: (args) => {
      canonicals.push(args.canonical)
      return realCache.lookup(args)
    },
  }
  const chain = createChain({ providers: createProviders(config, { fetch: fetchFn }), config, now, log: quiet, gate: budget.consumeProvider })
  const snapshot = mutableSnapshot(clock)
  const speech = createSpeech({ snapshot, providers: chain, config, budget, cache, log: quiet, bank: {} })
  return { db, clock, config, fetchFn, budget, cache: realCache, canonicals, snapshot, speech }
}

const say = (s, situation = 'lancamento', person = 'ele') => s.speech.generate({ hid: HID, person, situation })

describe('variantes do cache', () => {
  test('ate K variantes, depois sorteia sem repetir a ultima servida e sem chamar a rede', async () => {
    // rand 0 escolhe sempre o primeiro candidato que nao seja a ultima servida.
    const s = build({ AI_CACHE_VARIANTS: '3', AI_DAILY_CAP_PER_USER: '50' }, { queue: [T1, T2, T3], rand: () => 0 })
    const grow = []
    for (let i = 0; i < 3; i += 1) grow.push((await say(s)).text)
    assert.deepEqual(grow, [T1, T2, T3], 'enquanto ha menos de K variantes, gera mais uma')
    assert.equal(s.fetchFn.requests.length, 3)

    const served = []
    for (let i = 0; i < 8; i += 1) {
      const out = await say(s)
      assert.equal(out.source, 'cache')
      served.push(out.text)
    }
    assert.equal(s.fetchFn.requests.length, 3, 'com K variantes nao chama mais o provedor')
    for (let i = 1; i < served.length; i += 1) assert.notEqual(served[i], served[i - 1], 'nunca repete a ultima servida')
    assert.ok(new Set(served).size >= 2)
    assert.equal(s.db.read('aiUsage', `${HID}__ele__2026-11-17`).calls, 3)
  })

  test('passando de K a variante mais antiga sai', async () => {
    const s = build({ AI_CACHE_VARIANTS: '2', AI_DAILY_CAP_PER_USER: '50' }, { queue: [T1, T2, T3] })
    await say(s)
    await say(s)
    // Dois guardados e K=2: o terceiro texto so entra se uma geracao for pedida, entao grava direto.
    await s.cache.store({ hid: HID, person: 'ele', canonical: s.canonicals[0], text: T3 })
    const doc = s.db.read('aiCache', cacheKeyOf(HID, 'ele', s.canonicals[0]))
    assert.deepEqual(doc.variants, [T2, T3])
  })

  test('com o teto da pessoa esgotado e menos de K variantes, serve a que ja existe', async () => {
    const s = build({ AI_CACHE_VARIANTS: '3', AI_DAILY_CAP_PER_USER: '1' }, { queue: [T1, T2] })
    assert.equal((await say(s)).text, T1)
    const out = await say(s)
    assert.deepEqual(out, { text: T1, source: 'cache' })
    assert.equal(s.fetchFn.requests.length, 1)
  })

  test('TTL de 24 horas vencido vira miss e gera de novo', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '50' }, { queue: [T1, T2] })
    assert.equal((await say(s)).text, T1)
    s.clock.t += 23 * HOUR
    assert.equal((await say(s)).source, 'cache', 'aos 23 horas ainda vale')
    s.clock.t += 2 * HOUR
    const out = await say(s)
    assert.deepEqual(out, { text: T2, source: 'ia' })
    assert.equal(s.fetchFn.requests.length, 2)
    const doc = s.db.read('aiCache', cacheKeyOf(HID, 'ele', s.canonicals[0]))
    assert.deepEqual(doc.variants, [T2], 'a entrada vencida recomecou so com a nova')
  })

  test('AI_CACHE_TTL_HOURS muda o prazo', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_CACHE_TTL_HOURS: '2', AI_DAILY_CAP_PER_USER: '50' }, { queue: [T1, T2] })
    await say(s)
    s.clock.t += 3 * HOUR
    assert.equal((await say(s)).source, 'ia')
  })
})

describe('revalidacao antes de servir', () => {
  test('variante com numero que deixou de existir no resumo atual e descartada e nunca mostrada', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '50' }, { queue: [T_MONEY, T1] })
    assert.equal((await say(s)).text, T_MONEY, 'com 45,90 no resumo o numero existe')
    assert.equal((await say(s)).text, T_MONEY)
    // O lancamento mais recente passa a custar outro valor: a chave e a mesma, o numero nao.
    s.snapshot.txs = [tx('t1', 'IFOOD *RESTAURANTE', 51.2, 16, 'alimentacao', 'Alimentacao'), s.snapshot.txs[1]]
    const out = await say(s)
    assert.notEqual(out.text, T_MONEY)
    assert.deepEqual(out, { text: T1, source: 'ia' })
    const doc = s.db.read('aiCache', cacheKeyOf(HID, 'ele', s.canonicals[0]))
    assert.deepEqual(doc.variants, [T1], 'a reprovada saiu do documento')
  })

  test('sem geracao possivel, a variante reprovada nao e mostrada e a resposta e nula', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '1' }, { queue: [T_MONEY] })
    await say(s)
    s.snapshot.txs = [tx('t1', 'IFOOD *RESTAURANTE', 51.2, 16, 'alimentacao', 'Alimentacao'), s.snapshot.txs[1]]
    assert.deepEqual(await say(s), { text: null })
    assert.equal(s.db.read('aiCache', cacheKeyOf(HID, 'ele', s.canonicals[0])), undefined, 'documento limpo')
  })

  test('variante de lancamento que cita outra loja e descartada', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '1' }, { queue: [T1] })
    await say(s)
    const canonical = s.canonicals[0]
    // Planta, na chave do iFood, uma variante que fala do Uber (que existe no resumo como outra loja).
    await s.cache.store({ hid: HID, person: 'ele', canonical, text: T_UBER })
    const dropped = await s.cache.lookup({ hid: HID, person: 'ele', canonical, validate: () => null })
    assert.deepEqual(dropped, { text: null, count: 0 })

    await s.cache.store({ hid: HID, person: 'ele', canonical, text: T_UBER })
    // Pelo caminho real da fala: a variante do Uber nunca sai para o iFood.
    const out = await say(s)
    assert.notEqual(out.text, T_UBER)
    assert.equal(out.text, null, 'teto em 1 e a unica variante reprovada: sem fala')
  })

  test('a chave do lancamento muda quando a loja muda', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '50' }, { queue: [T1, T_RAPPI] })
    await say(s)
    s.snapshot.txs = [...s.snapshot.txs, tx('t3', 'RAPPI *PEDIDO', 12, 17, 'alimentacao', 'Alimentacao')]
    const out = await say(s)
    assert.equal(out.source, 'ia', 'outra loja, outra chave, sem acerto')
    assert.equal(out.text, T_RAPPI)
    assert.equal(new Set(s.canonicals).size, 2)
    assert.match(s.canonicals[0], /\|m[0-9a-f]{8}\|f[0-9a-f]{8}$/)
    assert.notEqual(s.canonicals[0], s.canonicals[1])
  })

  test('a chave nao leva texto livre nem valor exato', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '50' })
    await say(s)
    const key = s.canonicals[0]
    assert.match(key, /^v2\|2026-11\|sem-filtro\|lancamento\|delivery\|/)
    assert.match(key, /\|m[0-9a-f]{8}\|f[0-9a-f]{8}$/)
    // So as partes de texto: um hash hexadecimal pode conter "45" por acaso.
    const text = key.split('|').filter((part) => !/^[mf][0-9a-f]{8}$/.test(part)).join('|')
    for (const forbidden of ['IFOOD', 'ifood', '45', 'Alimentacao']) assert.equal(text.includes(forbidden), false, forbidden)
  })
})

describe('coalescencia e prazo da rota', () => {
  test('20 chamadas simultaneas iguais fazem um unico fetch e um unico desconto no teto', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '50' }, { delayMs: 40 })
    const results = await Promise.all(Array.from({ length: 20 }, () => say(s)))
    assert.equal(s.fetchFn.requests.length, 1)
    assert.ok(results.every((r) => r.text === T1))
    assert.equal(s.db.read('aiUsage', `${HID}__ele__2026-11-17`).calls, 1)
  })

  test('geracao que estoura o prazo da rota ainda chega ao cache para a proxima vez', async () => {
    const s = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '50', AI_TOTAL_BUDGET_MS: '20' }, { delayMs: 120 })
    assert.deepEqual(await say(s), { text: null }, 'a rota desistiu no prazo')
    assert.equal(s.fetchFn.requests.length, 1)
    await new Promise((resolve) => setTimeout(resolve, 300))
    const next = await say(s)
    assert.deepEqual(next, { text: T1, source: 'cache' })
    assert.equal(s.fetchFn.requests.length, 1, 'a segunda saiu do cache, sem nova chamada')
  })
})

describe('freio por provedor', () => {
  const TWO = {
    AI_PROVIDERS: 'cloudflare,groq',
    AI_CF_ACCOUNT_ID: 'conta123456',
    AI_CF_API_TOKEN: 'token-secreto-de-teste-1234',
    AI_CF_MODEL: '@cf/modelo/teste',
    AI_CACHE_VARIANTS: '1',
    AI_DAILY_CAP_PER_USER: '50',
  }
  const hosts = (s) => s.fetchFn.requests.map((r) => (r.url.includes('cloudflare') ? 'cloudflare' : 'groq'))

  test('provedor no teto proprio e pulado sem rede e o seguinte e usado', async () => {
    const s = build({ ...TWO, AI_PROVIDER_CAP_CLOUDFLARE: '1' }, { queue: [T1, N1] })
    assert.equal((await say(s, 'lancamento')).text, T1)
    // Outra situacao para nao cair no cache: o cloudflare ja gastou o unico lugar do dia.
    assert.equal((await say(s, 'abertura')).text, N1)
    assert.deepEqual(hosts(s), ['cloudflare', 'groq'])
    assert.equal(s.db.read('aiUsage', 'provider__cloudflare__2026-11-17').calls, 1)
  })

  test('sem teto proprio o provedor so e contado, nunca bloqueado', async () => {
    const s = build({ ...TWO }, { queue: [T1, N1] })
    await say(s, 'lancamento')
    assert.equal((await say(s, 'abertura')).text, N1)
    assert.deepEqual(hosts(s), ['cloudflare', 'cloudflare'])
    assert.equal(s.db.read('aiUsage', 'provider__cloudflare__2026-11-17').calls, 2)
  })

  test('todos os provedores no teto proprio: nenhum fetch e resposta nula', async () => {
    const s = build({ ...TWO, AI_PROVIDER_CAP_CLOUDFLARE: '1', AI_PROVIDER_CAP_GROQ: '1' }, { queue: [T1, N1, N2] })
    await say(s, 'lancamento')
    await say(s, 'abertura')
    const before = s.fetchFn.requests.length
    assert.deepEqual(await say(s, 'espiar'), { text: null })
    assert.equal(s.fetchFn.requests.length, before)
  })
})
