import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readAiConfig } from '../src/ai/config.js'
import { createBudget } from '../src/ai/budget.js'
import { createCache } from '../src/ai/cache.js'
import { createChain, createProviders } from '../src/ai/providers.js'
import { createSpeech } from '../src/ai/speech.js'
import { dailyCapOf } from '../src/ai/topics.js'
import { createMemoryDb } from './_ai-memory-db.js'

// Teto diario por pessoa e cache da fala (07-12) com Firestore em memoria, sem rede.
const NOW = new Date('2026-11-17T15:00:00Z')
const HID = 'casal-teste-1'

const GOOD = 'Mais um iFood, seu trouxa. Você vai ficar sem grana no fim do mês desse jeito.'
/** Fala sem marca nem numero: serve a qualquer fato de IA (a regua reprova marca fora do fato). */
const NEUTRAL = 'Segura a onda, teu bucho agradece e o cofre também.'
const NOTE = { title: 'Parar de pedir comida', content: 'ate sexta', date: null }
const sceneOf = (topic) => /^(.+)-[0-9a-f]{8}$/.exec(topic)?.[1]

const quiet = { log() {}, warn() {}, info() {}, error() {} }

function tx(id, description, amount, day, categoryId, category) {
  return { id, type: 'saida', amount, category, categoryId, description, source: 'bank', person: 'ele', date: new Date(Date.UTC(2026, 10, day, 15)) }
}

function fakeSnapshot() {
  return {
    async load(args) {
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
          notes: [NOTE],
        },
        reads: 3,
        tone: 'sem-filtro',
        tabNames: { area1: 'Nirigue', area2: 'Nirigua' },
      }
    },
  }
}

// Sem texto fixo, responde pelo fato do pedido: a fala do iFood so para o lancamento do iFood.
function fakeFetch(fixed) {
  const requests = []
  const fn = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push({ url: String(url), body })
    const text = fixed ?? (body.messages.at(-1).content.includes('"loja":"iFood"') ? GOOD : NEUTRAL)
    return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 })
  }
  fn.requests = requests
  return fn
}

function build(envExtra = {}, { db = createMemoryDb(), clock = { t: NOW.getTime() }, fetchFn = fakeFetch() } = {}) {
  const env = {
    AI_PROVIDERS: 'groq',
    AI_GROQ_API_KEY: 'chave-secreta-de-teste-1234',
    AI_GROQ_MODEL: 'modelo-de-teste',
    ...envExtra,
  }
  const now = () => new Date(clock.t)
  const config = readAiConfig(env, quiet)
  const budget = createBudget({ db, config, now, log: quiet })
  const cache = createCache({ db, config, now, rand: () => 0.5, log: quiet })
  const chain = createChain({ providers: createProviders(config, { fetch: fetchFn }), config, now, log: quiet, gate: budget.consumeProvider })
  const speech = createSpeech({ snapshot: fakeSnapshot(), providers: chain, config, budget, cache, log: quiet, bank: {} })
  return { db, clock, fetchFn, config, budget, cache, speech }
}

const say = (s, situation = 'lancamento', person = 'ele') => s.speech.generate({ hid: HID, person, situation })

