// check-indexes contra o emulador. O emulador nao cobra indice: aqui so se prova que as
// consultas sao montadas e executam sem excecao; a prova real de indice e contra producao (Plano 12).
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initAdmin } from '../../scripts/lib/admin.js'
import { buildProbeQueries, runChecks } from '../../scripts/check-indexes.js'
import { resetEmulators } from './_helpers.js'

const indexesJson = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL('../../../firestore.indexes.json', import.meta.url)), 'utf8')
)
const HID = 'casal-aaaa-0001'

describe('check-indexes', () => {
  let admin
  before(async () => {
    await resetEmulators()
    admin = initAdmin()
  })
  after(async () => {
    await admin.app.delete()
  })

  test('buildProbeQueries monta uma consulta por indice composto que comeca em ownerId (13)', () => {
    const probes = buildProbeQueries(indexesJson, HID, admin.db)
    assert.equal(probes.length, 13)
    assert.ok(probes.every((p) => typeof p.query.get === 'function'))
  })

  test('runChecks no emulador: ok verdadeiro e pending vazio', async () => {
    const result = await runChecks({ db: admin.db, hid: HID, indexesJson, waitSeconds: 0 })
    assert.equal(result.ok, true)
    assert.deepEqual(result.pending, [])
    assert.equal(result.total, 13)
  })

  test('runChecks trata FAILED_PRECONDITION como pendente, repete e depois conclui', async () => {
    let calls = 0
    const failingQuery = {
      limit() {
        return this
      },
      async get() {
        calls += 1
        if (calls === 1) throw Object.assign(new Error('The query requires an index'), { code: 9 })
        return { empty: true }
      },
    }
    const fakeDb = {
      collection: () => ({ where: () => ({ where: () => ({ orderBy: () => failingQuery }), orderBy: () => failingQuery }), orderBy: () => failingQuery }),
    }
    const one = { indexes: [{ collectionGroup: 'goals', queryScope: 'COLLECTION', fields: [{ fieldPath: 'ownerId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] }] }

    const noWait = await runChecks({ db: fakeDb, hid: HID, indexesJson: one, waitSeconds: 0 })
    assert.equal(noWait.ok, false)
    assert.equal(noWait.pending.length, 1)

    calls = 0
    const slept = []
    const retried = await runChecks({ db: fakeDb, hid: HID, indexesJson: one, waitSeconds: 30, sleep: async (ms) => slept.push(ms) })
    assert.equal(retried.ok, true)
    assert.deepEqual(slept, [15000])
  })

  test('runChecks relanca erros que nao sao de indice', async () => {
    const boom = { limit() { return this }, async get() { throw Object.assign(new Error('boom'), { code: 7 }) } }
    const fakeDb = { collection: () => ({ where: () => ({ orderBy: () => boom }), orderBy: () => boom }) }
    const one = { indexes: [{ collectionGroup: 'savings', queryScope: 'COLLECTION', fields: [{ fieldPath: 'ownerId', order: 'ASCENDING' }, { fieldPath: 'date', order: 'DESCENDING' }] }] }
    await assert.rejects(runChecks({ db: fakeDb, hid: HID, indexesJson: one }), /boom/)
  })
})
