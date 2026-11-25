// Teto diario e cache da fala por IA contra o emulador do Firestore (07-12), com provedor falso.
// Prova no banco real o que a memoria nao prova: documentos gravados, sem dado sensivel, e o teto.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import { initAdmin } from '../../scripts/lib/admin.js'
import { readAiConfig } from '../../src/ai/config.js'
import { createBudget } from '../../src/ai/budget.js'
import { createCache } from '../../src/ai/cache.js'
import { createChain, createProviders } from '../../src/ai/providers.js'
import { createSpeech } from '../../src/ai/speech.js'
import { TOPICS } from '../../../shared/core/aiSummary.js'
import { resetEmulators } from './_helpers.js'

const NOW = new Date('2026-11-17T15:00:00Z')
const HID = 'casal-emu-0001'
const GOOD = 'Mais um iFood, seu trouxa. Você vai ficar sem grana no fim do mês desse jeito.'
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
        },
        reads: 3,
        tone: 'sem-filtro',
        tabNames: { area1: 'Nirigue', area2: 'Nirigua' },
      }
    },
  }
}

function fakeFetch(text = GOOD) {
  const requests = []
  const fn = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(init.body) })
    return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 })
  }
  fn.requests = requests
  return fn
}

async function docsOf(db, name) {
  const snap = await db.collection(name).get()
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))
}

