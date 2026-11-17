// Sync bancaria com ownerId e categoryId (FUND-04, FUND-05, D-07, D-09) contra o emulador,
// com a Pluggy falsa. Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { cleanExistingDescriptions, syncAll, syncConnection } from '../../src/sync.js'
import { resetEmulators } from './_helpers.js'

const HID_A = 'casal-aaaa-0001'
const HID_B = 'casal-bbbb-0002'
const DAY_MS = 24 * 60 * 60 * 1000

// Datas relativas ao relogio do teste (hora 15 UTC: nao e meia-noite UTC).
const daysAgo = (n) => {
  const d = new Date(Date.now() - n * DAY_MS)
  d.setUTCHours(15, 0, 0, 0)
  return d
}

// Pluggy falsa: cada item tem uma conta e uma lista de lancamentos.
function fakePluggy(itemsById, { onFetchItem } = {}) {
  return {
    async fetchItem(itemId) {
      if (onFetchItem) await onFetchItem(itemId)
      return { id: itemId, status: 'UPDATED', connector: { name: 'Banco Falso', imageUrl: null } }
    },
    async fetchAccounts(itemId) {
      return { results: [{ id: `acc-${itemId}`, type: 'BANK', name: 'Conta' }] }
    },
    async fetchAllTransactions(accountId) {
      return itemsById[accountId.replace('acc-', '')] ?? []
    },
    async fetchCategories() {
      return { results: [] }
    },
  }
}

const bankTx = (id, description, extra = {}) => ({
  id,
  description,
  amount: -25.5,
  type: 'DEBIT',
  status: 'POSTED',
  date: daysAgo(2).toISOString(),
  category: 'Restaurants',
  ...extra,
})