describe('teto diario e cache (tracer)', () => {
  test('gera uma vez, reaproveita do cache sem contar e o teto corta a terceira', async () => {
    const s = build({ AI_DAILY_CAP_PER_USER: '1', AI_CACHE_VARIANTS: '1' })

    const first = await say(s)
    assert.equal(first.text, GOOD)
    assert.equal(first.source, 'ia')
    assert.equal(s.fetchFn.requests.length, 1)
    assert.equal(s.db.read('aiUsage', `${HID}__ele__2026-11-17`).calls, 1)

    const second = await say(s)
    assert.equal(second.text, GOOD)
    assert.equal(second.source, 'cache')
    assert.equal(s.fetchFn.requests.length, 1, 'acerto de cache nao chama o provedor')
    assert.equal(s.db.read('aiUsage', `${HID}__ele__2026-11-17`).calls, 1, 'acerto de cache nao conta')

    // Outra situacao (chave diferente) com o teto em 1: nada de provedor, resposta nula sem erro.
    const third = await say(s, 'abertura')
    assert.deepEqual(third, { text: null })
    assert.equal(s.fetchFn.requests.length, 1)
    assert.equal(s.db.read('aiUsage', `${HID}__ele__2026-11-17`).calls, 1)
  })

  test('o cache ainda serve depois que o teto da pessoa acabou', async () => {
    const s = build({ AI_DAILY_CAP_PER_USER: '1', AI_CACHE_VARIANTS: '1' })
    await say(s)
    for (let i = 0; i < 3; i += 1) assert.equal((await say(s)).source, 'cache')
    assert.equal(s.fetchFn.requests.length, 1)
  })

  test('so o texto aprovado, a chave e as datas vao para o cache; o contador so tem ids e contagem', async () => {
    const s = build({ AI_DAILY_CAP_PER_USER: '5', AI_CACHE_VARIANTS: '1' })
    await say(s)
    const cached = Object.entries(s.db.all('aiCache'))
    assert.equal(cached.length, 1)
    const [id, doc] = cached[0]
    assert.match(id, /^[0-9a-f]{40}$/)
    assert.deepEqual(Object.keys(doc).sort(), ['expiresAt', 'lastText', 'ownerId', 'person', 'updatedAt', 'variants'])
    assert.deepEqual(doc.variants, [GOOD])
    assert.equal(doc.ownerId, HID)
    const usage = s.db.read('aiUsage', `${HID}__ele__2026-11-17`)
    assert.deepEqual(Object.keys(usage).sort(), ['calls', 'dayKey', 'ownerId', 'person', 'updatedAt'])
    const dump = JSON.stringify([...s.db.store.values()])
    for (const forbidden of ['IFOOD', 'UBER', 'messages', 'chave-secreta', 'RESTAURANTE']) {
      assert.equal(dump.includes(forbidden), false, `nao pode gravar ${forbidden}`)
    }
  })

  test('teto zero: sem provedor, sem escrita, resposta nula', async () => {
    const s = build({ AI_DAILY_CAP_PER_USER: '0' })
    assert.deepEqual(await say(s), { text: null })
    assert.equal(s.fetchFn.requests.length, 0)
    assert.equal(s.db.stats.writes, 0)
  })

  test('cada pessoa tem o proprio teto', async () => {
    const s = build({ AI_DAILY_CAP_PER_USER: '1', AI_CACHE_VARIANTS: '1' })
    assert.equal((await say(s, 'lancamento', 'ele')).source, 'ia')
    assert.equal((await say(s, 'abertura', 'ele')).text, null)
    assert.equal((await say(s, 'abertura', 'ela')).source, 'ia')
  })
})

