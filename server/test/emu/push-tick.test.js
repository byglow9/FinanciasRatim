// Fatura, espontaneo e relogio contra o emulador do Firestore, com o FCM falso.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { withAfterSync } from '../../src/push/after-sync.js'
import { createPushFeature } from '../../src/push/index.js'
import { createNotifier } from '../../src/push/notifier.js'
import { createRepo } from '../../src/push/repo.js'
import { createSender } from '../../src/push/send.js'
import { resetEmulators } from './_helpers.js'

// 17/11 as 12:00 em Sao Paulo.
const NOW = new Date('2026-11-17T15:00:00Z')

const FID_ELE = 'fidEleAparelho0001'
const FID_ELA = 'fidElaAparelho0001'
const FID_B_ELE = 'fidBEleAparelho0001'

// FCM falso: registra as mensagens enviadas e responde sucesso.
function fakeMessaging() {
  const sent = []
  return {
    sent,
    async sendEach(messages) {
      sent.push(...messages)
      return { responses: messages.map((m) => ({ success: true, messageId: `m-${m.fid}` })) }
    },
  }
}

describe('fatura no emulador', () => {
  let db
  let messaging
  let clock

  before(() => {
    const admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
  })

  const buildNotifier = () =>
    createNotifier({
      repo: createRepo({ db }),
      sender: createSender({ db, messaging }),
      now: () => new Date(clock.t),
    })

  const registerFid = (fid, ownerId, person, updatedAt = NOW) =>
    db.collection('pushRegistrations').doc(fid).set({ ownerId, person, uid: `u-${person}`, platform: 'android', updatedAt })

  const putCard = async (id, ownerId, person, extra = {}) => {
    await db
      .collection('cards')
      .doc(id)
      .set({ accountId: id, ownerId, person, name: 'Cartao Teste', billTotals: { '2026-11': 45067 }, ...extra })
    await db.collection('cardSettings').doc(id).set({ accountId: id, ownerId, closingDay: 10, dueDay: 20, paidMonths: [] })
  }

  const markers = async () => {
    const snap = await db.collection('pushEvents').get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  beforeEach(async () => {
    await resetEmulators()
    messaging = fakeMessaging()
    clock = { t: NOW.getTime() }
    await db.collection('settings').doc('main').set({ ownerId: 'casalA' })
    await registerFid(FID_ELE, 'casalA', 'ele')
    await registerFid(FID_ELA, 'casalA', 'ela')
    await registerFid(FID_B_ELE, 'casalB', 'ele')
    await putCard('cartao-ele', 'casalA', 'ele')
  })

  test('a fatura perto de vencer vira um aviso unico, so no aparelho da pessoa do cartao', async () => {
    const notifier = buildNotifier()
    await notifier.evaluateBills({ hid: 'casalA', person: 'ele' })
    await notifier.evaluateBills({ hid: 'casalA', person: 'ela' })
    await notifier.evaluateBills({ hid: 'casalB', person: 'ele' })
    // Instancia nova sobre o mesmo banco (reinicio) e varias ao mesmo tempo: nada se repete.
    await Promise.all(Array.from({ length: 4 }, () => buildNotifier().evaluateBills({ hid: 'casalA', person: 'ele' })))

    assert.deepEqual(messaging.sent.map((m) => m.fid), [FID_ELE])
    assert.equal(messaging.sent[0].data.url, '/cartoes')
    assert.equal(messaging.sent[0].data.tag, 'fatura-cartao-ele')
    assert.doesNotMatch(messaging.sent[0].data.body, /\d|R\$/)

    const list = await markers()
    assert.deepEqual(list.map((m) => m.id), ['casalA__fatura__cartao-ele__2026-11'])
    assert.equal(list[0].status, 'enviado')
    assert.equal(list[0].kind, 'fatura')
    assert.ok(!JSON.stringify(list[0]).includes(messaging.sent[0].data.body), 'o marcador guardou o texto do aviso')
  })

  test('o cartao de outro casal com a mesma pessoa nunca entra na avaliacao', async () => {
    await putCard('cartao-b', 'casalB', 'ele')
    await buildNotifier().evaluateBills({ hid: 'casalB', person: 'ele' })
    assert.deepEqual(messaging.sent.map((m) => m.fid), [FID_B_ELE])
    assert.deepEqual((await markers()).map((m) => m.id), ['casalB__fatura__cartao-b__2026-11'])
  })

  test('fatura paga, marcada como paga ou com o interruptor desligado nao envia', async () => {
    await db.collection('cardSettings').doc('cartao-ele').set({ paidMonths: ['2026-11'] }, { merge: true })
    await buildNotifier().evaluateBills({ hid: 'casalA', person: 'ele' })
    assert.equal((await markers()).length, 0)

    await db.collection('cardSettings').doc('cartao-ele').set({ paidMonths: [] }, { merge: true })
    await db.collection('settings').doc('main').set({ notificationsEnabled: false }, { merge: true })
    await buildNotifier().evaluateBills({ hid: 'casalA', person: 'ele' })
    assert.deepEqual((await markers()).map((m) => m.status), ['desligado'])
    assert.equal(messaging.sent.length, 0)
  })
})

describe('ciclo completo no emulador', () => {
  // Silencio das 22:00 as 08:00 em Sao Paulo.
  const QUIET = { types: { limite80: true, limite100: true, espontanea: true }, quiet: { enabled: true, from: '22:00', to: '08:00' } }
  const T_2330 = Date.parse('2026-11-18T02:30:00Z')
  const T_0805 = Date.parse('2026-11-18T11:05:00Z')
  const SPONT_ID = 'casalA__ele__espontanea__2026-11-18'

  let db
  let messaging
  let clock

  before(() => {
    db = initAdmin().db
  })

  // Feature inteira nova sobre o mesmo banco: o equivalente a um reinicio do servidor.
  const boot = () => createPushFeature({ db, messaging, now: () => new Date(clock.t), env: {} })

  // Sincronizacao falsa: grava um gasto que cruza o limite e devolve o resumo como o sync.js.
  const fakeSync = () => ({
    async syncItem(database, _pluggy, itemId) {
      await database.collection('transactions').doc('bank_gasto-1').set({
        ownerId: 'casalA',
        person: 'ele',
        type: 'saida',
        source: 'bank',
        category: 'Lazer',
        categoryId: 'lazer',
        amount: 120,
        description: 'LOJA QUALQUER',
        date: Timestamp.fromDate(new Date('2026-11-17T15:00:00Z')),
      })
      return { itemId, person: 'ele', imported: 1, review: 0, ignored: 0 }
    },
    syncAll: async () => [],
    syncConnection: async () => null,
  })

  // O gancho roda por fora: a promessa dele e capturada para o teste poder esperar.
  const syncWith = (push) => {
    const pending = []
    const sync = withAfterSync(
      fakeSync(),
      (pair) => {
        const run = push.afterSync(pair)
        pending.push(run)
        return run
      },
      { ownerOf: push.ownerOfItem }
    )
    return async () => {
      const out = await sync.syncItem(db, {}, 'item-a-ele')
      // A leitura do dono acontece antes do gancho: espera ate ele ser chamado.
      for (let i = 0; i < 200 && pending.length === 0; i++) await new Promise((r) => setTimeout(r, 10))
      assert.equal(pending.length, 1, 'o gancho nao foi chamado')
      await Promise.all(pending.splice(0))
      return out
    }
  }

  const statuses = async () => {
    const snap = await db.collection('pushEvents').get()
    return snap.docs.map((d) => `${d.data().kind}:${d.data().threshold ?? ''}:${d.data().status}`).sort()
  }

  beforeEach(async () => {
    await resetEmulators()
    messaging = fakeMessaging()
    clock = { t: NOW.getTime() }
    await db.collection('settings').doc('main').set({
      ownerId: 'casalA',
      personConfig: {
        ele: { salaryDay: 1, expectedIncomeCents: 500000, limits: { lazer: [{ from: '2026-01', cents: 10000 }] } },
      },
    })
    await db.collection('bankConnections').doc('item-a-ele').set({ ownerId: 'casalA', person: 'ele', itemId: 'item-a-ele' })
    await db
      .collection('pushRegistrations')
      .doc(FID_ELE)
      .set({ ownerId: 'casalA', person: 'ele', uid: 'u-ele', platform: 'android', updatedAt: NOW })
  })

  test('a sincronizacao que cruza o limite avisa uma vez, mesmo repetida e depois de reiniciar', async () => {
    const out = await syncWith(boot())()
    assert.deepEqual(out, { itemId: 'item-a-ele', person: 'ele', imported: 1, review: 0, ignored: 0 })
    assert.deepEqual(messaging.sent.map((m) => m.fid), [FID_ELE])

    await syncWith(boot())()
    assert.equal(messaging.sent.length, 1)
    assert.deepEqual(await statuses(), ['limite:100:enviado', 'limite:80:silencioso'])
  })

  test('o relogio entrega o retido depois do silencio, e um reinicio nao repete nada', async () => {
    await db.collection('pushPrefs').doc('casalA__ele').set({ ownerId: 'casalA', person: 'ele', uid: 'u-ele', ...QUIET, updatedAt: NOW })
    clock.t = T_2330
    await syncWith(boot())()
    await boot().tick.runOnce()
    assert.equal(messaging.sent.length, 0)
    assert.deepEqual(await statuses(), ['limite:100:pendente', 'limite:80:silencioso'])

    clock.t = T_0805
    await boot().tick.runOnce()
    assert.equal(messaging.sent.length, 1)
    assert.equal(messaging.sent[0].data.tag, 'limite-lazer-2026-11')

    await boot().tick.runOnce()
    await syncWith(boot())()
    assert.equal(messaging.sent.length, 1)
  })

  test('o espontaneo sai uma vez no dia, mesmo com relogios novos e simultaneos', async () => {
    // 19:50 em Sao Paulo: depois de qualquer horario alvo da janela padrao.
    clock.t = Date.parse('2026-11-18T22:50:00Z')
    await boot().tick.runOnce()
    await Promise.all([boot().tick.runOnce(), boot().tick.runOnce(), boot().tick.runOnce()])
    assert.deepEqual(messaging.sent.map((m) => m.data.tag), ['espontanea'])
    assert.equal((await db.collection('pushEvents').doc(SPONT_ID).get()).data().status, 'enviado')
  })

  test('o relogio poda no Firestore so o aparelho sem renovacao ha mais de 30 dias', async () => {
    await db.collection('pushRegistrations').doc(FID_ELA).set({
      ownerId: 'casalA',
      person: 'ela',
      uid: 'u-ela',
      platform: 'ios',
      updatedAt: new Date(clock.t - 31 * 24 * 60 * 60 * 1000),
    })
    const out = await boot().tick.runOnce()
    assert.equal(out.pruned, 1)
    assert.equal((await db.collection('pushRegistrations').doc(FID_ELA).get()).exists, false)
    assert.equal((await db.collection('pushRegistrations').doc(FID_ELE).get()).exists, true)
  })
})
