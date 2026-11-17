// Ensaio completo da migracao no emulador a partir de um backup (D-13, usado no Plano 10).
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { exportAll } from '../../scripts/export-firestore.js'
import { runRehearsal } from '../../scripts/rehearsal.js'
import { runVerify } from '../../scripts/verify.js'
import { resetEmulators } from './_helpers.js'

const HID = 'casal-aaaa-0001'
const CREATED = Timestamp.fromDate(new Date('2026-10-05T12:00:00Z'))

async function seed(db, { withSettings = true } = {}) {
  if (withSettings) {
    await db.collection('settings').doc('main').set({ categories: ['Alimentacao', 'Lazer'] })
  }
  const tx = db.collection('transactions')
  await tx.doc('t1').set({ category: 'Alimentacao', description: 'Mercado', amount: 10, createdAt: CREATED })
  await tx.doc('t2').set({ category: 'alimentação ', description: 'Padaria', amount: 5, createdAt: CREATED })
  await tx.doc('t3').set({ category: 'Pets', description: 'Racao', amount: 40, createdAt: CREATED })
  await db.collection('fixedExpenses').doc('f1').set({ category: 'Lazer', description: 'Streaming', amount: 20 })
  await db.collection('bankImports').doc('b1').set({ category: 'Alimentacao', description: 'Restaurante', amount: 50 })
  await db.collection('savings').doc('s1').set({ amount: 1 })
}

describe('rehearsal', () => {
  let admin
  let dir

  before(() => {
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearsal-'))
  })

  after(async () => {
    fs.rmSync(dir, { recursive: true, force: true })
    await admin.app.delete()
  })

  beforeEach(async () => {
    await resetEmulators()
  })

  // Gera o backup a partir de dados semeados, limpa o emulador e devolve o caminho do JSON.
  async function makeBackup(opts) {
    await seed(admin.db, opts)
    const snapshot = await exportAll(admin.db)
    const file = path.join(dir, `backup-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
    fs.writeFileSync(file, JSON.stringify(snapshot), { mode: 0o600 })
    await resetEmulators()
    return file
  }

  test('ciclo completo: importa, dry-run escreve 0, apply preenche, verify estrito passa, 2a rodada escreve 0', async () => {
    const backupPath = await makeBackup()
    const lines = []
    const out = await runRehearsal({ db: admin.db, backupPath, hid: HID, log: (l) => lines.push(l) })

    assert.equal(out.ok, true, lines.join('\n'))
    assert.ok(!lines.some((l) => l.startsWith('MISMATCH')), lines.join('\n'))

    // tabela antes e depois, uma linha por colecao
    const byName = Object.fromEntries(out.tabela.map((r) => [r.collection, r]))
    assert.equal(byName.transactions.before, 3)
    assert.equal(byName.transactions.after, 3)
    assert.equal(byName.transactions.withoutOwner, 0)
    assert.equal(byName.settings.before, 1)
    assert.equal(byName.savings.after, 1)
    assert.ok(lines.some((l) => l.includes('transactions') && l.includes('3')))

    // estado final: verify passa de verdade
    const verified = await runVerify({ db: admin.db, hid: HID })
    assert.equal(verified.ok, true, verified.failures.join('\n'))
  })

  test('o ensaio nao imprime dados financeiros', async () => {
    const backupPath = await makeBackup()
    const lines = []
    await runRehearsal({ db: admin.db, backupPath, hid: HID, log: (l) => lines.push(l) })
    const joined = lines.join('\n')
    for (const secret of ['Mercado', 'Padaria', 'Racao', 'Streaming', 'Restaurante']) {
      assert.ok(!joined.includes(secret), `vazou ${secret}`)
    }
  })

  test('divergencia vira MISMATCH e ok falso (backup sem settings/main)', async () => {
    const backupPath = await makeBackup({ withSettings: false })
    const lines = []
    const out = await runRehearsal({ db: admin.db, backupPath, hid: HID, log: (l) => lines.push(l) })
    assert.equal(out.ok, false)
    assert.ok(lines.some((l) => l.startsWith('MISMATCH')), lines.join('\n'))
  })

  test('recusa rodar sem emulador', async () => {
    const backupPath = await makeBackup()
    const saved = process.env.FIRESTORE_EMULATOR_HOST
    delete process.env.FIRESTORE_EMULATOR_HOST
    try {
      await assert.rejects(runRehearsal({ db: admin.db, backupPath, hid: HID, log: () => {} }), /emulador/i)
    } finally {
      process.env.FIRESTORE_EMULATOR_HOST = saved
    }
  })

  test('recusa rodar com o emulador ja contendo dados', async () => {
    const backupPath = await makeBackup()
    await admin.db.collection('notes').doc('sobra').set({ a: 1 })
    await assert.rejects(runRehearsal({ db: admin.db, backupPath, hid: HID, log: () => {} }), /vazio/i)
  })
})
