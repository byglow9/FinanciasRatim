// Backfill de ownerId e categoryId (FUND-02, FUND-05, D-13) contra o emulador.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { exportAll, countsOf } from '../../scripts/export-firestore.js'
import { KNOWN_COLLECTIONS, runBackfill } from '../../scripts/backfill.js'
import { resetEmulators } from './_helpers.js'

const HID = 'casal-aaaa-0001'
const CREATED = Timestamp.fromDate(new Date('2026-10-05T12:00:00Z'))

// Semeia as 12 colecoes conhecidas, sem ownerId.
async function seed(db) {
  await db.collection('settings').doc('main').set({ categories: ['Alimentacao', 'Lazer'], theme: 'claro' })
  const tx = db.collection('transactions')
  await tx.doc('t1').set({ category: 'Alimentacao', description: 'Mercado', amount: 10, createdAt: CREATED })
  await tx.doc('t2').set({ category: 'alimentação ', description: 'Padaria', amount: 5, createdAt: CREATED })
  await tx.doc('t3').set({ category: 'Lazer', description: 'Cinema', amount: 30, createdAt: CREATED })
  await tx.doc('t4').set({ category: 'Pets', description: 'Racao', amount: 40, createdAt: CREATED })
  await db.collection('fixedExpenses').doc('f1').set({ category: 'Lazer', description: 'Streaming', amount: 20 })
  await db.collection('bankImports').doc('b1').set({ category: 'Alimentacao', description: 'Restaurante', amount: 50 })
  for (const name of [
    'savings',
    'events',
    'goals',
    'eventCategories',
    'notes',
    'fixedExpensePayments',
    'goalContributions',
    'bankConnections',
  ]) {
    await db.collection(name).doc(`${name}-1`).set({ label: name })
  }
}

const sumOf = (report, field) =>
  Object.values(report.collections).reduce((acc, c) => acc + c[field], 0)

