// Escopo da fala por IA contra o emulador do Firestore, com o provedor falso (fetch injetado).
// Prova que o resumo enviado ao provedor so tem a pessoa do token e o que e do casal.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { createApp } from '../../src/app.js'
import { readAiConfig } from '../../src/ai/config.js'
import { createChain, createProviders } from '../../src/ai/providers.js'
import { createAiRouter } from '../../src/ai/routes.js'
import { createSnapshotLoader } from '../../src/ai/snapshot.js'
import { createSpeech } from '../../src/ai/speech.js'
import { createLimiter } from '../../src/limiter.js'
import { resetEmulators } from './_helpers.js'

const ORIGIN = 'https://app.exemplo.test'
const NOW = new Date('2026-11-17T15:00:00Z')
const ts = (iso) => Timestamp.fromDate(new Date(iso))

const CLAIMS = {
  'tok-a-ele': { uid: 'u-a-ele', hid: 'casalA', person: 'ele' },
  'tok-a-ela': { uid: 'u-a-ela', hid: 'casalA', person: 'ela' },
  'tok-b-ele': { uid: 'u-b-ele', hid: 'casalB', person: 'ele' },
}
const verifyToken = async (token) => {
  const claims = CLAIMS[token]
  if (!claims) throw new Error('token invalido')
  return claims
}

const ENV = {
  AI_PROVIDERS: 'groq',
  AI_GROQ_API_KEY: 'chave-secreta-de-teste-1234',
  AI_GROQ_MODEL: 'modelo-de-teste',
}

const SETTINGS_A = {
  ownerId: 'casalA',
  categoryDefs: [
    { id: 'alimentacao', name: 'Alimentacao', kind: 'gasto' },
    { id: 'transporte', name: 'Transporte', kind: 'gasto' },
    { id: 'viagem', name: 'Viagem', kind: 'gasto' },
  ],
  personConfig: {
    ele: { salaryDay: 1, expectedIncomeCents: 500000 },
    // So a Ela tem limite em Viagem.
    ela: { salaryDay: 1, expectedIncomeCents: 600000, limits: { viagem: [{ from: '2026-01', cents: 80000 }] } },
  },
  tabNames: { area1: 'Nirigue', area2: 'Nirigua' },
  vintemTone: 'sem-filtro',
}

function bankTx(over) {
  return { type: 'saida', source: 'bank', amount: 40, date: ts('2026-11-16T15:00:00Z'), ...over }
}

