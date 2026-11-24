// Sync do cartao (CARD-02, D-06, D-08) contra o emulador, com a Pluggy falsa no formato da sonda
// (06-CARD-PROBE-792a3230.md). Dados simulados: nenhuma rede, nenhuma credencial.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { syncConnection } from '../../src/sync.js'
import { CARD_HISTORY_FLOOR } from '../../src/card-sync.js'
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

// ---------------------------------------------------------------------------------------------
// Compras do cartao (06-06): seis compras de exemplo no formato da sonda (D-06, D-08).
// ---------------------------------------------------------------------------------------------

const daysAgo = (n) => new Date(Date.now() - n * DAY_MS).toISOString()

function purchase(id, description, amount, extra = {}) {
  return {
    id,
    description,
    amount,
    type: 'DEBIT',
    status: 'PENDING',
    currencyCode: 'BRL',
    date: daysAgo(3),
    billForecastDate: '2026-12',
    category: 'Shopping',
    ...extra,
  }
}

// cinco em BRL (15133 centavos) e uma em USD convertida (3008): soma 18141
function sixPurchases() {
  return [
    purchase('c1', 'MERCADO CENTRAL', 45),
    purchase('c2', 'FARMACIA BOA SAUDE', 32),
    purchase('c3', 'POSTO ESTRADA', 29.33),
    purchase('c4', 'PADARIA DO BAIRRO', 25),
    purchase('c5', 'ASSINATURA MUSICA', 20),
    purchase('c6', 'LOJA INTERNACIONAL', 5, { currencyCode: 'USD', amountInAccountCurrency: 30.08 }),
  ]
}

// Pluggy falsa com as transacoes do cartao em uma lista mutavel; registra as buscas.
function cardPluggy(state) {
  const base = fakePluggy()
  return {
    ...base,
    calls: state.calls ?? (state.calls = []),
    async fetchAllTransactions(accountId, opts) {
      state.calls.push({ accountId, opts })
      if (accountId === BANK_ACCOUNT.id) return base.fetchAllTransactions(accountId)
      return state.card
    },
    async fetchAccounts() {
      return { results: state.accounts ?? [BANK_ACCOUNT, CREDIT_ACCOUNT] }
    },
  }
}

