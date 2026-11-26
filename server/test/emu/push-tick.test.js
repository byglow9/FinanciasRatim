// Avisos fixos, espontaneo e relogio contra o emulador do Firestore, com o FCM falso.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { createSnapshotLoader } from '../../src/ai/snapshot.js'
import { withAfterSync } from '../../src/push/after-sync.js'
import { createPushFeature } from '../../src/push/index.js'
import { createNotifier } from '../../src/push/notifier.js'
import { createRepo } from '../../src/push/repo.js'
import { createSender } from '../../src/push/send.js'
import { resetEmulators } from './_helpers.js'

// 17/11 as 12:00 em Sao Paulo.
const NOW = new Date('2026-11-17T15:00:00Z')
// 18/11 as 12:00 em Sao Paulo: 2 dias antes do vencimento do dia 20.
const D2 = new Date('2026-11-18T15:00:00Z')
const BILL_ID = 'casalA__ele__fatura__cartao-ele__2026-11-20__d2'

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

  const buildNotifier = (extra = {}) =>
    createNotifier({
      repo: createRepo({ db }),
      sender: createSender({ db, messaging }),
      now: () => new Date(clock.t),
      ...extra,
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
    clock = { t: D2.getTime() }
    await db.collection('settings').doc('main').set({ ownerId: 'casalA' })
    await registerFid(FID_ELE, 'casalA', 'ele')
    await registerFid(FID_ELA, 'casalA', 'ela')
    await registerFid(FID_B_ELE, 'casalB', 'ele')
    await putCard('cartao-ele', 'casalA', 'ele')
  })

  test('a fatura a 2 dias vira um aviso unico, so no aparelho da pessoa do cartao', async () => {
    const notifier = buildNotifier()
    await notifier.evaluateDue({ hid: 'casalA', person: 'ele' })
    await notifier.evaluateDue({ hid: 'casalA', person: 'ela' })
    await notifier.evaluateDue({ hid: 'casalB', person: 'ele' })
    // Instancia nova sobre o mesmo banco (reinicio) e varias ao mesmo tempo: nada se repete.
    await Promise.all(Array.from({ length: 4 }, () => buildNotifier().evaluateDue({ hid: 'casalA', person: 'ele' })))

    assert.deepEqual(messaging.sent.map((m) => m.fid), [FID_ELE])
    assert.equal(messaging.sent[0].data.url, '/cartoes')
    assert.equal(messaging.sent[0].data.tag, 'fatura-cartao-ele-2026-11-20')
    // O corpo traz o valor; nunca o nome do cartao nem CPF.
    assert.doesNotMatch(messaging.sent[0].data.body, /Cartao Teste|\d{3}\.\d{3}\.\d{3}-\d{2}/)

    const list = await markers()
    assert.deepEqual(list.map((m) => m.id), [BILL_ID])
    assert.equal(list[0].status, 'enviado')
    assert.equal(list[0].kind, 'fatura')
    assert.ok(!JSON.stringify(list[0]).includes(messaging.sent[0].data.body), 'o marcador guardou o texto do aviso')
  })

  test('o cartao de outro casal com a mesma pessoa nunca entra na avaliacao', async () => {
    await putCard('cartao-b', 'casalB', 'ele')
    await buildNotifier().evaluateDue({ hid: 'casalB', person: 'ele' })
    assert.deepEqual(messaging.sent.map((m) => m.fid), [FID_B_ELE])
    assert.deepEqual((await markers()).map((m) => m.id), ['casalB__ele__fatura__cartao-b__2026-11-20__d2'])
  })

  test('fatura paga, marcada como paga ou com o interruptor desligado nao envia', async () => {
    await db.collection('cardSettings').doc('cartao-ele').set({ paidMonths: ['2026-11'] }, { merge: true })
    await buildNotifier().evaluateDue({ hid: 'casalA', person: 'ele' })
    assert.equal((await markers()).length, 0)

    await db.collection('cardSettings').doc('cartao-ele').set({ paidMonths: [] }, { merge: true })
    await db.collection('settings').doc('main').set({ notificationsEnabled: false }, { merge: true })
    await buildNotifier().evaluateDue({ hid: 'casalA', person: 'ele' })
    assert.deepEqual((await markers()).map((m) => m.status), ['desligado'])
    assert.equal(messaging.sent.length, 0)
  })

  test('conta e compromisso lidos de verdade: um aviso cada, sem escrever em contas nem lancamentos', async () => {
    const date = Timestamp.fromDate(new Date('2026-11-20T15:00:00Z'))
    const bill = { ownerId: 'casalA', name: 'Internet', amount: 129.9, dueDay: 20, isActive: true }
    await db.collection('fixedExpenses').doc('net').set({ ...bill, person: 'conjunto' })
    await db.collection('fixedExpenses').doc('academia').set({ ...bill, person: 'ela', name: 'Academia' })
    await db.collection('fixedExpenses').doc('paga').set({ ...bill, person: 'ele', name: 'Aluguel' })
    await db.collection('fixedExpensePayments').doc('p1').set({ ownerId: 'casalA', fixedExpenseId: 'paga', month: 11, year: 2026, paidAmount: 129.9 })
    await db.collection('events').doc('dentista').set({ ownerId: 'casalA', person: 'ele', title: 'Dentista', date, time: '14:30' })
    await db.collection('cardSettings').doc('cartao-ele').set({ paidMonths: ['2026-11'] }, { merge: true })

    const { loadDue } = createSnapshotLoader({ db, now: () => new Date(clock.t) })
    await Promise.all(Array.from({ length: 4 }, () => buildNotifier({ loadDue }).evaluateDue({ hid: 'casalA', person: 'ele' })))

    assert.deepEqual((await markers()).map((m) => m.id).sort(), [
      'casalA__ele__compromisso__dentista__2026-11-20__d2',
      'casalA__ele__conta__net__2026-11-20__d2',
    ])
    assert.deepEqual(messaging.sent.map((m) => m.fid), [FID_ELE, FID_ELE])
    assert.equal((await db.collection('fixedExpensePayments').get()).size, 1)
    assert.equal((await db.collection('transactions').get()).size, 0)

    const repo = createRepo({ db })
    assert.equal(await repo.countSent('casalA', 'ele', '2026-11-18'), 2)
    assert.equal(await repo.countSent('casalA', 'ele', '2026-11-18', 'conta'), 1)
    assert.equal(await repo.countSent('casalA', 'ele', '2026-11-18', 'espontanea'), 0)
  })
})

