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
})
