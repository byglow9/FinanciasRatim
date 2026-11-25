// Fatura, espontaneo e relogio contra o emulador do Firestore, com o FCM falso.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import { initAdmin } from '../../scripts/lib/admin.js'
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
