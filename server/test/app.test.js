import { test, describe, before, after, beforeEach } from 'node:test'
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
            async set(data) {
              store.set(key, { ...data })
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
  }
}

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