describe('budget', () => {
  const cfg = (cap, providerCaps = {}) => ({ dailyCapPerUser: cap, providerCaps })

  test('consume incrementa ate o teto e nao escreve depois dele', async () => {
    const db = createMemoryDb()
    const b = createBudget({ db, config: cfg(3), now: () => NOW, log: quiet })
    const out = []
    for (let i = 0; i < 5; i += 1) out.push((await b.consume({ hid: HID, person: 'ele' })).ok)
    assert.deepEqual(out, [true, true, true, false, false])
    assert.equal(db.read('aiUsage', `${HID}__ele__2026-11-17`).calls, 3)
    assert.equal(db.stats.writes, 3)
  })

  test('chamadas simultaneas no ultimo lugar deixam passar so as que cabem', async () => {
    const db = createMemoryDb()
    const b = createBudget({ db, config: cfg(5), now: () => NOW, log: quiet })
    const results = await Promise.all(Array.from({ length: 12 }, () => b.consume({ hid: HID, person: 'ela' })))
    assert.equal(results.filter((r) => r.ok).length, 5)
    assert.equal(results.filter((r) => !r.ok).length, 7)
    assert.equal(db.read('aiUsage', `${HID}__ela__2026-11-17`).calls, 5)
  })

  test('o dia do teto e o de Sao Paulo, nao o UTC', async () => {
    const db = createMemoryDb()
    const clock = { t: Date.parse('2026-11-17T02:30:00Z') } // 23:30 do dia 16 em Sao Paulo
    const b = createBudget({ db, config: cfg(1), now: () => new Date(clock.t), log: quiet })
    assert.equal((await b.consume({ hid: HID, person: 'ele' })).ok, true)
    assert.ok(db.read('aiUsage', `${HID}__ele__2026-11-16`))
    clock.t = Date.parse('2026-11-17T02:59:00Z')
    assert.equal((await b.consume({ hid: HID, person: 'ele' })).ok, false, 'mesmo dia de Sao Paulo')
    clock.t = Date.parse('2026-11-17T03:01:00Z')
    assert.equal((await b.consume({ hid: HID, person: 'ele' })).ok, true, 'virou o dia em Sao Paulo')
  })

  test('erro do banco vira ok falso, sem lancar', async () => {
    const db = {
      collection: () => ({ doc: () => ({}) }),
      runTransaction: async () => {
        throw Object.assign(new Error('segredo-do-banco'), { code: 14 })
      },
    }
    const lines = []
    const b = createBudget({ db, config: cfg(3), now: () => NOW, log: { warn: (l) => lines.push(l) } })
    assert.deepEqual(await b.consume({ hid: HID, person: 'ele' }), { ok: false, calls: 0 })
    assert.equal(lines.join(' ').includes('segredo-do-banco'), false)
  })

  test('hid ou pessoa fora do formato nao consome nem escreve', async () => {
    const db = createMemoryDb()
    const b = createBudget({ db, config: cfg(3), now: () => NOW, log: quiet })
    assert.equal((await b.consume({ hid: 'a/b', person: 'ele' })).ok, false)
    assert.equal((await b.consume({ hid: HID, person: 'porquinho' })).ok, false)
    assert.equal(db.stats.writes, 0)
  })

  test('provedor: teto proprio por dia UTC, separado por provedor e sem ownerId', async () => {
    const db = createMemoryDb()
    const clock = { t: Date.parse('2026-11-17T23:30:00Z') }
    const b = createBudget({ db, config: cfg(3, { cloudflare: 2, groq: 0 }), now: () => new Date(clock.t), log: quiet })
    assert.equal((await b.consumeProvider({ providerId: 'cloudflare' })).ok, true)
    assert.equal((await b.consumeProvider({ providerId: 'cloudflare' })).ok, true)
    assert.equal((await b.consumeProvider({ providerId: 'cloudflare' })).ok, false)
    // Sem teto proprio o contador so conta e nunca bloqueia.
    for (let i = 0; i < 4; i += 1) assert.equal((await b.consumeProvider({ providerId: 'groq' })).ok, true)
    assert.equal(db.read('aiUsage', 'provider__groq__2026-11-17').calls, 4)
    const doc = db.read('aiUsage', 'provider__cloudflare__2026-11-17')
    assert.equal(doc.calls, 2)
    assert.equal('ownerId' in doc, false)
    // 00:00 UTC vira o dia do provedor (21:00 em Sao Paulo, ainda o mesmo dia deles).
    clock.t = Date.parse('2026-11-18T00:00:01Z')
    assert.equal((await b.consumeProvider({ providerId: 'cloudflare' })).ok, true)
  })
})

