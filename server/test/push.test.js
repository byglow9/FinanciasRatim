import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { createPushFeature } from '../src/push/index.js'
import { createFakeFirestore } from './_fake-firestore.js'

// Testes HTTP do push com verificador de token, Firestore e FCM falsos.
const ORIGIN = 'https://app.exemplo.test'

const CLAIMS = {
  'tok-a-ele': { uid: 'u-a-ele', hid: 'casalA', person: 'ele' },
  'tok-a-ela': { uid: 'u-a-ela', hid: 'casalA', person: 'ela' },
  'tok-b-ele': { uid: 'u-b-ele', hid: 'casalB', person: 'ele' },
  'tok-semhid': { uid: 'u-sem' },
  'tok-sempessoa': { uid: 'u-sp', hid: 'casalA' },
}

const verifyToken = async (token) => {
  const claims = CLAIMS[token]
  if (!claims) throw new Error('token invalido')
  return claims
}

const FID_A_ELE = 'fidAEle0123456789'
const FID_A_ELE_2 = 'fidAEle9876543210'
const FID_A_ELA = 'fidAEla0123456789'
const FID_B_ELE = 'fidBEle0123456789'

// FCM falso: registra as mensagens e responde por posicao. `fail` mapeia fid -> codigo de erro.
function fakeMessaging() {
  const sent = []
  const fail = new Map()
  return {
    sent,
    fail,
    async sendEach(messages) {
      sent.push(...messages)
      const responses = messages.map((m) =>
        fail.has(m.fid)
          ? { success: false, error: { code: fail.get(m.fid) } }
          : { success: true, messageId: 'm-' + m.fid }
      )
      return {
        responses,
        successCount: responses.filter((r) => r.success).length,
        failureCount: responses.filter((r) => !r.success).length,
      }
    },
  }
}