describe('compras do cartao', () => {
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
  const run = (state, extra) => syncConnection(db, cardPluggy(state), connection(extra))
  const cardTxs = async (ownerId = HID) =>
    (await db.collection('transactions').where('ownerId', '==', ownerId).where('cardId', '==', 'acc-credit').get()).docs

  test('grava as seis compras com campos de cartao, valor em reais pela regra do dolar e data da compra', async () => {
    const state = { card: sixPurchases() }
    const summary = await run(state)
    assert.equal(summary.error, undefined)
    assert.equal(summary.cardError, undefined)
    assert.equal(summary.cardTxs.created, 6)
    const docs = await cardTxs()
    assert.equal(docs.length, 6)
    const usd = (await db.collection('transactions').doc('bank_c6').get()).data()
    assert.equal(usd.amount, 30.08)
    assert.equal(usd.cardId, 'acc-credit')
    assert.equal(usd.cardKind, 'purchase')
    assert.equal(usd.cardStatus, 'pending')
    assert.equal(usd.billMonth, '2026-12')
    assert.equal(usd.billMonthSource, 'pluggy')
    assert.equal(usd.type, 'saida')
    assert.equal(usd.source, 'bank')
    assert.equal(usd.bankImportId, 'c6')
    assert.deepEqual(usd.currency, { code: 'USD', originalCents: 500 })
    assert.equal(usd.person, 'ela')
    assert.equal(usd.ownerId, HID)
    assert.ok(usd.date.toDate().getTime() < Date.now() - DAY_MS, 'a data e a da compra')
    const imp = (await db.collection('bankImports').doc('c1').get()).data()
    assert.equal(imp.cardId, 'acc-credit')
    assert.equal(imp.transactionId, 'bank_c1')
    // a conta BANK do mesmo item segue o caminho existente
    assert.equal((await db.collection('transactions').doc('bank_tx-bank-1').get()).exists, true)
    assert.equal(summary.imported, 1)
  })

  test('adocao: linha do caminho antigo em dolar vira uma so compra com 30,08 e mantem categoria e descricao do dono', async () => {
    const date = Timestamp.fromDate(new Date(Date.now() - 3 * DAY_MS))
    await db.collection('bankImports').doc('c6').set({
      ownerId: HID, person: 'ela', itemId: 'item-nubank', accountId: 'acc-credit', accountType: 'CREDIT',
      type: 'saida', amount: 5, description: 'Loja Internacional', date, status: 'imported',
      reason: null, transactionId: 'bank_c6',
    })
    await db.collection('transactions').doc('bank_c6').set({
      ownerId: HID, person: 'ela', type: 'saida', amount: 5, description: 'Minha descricao',
      category: 'Lazer editada', categoryId: 'cat-editada', date, source: 'bank', bankImportId: 'c6',
      bankDescription: 'Loja Internacional', note: 'nota do dono',
    })
    await run({ card: [sixPurchases()[5]] })
    const docs = await cardTxs()
    assert.equal(docs.length, 1)
    const d = docs[0].data()
    assert.equal(docs[0].id, 'bank_c6')
    assert.equal(d.amount, 30.08)
    assert.equal(d.cardId, 'acc-credit')
    assert.equal(d.cardKind, 'purchase')
    assert.equal(d.cardStatus, 'pending')
    assert.equal(d.description, 'Minha descricao')
    assert.equal(d.category, 'Lazer editada')
    assert.equal(d.categoryId, 'cat-editada')
    assert.equal(d.note, 'nota do dono')
    assert.equal((await db.collection('transactions').where('ownerId', '==', HID).where('source', '==', 'bank').get()).docs.filter((x) => x.data().bankImportId === 'c6').length, 1)
    const imp = (await db.collection('bankImports').doc('c6').get()).data()
    assert.equal(imp.cardId, 'acc-credit')
    assert.equal(imp.amount, 30.08)
  })

  test('pendente vira confirmada com o mesmo id: so atualiza o status, sem segundo lancamento', async () => {
    const state = { card: sixPurchases() }
    await run(state)
    state.card = state.card.map((t) => ({ ...t, status: 'POSTED' }))
    const summary = await run(state)
    assert.equal(summary.cardTxs.updated, 6)
    assert.equal(summary.cardTxs.created, 0)
    const docs = await cardTxs()
    assert.equal(docs.length, 6)
    assert.ok(docs.every((d) => d.data().cardStatus === 'posted'))
    const agg = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.deepEqual(agg.billTotals, { '2026-12': 18141 })
    assert.equal(agg.pendingCount, 0)
  })

  test('id recriado pelo banco: religa ao lancamento existente, sem duplicar e sem perder a categoria editada', async () => {
    const original = purchase('old-id', 'MERCADO CENTRAL', 45, { status: 'POSTED' })
    const state = { card: [original] }
    await run(state)
    await db.collection('transactions').doc('bank_old-id').update({ category: 'Mercado do dono', description: 'Feira' })
    state.card = [purchase('new-id', 'MERCADO CENTRAL', 45, { status: 'POSTED', date: new Date(new Date(original.date).getTime() + DAY_MS).toISOString() })]
    const summary = await run(state)
    assert.equal(summary.cardTxs.rebound, 1)
    assert.equal(summary.cardTxs.created, 0)
    const docs = await cardTxs()
    assert.equal(docs.length, 1)
    assert.equal(docs[0].id, 'bank_old-id')
    assert.equal(docs[0].data().bankImportId, 'new-id')
    assert.equal(docs[0].data().category, 'Mercado do dono')
    assert.equal(docs[0].data().description, 'Feira')
    assert.equal((await db.collection('bankImports').doc('old-id').get()).data().supersededBy, 'new-id')
    assert.equal((await db.collection('bankImports').doc('new-id').get()).data().transactionId, 'bank_old-id')
    // terceira rodada identica nao muda nada
    const third = await run(state)
    assert.equal(third.cardTxs.updated + third.cardTxs.rebound + third.cardTxs.created + third.cardTxs.removed, 0)
  })

  test('so pendente sem par some; confirmada que sumiu permanece', async () => {
    const state = { card: [purchase('p1', 'MERCADO CENTRAL', 45), purchase('k1', 'FARMACIA BOA SAUDE', 32, { status: 'POSTED' }), purchase('keep', 'POSTO ESTRADA', 11)] }
    await run(state)
    state.card = [state.card[2]]
    const summary = await run(state)
    assert.equal(summary.cardTxs.removed, 1)
    assert.equal((await db.collection('transactions').doc('bank_p1').get()).exists, false)
    assert.equal((await db.collection('bankImports').doc('p1').get()).exists, false)
    assert.equal((await db.collection('transactions').doc('bank_k1').get()).exists, true)
    assert.equal((await db.collection('transactions').doc('bank_keep').get()).exists, true)
  })

  test('resposta vazia da Pluggy nao apaga compra pendente', async () => {
    const state = { card: [purchase('p1', 'MERCADO CENTRAL', 45)] }
    await run(state)
    state.card = []
    await run(state)
    assert.equal((await db.collection('transactions').doc('bank_p1').get()).exists, true)
  })

  test('estorno vira entrada neutra (transfer, refund) que reduz a fatura e nao e renda', async () => {
    const refund = { id: 'r1', description: 'ESTORNO LOJA', amount: -10, type: 'CREDIT', status: 'POSTED', currencyCode: 'BRL', date: daysAgo(2), billForecastDate: '2026-12' }
    await run({ card: [purchase('c1', 'MERCADO CENTRAL', 45), refund] })
    const r = (await db.collection('transactions').doc('bank_r1').get()).data()
    assert.equal(r.type, 'entrada')
    assert.equal(r.transfer, true)
    assert.equal(r.cardKind, 'refund')
    assert.equal(r.amount, 10)
    const agg = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.deepEqual(agg.billTotals, { '2026-12': 3500 })
  })

  test('pagamento da fatura visto no cartao nao cria lancamento: fica so em bankImports ignorado', async () => {
    const pay = { id: 'pg1', description: 'Pagamento de fatura', amount: -181.41, type: 'CREDIT', status: 'POSTED', currencyCode: 'BRL', date: daysAgo(1) }
    const summary = await run({ card: [purchase('c1', 'MERCADO CENTRAL', 45), pay] })
    assert.equal(summary.cardTxs.payments, 1)
    assert.equal((await db.collection('transactions').doc('bank_pg1').get()).exists, false)
    const imp = (await db.collection('bankImports').doc('pg1').get()).data()
    assert.equal(imp.status, 'ignored')
    assert.equal(imp.reason, 'card_payment')
    assert.equal(imp.cardId, 'acc-credit')
    assert.equal(imp.amount, 181.41)
    assert.equal(imp.transactionId, null)
    assert.ok(imp.date.toDate)
    // idempotente
    const again = await run({ card: [purchase('c1', 'MERCADO CENTRAL', 45), pay] })
    assert.equal(again.cardTxs.payments, 0)
  })

  test('compra internacional sem valor em reais e pulada e contada em skippedNoBrl', async () => {
    const intl = purchase('i1', 'LOJA INTERNACIONAL', 5, { currencyCode: 'USD', amountInAccountCurrency: null })
    const summary = await run({ card: [intl, purchase('c1', 'MERCADO CENTRAL', 45)] })
    assert.equal(summary.error, undefined)
    assert.equal(summary.cardTxs.skippedNoBrl, 1)
    assert.equal((await db.collection('transactions').doc('bank_i1').get()).exists, false)
    assert.equal((await db.collection('bankImports').doc('i1').get()).exists, false)
    assert.equal((await cardTxs()).length, 1)
  })

  test('historico sem corte (D-13): compra de 14 meses atras entra e a busca usa o piso tecnico', async () => {
    const state = { card: [purchase('old', 'COMPRA ANTIGA', 70, { date: daysAgo(430), status: 'POSTED', billForecastDate: '2025-10' }), purchase('c1', 'MERCADO CENTRAL', 45)] }
    await run(state)
    assert.equal((await cardTxs()).length, 2)
    const call = state.calls.find((c) => c.accountId === 'acc-credit')
    assert.equal(call.opts.dateFrom, CARD_HISTORY_FLOOR)
    const bankCall = state.calls.find((c) => c.accountId === 'acc-bank')
    assert.notEqual(bankCall.opts.dateFrom, CARD_HISTORY_FLOOR)
    const agg = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.deepEqual(agg.billTotals, { '2025-10': 7000, '2026-12': 4500 })
    assert.ok(agg.firstPurchaseAt.toMillis() < Date.now() - 400 * DAY_MS)
    assert.ok(agg.lastPurchaseAt.toMillis() > Date.now() - 5 * DAY_MS)
  })

  test('lancamento manual no cartao (D-12) nunca e removido nem entra na reconciliacao', async () => {
    await db.collection('transactions').doc('manual-1').set({
      ownerId: HID, person: 'ela', type: 'saida', amount: 10.5, description: 'Cafe', category: 'Alimentacao',
      date: Timestamp.fromDate(new Date(Date.now() - 20 * DAY_MS)), cardId: 'acc-credit', cardKind: 'purchase',
    })
    const state = { card: [purchase('c1', 'MERCADO CENTRAL', 45)] }
    await run(state)
    state.card = [purchase('c2', 'FARMACIA BOA SAUDE', 32)]
    await run(state)
    const manual = await db.collection('transactions').doc('manual-1').get()
    assert.equal(manual.exists, true)
    assert.equal(manual.data().description, 'Cafe')
    assert.equal(manual.data().bankImportId, undefined)
  })
})