describe('config', () => {
  test('tetos e variantes so por variavel de ambiente, com os padroes do plano', () => {
    const d = readAiConfig({}, quiet)
    assert.equal(d.dailyCapPerUser, 100)
    assert.equal(d.cacheVariants, 3)
    assert.equal(d.cacheTtlHours, 24)
    assert.deepEqual(d.providerCaps, { cloudflare: 0, groq: 0, xai: 0 })
    const c = readAiConfig(
      { AI_DAILY_CAP_PER_USER: '7', AI_CACHE_VARIANTS: '2', AI_PROVIDER_CAP_CLOUDFLARE: '150', AI_PROVIDER_CAP_GROQ: 'x' },
      quiet,
    )
    assert.equal(c.dailyCapPerUser, 7)
    assert.equal(c.cacheVariants, 2)
    assert.deepEqual(c.providerCaps, { cloudflare: 150, groq: 0, xai: 0 })
  })
})

// ---------------------------------------------------------------------------------------------
// Fala espontanea (07-16, D-12): teto do tipo, assunto sem repeticao e consumo so quando ha texto.
// ---------------------------------------------------------------------------------------------

const DAY_DOC = `${HID}__ele__2026-11-17`

// Mesmo snapshot dos outros testes, com contagem das cargas e extras na entrada do resumo.
function spontaneousSetup(envExtra = {}, { extra = {}, fetchFn = fakeFetch(NEUTRAL), db = createMemoryDb() } = {}) {
  const env = {
    AI_PROVIDERS: 'groq',
    AI_GROQ_API_KEY: 'chave-secreta-de-teste-1234',
    AI_GROQ_MODEL: 'modelo-de-teste',
    ...envExtra,
  }
  const clock = { t: NOW.getTime() }
  const now = () => new Date(clock.t)
  const config = readAiConfig(env, quiet)
  const budget = createBudget({ db, config, now, log: quiet })
  const inner = createCache({ db, config, now, rand: () => 0, log: quiet })
  const keys = []
  const cache = {
    ...inner,
    lookup: (args) => {
      keys.push(args.canonical)
      return inner.lookup(args)
    },
  }
  const base = fakeSnapshot()
  const loads = []
  const snapshot = {
    async load(args) {
      loads.push(args)
      const snap = await base.load(args)
      return { ...snap, input: { ...snap.input, ...extra } }
    },
  }
  const chain = createChain({ providers: createProviders(config, { fetch: fetchFn }), config, now, log: quiet, gate: budget.consumeProvider })
  const speech = createSpeech({ snapshot, providers: chain, config, budget, cache, log: quiet, bank: {} })
  const open = (args = {}) => speech.generate({ hid: HID, person: 'ele', situation: 'abertura', ...args })
  const day = () => db.read('aiUsage', DAY_DOC)
  return { db, clock, config, budget, speech, fetchFn, keys, loads, open, day }
}

// Anotacao, compromisso com local e padrao guardado: os tres fatos que a IA pode comentar sozinha
// no sem filtro (D-10).
const RICH = {
  notes: [NOTE],
  events: [{ title: 'Dentista', date: new Date('2026-11-18T15:00:00Z'), time: '14:00', location: 'no centro', person: 'ele' }],
  insights: [
    {
      id: 'ele__i1',
      person: 'ele',
      type: 'delivery-heavy',
      severity: 3,
      cycleKey: '2026-11',
      subjectKind: 'category',
      subjectKey: 'alimentacao',
      metrics: { count: 4 },
    },
  ],
}