describe('sync com dono', () => {
  let admin
  let db

  before(() => {
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
  })

  after(async () => {
    await admin.app.delete()
  })

  beforeEach(async () => {
    await resetEmulators()
  })

  const seedConnection = (itemId, ownerId, person = 'ele') =>
    db
      .collection('bankConnections')
      .doc(itemId)
      .set({
        itemId,
        ...(ownerId ? { ownerId } : {}),
        person,
        importFrom: Timestamp.fromDate(daysAgo(30)),
      })

  const countOf = async (name) => (await db.collection(name).get()).size

  test('syncAll com hid importa so as conexoes do hid, com ownerId e categoryId', async () => {
    await seedConnection('itemA', HID_A)
    await seedConnection('itemB', HID_B)
    const pluggy = fakePluggy({
      itemA: [bankTx('txA1', 'RESTAURANTE SABOR')],
      itemB: [bankTx('txB1', 'LANCHONETE OUTRO')],
    })

    const results = await syncAll(db, pluggy, { hid: HID_A })
    assert.equal(results.length, 1)
    assert.equal(results[0].itemId, 'itemA')

    const imp = await db.collection('bankImports').doc('txA1').get()
    assert.equal(imp.data().ownerId, HID_A)
    assert.equal(imp.data().categoryId, 'alimentacao')
    assert.equal(imp.data().category, 'Alimentacao')
    const tx = await db.collection('transactions').doc('bank_txA1').get()
    assert.equal(tx.data().ownerId, HID_A)
    assert.equal(tx.data().categoryId, 'alimentacao')
    assert.equal(tx.data().category, 'Alimentacao')

    assert.equal((await db.collection('bankImports').doc('txB1').get()).exists, false)
    assert.equal((await db.collection('transactions').doc('bank_txB1').get()).exists, false)
  })

  test('syncAll sem hid (agendador) sincroniza as duas conexoes, cada uma com o seu dono', async () => {
    await seedConnection('itemA', HID_A)
    await seedConnection('itemB', HID_B)
    const pluggy = fakePluggy({
      itemA: [bankTx('txA1', 'RESTAURANTE SABOR')],
      itemB: [bankTx('txB1', 'LANCHONETE OUTRO')],
    })

    const results = await syncAll(db, pluggy)
    assert.equal(results.length, 2)
    assert.equal((await db.collection('bankImports').doc('txA1').get()).data().ownerId, HID_A)
    assert.equal((await db.collection('bankImports').doc('txB1').get()).data().ownerId, HID_B)
    assert.equal((await db.collection('transactions').doc('bank_txB1').get()).data().ownerId, HID_B)
  })

  test('conexao sem ownerId vira erro registrado e nenhuma escrita de dados', async () => {
    await seedConnection('itemX', null)
    const pluggy = fakePluggy({ itemX: [bankTx('txX1', 'RESTAURANTE SEM DONO')] })

    const results = await syncAll(db, pluggy)
    assert.equal(results.length, 1)
    assert.ok(results[0].error, 'summary.error deve estar preenchido')
    const conn = (await db.collection('bankConnections').doc('itemX').get()).data()
    assert.ok(conn.lastSyncError)
    assert.equal(await countOf('bankImports'), 0)
    assert.equal(await countOf('transactions'), 0)

    const direct = await syncConnection(db, pluggy, { itemId: 'itemX', person: 'ele' })
    assert.ok(direct.error)
    assert.equal(await countOf('bankImports'), 0)
  })

  test('definicao renomeada: importa com categoryId estavel e o nome atual', async () => {
    await db
      .collection('settings')
      .doc('main')
      .set({
        ownerId: HID_A,
        categoryDefs: [
          { id: 'alimentacao', name: 'Comida' },
          { id: 'lazer', name: 'Lazer' },
          { id: 'outros', name: 'Outros' },
        ],
      })
    await seedConnection('itemA', HID_A)
    await seedConnection('itemB', HID_B)
    const pluggy = fakePluggy({
      itemA: [bankTx('txA1', 'RESTAURANTE SABOR')],
      itemB: [bankTx('txB1', 'RESTAURANTE OUTRO')],
    })

    await syncAll(db, pluggy)
    const a = (await db.collection('transactions').doc('bank_txA1').get()).data()
    assert.equal(a.categoryId, 'alimentacao')
    assert.equal(a.category, 'Comida')
    // settings/main e de outro casal: o casal B usa as definicoes padrao.
    const b = (await db.collection('transactions').doc('bank_txB1').get()).data()
    assert.equal(b.categoryId, 'alimentacao')
    assert.equal(b.category, 'Alimentacao')
  })

  test('aprende a categoria por categoryId e ignora categoria arquivada ou desconhecida', async () => {
    await db
      .collection('settings')
      .doc('main')
      .set({
        ownerId: HID_A,
        categoryDefs: [
          { id: 'alimentacao', name: 'Alimentacao' },
          { id: 'lazer', name: 'Diversao' },
          { id: 'velha', name: 'Velha', archived: true },
          { id: 'outros', name: 'Outros' },
        ],
      })
    const learnedTx = (id, description, categoryId, ownerId = HID_A) =>
      db.collection('transactions').doc(id).set({
        ownerId,
        person: 'ele',
        source: 'bank',
        type: 'saida',
        amount: 1,
        description,
        bankDescription: description,
        category: 'texto antigo',
        categoryId,
        date: Timestamp.fromDate(daysAgo(5)),
      })
    await learnedTx('old1', 'Cinema Alfa', 'lazer')
    await learnedTx('old2', 'Loja Velha', 'velha')
    await learnedTx('old3', 'Loja Fantasma', 'nao-existe')
    // Mesma descricao no casal B nao ensina o casal A.
    await learnedTx('old4', 'Padaria Beta', 'lazer', HID_B)
    await seedConnection('itemA', HID_A)
    const pluggy = fakePluggy({
      itemA: [
        bankTx('n1', 'CINEMA ALFA'),
        bankTx('n2', 'LOJA VELHA'),
        bankTx('n3', 'LOJA FANTASMA'),
        bankTx('n4', 'PADARIA BETA'),
      ],
    })

    await syncAll(db, pluggy, { hid: HID_A })
    const get = async (id) => (await db.collection('transactions').doc(`bank_${id}`).get()).data()
    const n1 = await get('n1')
    assert.equal(n1.categoryId, 'lazer')
    assert.equal(n1.category, 'Diversao', 'nome sempre o da definicao atual')
    for (const id of ['n2', 'n3', 'n4']) {
      const d = await get(id)
      assert.equal(d.categoryId, 'alimentacao', `${id} cai na regra da Pluggy`)
    }
  })

  test('cleanExistingDescriptions so altera documentos do hid e exige hid', async () => {
    const seed = async (id, ownerId) => {
      await db.collection('bankImports').doc(id).set({
        ownerId,
        person: 'ele',
        description: 'PIX QR CODE DINAMICO - DES: UBER DO BRASIL',
        originalDescription: 'PIX QR CODE DINAMICO - DES: UBER DO BRASIL',
      })
      await db.collection('transactions').doc(`bank_${id}`).set({
        ownerId,
        person: 'ele',
        source: 'bank',
        description: 'PIX QR CODE DINAMICO - DES: UBER DO BRASIL',
        bankDescription: 'PIX QR CODE DINAMICO - DES: UBER DO BRASIL',
        originalDescription: 'PIX QR CODE DINAMICO - DES: UBER DO BRASIL',
      })
    }
    await seed('i1', HID_A)
    await seed('i2', HID_B)

    await assert.rejects(cleanExistingDescriptions(db), /hid/)
    await assert.rejects(cleanExistingDescriptions(db, ''), /hid/)

    const out = await cleanExistingDescriptions(db, HID_A)
    assert.equal(out.transactions, 1)
    const a = (await db.collection('transactions').doc('bank_i1').get()).data()
    assert.equal(a.description, 'Uber do Brasil')
    assert.equal((await db.collection('bankImports').doc('i1').get()).data().description, 'Uber do Brasil')
    const b = (await db.collection('transactions').doc('bank_i2').get()).data()
    assert.equal(b.description, 'PIX QR CODE DINAMICO - DES: UBER DO BRASIL')
    assert.equal(
      (await db.collection('bankImports').doc('i2').get()).data().description,
      'PIX QR CODE DINAMICO - DES: UBER DO BRASIL'
    )
  })

  test('execucoes simultaneas: nunca duas conexoes ao mesmo tempo e a mesma chave compartilha', async () => {
    await seedConnection('itemA', HID_A)
    await seedConnection('itemB', HID_B)
    let active = 0
    let maxActive = 0
    const pluggy = fakePluggy(
      { itemA: [bankTx('txA1', 'RESTAURANTE SABOR')], itemB: [bankTx('txB1', 'LANCHONETE OUTRO')] },
      {
        onFetchItem: async () => {
          active++
          maxActive = Math.max(maxActive, active)
          await new Promise((r) => setTimeout(r, 50))
          active--
        },
      }
    )

    const pA1 = syncAll(db, pluggy, { hid: HID_A })
    const pA2 = syncAll(db, pluggy, { hid: HID_A })
    const pB = syncAll(db, pluggy, { hid: HID_B })
    const pAll = syncAll(db, pluggy)
    assert.equal(pA1, pA2, 'mesma chave compartilha a execucao')
    const [a, , b, all] = await Promise.all([pA1, pA2, pB, pAll])
    assert.equal(a.length, 1)
    assert.equal(b.length, 1)
    assert.equal(all.length, 2)
    assert.equal(maxActive, 1, 'no maximo uma conexao em processamento')
    await assert.rejects(syncAll(db, pluggy, { hid: '' }), /hid/)
  })
})