describe('agregados do cartao', () => {
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
  const run = (state, extra) => syncConnection(db, cardPluggy(state), connection(extra))
  const cardDoc = async () => (await db.collection('cards').doc('acc-credit').get()).data()

  test('seis compras de exemplo: billTotals 18141, pendingCount 6, sem sem-mes; segunda rodada idempotente', async () => {
    const state = { card: sixPurchases() }
    await run(state)
    const agg = await cardDoc()
    assert.deepEqual(agg.billTotals, { '2026-12': 18141 })
    assert.equal(agg.pendingCount, 6)
    assert.equal(agg.unassignedCents, 0)
    const before = await db.collection('transactions').get()
    const snapshot = Object.fromEntries(before.docs.map((d) => [d.id, JSON.stringify(d.data())]))
    const second = await run(state)
    assert.deepEqual(second.cardTxs, { created: 0, updated: 0, rebound: 0, removed: 0, skippedNoBrl: 0, payments: 0 })
    const after = await db.collection('transactions').get()
    assert.deepEqual(Object.fromEntries(after.docs.map((d) => [d.id, JSON.stringify(d.data())])), snapshot)
    assert.deepEqual((await cardDoc()).billTotals, { '2026-12': 18141 })
  })

  test('compra sem billForecastDate cai no mes derivado do fechamento; sem cardSettings fica sem mes', async () => {
    const noMonth = purchase('d1', 'MERCADO CENTRAL', 45, { billForecastDate: null, date: '2026-11-03T15:00:00.000Z' })
    await run({ card: [noMonth] })
    let agg = await cardDoc()
    assert.deepEqual(agg.billTotals, {})
    assert.equal(agg.unassignedCents, 4500)
    await db.collection('cardSettings').doc('acc-credit').set({ ownerId: HID, closingDay: 7, dueDay: 14 })
    await run({ card: [noMonth] })
    agg = await cardDoc()
    assert.deepEqual(agg.billTotals, { '2026-11': 4500 })
    assert.equal(agg.unassignedCents, 0)
    // mapa substituido por inteiro: trocar o fechamento nao deixa o mes antigo para tras
    await db.collection('cardSettings').doc('acc-credit').update({ closingDay: 1 })
    await run({ card: [noMonth] })
    agg = await cardDoc()
    assert.deepEqual(agg.billTotals, { '2026-12': 4500 })
  })

  test('item so com conta BANK devolve o resumo de antes (sem chaves de cartao)', async () => {
    const state = { card: [], accounts: [BANK_ACCOUNT] }
    const summary = await run(state)
    assert.deepEqual(Object.keys(summary).sort(), ['ignored', 'imported', 'itemId', 'person', 'review'])
    assert.equal(summary.imported, 1)
    assert.equal((await db.collection('cards').get()).size, 0)
  })

  test('manual do cartao sem billMonth entra nos totais pelo fechamento e fora de pendingCount', async () => {
    await db.collection('cardSettings').doc('acc-credit').set({ ownerId: HID, closingDay: 7 })
    await db.collection('transactions').doc('manual-1').set({
      ownerId: HID, person: 'ela', type: 'saida', amount: 12.5, description: 'Cafe', category: 'Alimentacao',
      date: Timestamp.fromDate(new Date('2026-11-10T15:00:00Z')), cardId: 'acc-credit', cardKind: 'purchase',
    })
    await run({ card: [purchase('c1', 'MERCADO CENTRAL', 45)] })
    const agg = await cardDoc()
    // manual de 10/11 com fechamento dia 7 cai na fatura de dezembro; a compra da Pluggy ja e de 2026-12
    assert.deepEqual(agg.billTotals, { '2026-12': 5750 })
    assert.equal(agg.pendingCount, 1)
    await db.collection('cardSettings').doc('acc-credit').delete()
    await run({ card: [purchase('c1', 'MERCADO CENTRAL', 45)] })
    const noSettings = await cardDoc()
    assert.equal(noSettings.unassignedCents, 1250)
    assert.deepEqual(noSettings.billTotals, { '2026-12': 4500 })
  })

  test('firstPurchaseAt e lastPurchaseAt guardam a mais antiga e a mais recente, sem teto de idade', async () => {
    const oldest = new Date(Date.now() - 900 * DAY_MS)
    const newest = new Date(Date.now() - 1 * DAY_MS)
    await run({ card: [purchase('o', 'ANTIGA', 10, { date: oldest.toISOString(), status: 'POSTED' }), purchase('n', 'NOVA', 20, { date: newest.toISOString() })] })
    const agg = await cardDoc()
    assert.ok(Math.abs(agg.firstPurchaseAt.toMillis() - oldest.getTime()) < 24 * 3600 * 1000)
    assert.ok(Math.abs(agg.lastPurchaseAt.toMillis() - newest.getTime()) < 24 * 3600 * 1000)
  })
})

