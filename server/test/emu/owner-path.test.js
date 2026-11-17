// Tracer da Fase 1: conta criada por script -> claims no ID token -> regras do Firestore
// -> middleware do servidor (verifyIdToken real), tudo contra os emuladores.
// Rodar: npm run test:emu
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  query,
  where,
  getDocs,
  terminate,
} from 'firebase/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { createUsers, listUsers } from '../../scripts/create-users.js'
import { requireOwner } from '../../src/auth.js'
import { PROJECT_ID, emulatorHosts, resetEmulators } from './_helpers.js'

const HID_A = 'casal-aaaa-0001'
const HID_B = 'casal-bbbb-0002'
const ELE = { email: 'Ele@Exemplo.com', password: 'senha-ele-123' }
const ELA = { email: 'ela@exemplo.com', password: 'senha-ela-456' }

const hosts = emulatorHosts()
const cleanups = []
let admin
let seq = 0

// Cliente isolado (app nomeado) para que cada login tenha a propria sessao.
async function clientFor(email, password) {
  const app = initializeApp({ apiKey: 'fake-key', projectId: PROJECT_ID }, `cli-${++seq}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${hosts.auth.host}:${hosts.auth.port}`, { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, hosts.firestore.host, hosts.firestore.port)
  cleanups.push(async () => {
    await terminate(db)
    await deleteApp(app)
  })
  let user = null
  if (email) {
    const cred = await signInWithEmailAndPassword(auth, email.toLowerCase(), password)
    user = cred.user
  }
  return { app, auth, db, user }
}

const listOwned = (db, hid) =>
  getDocs(query(collection(db, 'transactions'), where('ownerId', '==', hid)))

const isDenied = (err) => err?.code === 'permission-denied'

function fakeReq(token) {
  const headers = token === undefined ? {} : { authorization: token }
  return { get: (name) => headers[name.toLowerCase()] }
}
function fakeRes() {
  return {
    code: null,
    body: null,
    status(c) {
      this.code = c
      return this
    },
    json(b) {
      this.body = b
      return this
    },
  }
}
async function runMiddleware(verify, authorization) {
  const req = fakeReq(authorization)
  const res = fakeRes()
  let called = false
  await requireOwner(verify)(req, res, () => {
    called = true
  })
  return { req, res, called }
}

function base64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

describe('caminho do dono (tracer)', () => {
  before(async () => {
    await resetEmulators()
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')

    const out = await createUsers({
      auth: admin.auth,
      hid: HID_A,
      people: [
        { person: 'ele', ...ELE },
        { person: 'ela', ...ELA },
      ],
      apply: true,
    })
    assert.equal(out.results.length, 2)

    // Dados semeados pelo Admin SDK (ignora regras): dois casais.
    const col = admin.db.collection('transactions')
    await col.doc('tA1').set({ ownerId: HID_A, person: 'ele', amount: 10 })
    await col.doc('tA2').set({ ownerId: HID_A, person: 'ela', amount: 20 })
    await col.doc('tB1').set({ ownerId: HID_B, person: 'ele', amount: 30 })
  })

  after(async () => {
    for (const fn of cleanups.reverse()) await fn()
    await admin.app.delete()
  })

  test('TRACER: Ele e Ela entram por e-mail e senha e o token traz hid e person', async () => {
    const ele = await clientFor(ELE.email, ELE.password)
    const ela = await clientFor(ELA.email, ELA.password)
    const eleToken = await ele.user.getIdTokenResult(true)
    const elaToken = await ela.user.getIdTokenResult(true)
    assert.equal(eleToken.claims.hid, HID_A)
    assert.equal(eleToken.claims.person, 'ele')
    assert.equal(elaToken.claims.hid, HID_A)
    assert.equal(elaToken.claims.person, 'ela')
  })

  test('so o casal le os proprios documentos; sem filtro, dono alheio e anonimo sao negados', async () => {
    const ele = await clientFor(ELE.email, ELE.password)
    const snap = await listOwned(ele.db, HID_A)
    assert.deepEqual(snap.docs.map((d) => d.id).sort(), ['tA1', 'tA2'])

    await assert.rejects(getDocs(collection(ele.db, 'transactions')), isDenied)
    await assert.rejects(listOwned(ele.db, HID_B), isDenied)

    const anon = await clientFor(null)
    await assert.rejects(listOwned(anon.db, HID_A), isDenied)
  })

  test('Ela le documentos de Ele: as regras nao distinguem person (D-05)', async () => {
    const ela = await clientFor(ELA.email, ELA.password)
    const snap = await listOwned(ela.db, HID_A)
    const persons = new Set(snap.docs.map((d) => d.data().person))
    assert.ok(persons.has('ele'), 'Ela deve ver documentos de Ele')
    assert.ok(persons.has('ela'))
  })

  test('conta sem claims entra, mas nao le nada, e requireOwner responde 403', async () => {
    await admin.auth.createUser({ email: 'sem-claims@exemplo.com', password: 'senha-sem-claims' })
    const cli = await clientFor('sem-claims@exemplo.com', 'senha-sem-claims')
    const tokenResult = await cli.user.getIdTokenResult(true)
    assert.equal(tokenResult.claims.hid, undefined)
    await assert.rejects(listOwned(cli.db, HID_A), isDenied)

    const verify = (t) => admin.auth.verifyIdToken(t)
    const { res, called } = await runMiddleware(verify, `Bearer ${tokenResult.token}`)
    assert.equal(called, false)
    assert.equal(res.code, 403)
    assert.deepEqual(res.body, { error: 'Sem acesso' })
  })

  test('requireOwner com verifyIdToken real: sem Bearer 401, token valido preenche req.owner, adulterado 401', async () => {
    const verify = (t) => admin.auth.verifyIdToken(t)

    const none = await runMiddleware(verify, undefined)
    assert.equal(none.res.code, 401)
    assert.equal(none.called, false)

    const ele = await clientFor(ELE.email, ELE.password)
    const { token } = await ele.user.getIdTokenResult(true)
    const ok = await runMiddleware(verify, `Bearer ${token}`)
    assert.equal(ok.called, true)
    assert.equal(ok.req.owner.hid, HID_A)
    assert.equal(ok.req.owner.person, 'ele')
    assert.equal(ok.req.owner.uid, ele.user.uid)

    // O emulador emite tokens sem assinatura, entao a adulteracao testada aqui e a de conteudo:
    // audiencia trocada (token forjado para outro projeto) e lixo no lugar do JWT.
    const [h, p] = token.split('.')
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
    const forged = `${h}.${base64urlJson({ ...payload, aud: 'outro-projeto', hid: 'casal-forjado' })}.`
    const bad1 = await runMiddleware(verify, `Bearer ${forged}`)
    assert.equal(bad1.res.code, 401)
    const bad2 = await runMiddleware(verify, 'Bearer isto-nao-e-um-jwt')
    assert.equal(bad2.res.code, 401)
    assert.equal(bad2.called, false)
  })

  test('create-users: idempotente, dry-run nao escreve, recusa outro casal, nao vaza senha, listUsers sem senha', async () => {
    const hid = 'casal-cccc-0003'
    const people = [
      { person: 'ele', email: 'novo-ele@exemplo.com', password: 'segredo-ele-777' },
      { person: 'ela', email: 'novo-ela@exemplo.com', password: 'segredo-ela-888' },
    ]
    const logs = []
    const log = (m) => logs.push(m)

    // dry-run: nada escrito
    const dry = await createUsers({ auth: admin.auth, hid, people, apply: false, log })
    assert.equal(dry.dryRun, true)
    assert.deepEqual(dry.results.map((r) => r.action), ['create', 'create'])
    await assert.rejects(admin.auth.getUserByEmail('novo-ele@exemplo.com'), (e) => e.code === 'auth/user-not-found')

    // apply cria; a segunda execucao e noop
    const first = await createUsers({ auth: admin.auth, hid, people, apply: true, log })
    assert.deepEqual(first.results.map((r) => r.action), ['create', 'create'])
    const second = await createUsers({ auth: admin.auth, hid, people, apply: true, log })
    assert.deepEqual(second.results.map((r) => r.action), ['noop', 'noop'])

    // recusa usuario que ja pertence a outro hid
    await assert.rejects(
      createUsers({ auth: admin.auth, hid: 'casal-dddd-0004', people: [people[0]], apply: true, log }),
      /outro casal/
    )

    // atualiza claims sem recriar e preserva claims existentes
    await admin.auth.createUser({ email: 'existente@exemplo.com' })
    const u = await admin.auth.getUserByEmail('existente@exemplo.com')
    await admin.auth.setCustomUserClaims(u.uid, { extra: 'preservado' })
    const upd = await createUsers({
      auth: admin.auth,
      hid,
      people: [{ person: 'ele', email: 'existente@exemplo.com' }],
      apply: true,
      log,
    })
    assert.equal(upd.results[0].action, 'update-claims')
    const merged = (await admin.auth.getUser(u.uid)).customClaims
    assert.deepEqual(merged, { extra: 'preservado', hid, person: 'ele' })

    // senha nunca aparece em retorno nem em log
    const everything = JSON.stringify([dry, first, second, upd, logs])
    for (const secret of ['segredo-ele-777', 'segredo-ela-888']) {
      assert.ok(!everything.includes(secret), 'senha vazou no retorno ou no log')
    }

    // listUsers: uid, e-mail, hid e person; sem senha
    const listed = await listUsers({ auth: admin.auth })
    const entry = listed.find((x) => x.email === 'novo-ele@exemplo.com')
    assert.equal(entry.hid, hid)
    assert.equal(entry.person, 'ele')
    assert.ok(entry.uid)
    assert.ok(!JSON.stringify(listed).includes('segredo-'))
    assert.deepEqual(Object.keys(entry).sort(), ['createdAt', 'email', 'hid', 'person', 'uid'])

    // validacoes de entrada
    await assert.rejects(createUsers({ auth: admin.auth, hid: 'curto', people, apply: false }), /hid invalido/)
    await assert.rejects(
      createUsers({ auth: admin.auth, hid, people: [people[0], people[0]], apply: false }),
      /repetida/
    )

    // CLI: a saida nao contem a senha informada por variavel de ambiente
    const script = fileURLToPath(new URL('../../scripts/create-users.js', import.meta.url))
    const cli = spawnSync(
      process.execPath,
      [script, '--hid', 'casal-eeee-0005', '--ele-email', 'cli-ele@exemplo.com', '--ela-email', 'cli-ela@exemplo.com', '--apply'],
      {
        env: { ...process.env, ELE_PASSWORD: 'cli-segredo-ele-1', ELA_PASSWORD: 'cli-segredo-ela-2' },
        encoding: 'utf8',
        cwd: path.dirname(script),
      }
    )
    assert.equal(cli.status, 0, cli.stderr)
    const cliOut = `${cli.stdout}${cli.stderr}`
    assert.ok(!cliOut.includes('cli-segredo'), 'senha apareceu na saida do CLI')
    assert.match(cliOut, /cli-ele@exemplo\.com/)
    assert.match(cliOut, /acao=create/)
  })
})