describe('fala espontanea: abertura do app', () => {
  test('devolve a fala com o assunto do dia, que entra na chave do cache e no aiUsage', async () => {
    const s = spontaneousSetup({}, { extra: RICH })
    const out = await s.open()
    assert.equal(out.text, NEUTRAL)
    const day = s.day()
    assert.equal(day.abertura, 1)
    assert.equal(day.assuntos.length, 1)
    assert.equal(day.ownerId, HID)
    assert.equal(day.calls, 1, 'a fala espontanea gerada conta no teto diario da pessoa (D-03)')
    assert.equal(s.keys.length, 1)
    assert.equal(s.keys[0].split('|')[3], 'abertura')
    assert.equal(s.keys[0].split('|')[4], sceneOf(day.assuntos[0]), 'a cena do assunto escolhido entra na chave do cache')
    assert.deepEqual(s.loads, [{ hid: HID, person: 'ele', fresh: false }])
  })

  test('as aberturas rodam pelos assuntos e a quarta (teto 3) devolve null sem ler nada', async () => {
    const s = spontaneousSetup({ AI_OPEN_PER_DAY: '3', AI_CACHE_VARIANTS: '1' }, { extra: RICH })
    for (let i = 0; i < 3; i += 1) assert.equal((await s.open()).text, NEUTRAL, `abertura ${i + 1}`)
    const day = s.day()
    assert.equal(day.abertura, 3)
    assert.equal(new Set(day.assuntos).size, 3, 'com assunto novo sobrando, nada se repete')
    assert.deepEqual(s.keys.map((k) => k.split('|')[4]), day.assuntos.map(sceneOf))

    const requests = s.fetchFn.requests.length
    const loads = s.loads.length
    assert.deepEqual(await s.open(), { text: null })
    assert.equal(s.fetchFn.requests.length, requests)
    assert.equal(s.loads.length, loads, 'com o teto esgotado nem o snapshot e lido')
    assert.equal(s.day().abertura, 3)
  })

  test('o teto vem so de AI_OPEN_PER_DAY; zero desliga a abertura', async () => {
    const s = spontaneousSetup({ AI_OPEN_PER_DAY: '0' }, { extra: RICH })
    assert.deepEqual(await s.open(), { text: null })
    assert.equal(s.fetchFn.requests.length, 0)
    assert.equal(s.db.stats.writes, 0)
  })

  test('falha do provedor nao consome o teto de aberturas nem o assunto', async () => {
    let fail = true
    const requests = []
    const fetchFn = async (url, init) => {
      requests.push(JSON.parse(init.body))
      if (fail) return new Response('{}', { status: 500 })
      return new Response(JSON.stringify({ choices: [{ message: { content: NEUTRAL } }] }), { status: 200 })
    }
    fetchFn.requests = requests
    const s = spontaneousSetup({}, { extra: RICH, fetchFn })
    assert.deepEqual(await s.open(), { text: null })
    assert.equal(s.day().abertura, undefined)
    assert.equal(s.day().assuntos, undefined)

    fail = false
    s.clock.t += 61_000 // passa o freio do 5xx
    assert.equal((await s.open()).text, NEUTRAL)
    assert.equal(s.day().abertura, 1)
    assert.equal(s.keys[1], s.keys[0], 'o assunto da tentativa falha volta a ser o escolhido')
  })

  test('sem assunto novo recomeca pelo menos recente, sem repetir a fala anterior (D-18, D-35)', async () => {
    const s = spontaneousSetup({ AI_CACHE_VARIANTS: '1' }, { extra: RICH })
    const spoken = []
    for (let i = 0; i < 7; i += 1) {
      assert.equal((await s.open()).text, NEUTRAL, `abertura ${i + 1}`)
      spoken.push(s.day().assuntos.at(-1))
    }
    assert.deepEqual(spoken.slice(0, 3).map(sceneOf).sort(), ['agenda-notas', 'compromisso', 'delivery'])
    assert.deepEqual(spoken.slice(3), [...spoken.slice(0, 3), spoken[0]], 'o rodizio segue a ordem de uso')
    assert.equal(s.day().abertura, 7)
    assert.equal(s.day().assuntos.length, 3)
    assert.equal(s.fetchFn.requests.length, 3, 'a repeticao vem do cache')
  })

  test('com um assunto so a segunda abertura devolve null, mesmo com teto de sobra', async () => {
    const s = spontaneousSetup({}, { extra: { notes: [NOTE] } })
    assert.equal((await s.open()).text, NEUTRAL)
    const requests = s.fetchFn.requests.length
    assert.deepEqual(await s.open(), { text: null })
    assert.equal(s.fetchFn.requests.length, requests)
    assert.equal(s.day().abertura, 1)
  })

  test('acerto de cache conta como abertura, mas nao no teto diario de chamadas (D-03)', async () => {
    const s = spontaneousSetup({ AI_CACHE_VARIANTS: '1' }, { extra: RICH })
    await s.open()
    // Dia novo do aiUsage com o cache ainda vivo: apaga so o contador do dia.
    await s.db.collection('aiUsage').doc(DAY_DOC).delete()
    const out = await s.open()
    assert.equal(out.source, 'cache')
    assert.equal(s.fetchFn.requests.length, 1)
    assert.equal(s.day().abertura, 1)
    assert.equal(s.day().calls, 0)
    assert.equal(s.day().assuntos.length, 1)
  })

  test('teto diario da pessoa esgotado corta a fala espontanea sem consumir abertura', async () => {
    const s = spontaneousSetup({ AI_DAILY_CAP_PER_USER: '1', AI_CACHE_VARIANTS: '1' }, { extra: RICH })
    assert.equal((await s.open()).text, NEUTRAL)
    assert.deepEqual(await s.open(), { text: null })
    assert.equal(s.day().abertura, 1)
    assert.equal(s.day().assuntos.length, 1)
  })

  test('pedidos simultaneos contam cada fala, o assunto uma vez, e nunca passam do teto', async () => {
    const s = spontaneousSetup({}, { extra: RICH })
    const out = await Promise.all([s.open(), s.open()])
    assert.equal(out.filter((o) => o.text !== null).length, 2)
    assert.equal(s.day().abertura, 2)
    assert.equal(s.day().assuntos.length, 1)

    const capped = spontaneousSetup({ AI_OPEN_PER_DAY: '1' }, { extra: RICH })
    const one = await Promise.all([capped.open(), capped.open()])
    assert.equal(one.filter((o) => o.text !== null).length, 1)
    assert.equal(capped.day().abertura, 1)
  })

  test('rota ja sem quem esperar (prazo vencido ou pedido abandonado) nao consome', async () => {
    const s = spontaneousSetup({}, { extra: RICH })
    assert.deepEqual(await s.open({ gone: () => true }), { text: null })
    assert.equal(s.day().abertura, undefined)

    const slow = async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
      return new Response(JSON.stringify({ choices: [{ message: { content: NEUTRAL } }] }), { status: 200 })
    }
    const late = spontaneousSetup({ AI_TOTAL_BUDGET_MS: '20' }, { extra: RICH, fetchFn: slow })
    assert.deepEqual(await late.open(), { text: null })
    await new Promise((resolve) => setTimeout(resolve, 150))
    assert.equal(late.day().abertura, undefined, 'a abertura nao mostrada foi contada')
    assert.equal(late.day().assuntos, undefined)
  })

  test('dia ilegivel fecha: sem provedor e sem erro', async () => {
    const db = createMemoryDb()
    const broken = {
      ...db,
      collection: (name) => ({
        doc: (id) => ({
          ...db.collection(name).doc(id),
          get: async () => {
            throw Object.assign(new Error('banco'), { code: 14 })
          },
        }),
      }),
    }
    const s = spontaneousSetup({}, { extra: RICH, db: broken })
    assert.deepEqual(await s.speech.generate({ hid: HID, person: 'ele', situation: 'abertura' }), { text: null })
    assert.equal(s.fetchFn.requests.length, 0)
  })
})

