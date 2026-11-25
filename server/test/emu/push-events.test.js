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
})
