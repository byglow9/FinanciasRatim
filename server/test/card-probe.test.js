import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeCardShape, renderCardProbe, probeHeading } from '../src/card-probe.js'
import { runProbe } from '../scripts/probe-card.js'

// Sonda do cartao (REV-03 / trilha paralela): so formato, contagens e valores enumerados.
// Todas as fixtures usam valores sentinela; nada aqui e dado financeiro real.
const NOW = new Date('2026-11-17T15:00:00Z')

const SENTINELS = ['LOJA-SECRETA', '5555', '1234', '12345678900', '987', 'bill-secreta', 'TITULAR-SECRETO']

function fixture() {
  const item = {
    id: 'item-sentinela-0001',
    status: 'UPDATED',
    executionStatus: 'SUCCESS',
    error: null,
    connector: { id: 7, name: 'MeuPluggy' },
    parameters: { cpf: '12345678900' },
    lastUpdatedAt: new Date('2026-11-16T15:00:00Z'),
    updatedAt: new Date('2026-11-16T15:00:00Z'),
    nextAutoSyncAt: new Date('2026-11-18T03:00:00Z'),
    consentExpiresAt: new Date('2027-01-16T15:00:00Z'),
  }
  const credit = {
    id: 'acc-credit-a',
    type: 'CREDIT',
    name: 'LOJA-SECRETA cartao',
    number: '5555 **** **** 1234',
    owner: 'TITULAR-SECRETO',
    creditData: {
      creditLimit: 5000,
      availableCreditLimit: 4000,
      balanceDueDate: '2026-12-05T00:00:00Z',
      balanceCloseDate: null,
      minimumPayment: 150,
      brand: 'MASTERCARD',
      level: 'GOLD',
      status: 'ACTIVE',
      holderType: 'MAIN',
      isLimitFlexible: false,
      disaggregatedCreditLimits: [{ creditLineLimitType: 'X', usedAmount: 10 }],
      additionalCards: [],
    },
  }
  const bank = { id: 'acc-bank-a', type: 'BANK', name: 'LOJA-SECRETA conta' }
  const bill = {
    id: 'bill-secreta-1',
    dueDate: '2026-12-05T00:00:00Z',
    billClosingDate: '2026-11-28T00:00:00Z',
    totalAmount: 987.65,
    minimumPaymentAmount: 150,
    allowsInstallments: true,
    financeCharges: [],
    payments: [],
  }
  const txs = [
    {
      id: 'tx-1',
      description: 'LOJA-SECRETA 2/10',
      amount: 987.65,
      date: '2026-11-10T12:00:00Z',
      type: 'DEBIT',
      status: 'POSTED',
      creditCardMetadata: {
        installmentNumber: 2,
        totalInstallments: 10,
        billId: 'bill-secreta-1',
        cardNumber: '1234',
      },
    },
    {
      id: 'tx-2',
      description: 'LOJA-SECRETA pendente',
      amount: 987.65,
      date: '2026-11-16T12:00:00Z',
      type: 'DEBIT',
      status: 'PENDING',
      creditCardMetadata: null,
    },
    {
      id: 'tx-3',
      description: 'LOJA-SECRETA futura',
      amount: 987.65,
      date: '2026-12-20T12:00:00Z',
      type: 'DEBIT',
      status: 'POSTED',
      creditCardMetadata: null,
    },
  ]
  return { item, credit, bank, bill, txs }
}

function summaryOf(f = fixture()) {
  return summarizeCardShape(
    {
      item: f.item,
      allAccounts: [f.bank, f.credit],
      cards: [{ account: f.credit, bills: [f.bill], billsErrorStatus: null, txs: f.txs }],
    },
    NOW,
  )
}

