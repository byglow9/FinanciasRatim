// Notificador de limites contra o emulador do Firestore, com o FCM falso.
// Prova que o marcador e gravado, que o texto do aviso nunca e gravado e que so a pessoa do gasto
// recebe. Rodar: npm run test:emu
import { test, describe, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { createNotifier } from '../../src/push/notifier.js'
import { createRepo } from '../../src/push/repo.js'
import { createSender } from '../../src/push/send.js'
import { resetEmulators } from './_helpers.js'

const NOW = new Date('2026-11-17T15:00:00Z') // 12:00 em Sao Paulo
const ts = (iso) => Timestamp.fromDate(new Date(iso))

const FID_ELE_1 = 'fidEleAparelho0001'
const FID_ELE_2 = 'fidEleAparelho0002'
const FID_ELA = 'fidElaAparelho0001'
const FID_B_ELE = 'fidBEleAparelho0001'

const SETTINGS_A = {
  ownerId: 'casalA',
  // Limite de Lazer so para o Ele.
  personConfig: {
    ele: { salaryDay: 1, expectedIncomeCents: 500000, limits: { lazer: [{ from: '2026-01', cents: 10000 }] } },
    ela: { salaryDay: 1, expectedIncomeCents: 600000 },
  },
  vintemTone: 'sem-filtro',
}

// FCM falso: registra as mensagens enviadas e responde sucesso (ou o erro do mapa fail) por FID.
function fakeMessaging() {
  const sent = []
  const fail = new Map()
  return {
    sent,
    fail,
    async sendEach(messages) {
      sent.push(...messages)
      const responses = messages.map((m) =>
        fail.has(m.fid) ? { success: false, error: { code: fail.get(m.fid) } } : { success: true, messageId: `m-${m.fid}` }
      )
      return {
        responses,
        successCount: responses.filter((r) => r.success).length,
        failureCount: responses.filter((r) => !r.success).length,
      }
    },
  }
}

describe('notificador de limites no emulador', () => {
  let db
  let messaging
  let clock

  before(() => {
    const admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
  })

  const buildNotifier = (overrides = {}) =>
    createNotifier({
      repo: createRepo({ db }),
      sender: createSender({ db, messaging }),
      now: () => new Date(clock.t),
      ...overrides,
    })

  const addTx = (data) =>
    db.collection('transactions').add({
      type: 'saida',
      source: 'bank',
      category: 'Lazer',
      categoryId: 'lazer',
      description: 'LOJA QUALQUER',
      date: ts('2026-11-16T15:00:00Z'),
      ...data,
    })

  const registerFid = (fid, ownerId, person) =>
    db.collection('pushRegistrations').doc(fid).set({ ownerId, person, uid: `u-${person}`, platform: 'android', updatedAt: NOW })

  beforeEach(async () => {
    await resetEmulators()
    messaging = fakeMessaging()
    clock = { t: NOW.getTime() }
    await db.collection('settings').doc('main').set(SETTINGS_A)
    await registerFid(FID_ELE_1, 'casalA', 'ele')
    await registerFid(FID_ELE_2, 'casalA', 'ele')
    await registerFid(FID_ELA, 'casalA', 'ela')
    await registerFid(FID_B_ELE, 'casalB', 'ele')
    // Ele passa de 100 por cento do limite de Lazer.
    await addTx({ ownerId: 'casalA', person: 'ele', amount: 120 })
    // Gasto de Ela e de outro casal na mesma categoria: nao pode gerar aviso para o Ele.
    await addTx({ ownerId: 'casalA', person: 'ela', amount: 900 })
    await addTx({ ownerId: 'casalB', person: 'ele', amount: 900 })
  })

  const markers = async () => {
    const snap = await db.collection('pushEvents').get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  test('um gasto que cruza 100 por cento vira um aviso unico no aparelho da pessoa certa', async () => {
    const notifier = buildNotifier()
    const out = await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.equal(out.sent, 2)

    // Uma mensagem por aparelho do Ele, nenhuma para Ela nem para o outro casal.
    assert.deepEqual(messaging.sent.map((m) => m.fid).sort(), [FID_ELE_1, FID_ELE_2])
    for (const m of messaging.sent) {
      assert.deepEqual(Object.keys(m.data).sort(), ['body', 'tag', 'title', 'url'])
      assert.doesNotMatch(m.data.body, /\d|R\$/)
      assert.equal(m.data.title, 'OINC')
    }

    // Marcadores gravados: o 100 enviado e o 80 silencioso, sem o texto do aviso.
    const list = await markers()
    assert.deepEqual(list.map((m) => `${m.threshold}:${m.status}`).sort(), ['100:enviado', '80:silencioso'])
    for (const m of list) {
      assert.equal(m.ownerId, 'casalA')
      assert.equal(m.person, 'ele')
      assert.equal(m.kind, 'limite')
      assert.ok(m.id.startsWith('casalA__limite__ele__2026-11__lazer__'))
      assert.equal('body' in m, false)
      assert.equal('text' in m, false)
      assert.ok(!JSON.stringify(m).includes(messaging.sent[0].data.body), 'o marcador guardou o texto do aviso')
    }
  })

  test('um segundo check, mesmo seguido, nao envia nada e nao cria marcador', async () => {
    const notifier = buildNotifier()
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    const again = await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.equal(again.events, 0)
    assert.equal(messaging.sent.length, 2)
    assert.equal((await markers()).length, 2)
  })

  test('a outra pessoa e outro casal nao recebem aviso nem geram marcador', async () => {
    const notifier = buildNotifier()
    const ela = await notifier.evaluateLimits({ hid: 'casalA', person: 'ela' })
    assert.equal(ela.events, 0)
    const b = await notifier.evaluateLimits({ hid: 'casalB', person: 'ele' })
    assert.equal(b.events, 0)
    assert.equal(messaging.sent.length, 0)
    assert.equal((await markers()).length, 0)
  })

  // Silencio das 22:00 as 08:00 em Sao Paulo.
  const QUIET = { types: { limite80: true, limite100: true, espontanea: true }, quiet: { enabled: true, from: '22:00', to: '08:00' } }
  const T_2330 = Date.parse('2026-11-18T02:30:00Z')
  const T_2230 = Date.parse('2026-11-18T01:30:00Z')
  const T_0805 = Date.parse('2026-11-18T11:05:00Z')
  const putPrefs = (person, prefs) =>
    db.collection('pushPrefs').doc(`casalA__${person}`).set({ ownerId: 'casalA', person, uid: `u-${person}`, ...prefs, updatedAt: NOW })

  test('o aviso do silencio fica pendente, chega depois dele uma vez so e o 80 e o 100 colapsam', async () => {
    await putPrefs('ele', QUIET)
    const notifier = buildNotifier()
    clock.t = T_2330
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.equal(messaging.sent.length, 0)
    assert.deepEqual((await markers()).map((m) => `${m.threshold}:${m.status}`).sort(), ['100:pendente', '80:silencioso'])

    clock.t = T_2230
    assert.equal((await notifier.deliverHeld()).sent, 0)
    assert.equal(messaging.sent.length, 0)

    clock.t = T_0805
    const out = await notifier.deliverHeld()
    assert.equal(out.sent, 2)
    assert.deepEqual(messaging.sent.map((m) => m.fid).sort(), [FID_ELE_1, FID_ELE_2])
    const list = await markers()
    assert.deepEqual(list.map((m) => `${m.threshold}:${m.status}`).sort(), ['100:enviado', '80:silencioso'])
    assert.equal(list.find((m) => m.threshold === 100).dayKey, '2026-11-18')

    await notifier.deliverHeld()
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.equal(messaging.sent.length, 2)
  })

  test('dois deliverHeld simultaneos enviam o retido uma so vez', async () => {
    await putPrefs('ele', QUIET)
    const notifier = buildNotifier()
    clock.t = T_2330
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    clock.t = T_0805
    const other = buildNotifier()
    await Promise.all([notifier.deliverHeld(), other.deliverHeld()])
    assert.equal(messaging.sent.length, 2)
  })

  test('tipo desligado vira marcador desligado e retido com tipo desligado depois nao chega', async () => {
    await putPrefs('ele', { ...QUIET, types: { limite80: true, limite100: false, espontanea: true } })
    const notifier = buildNotifier()
    clock.t = T_2330
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.deepEqual((await markers()).map((m) => `${m.threshold}:${m.status}`).sort(), ['100:desligado', '80:silencioso'])
    clock.t = T_0805
    await notifier.deliverHeld()
    assert.equal(messaging.sent.length, 0)
  })

  test('o teto diario conta os avisos enviados do dia no Firestore real', async () => {
    const repo = createRepo({ db })
    for (let i = 0; i < 3; i++) {
      await db.collection('pushEvents').doc(`casalA__limite__x${i}`).set({ ownerId: 'casalA', person: 'ele', kind: 'limite', dayKey: '2026-11-17', status: 'enviado' })
    }
    await db.collection('pushEvents').doc('casalA__limite__outro-dia').set({ ownerId: 'casalA', person: 'ele', kind: 'limite', dayKey: '2026-11-16', status: 'enviado' })
    await db.collection('pushEvents').doc('casalA__limite__ela').set({ ownerId: 'casalA', person: 'ela', kind: 'limite', dayKey: '2026-11-17', status: 'enviado' })
    await db.collection('pushEvents').doc('casalA__limite__pendente').set({ ownerId: 'casalA', person: 'ele', kind: 'limite', dayKey: '2026-11-17', status: 'pendente' })
    assert.equal(await repo.countSent('casalA', 'ele', '2026-11-17'), 3)

    // Com teto 3, o aviso novo vira marcador teto e nada sai.
    const notifier = buildNotifier({ config: { maxPerDay: 3 } })
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.equal(messaging.sent.length, 0)
    const own = (await markers()).filter((m) => m.threshold === 100)
    assert.deepEqual(own.map((m) => m.status), ['teto'])
  })

  test('falha transitoria apaga o marcador do Firestore e o check seguinte reenvia', async () => {
    messaging.fail.set(FID_ELE_1, 'messaging/internal-error')
    messaging.fail.set(FID_ELE_2, 'messaging/server-unavailable')
    const notifier = buildNotifier()
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.deepEqual((await markers()).map((m) => `${m.threshold}:${m.status}`), ['80:silencioso'])
    messaging.fail.clear()
    await notifier.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.deepEqual((await markers()).map((m) => `${m.threshold}:${m.status}`).sort(), ['100:enviado', '80:silencioso'])
  })

  test('FID morto apaga o registro e mantem o marcador', async () => {
    messaging.fail.set(FID_ELE_1, 'messaging/installation-id-not-registered')
    messaging.fail.set(FID_ELE_2, 'messaging/installation-id-not-registered')
    await buildNotifier().evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.deepEqual((await markers()).map((m) => `${m.threshold}:${m.status}`).sort(), ['100:sem-aparelho', '80:silencioso'])
    assert.equal((await db.collection('pushRegistrations').doc(FID_ELE_1).get()).exists, false)
    assert.equal((await db.collection('pushRegistrations').doc(FID_ELA).get()).exists, true)
  })

  test('excludeFid pula so o aparelho em uso e nunca chega a outra pessoa', async () => {
    await buildNotifier().evaluateLimits({ hid: 'casalA', person: 'ele', excludeFid: FID_ELE_1 })
    assert.deepEqual(messaging.sent.map((m) => m.fid), [FID_ELE_2])
  })

  // D-07, PUSH-04: o marcador e o create() do Firestore, nao a memoria do processo.
  test('varios checks simultaneos sobre o mesmo gasto enviam uma notificacao so', async () => {
    const instances = Array.from({ length: 6 }, () => buildNotifier())
    await Promise.all(instances.map((n) => n.evaluateLimits({ hid: 'casalA', person: 'ele' })))
    // Uma notificacao = uma mensagem por aparelho do Ele, sem repeticao.
    assert.deepEqual(messaging.sent.map((m) => m.fid).sort(), [FID_ELE_1, FID_ELE_2])
    assert.deepEqual((await markers()).map((m) => `${m.threshold}:${m.status}`).sort(), ['100:enviado', '80:silencioso'])
  })

  test('o mesmo notificador chamado duas vezes ao mesmo tempo tambem envia uma vez', async () => {
    const notifier = buildNotifier()
    await Promise.all([
      notifier.evaluateLimits({ hid: 'casalA', person: 'ele' }),
      notifier.evaluateLimits({ hid: 'casalA', person: 'ele' }),
    ])
    assert.equal(messaging.sent.length, 2)
  })

  test('um notificador novo sobre o mesmo banco (reinicio do servidor) nao reenvia', async () => {
    await buildNotifier().evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.equal(messaging.sent.length, 2)
    // Instancias novas de tudo: repo, sender e notificador, sem nenhuma memoria do processo anterior.
    const restarted = createNotifier({
      repo: createRepo({ db }),
      sender: createSender({ db, messaging }),
      now: () => new Date(clock.t),
    })
    const out = await restarted.evaluateLimits({ hid: 'casalA', person: 'ele' })
    assert.equal(out.sent, 0)
    assert.equal(messaging.sent.length, 2)
    // Nem o marcador pendente ou o enviado volta a ser reivindicado na mao.
    const repo = createRepo({ db })
    for (const m of await markers()) assert.equal(await repo.claimEvent(m.id, { ownerId: 'casalA' }), false)
  })

  test('o marcador apagado por falha transitoria volta a poder ser reivindicado', async () => {
    const repo = createRepo({ db })
    const id = 'casalA__limite__ele__2026-11__lazer__100'
    assert.equal(await repo.claimEvent(id, { ownerId: 'casalA', status: 'enviando' }), true)
    assert.equal(await repo.claimEvent(id, { ownerId: 'casalA', status: 'enviando' }), false)
    await repo.deleteEvent(id)
    assert.equal(await repo.claimEvent(id, { ownerId: 'casalA', status: 'enviando' }), true)
  })

  test('o create() falha de verdade quando o documento existe; qualquer outro erro sobe', async () => {
    // Documento existente no emulador: o create() real recusa e vira falso (nunca lanca).
    await db.collection('pushEvents').doc('casalA__limite__existente').set({ ownerId: 'casalA' })
    const repo = createRepo({ db })
    await assert.rejects(() => db.collection('pushEvents').doc('casalA__limite__existente').create({ ownerId: 'casalA' }))
    assert.equal(await repo.claimEvent('casalA__limite__existente', { ownerId: 'casalA' }), false)

    // Outro erro (por exemplo permissao negada) nao pode ser confundido com "ja existe".
    const boom = (code) => ({
      collection: () => ({
        doc: () => ({
          create: async () => {
            const err = new Error('falha')
            err.code = code
            throw err
          },
        }),
      }),
    })
    await assert.rejects(() => createRepo({ db: boom(7), prefsStore: {} }).claimEvent('x', {}))
    await assert.rejects(() => createRepo({ db: boom(14), prefsStore: {} }).claimEvent('x', {}))
    assert.equal(await createRepo({ db: boom(6), prefsStore: {} }).claimEvent('x', {}), false)
  })
})
