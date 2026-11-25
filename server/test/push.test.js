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
    // O limitador e do app e persiste entre os testes: cada teste comeca dois minutos depois.
    clock.t += 120_000
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
    assert.equal(msg.data.title, 'OINC')
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

  test('o segundo teste do mesmo usuario no mesmo minuto recebe 429; outro usuario passa', async () => {
    await register('tok-a-ele', FID_A_ELE)
    await register('tok-a-ela', FID_A_ELA)
    const first = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(first.status, 200)
    clock.t += 20_000
    const second = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(second.status, 429)
    assert.deepEqual(await second.json(), { error: 'Aguarde um minuto para testar de novo' })
    assert.equal(second.headers.get('retry-after'), '40')
    assert.equal(messaging.sent.length, 1, 'o bloqueado nao chega ao FCM')
    // outra pessoa no mesmo minuto nao e afetada
    const other = await call('/api/push/test', { token: 'tok-a-ela' })
    assert.equal(other.status, 200)
    // passado o minuto, o primeiro usuario volta a poder testar
    clock.t += 40_000
    const again = await call('/api/push/test', { token: 'tok-a-ele' })
    assert.equal(again.status, 200)
  })

  const getPrefs = (token) => call('/api/push/prefs', { method: 'GET', token })
  const putPrefs = (token, body) => call('/api/push/prefs', { method: 'PUT', token, body })

  const DEFAULT_PREFS = {
    types: { limite80: true, limite100: true, espontanea: true },
    quiet: { enabled: false, from: '22:00', to: '08:00' },
  }

  test('prefs: sem documento o GET devolve os padroes da D-06 e da D-21', async () => {
    const res = await getPrefs('tok-a-ele')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { prefs: DEFAULT_PREFS })
    assert.equal(db.store.size, 0, 'ler nao grava')
  })

  test('prefs: PUT valido grava no documento do casal e da pessoa e o GET seguinte devolve', async () => {
    const body = {
      types: { limite80: false, limite100: true, espontanea: false },
      quiet: { enabled: true, from: '23:00', to: '07:30' },
    }
    const put = await putPrefs('tok-a-ele', body)
    assert.equal(put.status, 200)
    assert.deepEqual(await put.json(), { prefs: body })
    const doc = db.store.get('pushPrefs/casalA__ele')
    assert.equal(doc.ownerId, 'casalA')
    assert.equal(doc.person, 'ele')
    assert.equal(doc.uid, 'u-a-ele')
    assert.deepEqual(doc.types, body.types)
    assert.deepEqual(doc.quiet, body.quiet)
    assert.ok(doc.updatedAt)
    const get = await getPrefs('tok-a-ele')
    assert.deepEqual(await get.json(), { prefs: body })
  })

  test('prefs: PUT parcial completa com os padroes', async () => {
    const put = await putPrefs('tok-a-ele', { quiet: { enabled: true } })
    assert.equal(put.status, 200)
    assert.deepEqual(await put.json(), {
      prefs: { types: DEFAULT_PREFS.types, quiet: { enabled: true, from: '22:00', to: '08:00' } },
    })
  })

  test('prefs: chave extra, hora invalida, inicio igual ao fim e tipo errado dao 400 e nao gravam', async () => {
    const bad = [
      { extra: 1 },
      { types: { limite80: true, fatura: true } },
      { quiet: { enabled: true, from: '25:00', to: '08:00' } },
      { quiet: { enabled: true, from: '22:00', to: '22:00' } },
      { types: { limite80: 'sim' } },
      { quiet: 'sempre' },
    ]
    for (const body of bad) {
      const res = await putPrefs('tok-a-ele', body)
      assert.equal(res.status, 400, JSON.stringify(body))
      const json = await res.json()
      assert.equal(typeof json.error, 'string')
    }
    assert.equal(db.store.size, 0)
  })

  test('prefs: Ele grava e Ela continua com os padroes (documentos separados)', async () => {
    await putPrefs('tok-a-ele', { types: { limite80: false } })
    const ela = await getPrefs('tok-a-ela')
    assert.deepEqual(await ela.json(), { prefs: DEFAULT_PREFS })
    await putPrefs('tok-a-ela', { quiet: { enabled: true } })
    const ele = await (await getPrefs('tok-a-ele')).json()
    assert.equal(ele.prefs.types.limite80, false)
    assert.equal(ele.prefs.quiet.enabled, false)
    assert.ok(db.store.has('pushPrefs/casalA__ele') && db.store.has('pushPrefs/casalA__ela'))
  })

  test('prefs: outro casal nao ve o do casalA e o corpo nao define o dono', async () => {
    await putPrefs('tok-a-ele', { types: { limite80: false } })
    const b = await getPrefs('tok-b-ele')
    assert.deepEqual(await b.json(), { prefs: DEFAULT_PREFS })
    const spoof = await putPrefs('tok-b-ele', { ownerId: 'casalA', person: 'ela' })
    assert.equal(spoof.status, 400)
    assert.equal(db.store.get('pushPrefs/casalA__ele').types.limite80, false)
  })

  test('prefs: documento de outro dono no mesmo id nunca e lido', async () => {
    db.store.set('pushPrefs/casalA__ele', { ownerId: 'casalB', person: 'ele', types: { limite80: false }, quiet: {} })
    const res = await getPrefs('tok-a-ele')
    assert.deepEqual(await res.json(), { prefs: DEFAULT_PREFS })
  })

  test('prefs: sem token 401, sem pessoa 403', async () => {
    assert.equal((await getPrefs(undefined)).status, 401)
    assert.equal((await putPrefs(undefined, {})).status, 401)
    assert.equal((await getPrefs('tok-ruim')).status, 401)
    assert.equal((await getPrefs('tok-semhid')).status, 403)
    assert.equal((await getPrefs('tok-sempessoa')).status, 403)
    assert.equal((await putPrefs('tok-sempessoa', { types: {} })).status, 403)
    assert.equal(db.store.size, 0)
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
