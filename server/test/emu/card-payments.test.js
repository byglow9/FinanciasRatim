// Pagamento da fatura (CARD-04, CARD-06, D-05) contra o emulador, com a Pluggy falsa. Dados
// simulados: nenhuma rede, nenhuma credencial.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { syncConnection } from '../../src/sync.js'
import { ownerHasCard, reconcileCardPayments } from '../../src/card-payments.js'
import { reclassifyCardPayments, runReclassify } from '../../scripts/reclassify-card-payments.js'
import { resetEmulators } from './_helpers.js'

const HID = 'casal-aaaa-0001'
const OTHER = 'casal-bbbb-0002'
const DAY_MS = 24 * 60 * 60 * 1000
const ts = (iso) => Timestamp.fromDate(new Date(iso))

// Item bancario SEM conta CREDIT (o Bradesco): so uma conta BANK com o pagamento da fatura.
function bankOnlyPluggy(txs) {
  return {
    async fetchItem(itemId) {
      return { id: itemId, status: 'UPDATED', connector: { name: 'Bradesco', imageUrl: null } }
    },
    async fetchAccounts() {
      return { results: [{ id: 'acc-bradesco', type: 'BANK', name: 'Conta Corrente', balance: 900 }] }
    },
    async fetchAllTransactions() {
      return txs
    },
    async fetchCategories() {
      return { results: [] }
    },
  }
}

const payTx = (over = {}) => ({
  id: 'tx-pay-1',
  description: 'PAGAMENTO DE FATURA NUBANK',
  amount: -181.41,
  type: 'DEBIT',
  status: 'POSTED',
  date: new Date(Date.now() - 2 * DAY_MS).toISOString(),
  category: 'Credit card payment',
  ...over,
})

const connection = (extra = {}) => ({
  itemId: 'item-bradesco',
  ownerId: HID,
  person: 'ela',
  importFrom: Timestamp.fromDate(new Date(Date.now() - 30 * DAY_MS)),
  ...extra,
})

