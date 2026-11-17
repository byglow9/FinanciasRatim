// verify: portao "zero documentos sem ownerId/categoryId" e contagens contra a linha de base (D-13).
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { initAdmin } from '../../scripts/lib/admin.js'
import { exportAll } from '../../scripts/export-firestore.js'
import { runVerify } from '../../scripts/verify.js'
import { resetEmulators } from './_helpers.js'

const HID = 'casal-aaaa-0001'
const SECRET = 'DESCRICAO-SECRETA-NAO-IMPRIMIR'

const DEFS = [
  { id: 'alimentacao', name: 'Alimentacao' },
  { id: 'lazer', name: 'Lazer' },
]

// Banco limpo e consistente: tudo com ownerId, categoryId onde ha texto de category, categoryDefs.
async function seedConsistent(db) {
  await db.collection('settings').doc('main').set({ ownerId: HID, categories: ['Alimentacao', 'Lazer'], categoryDefs: DEFS })
  await db.collection('transactions').doc('t1').set({ ownerId: HID, category: 'Alimentacao', categoryId: 'alimentacao', description: SECRET })
  await db.collection('transactions').doc('t2').set({ ownerId: HID, category: 'Lazer', categoryId: 'lazer', description: SECRET })
  await db.collection('fixedExpenses').doc('f1').set({ ownerId: HID, category: 'Lazer', categoryId: 'lazer' })
  await db.collection('bankImports').doc('b1').set({ ownerId: HID, category: 'Alimentacao', categoryId: 'alimentacao' })
  await db.collection('savings').doc('s1').set({ ownerId: HID, amount: 1 })
}

describe('verify', () => {
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

  test('banco limpo e consistente: ok verdadeiro com as contagens por colecao', async () => {
    await seedConsistent(admin.db)
    const result = await runVerify({ db: admin.db, hid: HID })
    assert.equal(result.ok, true)
    assert.deepEqual(result.failures, [])
    assert.deepEqual(result.collections.transactions, { count: 2, withoutOwner: 0, wrongOwner: 0, withoutCategoryId: 0 })
    assert.equal(result.collections.fixedExpenses.count, 1)
    assert.equal(result.collections.bankImports.count, 1)
    assert.equal(result.collections.savings.count, 1)
    assert.equal(result.collections.goals.count, 0)
  })

  test('documento sem ownerId falha', async () => {
    await seedConsistent(admin.db)
    await admin.db.collection('savings').doc('s2').set({ amount: 2 })
    const result = await runVerify({ db: admin.db, hid: HID })
    assert.equal(result.ok, false)
    assert.equal(result.collections.savings.withoutOwner, 1)
    assert.ok(result.failures.some((f) => f.includes('savings') && f.includes('sem ownerId')))
  })

  test('documento com ownerId diferente do hid falha', async () => {
    await seedConsistent(admin.db)
    await admin.db.collection('notes').doc('n1').set({ ownerId: 'outro-casal-9999', text: 'x' })
    const result = await runVerify({ db: admin.db, hid: HID })
    assert.equal(result.ok, false)
    assert.equal(result.collections.notes.wrongOwner, 1)
    assert.ok(result.failures.some((f) => f.includes('notes') && f.includes('ownerId diferente')))
  })

  test('documento com texto de category e sem categoryId falha nas 3 colecoes', async () => {
    for (const name of ['transactions', 'fixedExpenses', 'bankImports']) {
      await resetEmulators()
      await seedConsistent(admin.db)
      await admin.db.collection(name).doc('sem-id').set({ ownerId: HID, category: 'Lazer' })
      const result = await runVerify({ db: admin.db, hid: HID })
      assert.equal(result.ok, false, name)
      assert.equal(result.collections[name].withoutCategoryId, 1, name)
      assert.ok(result.failures.some((f) => f.includes(name) && f.includes('categoryId')), name)
    }
  })

  test('settings/main sem categoryDefs falha', async () => {
    await seedConsistent(admin.db)
    await admin.db.collection('settings').doc('main').set({ ownerId: HID, categories: ['Alimentacao'] })
    const result = await runVerify({ db: admin.db, hid: HID })
    assert.equal(result.ok, false)
    assert.ok(result.failures.some((f) => f.includes('categoryDefs')))
  })

  test('colecao desconhecida tambem e falha', async () => {
    await seedConsistent(admin.db)
    await admin.db.collection('colecaoNova').doc('x').set({ ownerId: HID })
    const result = await runVerify({ db: admin.db, hid: HID })
    assert.equal(result.ok, false)
    assert.ok(result.failures.some((f) => f.includes('colecaoNova')))
  })

  test('baseline: falha se a contagem ficou menor; aceita snapshot do backup e objeto de contagens', async () => {
    await seedConsistent(admin.db)
    const snapshot = await exportAll(admin.db)

    // igual a linha de base: passa
    assert.equal((await runVerify({ db: admin.db, hid: HID, baseline: snapshot })).ok, true)
    assert.equal((await runVerify({ db: admin.db, hid: HID, baseline: { transactions: 2, savings: 1 } })).ok, true)

    // linha de base maior que o banco: falha
    const menor = await runVerify({ db: admin.db, hid: HID, baseline: { transactions: 3 } })
    assert.equal(menor.ok, false)
    assert.ok(menor.failures.some((f) => f.includes('transactions') && f.includes('menor')))

    // snapshot com um documento a mais que o banco: falha
    const extra = structuredClone(snapshot)
    extra.collections.goals = [{ id: 'g1', data: { ownerId: HID } }]
    assert.equal((await runVerify({ db: admin.db, hid: HID, baseline: extra })).ok, false)
  })

  test('strict exige igualdade: banco com mais documentos que a linha de base falha so no estrito', async () => {
    await seedConsistent(admin.db)
    const snapshot = await exportAll(admin.db)
    await admin.db.collection('savings').doc('s9').set({ ownerId: HID, amount: 9 })

    assert.equal((await runVerify({ db: admin.db, hid: HID, baseline: snapshot, strict: false })).ok, true)
    const estrito = await runVerify({ db: admin.db, hid: HID, baseline: snapshot, strict: true })
    assert.equal(estrito.ok, false)
    assert.ok(estrito.failures.some((f) => f.includes('savings') && f.includes('igual')))

    // igualdade exata passa no estrito
    await admin.db.collection('savings').doc('s9').delete()
    assert.equal((await runVerify({ db: admin.db, hid: HID, baseline: snapshot, strict: true })).ok, true)
  })

  test('strict sem baseline e erro de uso', async () => {
    await seedConsistent(admin.db)
    await assert.rejects(runVerify({ db: admin.db, hid: HID, strict: true }), /baseline/)
  })

  test('as mensagens de falha nao carregam dados financeiros', async () => {
    await seedConsistent(admin.db)
    await admin.db.collection('transactions').doc('t9').set({ category: 'Lazer', description: SECRET })
    const result = await runVerify({ db: admin.db, hid: HID })
    assert.equal(result.ok, false)
    assert.ok(result.failures.length > 0)
    assert.ok(!JSON.stringify(result).includes(SECRET))
  })
})