describe('backfill', () => {
  let admin

  before(() => {
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
  })

  after(async () => {
    await admin.app.delete()
  })

  beforeEach(async () => {
    await resetEmulators()
  })

  test('KNOWN_COLLECTIONS tem as 12 colecoes do app', () => {
    assert.deepEqual(
      [...KNOWN_COLLECTIONS].sort(),
      [
        'bankConnections',
        'bankImports',
        'eventCategories',
        'events',
        'fixedExpensePayments',
        'fixedExpenses',
        'goalContributions',
        'goals',
        'notes',
        'savings',
        'settings',
        'transactions',
      ]
    )
  })

  test('dry-run: escreve 0 documentos, devolve toWrite por colecao e nao altera o emulador', async () => {
    const { db } = admin
    await seed(db)
    const before = await exportAll(db)

    const report = await runBackfill({ db, hid: HID, apply: false })

    assert.equal(report.apply, false)
    assert.equal(report.hid, HID)
    assert.equal(sumOf(report, 'written'), 0)
    assert.equal(report.collections.transactions.toWrite, 4)
    assert.equal(report.collections.fixedExpenses.toWrite, 1)
    assert.equal(report.collections.bankImports.toWrite, 1)
    assert.equal(report.collections.settings.toWrite, 1)
    assert.equal(report.collections.savings.toWrite, 1)
    assert.deepEqual(report.categoryDefsAdded, ['Pets'])
    assert.deepEqual(report.conflicts, [])
    assert.deepEqual(report.errors, [])

    const after = await exportAll(db)
    assert.deepEqual(after.collections, before.collections)
  })

  test('apply: ownerId em tudo, categoryId nas 3 colecoes, orfao vira definicao arquivada, nada existente muda', async () => {
    const { db } = admin
    await seed(db)
    const before = await exportAll(db)

    const report = await runBackfill({ db, hid: HID, apply: true })
    assert.deepEqual(report.errors, [])
    assert.deepEqual(report.conflicts, [])
    assert.equal(sumOf(report, 'written'), sumOf(report, 'toWrite'))
    assert.ok(sumOf(report, 'written') > 0)

    const after = await exportAll(db)
    // todo documento tem ownerId igual ao hid
    for (const [name, docs] of Object.entries(after.collections)) {
      for (const { id, data } of docs) {
        assert.equal(data.ownerId, HID, `${name}/${id} sem ownerId`)
      }
    }

    // categoryId: os dois textos de Alimentacao viram alimentacao; Pets ganha id novo
    const txById = Object.fromEntries(after.collections.transactions.map((d) => [d.id, d.data]))
    assert.equal(txById.t1.categoryId, 'alimentacao')
    assert.equal(txById.t2.categoryId, 'alimentacao')
    assert.equal(txById.t3.categoryId, 'lazer')
    assert.equal(txById.t4.categoryId, 'pets')
    const fixed = after.collections.fixedExpenses[0].data
    assert.equal(fixed.categoryId, 'lazer')
    const imp = after.collections.bankImports[0].data
    assert.equal(imp.categoryId, 'alimentacao')
    // colecoes sem texto de category nao ganham categoryId
    assert.equal(after.collections.savings[0].data.categoryId, undefined)

    // settings/main: categoryDefs criadas, categories intacto
    const settings = after.collections.settings[0].data
    assert.deepEqual(settings.categories, ['Alimentacao', 'Lazer'])
    const defs = Object.fromEntries(settings.categoryDefs.map((d) => [d.id, d]))
    assert.equal(defs.alimentacao.name, 'Alimentacao')
    assert.equal(defs.alimentacao.color, '#f97316')
    assert.equal(defs.lazer.name, 'Lazer')
    assert.equal(defs.pets.name, 'Pets')
    assert.equal(defs.pets.archived, true)
    assert.notEqual(defs.alimentacao.archived, true)

    // nada existente mudou: tirando os campos acrescentados, o documento e identico ao de antes
    const added = new Set(['ownerId', 'categoryId', 'categoryDefs'])
    for (const [name, docs] of Object.entries(before.collections)) {
      const afterById = Object.fromEntries(after.collections[name].map((d) => [d.id, d.data]))
      for (const { id, data } of docs) {
        const stripped = Object.fromEntries(Object.entries(afterById[id]).filter(([k]) => !added.has(k)))
        assert.deepEqual(stripped, data, `${name}/${id} foi alterado`)
      }
    }
    // texto de category e createdAt identicos, explicitamente
    assert.equal(txById.t2.category, 'alimentação ')
    assert.deepEqual(txById.t1.createdAt, { __ts: true, seconds: CREATED.seconds, nanoseconds: 0 })
    assert.equal(txById.t1.description, 'Mercado')
  })

  test('contagens antes e depois por colecao sao iguais', async () => {
    const { db } = admin
    await seed(db)
    const snapshot = await exportAll(db)
    const expected = countsOf(snapshot)

    const report = await runBackfill({ db, hid: HID, apply: true })
    for (const name of KNOWN_COLLECTIONS) {
      const c = report.collections[name]
      assert.equal(c.before, expected[name] ?? 0, `before de ${name}`)
      assert.equal(c.after, c.before, `after de ${name}`)
    }
  })

  test('segunda rodada com apply escreve 0 (idempotente)', async () => {
    const { db } = admin
    await seed(db)
    await runBackfill({ db, hid: HID, apply: true })
    const mid = await exportAll(db)

    const second = await runBackfill({ db, hid: HID, apply: true })
    assert.equal(sumOf(second, 'toWrite'), 0)
    assert.equal(sumOf(second, 'written'), 0)
    assert.deepEqual(second.categoryDefsAdded, [])
    assert.deepEqual(second.errors, [])

    const end = await exportAll(db)
    assert.deepEqual(end.collections, mid.collections)
  })

  test('colecao fora das 12 conhecidas faz falhar antes de qualquer escrita', async () => {
    const { db } = admin
    await seed(db)
    await db.collection('colecaoNova').doc('x').set({ a: 1 })
    const before = await exportAll(db)

    await assert.rejects(runBackfill({ db, hid: HID, apply: true }), /colecaoNova/)

    const after = await exportAll(db)
    assert.deepEqual(after.collections, before.collections)
  })

  test('settings/main ausente faz falhar antes de qualquer escrita', async () => {
    const { db } = admin
    await seed(db)
    await db.collection('settings').doc('main').delete()
    const before = await exportAll(db)

    await assert.rejects(runBackfill({ db, hid: HID, apply: true }), /settings\/main/)

    const after = await exportAll(db)
    assert.deepEqual(after.collections, before.collections)
  })

  test('hid invalido e recusado', async () => {
    await assert.rejects(runBackfill({ db: admin.db, hid: 'curto', apply: false }), /hid invalido/)
  })

  test('documento com ownerId diferente do hid nao e alterado e aparece em conflicts', async () => {
    const { db } = admin
    await seed(db)
    await db.collection('transactions').doc('alheio').set({
      ownerId: 'outro-casal-9999',
      category: 'Lazer',
      description: 'De outro',
    })
    const report = await runBackfill({ db, hid: HID, apply: true })

    assert.deepEqual(report.conflicts, [{ collection: 'transactions', id: 'alheio', ownerId: 'outro-casal-9999' }])
    const alheio = (await db.collection('transactions').doc('alheio').get()).data()
    assert.deepEqual(alheio, { ownerId: 'outro-casal-9999', category: 'Lazer', description: 'De outro' })
    // os demais documentos do casal foram preenchidos normalmente
    const t1 = (await db.collection('transactions').doc('t1').get()).data()
    assert.equal(t1.ownerId, HID)
    assert.equal(t1.categoryId, 'alimentacao')
  })

  test('categoryDefs ja existentes sao respeitadas e so recebem orfaos novos', async () => {
    const { db } = admin
    await seed(db)
    await db.collection('settings').doc('main').set({
      categories: ['Alimentacao', 'Lazer'],
      categoryDefs: [
        { id: 'comida', name: 'Alimentacao' },
        { id: 'diversao', name: 'Lazer' },
      ],
    })
    await runBackfill({ db, hid: HID, apply: true })

    const t1 = (await db.collection('transactions').doc('t1').get()).data()
    assert.equal(t1.categoryId, 'comida')
    const settings = (await db.collection('settings').doc('main').get()).data()
    assert.deepEqual(
      settings.categoryDefs.map((d) => d.id),
      ['comida', 'diversao', 'pets']
    )
  })
})