describe('pagamento da fatura', () => {
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

  const seedCard = (over = {}, id = 'acc-credit', ownerId = HID) =>
    db
      .collection('cards')
      .doc(id)
      .set({ ownerId, person: 'ela', itemId: 'item-nubank', accountId: id, billTotals: { '2026-12': 18141 }, ...over })

  test('item sem conta CREDIT do dono que tem cartao em outro item importa o pagamento como transferencia', async () => {
    await seedCard()
    const summary = await syncConnection(db, bankOnlyPluggy([payTx()]), connection())
    assert.equal(summary.error, undefined)
    assert.equal(summary.imported, 1)

    const tx = (await db.collection('transactions').doc('bank_tx-pay-1').get()).data()
    assert.equal(tx.transfer, true)
    assert.equal(tx.cardKind, 'payment')
    assert.equal(tx.type, 'saida')
    assert.equal(tx.ownerId, HID)
    const imp = (await db.collection('bankImports').doc('tx-pay-1').get()).data()
    assert.equal(imp.status, 'imported')
    assert.equal(imp.cardKind, 'payment')
    assert.equal(imp.transfer, true)
  })

  test('dono sem nenhum cartao importa o mesmo texto como saida comum', async () => {
    const summary = await syncConnection(db, bankOnlyPluggy([payTx()]), connection())
    assert.equal(summary.imported, 1)
    const tx = (await db.collection('transactions').doc('bank_tx-pay-1').get()).data()
    assert.equal(tx.transfer, undefined)
    assert.equal(tx.cardKind, undefined)
    assert.equal(tx.type, 'saida')
  })

  test('ownerHasCard nunca enxerga o cartao de outro casal', async () => {
    await seedCard({}, 'acc-outro', OTHER)
    assert.equal(await ownerHasCard(db, HID), false)
    assert.equal(await ownerHasCard(db, OTHER), true)
    await assert.rejects(() => ownerHasCard(db, ''), /ownerId/)

    // o cartao do outro casal tambem nao muda a importacao deste dono
    await syncConnection(db, bankOnlyPluggy([payTx()]), connection())
    const tx = (await db.collection('transactions').doc('bank_tx-pay-1').get()).data()
    assert.equal(tx.cardKind, undefined)
  })

  test('cards.payments traz o pagamento ligado a fatura (valor exato) e a mesma operacao nos dois lados conta uma vez', async () => {
    await seedCard()
    const at = new Date(Date.now() - 2 * DAY_MS)
    // o mesmo pagamento visto no cartao (credito) e na conta (debito)
    await db.collection('bankImports').doc('card-credit-1').set({
      ownerId: HID,
      cardId: 'acc-credit',
      cardKind: 'payment',
      reason: 'card_payment',
      status: 'ignored',
      type: 'entrada',
      amount: 181.41,
      date: Timestamp.fromDate(at),
    })
    await syncConnection(db, bankOnlyPluggy([payTx({ date: at.toISOString() })]), connection())

    const card = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.equal(card.payments.length, 1)
    assert.equal(card.payments[0].billMonth, '2026-12')
    assert.equal(card.payments[0].cents, 18141)
    assert.equal(card.payments[0].source, 'card')
    assert.equal(card.billTotals['2026-12'], 18141) // a fatura nao e tocada

    // o lancamento da conta recebe cardId e billMonth da ligacao
    const tx = (await db.collection('transactions').doc('bank_tx-pay-1').get()).data()
    assert.equal(tx.cardId, 'acc-credit')
    assert.equal(tx.billMonth, '2026-12')
  })

  test('so o lado da conta: a evidencia e bank-text e o lancamento e ligado; rodar duas vezes nao duplica nada', async () => {
    await seedCard()
    const pluggy = bankOnlyPluggy([payTx()])
    await syncConnection(db, pluggy, connection())
    const first = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.equal(first.payments.length, 1)
    assert.equal(first.payments[0].source, 'bank-text')
    assert.equal(first.payments[0].billMonth, '2026-12')

    const again = await syncConnection(db, pluggy, connection())
    assert.equal(again.error, undefined)
    const second = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.deepEqual(second.payments, first.payments)
    assert.equal((await db.collection('transactions').where('ownerId', '==', HID).get()).size, 1)
    assert.equal((await db.collection('bankImports').where('ownerId', '==', HID).get()).size, 1)
    const tx = (await db.collection('transactions').doc('bank_tx-pay-1').get()).data()
    assert.equal(tx.cardId, 'acc-credit')
    assert.equal(tx.billMonth, '2026-12')
  })

  test('pagamento parcial com fechamento abate a fatura fechada mais antiga e nao a aberta', async () => {
    const now = new Date('2026-11-25T15:00:00Z')
    await seedCard({ billTotals: { '2026-11': 30000, '2026-12': 20000 } })
    await db.collection('cardSettings').doc('acc-credit').set({ ownerId: HID, closingDay: 5 })
    await db.collection('transactions').doc('bank_p1').set({
      ownerId: HID,
      source: 'bank',
      type: 'saida',
      amount: 100,
      cardKind: 'payment',
      transfer: true,
      bankImportId: 'p1',
      date: ts('2026-11-20T15:00:00Z'),
    })
    await reconcileCardPayments(db, { ownerId: HID, now })
    const card = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.equal(card.payments.length, 1)
    assert.equal(card.payments[0].billMonth, '2026-11')
    assert.equal(card.payments[0].cents, 10000)
  })

  test('closingDay de cardSettings de outro casal e ignorado', async () => {
    const now = new Date('2026-11-25T15:00:00Z')
    await seedCard({ billTotals: { '2026-11': 30000 } })
    await db.collection('cardSettings').doc('acc-credit').set({ ownerId: OTHER, closingDay: 5 })
    await db.collection('transactions').doc('bank_p1').set({
      ownerId: HID, source: 'bank', type: 'saida', amount: 100, cardKind: 'payment', transfer: true,
      bankImportId: 'p1', date: ts('2026-11-20T15:00:00Z'),
    })
    await reconcileCardPayments(db, { ownerId: HID, now })
    const card = (await db.collection('cards').doc('acc-credit').get()).data()
    // sem fechamento valido a parcial nao tem fatura fechada para abater
    assert.equal(card.payments[0].billMonth, null)
  })

  test('transferencia propria de valor exato da fatura fechada vira evidencia bank-self, sem lancamento; valor diferente nao', async () => {
    const now = new Date('2026-11-25T15:00:00Z')
    await seedCard({ billTotals: { '2026-11': 50000 } })
    await db.collection('cardSettings').doc('acc-credit').set({ ownerId: HID, closingDay: 5 })
    const selfImport = (id, amount) =>
      db.collection('bankImports').doc(id).set({
        ownerId: HID, status: 'review', reason: 'self_transfer', type: 'saida', amount,
        date: ts('2026-11-20T15:00:00Z'), transactionId: null,
      })
    await selfImport('s-diff', 499)
    await reconcileCardPayments(db, { ownerId: HID, now })
    assert.deepEqual((await db.collection('cards').doc('acc-credit').get()).data().payments, [])

    await selfImport('s-exact', 500)
    await reconcileCardPayments(db, { ownerId: HID, now })
    const card = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.equal(card.payments.length, 1)
    assert.equal(card.payments[0].source, 'bank-self')
    assert.equal(card.payments[0].billMonth, '2026-11')
    // nao cria lancamento nem altera o saldo
    assert.equal((await db.collection('transactions').where('ownerId', '==', HID).get()).size, 0)
  })

  test('transferencia propria no sync continua em revisao e nao cria lancamento', async () => {
    await seedCard()
    const self = payTx({ id: 'tx-self', description: 'TRANSFERENCIA ENTRE CONTAS', category: 'Same person transfer - PIX', amount: -50 })
    const summary = await syncConnection(db, bankOnlyPluggy([self]), connection())
    assert.equal(summary.review, 1)
    assert.equal((await db.collection('transactions').where('ownerId', '==', HID).get()).size, 0)
    const imp = (await db.collection('bankImports').doc('tx-self').get()).data()
    assert.equal(imp.reason, 'self_transfer')
    assert.equal(imp.cardKind, undefined)
  })

  test('guarda no maximo 24 pagamentos, os mais recentes', async () => {
    const now = new Date('2026-11-25T15:00:00Z')
    await seedCard({ billTotals: {} })
    for (let i = 0; i < 30; i++) {
      await db.collection('transactions').doc(`bank_m${i}`).set({
        ownerId: HID, source: 'bank', type: 'saida', amount: 10 + i, cardKind: 'payment', transfer: true,
        bankImportId: `m${i}`, date: Timestamp.fromMillis(now.getTime() - (i + 1) * DAY_MS),
      })
    }
    await reconcileCardPayments(db, { ownerId: HID, now })
    const { payments } = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.equal(payments.length, 24)
    assert.ok(payments[0].atMs > payments[23].atMs)
    assert.equal(payments[0].id, 'm0')
  })

  test('nunca toca cartao nem lancamento de outro casal', async () => {
    const now = new Date('2026-11-25T15:00:00Z')
    await seedCard({ billTotals: { '2026-12': 18141 } })
    await seedCard({ billTotals: { '2026-12': 18141 } }, 'acc-outro', OTHER)
    await db.collection('transactions').doc('bank_o1').set({
      ownerId: OTHER, source: 'bank', type: 'saida', amount: 181.41, cardKind: 'payment', transfer: true,
      bankImportId: 'o1', date: ts('2026-11-20T15:00:00Z'),
    })
    await reconcileCardPayments(db, { ownerId: HID, now })
    assert.deepEqual((await db.collection('cards').doc('acc-credit').get()).data().payments, [])
    const foreign = (await db.collection('cards').doc('acc-outro').get()).data()
    assert.equal(foreign.payments, undefined)
    const tx = (await db.collection('transactions').doc('bank_o1').get()).data()
    assert.equal(tx.cardId, undefined)
  })

  const textPayment = (id, amount, iso) =>
    db.collection('transactions').doc(`bank_${id}`).set({
      ownerId: HID, source: 'bank', type: 'saida', amount, cardKind: 'payment', transfer: true,
      bankImportId: id, date: ts(iso),
    })
  const paymentsOf = async (id = 'acc-credit') => (await db.collection('cards').doc(id).get()).data().payments
  const seedClosing = (id = 'acc-credit') =>
    db.collection('cardSettings').doc(id).set({ ownerId: HID, closingDay: 5 })

  test('fatura do historico, fora do alcance da janela de 90 dias, nunca recebe o pagamento', async () => {
    const now = new Date('2026-11-25T15:00:00Z')
    // o historico inteiro do cartao esta em billTotals (D-13), mas as evidencias so cobrem 90 dias
    await seedCard({ billTotals: { '2025-03': 30000, '2025-04': 10000, '2026-11': 30000 } })
    await seedClosing()
    await textPayment('p1', 100, '2026-11-20T15:00:00Z')
    await reconcileCardPayments(db, { ownerId: HID, now })
    const payments = await paymentsOf()
    assert.equal(payments.length, 1)
    assert.equal(payments[0].billMonth, '2026-11')
  })

  test('pagamento que saiu da janela continua guardado e a fatura dele nao volta a receber', async () => {
    await seedCard({ billTotals: { '2026-09': 20000, '2026-10': 30000 } })
    await seedClosing()
    await textPayment('set', 200, '2026-09-10T15:00:00Z')
    await reconcileCardPayments(db, { ownerId: HID, now: new Date('2026-09-20T15:00:00Z') })
    assert.equal((await paymentsOf())[0].billMonth, '2026-09')

    // 100 dias depois a evidencia de setembro ja nao e lida, mas a fatura continua paga
    await textPayment('out', 100, '2026-12-15T15:00:00Z')
    const now = new Date('2026-12-20T15:00:00Z')
    await reconcileCardPayments(db, { ownerId: HID, now })
    const payments = await paymentsOf()
    assert.deepEqual(payments.map((p) => [p.id, p.billMonth]), [['out', '2026-10'], ['set', '2026-09']])
    await reconcileCardPayments(db, { ownerId: HID, now })
    assert.deepEqual(await paymentsOf(), payments)
  })

  test('na borda da janela, o outro lado de um pagamento ja guardado nao conta de novo', async () => {
    const now = new Date('2026-11-25T15:00:00Z')
    const edge = now.getTime() - 90 * DAY_MS
    await seedCard({
      billTotals: { '2026-08': 20000 },
      payments: [{ id: 'c-old', billMonth: '2026-08', cents: 20000, atMs: edge - DAY_MS, source: 'card' }],
    })
    await textPayment('late', 200, new Date(edge + DAY_MS).toISOString())
    await reconcileCardPayments(db, { ownerId: HID, now })
    assert.deepEqual((await paymentsOf()).map((p) => p.id), ['c-old'])
  })

  test('a rodada do sync do cartao nao trata o pagamento ligado como compra', async () => {
    await seedCard()
    await syncConnection(db, bankOnlyPluggy([payTx()]), connection())
    const nubank = {
      async fetchItem(itemId) {
        return { id: itemId, status: 'UPDATED', connector: { name: 'Nubank', imageUrl: null } }
      },
      async fetchAccounts() {
        return {
          results: [{
            id: 'acc-credit', type: 'CREDIT', name: 'Cartao', balance: 181.41,
            creditData: { creditLimit: 200, availableCreditLimit: 18.59 },
          }],
        }
      },
      async fetchAllTransactions() {
        return [{
          id: 'tx-compra', description: 'PAGAMENTO DE FATURA NUBANK', amount: 181.41, type: 'DEBIT', status: 'POSTED',
          date: new Date(Date.now() - 2 * DAY_MS).toISOString(), billForecastDate: '2026-12',
        }]
      },
      async fetchCategories() {
        return { results: [] }
      },
    }
    const summary = await syncConnection(db, nubank, connection({ itemId: 'item-nubank' }))
    assert.equal(summary.cardError, undefined)
    // compra com mesma descricao, valor e data do pagamento: sem a defesa ela religaria o lancamento
    // do pagamento (id novo do banco); o pagamento continua pagamento e intacto
    const pay = (await db.collection('transactions').doc('bank_tx-pay-1').get()).data()
    assert.equal(pay.cardKind, 'payment')
    assert.equal(pay.bankImportId, 'tx-pay-1')
    const buy = (await db.collection('transactions').doc('bank_tx-compra').get()).data()
    assert.equal(buy.cardKind, 'purchase')
  })
})