describe('summarizeCardShape', () => {
  test('resume formato e contagens do cartao', () => {
    const s = summaryOf()
    assert.equal(s.cardAccountsFound, 1)
    assert.deepEqual(s.accountTypes, { BANK: 1, CREDIT: 1 })
    assert.equal(s.item.status, 'UPDATED')
    assert.equal(s.item.executionStatus, 'SUCCESS')
    assert.equal(s.item.connector, 'MeuPluggy')
    assert.equal(s.item.ageHours, 24)
    assert.equal(s.item.consentExpiresInDays, 60)
    assert.equal(s.item.hasNextAutoSync, true)
    assert.equal(s.item.nextAutoSyncInHours, 12)
    const [card] = s.cards
    assert.equal(card.n, 1)
    assert.equal(card.creditData.brand, 'MASTERCARD')
    assert.equal(card.creditData.level, 'GOLD')
    assert.equal(card.creditData.holderType, 'MAIN')
    assert.equal(card.creditData.isLimitFlexible, false)
    assert.equal(card.creditData.availableWithinLimit, true)
    assert.equal(card.creditData.fields.creditLimit, 'number')
    assert.equal(card.creditData.fields.balanceCloseDate, 'null')
    assert.equal(card.billsFetch, 'ok')
    assert.equal(card.bills.length, 1)
    assert.equal(card.bills[0].dueAfterClosing, true)
    assert.equal(card.bills[0].txSumMatchesTotal, true)
    assert.equal(card.bills[0].fields.allowsInstallments, 'boolean')
    assert.equal(card.txs.total, 3)
    assert.equal(card.txs.withInstallmentNumber, 1)
    assert.equal(card.txs.withTotalInstallments, 1)
    assert.equal(card.txs.withBillId, 1)
    assert.equal(card.txs.pending, 1)
    assert.equal(card.txs.futureDated, 1)
    assert.deepEqual(card.txs.installmentTotals, { 10: 1 })
    assert.deepEqual(card.txs.byType, { DEBIT: 3 })
    assert.deepEqual(card.txs.byStatus, { POSTED: 2, PENDING: 1 })
  })

  test('nenhuma sentinela vaza no resumo nem no markdown', () => {
    const s = summaryOf()
    const md = renderCardProbe(s, { dayIso: '2026-11-17' })
    for (const sentinel of SENTINELS) {
      assert.ok(!JSON.stringify(s).includes(sentinel), `resumo vazou ${sentinel}`)
      assert.ok(!md.includes(sentinel), `markdown vazou ${sentinel}`)
    }
  })

  test('enumerados fora do formato viram OUTRO e ausentes viram AUSENTE', () => {
    const f = fixture()
    f.credit.creditData.brand = 'Loja Secreta 5555'
    delete f.credit.creditData.level
    f.item.connector.name = 'nome <script> com 12345678900'
    const s = summaryOf(f)
    assert.equal(s.cards[0].creditData.brand, 'OUTRO')
    assert.equal(s.cards[0].creditData.level, 'AUSENTE')
    assert.equal(s.item.connector, 'OUTRO')
  })

  test('total de parcelas acima de 99 vira maior-que-99', () => {
    const f = fixture()
    f.txs[1].creditCardMetadata = { installmentNumber: 1, totalInstallments: 120 }
    const s = summaryOf(f)
    assert.deepEqual(s.cards[0].txs.installmentTotals, { 10: 1, 'maior-que-99': 1 })
  })

  test('sem conta CREDIT: cards vazio e markdown registra isso', () => {
    const f = fixture()
    const s = summarizeCardShape({ item: f.item, allAccounts: [f.bank], cards: [] }, NOW)
    assert.equal(s.cardAccountsFound, 0)
    assert.deepEqual(s.cards, [])
    const md = renderCardProbe(s, { dayIso: '2026-11-17' })
    assert.match(md, /cartao CREDIT encontrado: nao/)
  })

  test('faturas que falharam: billsFetch error com o status e o restante resumido', () => {
    const f = fixture()
    const s = summarizeCardShape(
      {
        item: f.item,
        allAccounts: [f.bank, f.credit],
        cards: [{ account: f.credit, bills: null, billsErrorStatus: 404, txs: f.txs }],
      },
      NOW,
    )
    assert.equal(s.cards[0].billsFetch, 'error')
    assert.equal(s.cards[0].billsErrorStatus, 404)
    assert.deepEqual(s.cards[0].bills, [])
    assert.equal(s.cards[0].txs.total, 3)
  })

  test('txSumMatchesTotal e null quando nenhuma compra casa com a fatura', () => {
    const f = fixture()
    f.txs[0].creditCardMetadata.billId = 'outra'
    const s = summaryOf(f)
    assert.equal(s.cards[0].bills[0].txSumMatchesTotal, null)
  })
})

describe('probeHeading', () => {
  test('cabecalho exato', () => {
    assert.equal(probeHeading('2026-11-17'), '# Sonda do cartao (somente formato) - 2026-11-17')
  })
})

describe('runProbe', () => {
  function fakePluggy({ failBills = null } = {}) {
    const f = fixture()
    const calls = []
    return {
      calls,
      async fetchItem(id) {
        calls.push('fetchItem')
        assert.equal(id, 'item-sentinela-0001')
        return f.item
      },
      async fetchAccounts() {
        calls.push('fetchAccounts')
        return { total: 2, results: [f.bank, f.credit] }
      },
      async fetchCreditCardBills(accountId) {
        calls.push('fetchCreditCardBills')
        assert.equal(accountId, 'acc-credit-a')
        if (failBills) throw failBills
        return { total: 1, results: [f.bill] }
      },
      async fetchAllTransactions(accountId, opts) {
        calls.push('fetchAllTransactions')
        assert.equal(accountId, 'acc-credit-a')
        assert.equal(opts.dateFrom, '2026-08-19')
        return f.txs
      },
    }
  }

  test('chama so os quatro metodos de leitura e devolve markdown de formato', async () => {
    const pluggy = fakePluggy()
    const { markdown } = await runProbe({ pluggy, itemId: 'item-sentinela-0001', now: NOW })
    assert.deepEqual([...new Set(pluggy.calls)].sort(), [
      'fetchAccounts',
      'fetchAllTransactions',
      'fetchCreditCardBills',
      'fetchItem',
    ])
    assert.ok(markdown.startsWith('# Sonda do cartao (somente formato) - 2026-11-17'))
    for (const sentinel of SENTINELS) assert.ok(!markdown.includes(sentinel), `markdown vazou ${sentinel}`)
    assert.match(markdown, /"withBillId": 1/)
  })

  test('erro 404 nas faturas: registra so o status, nao a mensagem, e segue com o resto', async () => {
    const err = Object.assign(new Error('MENSAGEM-SECRETA da Pluggy'), { status: 404 })
    const pluggy = fakePluggy({ failBills: err })
    const { markdown } = await runProbe({ pluggy, itemId: 'item-sentinela-0001', now: NOW })
    assert.match(markdown, /"billsFetch": "error"/)
    assert.match(markdown, /"billsErrorStatus": 404/)
    assert.match(markdown, /"total": 3/)
    assert.ok(!markdown.includes('MENSAGEM-SECRETA'))
  })

  test('sem conta CREDIT: nao chama faturas nem transacoes', async () => {
    const pluggy = fakePluggy()
    pluggy.fetchAccounts = async () => {
      pluggy.calls.push('fetchAccounts')
      return { results: [{ id: 'acc-bank-a', type: 'BANK' }] }
    }
    const { markdown } = await runProbe({ pluggy, itemId: 'item-sentinela-0001', now: NOW })
    assert.deepEqual(pluggy.calls, ['fetchItem', 'fetchAccounts'])
    assert.match(markdown, /cartao CREDIT encontrado: nao/)
  })
})
