// Backup e restauracao por JSON (D-13): exportAll -> limpar -> importAll contra o emulador.
// Rodar: npm run test:emu
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import { Timestamp, GeoPoint } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { exportAll, importAll, countsOf, assertSafeOutPath } from '../../scripts/export-firestore.js'
import { resetEmulators } from './_helpers.js'

describe('export-firestore', () => {
  let admin

  before(async () => {
    await resetEmulators()
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
  })

  after(async () => {
    await admin.app.delete()
  })

  test('exportAll enumera coleções (inclusive desconhecida) e countsOf conta documentos', async () => {
    await resetEmulators()
    const { db } = admin
    await db.collection('transactions').doc('t1').set({ amount: 10 })
    await db.collection('transactions').doc('t2').set({ amount: 20 })
    await db.collection('colecaoDesconhecida').doc('x1').set({ a: 1 })

    const snapshot = await exportAll(db)
    assert.equal(snapshot.meta.version, 1)
    assert.equal(typeof snapshot.meta.exportedAt, 'string')
    assert.deepEqual(Object.keys(snapshot.collections).sort(), ['colecaoDesconhecida', 'transactions'])
    assert.deepEqual(countsOf(snapshot), { colecaoDesconhecida: 1, transactions: 2 })
    assert.deepEqual(
      snapshot.collections.transactions.map((d) => d.id).sort(),
      ['t1', 't2']
    )
  })

  test('ciclo exportAll, limpar, importAll preserva Timestamp com nanosegundos e estruturas aninhadas', async () => {
    await resetEmulators()
    const { db } = admin
    // O Firestore guarda Timestamp com precisao de microssegundo (trunca abaixo disso): usar o maximo preservavel.
    const original = {
      date: new Timestamp(1_700_000_000, 123_456_000),
      createdAt: Timestamp.fromDate(new Date('2026-11-01T03:00:00Z')),
      amount: 12.34,
      active: true,
      nothing: null,
      tags: ['a', 'b', 3, { deep: new Timestamp(5, 7_000) }],
      nested: { level1: { level2: { n: 1, list: [{ a: [1, 2] }, { a: [3] }] } } },
      text: 'alimentação ',
    }
    await db.collection('transactions').doc('ciclo').set(original)
    await db.collection('settings').doc('main').set({ categories: ['Alimentacao', 'Lazer'] })

    const snapshot = await exportAll(db)
    // o snapshot tem de sobreviver a JSON (e nao conter Timestamp cru)
    const wire = JSON.parse(JSON.stringify(snapshot))

    await resetEmulators()
    const empty = await db.collection('transactions').get()
    assert.equal(empty.size, 0)

    await importAll(db, wire)

    const back = await db.collection('transactions').doc('ciclo').get()
    assert.ok(back.exists)
    const data = back.data()
    assert.ok(data.date instanceof Timestamp)
    assert.equal(data.date.seconds, 1_700_000_000)
    assert.equal(data.date.nanoseconds, 123_456_000)
    assert.deepEqual(data, original)
    const settings = await db.collection('settings').doc('main').get()
    assert.deepEqual(settings.data(), { categories: ['Alimentacao', 'Lazer'] })
  })

  test('tipo nao suportado (referencia de documento, GeoPoint) lanca erro claro', async () => {
    await resetEmulators()
    const { db } = admin
    await db.collection('notes').doc('n1').set({ ref: db.collection('notes').doc('outro') })
    await assert.rejects(exportAll(db), /Tipo nao suportado no backup/)

    await resetEmulators()
    await db.collection('notes').doc('n2').set({ where: new GeoPoint(1, 2) })
    await assert.rejects(exportAll(db), /Tipo nao suportado no backup/)
  })

  test('importAll lanca erro quando FIRESTORE_EMULATOR_HOST nao esta definido', async () => {
    const saved = process.env.FIRESTORE_EMULATOR_HOST
    delete process.env.FIRESTORE_EMULATOR_HOST
    try {
      await assert.rejects(
        importAll(admin.db, { meta: { version: 1 }, collections: { transactions: [{ id: 'x', data: { a: 1 } }] } }),
        /emulador/i
      )
    } finally {
      process.env.FIRESTORE_EMULATOR_HOST = saved
    }
    const check = await admin.db.collection('transactions').doc('x').get()
    assert.equal(check.exists, false)
  })

  test('importAll recusa snapshot de versao desconhecida', async () => {
    await assert.rejects(importAll(admin.db, { meta: { version: 99 }, collections: {} }), /versao/i)
  })

  test('assertSafeOutPath aceita backups/ e pastas fora do repositorio e recusa o resto do repositorio', () => {
    const repo = path.resolve(import.meta.dirname, '..', '..', '..')
    assert.doesNotThrow(() => assertSafeOutPath(path.join(repo, 'backups', 'a.json')))
    assert.doesNotThrow(() => assertSafeOutPath(path.join(os.tmpdir(), 'a.json')))
    assert.throws(() => assertSafeOutPath(path.join(repo, 'server', 'a.json')), /backups/)
    assert.throws(() => assertSafeOutPath(path.join(repo, 'a.json')), /backups/)
    assert.throws(() => assertSafeOutPath(path.join(repo, 'backups', '..', 'src', 'a.json')), /backups/)
  })
})