describe('isolamento e privacidade do cartao', () => {
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

  const OTHER = 'casal-bbbb-0002'
  const connection = (extra = {}) => ({
    itemId: 'item-nubank',
    ownerId: HID,
    person: 'ela',
    importFrom: Timestamp.fromDate(new Date(Date.now() - 30 * DAY_MS)),
    ...extra,
  })
  const run = (state, extra) => syncConnection(db, cardPluggy(state), connection(extra))

  test('dois casais: cada rodada so toca o proprio ownerId e cardSettings alheio e ignorado', async () => {
    // casal B ja tem dados do cartao e uma configuracao com o MESMO accountId do casal A
    await db.collection('transactions').doc('b-tx').set({
      ownerId: OTHER, person: 'ele', type: 'saida', amount: 99, description: 'B', cardId: 'acc-credit',
      cardKind: 'purchase', cardStatus: 'pending', bankImportId: 'b-import', source: 'bank', date: Timestamp.now(),
    })
    await db.collection('cardSettings').doc('acc-credit').set({ ownerId: OTHER, closingDay: 1 })
    const beforeB = JSON.stringify((await db.collection('transactions').doc('b-tx').get()).data())

    await run({ card: [purchase('c1', 'MERCADO CENTRAL', 45, { billForecastDate: null, date: '2026-11-03T15:00:00.000Z' })] })
    const agg = (await db.collection('cards').doc('acc-credit').get()).data()
    // closingDay 1 do outro casal nao vale: sem fechamento proprio, a compra fica sem mes
    assert.deepEqual(agg.billTotals, {})
    assert.equal(agg.unassignedCents, 4500)
    assert.equal(agg.ownerId, HID)
    assert.equal(JSON.stringify((await db.collection('transactions').doc('b-tx').get()).data()), beforeB)
    assert.equal((await db.collection('transactions').doc('bank_c1').get()).data().ownerId, HID)
  })

  test('lancamento apagado a mao nao e recriado pelo sync', async () => {
    const state = { card: [purchase('c1', 'MERCADO CENTRAL', 45), purchase('c2', 'FARMACIA BOA SAUDE', 32)] }
    await run(state)
    await db.collection('transactions').doc('bank_c1').delete()
    const summary = await run(state)
    assert.equal((await db.collection('transactions').doc('bank_c1').get()).exists, false)
    assert.equal(summary.cardTxs.created, 0)
    assert.equal((await db.collection('bankImports').doc('c1').get()).exists, true)
    const agg = (await db.collection('cards').doc('acc-credit').get()).data()
    assert.deepEqual(agg.billTotals, { '2026-12': 3200 })
  })

  test('nenhum documento gravado contem numero do cartao, titular, documento nem cartoes adicionais', async () => {
    const dirty = purchase('c1', 'MERCADO CENTRAL', 45, {
      creditCardMetadata: { cardNumber: '4444333322221111', installmentNumber: null },
      merchant: { name: 'Mercado', cnpj: '12.345.678/0001-90', category: 'Groceries' },
      owner: 'Fulana de Tal',
      taxNumber: '123.456.789-00',
    })
    const account = {
      ...CREDIT_ACCOUNT,
      owner: 'Fulana de Tal',
      taxNumber: '123.456.789-00',
      number: '4444333322221111',
      creditData: { ...CREDIT_ACCOUNT.creditData, additionalCards: [{ number: '9999888877776666', holder: 'Beltrano' }] },
    }
    await run({ card: [dirty], accounts: [BANK_ACCOUNT, account] })
    for (const col of ['cards', 'transactions', 'bankImports']) {
      const snap = await db.collection(col).get()
      const text = JSON.stringify(snap.docs.map((d) => d.data()))
      for (const secret of ['4444333322221111', '9999888877776666', 'Fulana', 'Beltrano', '123.456.789', '12.345.678', 'additionalCards', 'taxNumber', 'cardNumber', '"owner"']) {
        assert.ok(!text.includes(secret), `${col} nao pode conter ${secret}`)
      }
    }
  })

  test('conexao sem ownerId nao grava nada do cartao e registra o erro no resumo', async () => {
    const summary = await run({ card: sixPurchases() }, { ownerId: undefined })
    assert.ok(summary.error)
    assert.equal((await db.collection('transactions').get()).size, 0)
    assert.equal((await db.collection('bankImports').get()).size, 0)
    assert.equal((await db.collection('cards').get()).size, 0)
  })

  test('categoria editada de compra confirmada nao volta ao padrao depois de nova rodada', async () => {
    const state = { card: [purchase('c1', 'MERCADO CENTRAL', 45, { status: 'POSTED' })] }
    await run(state)
    await db.collection('transactions').doc('bank_c1').update({ category: 'Categoria do dono', categoryId: 'cat-dono', description: 'Meu mercado' })
    await run(state)
    await run({ card: [{ ...state.card[0], billForecastDate: '2027-01' }] })
    const d = (await db.collection('transactions').doc('bank_c1').get()).data()
    assert.equal(d.category, 'Categoria do dono')
    assert.equal(d.categoryId, 'cat-dono')
    assert.equal(d.description, 'Meu mercado')
    assert.equal(d.billMonth, '2027-01')
  })
})