describe('fala espontanea: budget e assunto', () => {
  const config = { openPerDay: 2, peekPerDay: 1 }

  test('commitSpontaneous so e limitado pelo teto do tipo, mesmo em paralelo', async () => {
    const db = createMemoryDb()
    const b = createBudget({ db, config, now: () => NOW, log: quiet })
    const topics = ['ritmo', 'limites', 'metas', 'entradas', 'porquinho']
    const out = await Promise.all(topics.map((topic) => b.commitSpontaneous({ hid: HID, person: 'ele', kind: 'abertura', topic })))
    assert.equal(out.filter((o) => o.ok).length, 2)
    const day = await b.readDay({ hid: HID, person: 'ele' })
    assert.deepEqual([day.ok, day.abertura, day.espiar, day.assuntos.length], [true, 2, 0, 2])
  })

  test('assunto repetido conta de novo e vai para o fim: a lista e a ordem de uso', async () => {
    const db = createMemoryDb()
    const b = createBudget({ db, config: { openPerDay: 5, peekPerDay: 2 }, now: () => NOW, log: quiet })
    const commit = (kind, topic) => b.commitSpontaneous({ hid: HID, person: 'ele', kind, topic })
    for (const topic of ['ritmo', 'metas', 'fatura']) assert.deepEqual(await commit('abertura', topic), { ok: true })
    assert.deepEqual(await commit('abertura', 'ritmo'), { ok: true })
    assert.deepEqual((await b.readDay({ hid: HID, person: 'ele' })).assuntos, ['metas', 'fatura', 'ritmo'])
    // duas espiadas com o mesmo assunto contam as duas, ate o teto
    assert.deepEqual(await commit('espiar', 'metas'), { ok: true })
    assert.deepEqual(await commit('espiar', 'metas'), { ok: true })
    assert.deepEqual(await commit('espiar', 'metas'), { ok: false })
    const day = await b.readDay({ hid: HID, person: 'ele' })
    assert.deepEqual([day.abertura, day.espiar, day.assuntos], [4, 2, ['fatura', 'ritmo', 'metas']])
  })

  test('teto zero nega a fala espontanea sem escrever', async () => {
    const db = createMemoryDb()
    const b = createBudget({ db, config: { openPerDay: 0, peekPerDay: 0 }, now: () => NOW, log: quiet })
    for (const kind of ['abertura', 'espiar']) {
      assert.deepEqual(await b.commitSpontaneous({ hid: HID, person: 'ele', kind, topic: 'ritmo' }), { ok: false }, kind)
    }
    assert.equal(db.stats.writes, 0)
  })

  test('o dia da fala espontanea e o de Sao Paulo e entradas sujas sao recusadas', async () => {
    const db = createMemoryDb()
    const clock = { t: Date.parse('2026-11-17T02:30:00Z') }
    const b = createBudget({ db, config, now: () => new Date(clock.t), log: quiet })
    await b.commitSpontaneous({ hid: HID, person: 'ele', kind: 'abertura', topic: 'ritmo' })
    assert.ok(db.read('aiUsage', `${HID}__ele__2026-11-16`))
    clock.t = Date.parse('2026-11-17T03:01:00Z')
    assert.deepEqual((await b.readDay({ hid: HID, person: 'ele' })).assuntos, [])
    for (const bad of [
      { hid: 'a/b', person: 'ele', kind: 'abertura', topic: 'ritmo' },
      { hid: HID, person: 'porquinho', kind: 'abertura', topic: 'ritmo' },
      { hid: HID, person: 'ele', kind: 'lancamento', topic: 'ritmo' },
      { hid: HID, person: 'ele', kind: 'abertura', topic: 'a b' },
    ]) {
      assert.deepEqual(await b.commitSpontaneous(bad), { ok: false }, JSON.stringify(bad))
    }
    assert.equal((await b.readDay({ hid: 'a/b', person: 'ele' })).ok, false)
  })

  test('dailyCapOf: tipo desconhecido vale zero', () => {
    assert.equal(dailyCapOf(config, 'abertura'), 2)
    assert.equal(dailyCapOf(config, 'espiar'), 1)
    assert.equal(dailyCapOf(config, 'lancamento'), 0)
  })
})