// ---- Script do dono: reclassificar os pagamentos de fatura antigos (06-08, Task 3) ----

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/reclassify-card-payments.js')
const SECRET_TEXT = 'PAGAMENTO DE FATURA SEGREDO-XYZ'

describe('reclassificacao dos pagamentos de fatura antigos', () => {
  let admin
  let db
  let dir

  before(() => {
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reclassify-'))
  })

  after(async () => {
    fs.rmSync(dir, { recursive: true, force: true })
    await admin.app.delete()
  })

  beforeEach(async () => {
    await resetEmulators()
  })

  const oldTx = (id, over = {}) =>
    db.collection('transactions').doc(id).set({
      ownerId: HID,
      source: 'bank',
      type: 'saida',
      amount: 123.45,
      description: 'Pagamento de fatura',
      originalDescription: SECRET_TEXT,
      bankDescription: 'Pagamento de fatura',
      date: ts('2026-10-20T15:00:00Z'),
      ...over,
    })
  const seedCard = (ownerId = HID, id = 'acc-credit') =>
    db.collection('cards').doc(id).set({ ownerId, accountId: id, billTotals: {} })
  const get = async (id) => (await db.collection('transactions').doc(id).get()).data()

  function backupFile(name, { ageHours = 1, drop } = {}) {
    const collections = { transactions: [{ id: 't', data: {} }], bankImports: [], settings: [] }
    if (drop) delete collections[drop]
    const file = path.join(dir, name)
    fs.writeFileSync(file, JSON.stringify({
      meta: { exportedAt: new Date(Date.now() - ageHours * 3_600_000).toISOString(), version: 1 },
      collections,
    }))
    return file
  }

  function runCli(args) {
    const res = spawnSync(process.execPath, [SCRIPT, ...args], { env: process.env, encoding: 'utf8' })
    return { code: res.status, out: `${res.stdout}\n${res.stderr}` }
  }

  test('ensaio nao grava e devolve so a contagem; --apply marca; rodar de novo nao altera nada', async () => {
    await seedCard()
    await oldTx('bank_a')
    await oldTx('bank_b', { originalDescription: undefined, bankDescription: 'Pagamento da fatura do cartao' })

    const dry = await reclassifyCardPayments(db, HID)
    assert.deepEqual(dry, { examined: 2, matched: 2, updated: 0 })
    assert.equal((await get('bank_a')).transfer, undefined)

    const applied = await reclassifyCardPayments(db, HID, { apply: true })
    assert.deepEqual(applied, { examined: 2, matched: 2, updated: 2 })
    for (const id of ['bank_a', 'bank_b']) {
      const d = await get(id)
      assert.equal(d.transfer, true)
      assert.equal(d.cardKind, 'payment')
      assert.equal(d.amount, 123.45) // so os dois campos mudam
    }

    const again = await reclassifyCardPayments(db, HID, { apply: true })
    assert.deepEqual(again, { examined: 0, matched: 0, updated: 0 })
  })

  test('gasto comum, compra do cartao e lancamento de outro casal nao sao tocados', async () => {
    await seedCard()
    await oldTx('bank_gasto', { originalDescription: 'RESTAURANTE SABOR', bankDescription: 'Restaurante Sabor', description: 'Restaurante' })
    await oldTx('bank_manual', { source: 'manual' })
    await oldTx('bank_entrada', { type: 'entrada' })
    await oldTx('bank_compra', { cardKind: 'purchase', cardId: 'acc-credit' })
    await oldTx('bank_outro', { ownerId: OTHER })
    const res = await reclassifyCardPayments(db, HID, { apply: true })
    assert.deepEqual(res, { examined: 1, matched: 0, updated: 0 })
    for (const id of ['bank_gasto', 'bank_manual', 'bank_entrada', 'bank_compra', 'bank_outro']) {
      assert.equal((await get(id)).transfer, undefined, id)
    }
    assert.equal((await get('bank_compra')).cardKind, 'purchase')
  })

  test('dono sem cartao: nada e reclassificado, mesmo com cartao de outro casal', async () => {
    await seedCard(OTHER, 'acc-outro')
    await oldTx('bank_a')
    const res = await reclassifyCardPayments(db, HID, { apply: true })
    assert.deepEqual(res, { examined: 0, matched: 0, updated: 0 })
    assert.equal((await get('bank_a')).transfer, undefined)
    await assert.rejects(() => reclassifyCardPayments(db, ''), /hid/)
  })

  test('muitos lancamentos: grava em lotes e conta tudo', async () => {
    await seedCard()
    for (let i = 0; i < 450; i++) await oldTx(`bank_m${i}`)
    const res = await reclassifyCardPayments(db, HID, { apply: true })
    assert.deepEqual(res, { examined: 450, matched: 450, updated: 450 })
    assert.equal((await db.collection('transactions').where('cardKind', '==', 'payment').get()).size, 450)
  })

  test('linha de comando sem --hid falha com mensagem; a saida nunca traz descricao, valor ou id', async () => {
    const noHid = runCli([])
    assert.notEqual(noHid.code, 0)
    assert.match(noHid.out, /--hid/)

    await seedCard()
    await oldTx('bank_segredo-id-777')
    const dry = runCli(['--hid', HID])
    assert.equal(dry.code, 0, dry.out)
    assert.match(dry.out, /dry-run/)
    assert.match(dry.out, /encontrados: 1/)
    for (const secret of [SECRET_TEXT, 'SEGREDO', '123.45', '123,45', 'segredo-id-777', HID]) {
      assert.ok(!dry.out.includes(secret), `a saida nao pode conter ${secret}`)
    }
    assert.equal((await get('bank_segredo-id-777')).transfer, undefined)
  })

  test('--apply sem --backup, ou com copia recusada, nao grava nada e sai com erro', async () => {
    await seedCard()
    await oldTx('bank_a')

    const noBackup = runCli(['--hid', HID, '--apply'])
    assert.notEqual(noBackup.code, 0)
    assert.match(noBackup.out, /--backup/)

    const old = runCli(['--hid', HID, '--apply', '--backup', backupFile('velho.json', { ageHours: 30 })])
    assert.notEqual(old.code, 0)
    assert.match(old.out, /mais de 24 horas/)

    const missing = runCli(['--hid', HID, '--apply', '--backup', path.join(dir, 'nao-existe.json')])
    assert.notEqual(missing.code, 0)

    const noColl = runCli(['--hid', HID, '--apply', '--backup', backupFile('sem-colecao.json', { drop: 'bankImports' })])
    assert.notEqual(noColl.code, 0)

    assert.equal((await get('bank_a')).transfer, undefined)
    // a mesma regra vale chamando a funcao do script diretamente
    await assert.rejects(() => runReclassify({ db, hid: HID, apply: true }), /obrigatoria/)
    await assert.rejects(
      () => runReclassify({ db, hid: HID, apply: true, backup: backupFile('velho2.json', { ageHours: 48 }) }),
      /mais de 24 horas/
    )
    assert.equal((await get('bank_a')).transfer, undefined)
  })

  test('com copia valida aplica; o ensaio nao exige copia', async () => {
    await seedCard()
    await oldTx('bank_a')

    const dry = runCli(['--hid', HID, '--dry-run'])
    assert.equal(dry.code, 0, dry.out)
    assert.equal((await get('bank_a')).transfer, undefined)

    const applied = runCli(['--hid', HID, '--apply', '--backup', backupFile('bom.json')])
    assert.equal(applied.code, 0, applied.out)
    assert.match(applied.out, /atualizados: 1/)
    assert.ok(!applied.out.includes(SECRET_TEXT))
    const d = await get('bank_a')
    assert.equal(d.transfer, true)
    assert.equal(d.cardKind, 'payment')
  })
})
