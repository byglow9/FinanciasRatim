// Sync do cartao (CARD-02, D-06, D-08) contra o emulador, com a Pluggy falsa no formato da sonda
// (06-CARD-PROBE-792a3230.md). Dados simulados: nenhuma rede, nenhuma credencial.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { syncConnection } from '../../src/sync.js'
import { resetEmulators } from './_helpers.js'

const HID = 'casal-aaaa-0001'
const DAY_MS = 24 * 60 * 60 * 1000

const BANK_ACCOUNT = { id: 'acc-bank', type: 'BANK', name: 'Conta Corrente', balance: 50 }
const CREDIT_ACCOUNT = {
  id: 'acc-credit',
  type: 'CREDIT',
  name: 'Cartao de Credito',
  marketingName: 'Nubank Mastercard',
  balance: 181.41,
  number: '5555',
  creditData: {
    creditLimit: 200,
    availableCreditLimit: 18.59,
    balanceDueDate: null,
    balanceCloseDate: null,
    minimumPayment: null,
    brand: 'MASTERCARD',
    level: 'GOLD',
    status: 'ACTIVE',
    holderType: null,
    isLimitFlexible: false,
    disaggregatedCreditLimits: [{ creditLineLimitType: 'TOTAL', limitAmount: 200 }],
    additionalCards: [],
  },
}

// Pluggy falsa: uma conta BANK e uma CREDIT, sem transacoes no cartao; o banco tem um lancamento.
function fakePluggy() {
  const bankTx = {
    id: 'tx-bank-1',
    description: 'RESTAURANTE SABOR',
    amount: -25.5,
    type: 'DEBIT',
    status: 'POSTED',
    date: new Date(Date.now() - 2 * DAY_MS).toISOString(),
    category: 'Restaurants',
  }
  return {
    async fetchItem(itemId) {
      return { id: itemId, status: 'UPDATED', connector: { name: 'MeuPluggy', imageUrl: null } }
    },
    async fetchAccounts() {
      return { results: [BANK_ACCOUNT, CREDIT_ACCOUNT] }
    },
    async fetchAllTransactions(accountId) {
      return accountId === BANK_ACCOUNT.id ? [bankTx] : []
    },
    async fetchCategories() {
      return { results: [] }
    },
  }
}

// db cuja colecao cards falha; as demais seguem para o emulador de verdade.
function dbFailingOnCards(db) {
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'collection') {
        return (name) => {
          if (name === 'cards') throw new Error('falha simulada em cards')
          return target.collection(name)
        }
      }
      const value = target[prop]
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

describe('sync do cartao', () => {
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

  const connection = (extra = {}) => ({
    itemId: 'item-nubank',
    ownerId: HID,
    person: 'ela',
    importFrom: Timestamp.fromDate(new Date(Date.now() - 30 * DAY_MS)),
    ...extra,
  })

  test('grava cards/{id} com dono, pessoa, item e centavos; a segunda rodada reescreve o mesmo documento', async () => {
    const summary = await syncConnection(db, fakePluggy(), connection())
    assert.equal(summary.error, undefined)
    assert.equal(summary.cards, 1)

    const snap = await db.collection('cards').doc('acc-credit').get()
    assert.equal(snap.exists, true)
    const data = snap.data()
    assert.equal(data.ownerId, HID)
    assert.equal(data.person, 'ela')
    assert.equal(data.itemId, 'item-nubank')
    assert.equal(data.accountId, 'acc-credit')
    assert.equal(data.name, 'Nubank Mastercard')
    assert.equal(data.brand, 'MASTERCARD')
    assert.equal(data.level, 'GOLD')
    assert.equal(data.status, 'ACTIVE')
    assert.equal(data.creditLimitCents, 20000)
    assert.equal(data.availableLimitCents, 1859)
    assert.equal(data.balanceCents, 18141)
    assert.ok(data.syncedAt?.toDate, 'syncedAt deve ser Timestamp')
    // privacidade: nada de numero do cartao nem de cartoes adicionais
    assert.ok(!('number' in data))
    assert.ok(!('additionalCards' in data))
    assert.ok(!JSON.stringify(data).includes('5555'))

    // a conta BANK nao vira cartao
    assert.equal((await db.collection('cards').doc('acc-bank').get()).exists, false)

    const second = await syncConnection(db, fakePluggy(), connection())
    assert.equal(second.error, undefined)
    assert.equal((await db.collection('cards').get()).size, 1)
  })

  test('item sem cartao nao ganha a chave cards no resumo', async () => {
    const pluggy = fakePluggy()
    pluggy.fetchAccounts = async () => ({ results: [BANK_ACCOUNT] })
    const summary = await syncConnection(db, pluggy, connection())
    assert.equal('cards' in summary, false)
    assert.equal((await db.collection('cards').get()).size, 0)
  })

  test('falha ao gravar o cartao nao derruba a importacao bancaria do mesmo item', async () => {
    const warns = []
    const original = console.warn
    console.warn = (...args) => warns.push(args.join(' '))
    let summary
    try {
      summary = await syncConnection(dbFailingOnCards(db), fakePluggy(), connection())
    } finally {
      console.warn = original
    }
    assert.equal(summary.error, undefined)
    assert.equal(summary.imported, 1)
    assert.equal('cards' in summary, false)
    assert.equal((await db.collection('bankImports').doc('tx-bank-1').get()).exists, true)
    assert.equal((await db.collection('transactions').doc('bank_tx-bank-1').get()).exists, true)
    assert.equal((await db.collection('cards').get()).size, 0)
    assert.equal(warns.length, 1)
    assert.ok(warns[0].includes('falha simulada em cards'))
    // o log nao carrega valores nem dados do cartao
    assert.ok(!warns[0].includes('181'))
    assert.ok(!warns[0].includes('5555'))
  })

  test('conexao sem dono nao grava cartao', async () => {
    const summary = await syncConnection(db, fakePluggy(), connection({ ownerId: undefined }))
    assert.ok(summary.error)
    assert.equal((await db.collection('cards').get()).size, 0)
  })
})