describe('ciclo completo no emulador', () => {
  // Silencio das 22:00 as 08:00 em Sao Paulo.
  const QUIET = { types: { limite80: true, limite100: true, espontanea: true, conta: true, compromisso: true }, quiet: { enabled: true, from: '22:00', to: '08:00' } }
  const T_2330 = Date.parse('2026-11-18T02:30:00Z')
  const T_0805 = Date.parse('2026-11-18T11:05:00Z')
  const SPONT_ID = 'casalA__ele__espontanea__2026-11-18__3'

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

  test('o espontaneo sai uma vez na vaga, mesmo com relogios novos e simultaneos', async () => {
    // 20:50 em Sao Paulo: so a terceira vaga pode estar livre, e o alvo dela ja passou.
    clock.t = Date.parse('2026-11-18T23:50:00Z')
    await boot().tick.runOnce()
    await Promise.all([boot().tick.runOnce(), boot().tick.runOnce(), boot().tick.runOnce()])
    assert.deepEqual(messaging.sent.map((m) => m.data.tag), ['espontanea-3'])
    assert.equal((await db.collection('pushEvents').doc(SPONT_ID).get()).data().status, 'enviado')
  })

  test('o relogio narra a compra de ontem lida do banco, guarda os recentes e nao repete', async () => {
    await db.collection('transactions').doc('bank_pedido-1').set({
      ownerId: 'casalA',
      person: 'ele',
      type: 'saida',
      source: 'bank',
      category: 'Lazer',
      categoryId: 'lazer',
      amount: 40,
      description: 'IFOOD *PEDIDO 987',
      date: Timestamp.fromDate(new Date('2026-11-17T15:00:00Z')),
    })
    clock.t = Date.parse('2026-11-18T23:50:00Z')
    await boot().tick.runOnce()
    const { body } = messaging.sent[0].data
    assert.match(body, /ontem/i)
    assert.match(body, /iFood/)
    assert.doesNotMatch(body, /PEDIDO|987/)
    const marker = (await db.collection('pushEvents').doc(SPONT_ID).get()).data()
    assert.equal(marker.txId, 'bank_pedido-1')
    assert.doesNotMatch(JSON.stringify(marker), /iFood|IFOOD|R\$/)
    const state = (await db.collection('oincState').doc('casalA__ele').get()).data()
    assert.equal(state.ownerId, 'casalA')
    assert.deepEqual(state.pushRecent, [marker.phraseId, 'tx:bank_pedido-1'])

    // Mesma compra, dia seguinte de manha: ja e antiga e ja foi narrada.
    clock.t = Date.parse('2026-11-19T15:45:00Z')
    await boot().tick.runOnce()
    const spontaneous = messaging.sent.filter((m) => m.data.tag.startsWith('espontanea-'))
    assert.equal(spontaneous.length, 2)
    assert.ok(!spontaneous[1].data.body.includes('iFood'))
  })

  test('um dia inteiro custa uma carga de dados por vaga e por pessoa', async (t) => {
    await db.collection('pushRegistrations').doc(FID_ELA).set({ ownerId: 'casalA', person: 'ela', uid: 'u-ela', platform: 'ios', updatedAt: NOW })
    const loader = createSnapshotLoader({ db, now: () => new Date(clock.t) })
    const loads = []
    const notifier = createNotifier({
      repo: createRepo({ db }),
      sender: createSender({ db, messaging }),
      now: () => new Date(clock.t),
      loadSnapshot: async (args) => {
        const out = await loader.load(args)
        loads.push(out.reads)
        return out
      },
    })
    // De 09:00 a 21:00 em Sao Paulo, de 15 em 15 minutos, como o relogio.
    for (let at = Date.parse('2026-11-18T12:00:00Z'); at < Date.parse('2026-11-19T00:00:00Z'); at += 15 * 60_000) {
      clock.t = at
      await notifier.evaluateSpontaneous({ hid: 'casalA', person: 'ele' })
      await notifier.evaluateSpontaneous({ hid: 'casalA', person: 'ela' })
    }
    assert.equal(loads.length, 6)
    assert.equal(messaging.sent.length, 6)
    t.diagnostic(`cargas=${loads.length} documentos lidos por carga=${loads.join(',')}`)
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