describe('push', () => {
  let server
  let base
  let db
  let messaging
  let clock

  before(async () => {
    db = createFakeFirestore()
    messaging = fakeMessaging()
    clock = { t: 1_700_000_000_000 }
    const feature = createPushFeature({ db, messaging, now: () => new Date(clock.t) })
    const app = createApp({
      verifyToken,
      db,
      pluggy: {},
      sync: {},
      origins: [ORIGIN],
      features: [feature],
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
    messaging.sent.length = 0
    messaging.fail.clear()
    clock.t = 1_700_000_000_000
  })

  const call = (path, { method = 'POST', token, body, headers = {} } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

  const register = (token, fid, headers) => call('/api/push/register', { token, body: { fid }, headers })

  test('registrar devolve 200 e grava ownerId, uid e person do token', async () => {
    const res = await register('tok-a-ele', FID_A_ELE, {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    })
    assert.equal(res.status, 200)
    const doc = db.store.get(`pushRegistrations/${FID_A_ELE}`)
    assert.equal(doc.ownerId, 'casalA')
    assert.equal(doc.uid, 'u-a-ele')
    assert.equal(doc.person, 'ele')
    assert.equal(doc.platform, 'ios')
    assert.ok(doc.createdAt && doc.updatedAt)
    assert.ok(!Object.values(doc).some((v) => typeof v === 'string' && v.includes('Mozilla')), 'User-Agent nao e guardado')
  })

  test('dono e pessoa vem so do token, nunca do corpo', async () => {
    const res = await call('/api/push/register', {
      token: 'tok-a-ele',
      body: { fid: FID_A_ELE, ownerId: 'casalB', hid: 'casalB', person: 'ela', uid: 'outro' },
    })
    assert.equal(res.status, 200)
    const doc = db.store.get(`pushRegistrations/${FID_A_ELE}`)
    assert.equal(doc.ownerId, 'casalA')
    assert.equal(doc.person, 'ele')
    assert.equal(doc.uid, 'u-a-ele')
  })

  test('renovar mantem createdAt e atualiza updatedAt', async () => {
    await register('tok-a-ele', FID_A_ELE)
    const first = db.store.get(`pushRegistrations/${FID_A_ELE}`).createdAt
    clock.t += 60_000
    await register('tok-a-ele', FID_A_ELE)
    const doc = db.store.get(`pushRegistrations/${FID_A_ELE}`)
    assert.deepEqual(doc.createdAt, first)
    assert.ok(doc.updatedAt > doc.createdAt)
  })

  test('FID de outro casal ja registrado nao e sobrescrito (409)', async () => {
    await register('tok-a-ele', FID_A_ELE)
    const res = await register('tok-b-ele', FID_A_ELE)
    assert.equal(res.status, 409)
    assert.equal(db.store.get(`pushRegistrations/${FID_A_ELE}`).ownerId, 'casalA')
  })

  test('FID invalido da 400; sem token da 401; sem hid da 403; sem pessoa da 403', async () => {
    for (const fid of ['curto', 'tem espaco aqui!', 'x'.repeat(65), 123, undefined]) {
      const res = await register('tok-a-ele', fid)
      assert.equal(res.status, 400, `fid ${String(fid)}`)
    }
    assert.equal((await register(undefined, FID_A_ELE)).status, 401)
    assert.equal((await register('tok-ruim', FID_A_ELE)).status, 401)
    assert.equal((await register('tok-semhid', FID_A_ELE)).status, 403)
    assert.equal((await register('tok-sempessoa', FID_A_ELE)).status, 403)
    assert.equal(db.store.size, 0)
    assert.equal((await call('/api/push/test')).status, 401)
  })

  test('o teste envia uma unica mensagem com fid e data title, body, tag e url', async () => {
    await register('tok-a-ele', FID_A_ELE)
    const res = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { sent: 1 })
    assert.equal(messaging.sent.length, 1)
    const msg = messaging.sent[0]
    assert.equal(msg.fid, FID_A_ELE)
    assert.ok(!('token' in msg), 'sem o campo token')
    assert.ok(!('notification' in msg), 'sem o campo notification')
    assert.deepEqual(Object.keys(msg.data).sort(), ['body', 'tag', 'title', 'url'])
    assert.equal(msg.data.title, 'Vintém')
    assert.equal(msg.data.tag, 'teste')
    assert.equal(msg.data.url, '/configuracoes#notificacoes')
    assert.ok(Object.values(msg.data).every((v) => typeof v === 'string'))
    assert.ok(!/\d|R\$/.test(msg.data.body), 'corpo de teste sem numero nem valor')
    assert.equal(msg.webpush.headers.TTL, '21600')
    assert.equal(msg.webpush.headers.Urgency, 'high')
  })

  test('so os aparelhos da propria pessoa recebem; outra pessoa e outro casal ficam de fora', async () => {
    await register('tok-a-ele', FID_A_ELE)
    await register('tok-a-ele', FID_A_ELE_2)
    await register('tok-a-ela', FID_A_ELA)
    await register('tok-b-ele', FID_B_ELE)
    const res = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { sent: 2 })
    assert.deepEqual(messaging.sent.map((m) => m.fid).sort(), [FID_A_ELE, FID_A_ELE_2].sort())
  })

  test('sem aparelho registrado responde 404 e nao chama o FCM', async () => {
    await register('tok-a-ela', FID_A_ELA)
    const res = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { error: 'Nenhum aparelho registrado' })
    assert.equal(messaging.sent.length, 0)
  })

  test('FID morto tem o registro apagado e o envio dos outros segue', async () => {
    await register('tok-a-ele', FID_A_ELE)
    await register('tok-a-ele', FID_A_ELE_2)
    messaging.fail.set(FID_A_ELE, 'messaging/installation-id-not-registered')
    const res = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { sent: 1 })
    assert.equal(messaging.sent.length, 2)
    assert.equal(db.store.has(`pushRegistrations/${FID_A_ELE}`), false)
    assert.equal(db.store.has(`pushRegistrations/${FID_A_ELE_2}`), true)
  })

  test('codigo de FID morto sem o prefixo tambem apaga; outra falha nao apaga', async () => {
    await register('tok-a-ele', FID_A_ELE)
    await register('tok-a-ele', FID_A_ELE_2)
    messaging.fail.set(FID_A_ELE, 'installation-id-not-registered')
    messaging.fail.set(FID_A_ELE_2, 'messaging/internal-error')
    const res = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { sent: 0 })
    assert.equal(db.store.has(`pushRegistrations/${FID_A_ELE}`), false)
    assert.equal(db.store.has(`pushRegistrations/${FID_A_ELE_2}`), true)
  })
})

describe('createApp features', () => {
  const base = { verifyToken, db: createFakeFirestore(), pluggy: {}, sync: {}, origins: [ORIGIN] }

  test('recusa montar router fora de /api/', () => {
    const router = (_req, _res, next) => next()
    for (const path of ['/push', '/webhooks/x', '/apix', '/', undefined]) {
      assert.throws(() => createApp({ ...base, features: [{ mounts: [{ path, router }] }] }), /\/api\//, String(path))
    }
  })

  test('aceita features vazia, ausente e router em /api/', () => {
    assert.ok(createApp({ ...base }))
    assert.ok(createApp({ ...base, features: [] }))
    assert.ok(createApp({ ...base, features: [{ mounts: [{ path: '/api/x', router: (_q, _s, n) => n() }] }] }))
  })
})
