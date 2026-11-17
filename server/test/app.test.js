import { test, describe, before, after, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { monthRange } from '../../shared/core/time.js'

// Testes HTTP do servidor com verificador de token, banco, Pluggy e sync falsos.
const ORIGIN = 'https://app.exemplo.test'
const OTHER_ORIGIN = 'https://evil.exemplo.test'
const NOW = new Date('2026-11-17T15:00:00Z')

const CLAIMS = {
  'tok-ele': { uid: 'u-ele', hid: 'casalA', person: 'ele' },
  'tok-outro': { uid: 'u-outro', hid: 'casalB', person: 'ele' },
  'tok-semhid': { uid: 'u-sem' },
}

const verifyToken = async (token) => {
  const claims = CLAIMS[token]
  if (!claims) throw new Error('token invalido')
  return claims
}

// Firestore falso em memoria: collection(nome).doc(id) com get, set e delete.
function fakeDb() {
  const store = new Map()
  return {
    store,
    collection(name) {
      return {
        doc(id) {
          const key = `${name}/${id}`
          return {
            id,
            async get() {
              const data = store.get(key)
              return { exists: data !== undefined, id, data: () => (data ? { ...data } : undefined) }
            },
            async set(data, opts) {
              store.set(key, opts?.merge ? { ...(store.get(key) ?? {}), ...data } : { ...data })
            },
            async delete() {
              store.delete(key)
            },
          }
        },
      }
    },
  }
}

function fakePluggy(calls) {
  return {
    async createConnectToken(itemId, options) {
      calls.push(['createConnectToken', itemId, options])
      return { accessToken: 'connect-token-falso' }
    },
    async fetchItem(itemId) {
      calls.push(['fetchItem', itemId])
      return { id: itemId, status: 'UPDATED', connector: { name: 'Banco X', imageUrl: null } }
    },
    async deleteItem(itemId) {
      calls.push(['deleteItem', itemId])
    },
  }
}

function fakeSync(calls) {
  return {
    async syncAll(db, pluggy, opts) {
      calls.push(['syncAll', opts])
      return [{ itemId: 'i1', imported: 1 }]
    },
    async syncConnection(db, pluggy, connection) {
      calls.push(['syncConnection', connection])
      return { itemId: connection.itemId, person: connection.person, imported: 0 }
    },
    async cleanExistingDescriptions(db, hid) {
      calls.push(['cleanExistingDescriptions', hid])
      return { transactions: 0, imports: 0 }
    },
    async syncItem(db, pluggy, itemId) {
      calls.push(['syncItem', itemId])
      if (itemId === 'item-falha-1') throw new Error('falha simulada')
      return {}
    },
  }
}

// Repete fn ate valer (o processamento do webhook roda depois do 200).
async function waitFor(fn, { timeoutMs = 3000, stepMs = 10 } = {}) {
  const limit = Date.now() + timeoutMs
  while (Date.now() < limit) {
    if (await fn()) return
    await new Promise((r) => setTimeout(r, stepMs))
  }
  throw new Error('waitFor: tempo esgotado')
}

const WH_SECRET = 'segredo-de-teste-0123456789abcdef'

describe('createApp', () => {
  let server
  let base
  let db
  let calls

  before(async () => {
    db = fakeDb()
    calls = []
    const app = createApp({
      verifyToken,
      db,
      pluggy: fakePluggy(calls),
      sync: fakeSync(calls),
      origins: [ORIGIN],
      now: () => NOW,
      webhookSecret: WH_SECRET,
    })
    await new Promise((resolve) => {
      server = app.listen(0, resolve)
    })
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  beforeEach(() => {
    db.store.clear()
    calls.length = 0
  })

  const call = (path, { method = 'GET', token, origin, body, headers = {} } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(origin ? { origin } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

  test('createApp lanca erro se origins for vazio', () => {
    assert.throws(
      () => createApp({ verifyToken, db, pluggy: {}, sync: {}, origins: [] }),
      /ALLOWED_ORIGINS/
    )
  })

  test('GET /health responde 200 sem token', async () => {
    const res = await call('/health')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
  })

  test('sem Authorization responde 401', async () => {
    const res = await call('/api/sync', { method: 'POST' })
    assert.equal(res.status, 401)
  })

  test('cabecalho que nao e Bearer responde 401', async () => {
    const res = await call('/api/sync', { method: 'POST', headers: { authorization: 'Basic abc' } })
    assert.equal(res.status, 401)
  })

  test('verificador que lanca responde 401', async () => {
    const res = await call('/api/sync', { method: 'POST', token: 'qualquer-coisa' })
    assert.equal(res.status, 401)
  })

  test('token sem hid responde 403', async () => {
    const res = await call('/api/sync', { method: 'POST', token: 'tok-semhid' })
    assert.equal(res.status, 403)
    assert.deepEqual(await res.json(), { error: 'Sem acesso' })
  })

  test('x-api-key sozinha nao autentica', async () => {
    const res = await call('/api/sync', { method: 'POST', headers: { 'x-api-key': 'segredo' } })
    assert.equal(res.status, 401)
  })

  test('Origin fora da lista responde 403 mesmo com token valido', async () => {
    const res = await call('/api/sync', { method: 'POST', token: 'tok-ele', origin: OTHER_ORIGIN })
    assert.equal(res.status, 403)
    assert.deepEqual(await res.json(), { error: 'Origem nao autorizada' })
    assert.equal(calls.length, 0)
  })

  test('Origin permitida passa e sem Origin (curl) passa com token valido', async () => {
    const withOrigin = await call('/api/sync', { method: 'POST', token: 'tok-ele', origin: ORIGIN })
    assert.equal(withOrigin.status, 200)
    const without = await call('/api/sync', { method: 'POST', token: 'tok-ele' })
    assert.equal(without.status, 200)
  })

  test('preflight de origem permitida libera Authorization', async () => {
    const res = await call('/api/sync', {
      method: 'OPTIONS',
      origin: ORIGIN,
      headers: {
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
      },
    })
    assert.ok(res.status === 200 || res.status === 204)
    assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN)
    assert.match(res.headers.get('access-control-allow-headers') ?? '', /authorization/i)
  })

  test('POST /api/connect-token valida a pessoa', async () => {
    const bad = await call('/api/connect-token', {
      method: 'POST',
      token: 'tok-ele',
      body: { person: 'porquinho' },
    })
    assert.equal(bad.status, 400)
    const ok = await call('/api/connect-token', {
      method: 'POST',
      token: 'tok-ele',
      body: { person: 'ela' },
    })
    assert.equal(ok.status, 200)
    assert.deepEqual(await ok.json(), { accessToken: 'connect-token-falso' })
  })

  test('POST /api/connections grava ownerId do token e ignora o do corpo', async () => {
    const res = await call('/api/connections', {
      method: 'POST',
      token: 'tok-ele',
      body: { itemId: 'item-1', person: 'ele', ownerId: 'casalB' },
    })
    assert.equal(res.status, 200)
    const saved = db.store.get('bankConnections/item-1')
    assert.equal(saved.ownerId, 'casalA')
    assert.equal(saved.person, 'ele')
    assert.equal(saved.importFrom.toDate().getTime(), monthRange(NOW).start.getTime())
    const sync = calls.find((c) => c[0] === 'syncConnection')
    assert.equal(sync[1].ownerId, 'casalA')
  })

  test('POST /api/connections valida person e itemId', async () => {
    const badPerson = await call('/api/connections', {
      method: 'POST',
      token: 'tok-ele',
      body: { itemId: 'item-1', person: 'porquinho' },
    })
    assert.equal(badPerson.status, 400)
    const noItem = await call('/api/connections', {
      method: 'POST',
      token: 'tok-ele',
      body: { person: 'ele' },
    })
    assert.equal(noItem.status, 400)
    assert.equal(db.store.size, 0)
  })

  test('POST /api/connections de item de outro dono responde 403 sem sincronizar', async () => {
    db.store.set('bankConnections/item-2', { ownerId: 'casalB', person: 'ele' })
    const res = await call('/api/connections', {
      method: 'POST',
      token: 'tok-ele',
      body: { itemId: 'item-2', person: 'ele' },
    })
    assert.equal(res.status, 403)
    assert.equal(calls.some((c) => c[0] === 'syncConnection'), false)
    assert.equal(db.store.get('bankConnections/item-2').ownerId, 'casalB')
  })

  test('POST /api/connections do mesmo dono em outra person responde 409', async () => {
    db.store.set('bankConnections/item-3', { ownerId: 'casalA', person: 'ele' })
    const res = await call('/api/connections', {
      method: 'POST',
      token: 'tok-ele',
      body: { itemId: 'item-3', person: 'ela' },
    })
    assert.equal(res.status, 409)
    assert.equal(calls.some((c) => c[0] === 'syncConnection'), false)
  })

  test('DELETE de conexao de outro dono responde 403 sem chamar a Pluggy nem apagar', async () => {
    db.store.set('bankConnections/item-4', { ownerId: 'casalB', person: 'ele' })
    const res = await call('/api/connections/item-4', { method: 'DELETE', token: 'tok-ele' })
    assert.equal(res.status, 403)
    assert.equal(calls.some((c) => c[0] === 'deleteItem'), false)
    assert.ok(db.store.has('bankConnections/item-4'))
  })

  test('DELETE de conexao inexistente responde 404', async () => {
    const res = await call('/api/connections/nao-existe', { method: 'DELETE', token: 'tok-ele' })
    assert.equal(res.status, 404)
  })

  test('DELETE de conexao do proprio dono remove na Pluggy e no Firestore', async () => {
    db.store.set('bankConnections/item-5', { ownerId: 'casalA', person: 'ele' })
    const res = await call('/api/connections/item-5', { method: 'DELETE', token: 'tok-ele' })
    assert.equal(res.status, 200)
    assert.deepEqual(calls.find((c) => c[0] === 'deleteItem'), ['deleteItem', 'item-5'])
    assert.equal(db.store.has('bankConnections/item-5'), false)
  })

  test('POST /api/sync e clean-descriptions usam o hid do token', async () => {
    const sync = await call('/api/sync', { method: 'POST', token: 'tok-outro' })
    assert.equal(sync.status, 200)
    assert.deepEqual(await sync.json(), { results: [{ itemId: 'i1', imported: 1 }] })
    assert.deepEqual(calls.find((c) => c[0] === 'syncAll')[1], { hid: 'casalB' })

    const clean = await call('/api/maintenance/clean-descriptions', {
      method: 'POST',
      token: 'tok-ele',
    })
    assert.equal(clean.status, 200)
    assert.deepEqual(calls.find((c) => c[0] === 'cleanExistingDescriptions'), [
      'cleanExistingDescriptions',
      'casalA',
    ])
  })
})

describe('POST /webhooks/pluggy', () => {
  let server
  let base
  let db
  let calls

  const start = async (opts) => {
    const app = createApp({
      verifyToken,
      db,
      pluggy: fakePluggy(calls),
      sync: fakeSync(calls),
      origins: [ORIGIN],
      now: () => NOW,
      ...opts,
    })
    const s = await new Promise((resolve) => {
      const l = app.listen(0, () => resolve(l))
    })
    return { s, url: `http://127.0.0.1:${s.address().port}` }
  }

  before(async () => {
    db = fakeDb()
    calls = []
    const started = await start({ webhookSecret: WH_SECRET })
    server = started.s
    base = started.url
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  beforeEach(() => {
    db.store.clear()
    calls.length = 0
    mock.restoreAll()
  })

  const hook = (body, { secret = WH_SECRET, path = '/webhooks/pluggy', url = base } = {}) =>
    fetch(`${url}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret ? { 'x-webhook-secret': secret } : {}),
      },
      body: JSON.stringify(body),
    })

  const ev = (extra = {}) => ({
    event: 'item/updated',
    eventId: `ev-${Math.random().toString(36).slice(2)}`,
    itemId: 'item-webhook-1',
    ...extra,
  })

  const seedItem = (itemId = 'item-webhook-1') =>
    db.store.set(`bankConnections/${itemId}`, { ownerId: 'casalA', person: 'ele' })

  const syncCalls = () => calls.filter((c) => c[0] === 'syncItem')

  test('sem segredo ou com segredo errado responde 401 e nao sincroniza', async () => {
    seedItem()
    const none = await hook(ev(), { secret: null })
    assert.equal(none.status, 401)
    assert.deepEqual(await none.json(), { error: 'Nao autorizado' })
    const wrong = await hook(ev(), { secret: 'errado' })
    assert.equal(wrong.status, 401)
    await new Promise((r) => setTimeout(r, 50))
    assert.equal(syncCalls().length, 0)
  })

  test('segredo na query string sem cabecalho responde 401', async () => {
    seedItem()
    const res = await hook(ev(), { secret: null, path: `/webhooks/pluggy?secret=${WH_SECRET}` })
    assert.equal(res.status, 401)
    assert.equal(syncCalls().length, 0)
  })

  test('os 4 eventos tratados respondem 200 e disparam um syncItem cada', async () => {
    seedItem()
    for (const event of [
      'item/updated',
      'transactions/created',
      'transactions/updated',
      'transactions/deleted',
    ]) {
      calls.length = 0
      const res = await hook(ev({ event }))
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { ok: true })
      await waitFor(() => syncCalls().length === 1)
      assert.deepEqual(syncCalls()[0], ['syncItem', 'item-webhook-1'])
    }
  })

  test('evento fora da lista responde 200 ignored e nao sincroniza', async () => {
    seedItem()
    const res = await hook(ev({ event: 'item/login_succeeded' }))
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, ignored: true })
    await new Promise((r) => setTimeout(r, 50))
    assert.equal(syncCalls().length, 0)
  })

  test('corpo invalido responde 400', async () => {
    seedItem()
    for (const body of [
      { event: 'item/updated', itemId: 'item-webhook-1' },
      { event: 'item/updated', eventId: 'ev-x' },
      { event: 'item/updated', eventId: 'ev-x', itemId: 'x' },
      { event: 'item/updated', eventId: 'ev-x', itemId: 'a/b/c/d/e/f' },
      { eventId: 'ev-x', itemId: 'item-webhook-1' },
    ]) {
      const res = await hook(body)
      assert.equal(res.status, 400)
      assert.deepEqual(await res.json(), { error: 'Evento invalido' })
    }
    assert.equal(syncCalls().length, 0)
  })

  test('item desconhecido responde 200, nao sincroniza e nao cria documento', async () => {
    const res = await hook(ev({ itemId: 'item-desconhecido-1' }))
    assert.equal(res.status, 200)
    await new Promise((r) => setTimeout(r, 50))
    assert.equal(syncCalls().length, 0)
    assert.equal(db.store.has('bankConnections/item-desconhecido-1'), false)
  })

  test('o mesmo eventId duas vezes gera um unico syncItem', async () => {
    seedItem()
    const body = ev({ eventId: 'ev-repetido-1' })
    assert.equal((await hook(body)).status, 200)
    assert.equal((await hook(body)).status, 200)
    await waitFor(() => syncCalls().length >= 1)
    await new Promise((r) => setTimeout(r, 50))
    assert.equal(syncCalls().length, 1)
  })

  test('ownerId e clientUserId do corpo nao mudam o dono e a evidencia e gravada por merge', async () => {
    seedItem()
    const res = await hook(ev({ ownerId: 'casalB', clientUserId: 'casalB' }))
    assert.equal(res.status, 200)
    await waitFor(() => db.store.get('bankConnections/item-webhook-1')?.lastWebhookAt)
    const doc = db.store.get('bankConnections/item-webhook-1')
    assert.equal(doc.ownerId, 'casalA')
    assert.equal(doc.person, 'ele')
    assert.equal(doc.lastWebhookEvent, 'item/updated')
    assert.ok(doc.lastWebhookAt)
  })

  test('sem webhookSecret a rota nao existe (404)', async () => {
    const started = await start({})
    try {
      const res = await hook(ev(), { url: started.url })
      assert.equal(res.status, 404)
    } finally {
      await new Promise((resolve) => started.s.close(resolve))
    }
  })

  test('/api/sync continua exigindo token mesmo com o cabecalho do webhook', async () => {
    const res = await fetch(`${base}/api/sync`, {
      method: 'POST',
      headers: { 'x-webhook-secret': WH_SECRET },
    })
    assert.equal(res.status, 401)
    assert.equal(calls.filter((c) => c[0] === 'syncAll').length, 0)
  })

  test('falha do syncItem depois do 200 so gera console.error sem o segredo', async () => {
    seedItem('item-falha-1')
    const errors = mock.method(console, 'error', () => {})
    const logs = mock.method(console, 'log', () => {})
    const warns = mock.method(console, 'warn', () => {})
    const res = await hook(ev({ itemId: 'item-falha-1' }))
    assert.equal(res.status, 200)
    await waitFor(() => errors.mock.callCount() >= 1)
    assert.deepEqual(syncCalls()[0], ['syncItem', 'item-falha-1'])
    const all = [errors, logs, warns].flatMap((m) =>
      m.mock.calls.flatMap((c) => c.arguments.map((a) => String(a)))
    )
    assert.ok(all.length > 0)
    for (const text of all) assert.equal(text.includes(WH_SECRET), false)
  })
})