describe('fala por IA no emulador', () => {
  let admin
  let db
  let server
  let base
  let requests
  let clock

  before(() => {
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
  })

  beforeEach(async () => {
    await resetEmulators()
    requests = []
    clock = { t: NOW.getTime() }
    await db.collection('settings').doc('main').set(SETTINGS_A)
    const add = (data) => db.collection('transactions').add(data)
    // Ele (casalA)
    await add(bankTx({ ownerId: 'casalA', person: 'ele', description: 'IFOOD *RESTAURANTE', category: 'Alimentacao', categoryId: 'alimentacao', amount: 45.9 }))
    await add(bankTx({ ownerId: 'casalA', person: 'ele', description: 'UBER *TRIP', category: 'Transporte', categoryId: 'transporte', amount: 23.5, date: ts('2026-11-15T15:00:00Z') }))
    // Ela (casalA): loja e categoria que so ela tem
    await add(bankTx({ ownerId: 'casalA', person: 'ela', description: 'RAPPI *PEDIDO', category: 'Alimentacao', categoryId: 'alimentacao', amount: 77.7 }))
    await add(bankTx({ ownerId: 'casalA', person: 'ela', description: 'SPOTIFY BR', category: 'Viagem', categoryId: 'viagem', amount: 19.9, date: ts('2026-11-14T15:00:00Z') }))
    // Outro casal
    await add(bankTx({ ownerId: 'casalB', person: 'ele', description: 'NETFLIX.COM', category: 'Lazer', categoryId: 'lazer', amount: 55.9 }))
  })

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve))
  })

  const fetchFn = async (url, init) => {
    requests.push(JSON.parse(init.body))
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Mais um gasto, seu trouxa. Assim o mês acaba antes de começar.' } }] }), { status: 200 })
  }

  async function start({ leakCheck } = {}) {
    if (server) await new Promise((resolve) => server.close(resolve))
    const log = { log() {}, warn() {}, info() {}, error() {} }
    const config = readAiConfig(ENV, log)
    const providers = createProviders(config, { fetch: fetchFn })
    const chain = createChain({ providers, config, now: () => NOW, log })
    const snapshot = createSnapshotLoader({ db, now: () => NOW })
    const speech = createSpeech({ snapshot, providers: chain, config, log, ...(leakCheck ? { leakCheck } : {}) })
    const limiter = createLimiter({ max: 100, windowMs: 60_000, now: () => clock.t })
    const router = createAiRouter({ speech, db, limiter, log })
    const app = createApp({
      verifyToken,
      db,
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

  const post = (token, body) =>
    fetch(`${base}/api/vintem/fala`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })

  const promptOf = (req) => req.messages.map((m) => m.content).join('\n')

  test('a fala de Ele usa so os lancamentos de Ele: nada de categoria nem loja que so a Ela tem', async () => {
    await start()
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    assert.equal(requests.length, 1)
    const prompt = promptOf(requests[0])
    assert.ok(prompt.includes('iFood') && prompt.includes('Uber'), 'o que e dele esta no resumo')
    for (const hers of ['Rappi', 'Spotify', 'Viagem', '77,70', '19,90']) {
      assert.ok(!prompt.includes(hers), `o resumo de Ele nao pode ter: ${hers}`)
    }
    assert.ok(!prompt.includes('Netflix'), 'nem nada de outro casal')
  })

  test('a fala de Ela usa so os lancamentos de Ela', async () => {
    await start()
    await post('tok-a-ela', { situation: 'lancamento' })
    const prompt = promptOf(requests[0])
    assert.ok(prompt.includes('Rappi') && prompt.includes('Spotify'))
    for (const his of ['iFood', 'Uber', '45,90', '23,50']) {
      assert.ok(!prompt.includes(his), `o resumo de Ela nao pode ter: ${his}`)
    }
  })

  test('o outro casal nao ve nada do casalA, nem as configuracoes dele', async () => {
    await start()
    await post('tok-b-ele', { situation: 'lancamento' })
    const prompt = promptOf(requests[0])
    assert.ok(prompt.includes('Netflix'))
    for (const a of ['iFood', 'Uber', 'Rappi', 'Spotify', 'Viagem', 'Nirigua']) {
      assert.ok(!prompt.includes(a), `o casalB nao pode ver: ${a}`)
    }
  })

  test('lancamento manual com nome de pessoa na descricao chega ao provedor sem o nome (D-20)', async () => {
    await db.collection('transactions').add({
      ownerId: 'casalA',
      person: 'ele',
      type: 'saida',
      amount: 50,
      category: 'Outros',
      categoryId: 'outros',
      description: 'Pix para Maria Souza',
      date: ts('2026-11-17T12:00:00Z'),
    })
    await start()
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    const prompt = promptOf(requests[0])
    assert.ok(!/Maria|Souza|maria|souza/.test(prompt), 'o nome nao pode sair de casa')
    assert.ok(prompt.includes('ultimoLancamento'), 'o lancamento entra no resumo, so sem o nome')
  })

  test('um resumo com vazamento forcado nunca e enviado ao provedor', async () => {
    await start({ leakCheck: () => ['digitos'] })
    const res = await post('tok-a-ele', { situation: 'lancamento' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { text: null })
    assert.equal(requests.length, 0, 'o fetch falso nao foi chamado')
  })

  test('transactionId de outro casal ou de outra pessoa da 404 igual ao inexistente, com dados reais', async () => {
    const foreign = await db.collection('transactions').where('ownerId', '==', 'casalB').get()
    const hers = await db.collection('transactions').where('ownerId', '==', 'casalA').where('person', '==', 'ela').get()
    const mine = await db.collection('transactions').where('ownerId', '==', 'casalA').where('person', '==', 'ele').get()
    await start()
    const bodies = []
    for (const id of [foreign.docs[0].id, hers.docs[0].id, 'idinexistente123']) {
      const res = await post('tok-a-ele', { situation: 'lancamento', transactionId: id })
      assert.equal(res.status, 404)
      bodies.push(await res.text())
    }
    assert.equal(new Set(bodies).size, 1)
    assert.equal(requests.length, 0)
    const ok = await post('tok-a-ele', { situation: 'lancamento', transactionId: mine.docs[0].id })
    assert.equal(ok.status, 200)
    assert.equal(requests.length, 1)
  })
})