describe('teto diario e cache no emulador', () => {
  let db
  let clock

  before(() => {
    const admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
  })

  beforeEach(async () => {
    await resetEmulators()
    clock = { t: NOW.getTime() }
  })

  /** Monta budget, cache e fala sobre o banco real; chamar de novo simula um reinicio do servidor. */
  function build(envExtra = {}, { fetchFn = fakeFetch() } = {}) {
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
    const speech = createSpeech({ snapshot: fakeSnapshot(), providers: chain, config, budget, cache, log: quiet })
    return { fetchFn, config, budget, cache, speech }
  }

  const say = (s, situation = 'lancamento', person = 'ele') => s.speech.generate({ hid: HID, person, situation })

  test('tracer: gera uma vez, a segunda vem do cache e o teto corta a terceira', async () => {
    const s = build({ AI_DAILY_CAP_PER_USER: '1', AI_CACHE_VARIANTS: '1' })

    const first = await say(s)
    assert.deepEqual(first, { text: GOOD, source: 'ia' })
    const second = await say(s)
    assert.deepEqual(second, { text: GOOD, source: 'cache' })
    const third = await say(s, 'abertura')
    assert.deepEqual(third, { text: null })
    assert.equal(s.fetchFn.requests.length, 1, 'so a primeira chamou o provedor')

    const usage = await docsOf(db, 'aiUsage')
    const userDoc = usage[`${HID}__ele__2026-11-17`]
    assert.equal(userDoc.calls, 1, 'so a chamada real contou')
    assert.equal(userDoc.ownerId, HID)
    assert.equal(userDoc.person, 'ele')

    const cached = await docsOf(db, 'aiCache')
    const entries = Object.entries(cached)
    assert.equal(entries.length, 1)
    const [id, doc] = entries[0]
    assert.match(id, /^[0-9a-f]{40}$/)
    assert.deepEqual(doc.variants, [GOOD])
    assert.equal(doc.ownerId, HID)
    assert.equal(doc.person, 'ele')
    assert.equal(doc.expiresAt.toMillis(), NOW.getTime() + 24 * 3_600_000)

    // Nada do resumo, da descricao, do prompt nem da chave foi para o banco.
    const dump = JSON.stringify([usage, cached])
    for (const forbidden of ['IFOOD', 'UBER', 'RESTAURANTE', 'messages', 'chave-secreta', 'Alimentacao']) {
      assert.equal(dump.includes(forbidden), false, `nao pode gravar ${forbidden}`)
    }
  })

  test('com o teto em N, N mais M chamadas simultaneas deixam passar exatamente N', async () => {
    const config = readAiConfig({ AI_DAILY_CAP_PER_USER: '8' }, quiet)
    const budget = createBudget({ db, config, now: () => new Date(clock.t), log: quiet })
    const results = await Promise.all(Array.from({ length: 8 + 22 }, () => budget.consume({ hid: HID, person: 'ela' })))
    assert.equal(results.filter((r) => r.ok).length, 8)
    assert.equal(results.filter((r) => !r.ok).length, 22)
    const usage = await docsOf(db, 'aiUsage')
    assert.equal(usage[`${HID}__ela__2026-11-17`].calls, 8, 'o contador gravado bate com o que passou')
  })

  test('uma nova instancia sobre o mesmo banco continua a contagem do dia (reinicio do servidor)', async () => {
    const config = readAiConfig({ AI_DAILY_CAP_PER_USER: '3' }, quiet)
    const mk = () => createBudget({ db, config, now: () => new Date(clock.t), log: quiet })
    const before = mk()
    assert.equal((await before.consume({ hid: HID, person: 'ele' })).calls, 1)
    assert.equal((await before.consume({ hid: HID, person: 'ele' })).calls, 2)
    const after = mk()
    assert.deepEqual(await after.consume({ hid: HID, person: 'ele' }), { ok: true, calls: 3 })
    assert.deepEqual(await after.consume({ hid: HID, person: 'ele' }), { ok: false, calls: 3 })
    assert.deepEqual(await mk().consume({ hid: HID, person: 'ele' }), { ok: false, calls: 3 })
  })

  test('o contador da pessoa vira no dia de Sao Paulo, nao a meia-noite UTC', async () => {
    const config = readAiConfig({ AI_DAILY_CAP_PER_USER: '1' }, quiet)
    const budget = createBudget({ db, config, now: () => new Date(clock.t), log: quiet })
    clock.t = Date.parse('2026-11-17T02:30:00Z') // ainda dia 16, 23:30 em Sao Paulo
    assert.equal((await budget.consume({ hid: HID, person: 'ele' })).ok, true)
    clock.t = Date.parse('2026-11-17T02:50:00Z')
    assert.equal((await budget.consume({ hid: HID, person: 'ele' })).ok, false, 'mesmo dia em Sao Paulo, apesar do UTC ja ser dia 17')
    clock.t = Date.parse('2026-11-17T03:05:00Z') // 00:05 do dia 17 em Sao Paulo
    assert.equal((await budget.consume({ hid: HID, person: 'ele' })).ok, true)
    const usage = await docsOf(db, 'aiUsage')
    assert.deepEqual(Object.keys(usage).sort(), [`${HID}__ele__2026-11-16`, `${HID}__ele__2026-11-17`])
  })

  test('um cache novo sobre o mesmo banco encontra a variante gravada e respeita o vencimento', async () => {
    const first = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '10' })
    assert.equal((await say(first)).source, 'ia')

    // Instancia nova (Map vazio) com outro provedor falso: o acerto vem do Firestore, sem rede.
    const second = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '10' })
    assert.deepEqual(await say(second), { text: GOOD, source: 'cache' })
    assert.equal(second.fetchFn.requests.length, 0)

    // Passadas 25 horas o documento existe, mas o vencimento manda: miss e geracao nova.
    clock.t += 25 * 3_600_000
    const third = build({ AI_CACHE_VARIANTS: '1', AI_DAILY_CAP_PER_USER: '10' })
    assert.deepEqual(await say(third), { text: GOOD, source: 'ia' })
    assert.equal(third.fetchFn.requests.length, 1)
    const cached = Object.values(await docsOf(db, 'aiCache'))
    assert.equal(cached.length, 1)
    assert.equal(cached[0].expiresAt.toMillis(), clock.t + 24 * 3_600_000, 'entrada vencida recomecou')
  })

  test('o contador por provedor usa o dia UTC e separa os provedores', async () => {
    const config = readAiConfig({ AI_PROVIDER_CAP_CLOUDFLARE: '2', AI_PROVIDER_CAP_GROQ: '1' }, quiet)
    const budget = createBudget({ db, config, now: () => new Date(clock.t), log: quiet })
    clock.t = Date.parse('2026-11-17T23:50:00Z') // 20:50 em Sao Paulo, ainda o mesmo dia UTC
    const calls = await Promise.all([
      budget.consumeProvider({ providerId: 'cloudflare' }),
      budget.consumeProvider({ providerId: 'cloudflare' }),
      budget.consumeProvider({ providerId: 'cloudflare' }),
      budget.consumeProvider({ providerId: 'groq' }),
      budget.consumeProvider({ providerId: 'groq' }),
    ])
    // Simultaneas: a ordem de chegada nao e garantida, so quantas passam por provedor.
    assert.equal(calls.slice(0, 3).filter((c) => c.ok).length, 2)
    assert.equal(calls.slice(3).filter((c) => c.ok).length, 1)
    clock.t = Date.parse('2026-11-18T00:10:00Z') // virou o dia UTC (21:10 em Sao Paulo)
    assert.equal((await budget.consumeProvider({ providerId: 'cloudflare' })).ok, true)
    const usage = await docsOf(db, 'aiUsage')
    assert.equal(usage['provider__cloudflare__2026-11-17'].calls, 2)
    assert.equal(usage['provider__groq__2026-11-17'].calls, 1)
    assert.equal(usage['provider__cloudflare__2026-11-18'].calls, 1)
    assert.equal('ownerId' in usage['provider__cloudflare__2026-11-17'], false, 'so o servidor usa estes documentos')
  })

  test('freio por provedor ligado na cadeia: provedor no teto e pulado sem rede', async () => {
    const env = {
      AI_PROVIDERS: 'cloudflare,groq',
      AI_CF_ACCOUNT_ID: 'conta123456',
      AI_CF_API_TOKEN: 'token-secreto-de-teste-1234',
      AI_CF_MODEL: '@cf/modelo/teste',
      AI_PROVIDER_CAP_CLOUDFLARE: '1',
      AI_CACHE_VARIANTS: '1',
      AI_DAILY_CAP_PER_USER: '10',
    }
    const s = build(env)
    assert.equal((await say(s, 'lancamento')).source, 'ia')
    assert.equal((await say(s, 'abertura')).source, 'ia')
    const hosts = s.fetchFn.requests.map((r) => (r.url.includes('cloudflare') ? 'cloudflare' : 'groq'))
    assert.deepEqual(hosts, ['cloudflare', 'groq'])
  })

  test('nenhum documento de aiUsage ou aiCache guarda resumo, descricao, prompt ou chave de API', async () => {
    const env = {
      AI_PROVIDERS: 'cloudflare,groq',
      AI_CF_ACCOUNT_ID: 'conta123456',
      AI_CF_API_TOKEN: 'token-secreto-de-teste-1234',
      AI_CF_MODEL: '@cf/modelo/teste',
      AI_PROVIDER_CAP_CLOUDFLARE: '1',
      AI_CACHE_VARIANTS: '2',
      AI_DAILY_CAP_PER_USER: '10',
    }
    const s = build(env)
    for (const situation of ['lancamento', 'lancamento', 'abertura', 'espiar']) await say(s, situation)
    const usage = await docsOf(db, 'aiUsage')
    const cached = await docsOf(db, 'aiCache')
    assert.ok(Object.keys(usage).length >= 3 && Object.keys(cached).length >= 2)
    const dump = JSON.stringify([usage, cached])
    for (const forbidden of [
      'IFOOD', 'UBER', 'RESTAURANTE', 'Alimentacao', 'Transporte', 'token-secreto', 'chave-secreta', 'conta123456',
      'messages', 'role', 'system', 'podeGastar', 'ultimoLancamento', 'Nirigue',
    ]) {
      assert.equal(dump.includes(forbidden), false, `nao pode gravar ${forbidden}`)
    }
    // Campos permitidos, nada alem deles.
    for (const doc of Object.values(cached)) {
      assert.deepEqual(Object.keys(doc).sort(), ['expiresAt', 'lastText', 'ownerId', 'person', 'updatedAt', 'variants'])
      for (const v of doc.variants) assert.equal(typeof v, 'string')
    }
    for (const [id, doc] of Object.entries(usage)) {
      // O dia da pessoa tambem conta as falas espontaneas servidas e os assuntos usados (07-16).
      const allowed = id.startsWith('provider__')
        ? ['calls', 'day', 'providerId', 'updatedAt']
        : ['abertura', 'assuntos', 'calls', 'dayKey', 'espiar', 'ownerId', 'person', 'updatedAt']
      assert.deepEqual(Object.keys(doc).sort(), allowed)
      for (const topic of doc.assuntos ?? []) assert.ok(TOPICS.includes(topic), `assunto fora da lista: ${topic}`)
    }
  })

  test('fala espontanea em paralelo respeita o teto do tipo e nunca repete assunto no banco real', async () => {
    const config = readAiConfig({ AI_OPEN_PER_DAY: '3', AI_PEEK_PER_DAY: '6' }, quiet)
    const budget = createBudget({ db, config, now: () => new Date(clock.t), log: quiet })
    const commit = (kind, topic) => budget.commitSpontaneous({ hid: HID, person: 'ele', kind, topic })

    const opened = await Promise.all(TOPICS.map((topic) => commit('abertura', topic)))
    assert.equal(opened.filter((r) => r.ok).length, 3)
    const same = await Promise.all(Array.from({ length: 5 }, () => commit('espiar', 'assunto-novo')))
    assert.equal(same.filter((r) => r.ok).length, 1)

    const day = await budget.readDay({ hid: HID, person: 'ele' })
    assert.deepEqual([day.abertura, day.espiar, day.assuntos.length, new Set(day.assuntos).size], [3, 1, 4, 4])
  })
})
