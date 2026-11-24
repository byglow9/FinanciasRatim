import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardSnapshotFromAccount, cardLimitView } from './cards.js'

// Conta CREDIT no formato da sonda (06-CARD-PROBE-792a3230.md) com os numeros reais do dono.
const CREDIT = {
  id: 'acc-credit-1',
  type: 'CREDIT',
  name: 'Cartao de Credito',
  marketingName: 'Nubank Mastercard',
  balance: 181.41,
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
    disaggregatedCreditLimits: [{ creditLineLimitType: 'X', limitAmount: 200 }],
    additionalCards: [],
  },
}
const CTX = { itemId: 'item-1', person: 'ele' }

test('conta CREDIT vira centavos inteiros sem erro de ponto flutuante', () => {
  const snap = cardSnapshotFromAccount(CREDIT, CTX)
  assert.equal(snap.accountId, 'acc-credit-1')
  assert.equal(snap.itemId, 'item-1')
  assert.equal(snap.person, 'ele')
  assert.equal(snap.name, 'Nubank Mastercard')
  assert.equal(snap.brand, 'MASTERCARD')
  assert.equal(snap.level, 'GOLD')
  assert.equal(snap.status, 'ACTIVE')
  assert.equal(snap.isLimitFlexible, false)
  assert.equal(snap.creditLimitCents, 20000)
  assert.equal(snap.availableLimitCents, 1859)
  assert.equal(snap.balanceCents, 18141)
})

test('campo ausente ou nao numerico vira null, nunca 0; creditData ausente nao lanca', () => {
  const snap = cardSnapshotFromAccount(
    { id: 'c', type: 'CREDIT', balance: 'abc', creditData: { creditLimit: null, availableCreditLimit: '12' } },
    CTX
  )
  assert.equal(snap.creditLimitCents, null)
  assert.equal(snap.availableLimitCents, null)
  assert.equal(snap.balanceCents, null)
  assert.equal(snap.brand, null)
  assert.equal(snap.level, null)
  assert.equal(snap.status, null)
  assert.equal(snap.isLimitFlexible, null)
  assert.equal(snap.name, '')

  const bare = cardSnapshotFromAccount({ id: 'c2', type: 'CREDIT' }, CTX)
  assert.equal(bare.creditLimitCents, null)
  assert.equal(bare.availableLimitCents, null)
  assert.equal(bare.balanceCents, null)

  const nan = cardSnapshotFromAccount({ id: 'c3', type: 'CREDIT', balance: Number.NaN }, CTX)
  assert.equal(nan.balanceCents, null)
})

test('usa name quando nao ha marketingName', () => {
  const snap = cardSnapshotFromAccount({ id: 'c', type: 'CREDIT', name: 'Cartao X' }, CTX)
  assert.equal(snap.name, 'Cartao X')
})

test('conta que nao e CREDIT devolve null', () => {
  assert.equal(cardSnapshotFromAccount({ id: 'b', type: 'BANK', balance: 10 }, CTX), null)
  assert.equal(cardSnapshotFromAccount(null, CTX), null)
})

test('o snapshot nao carrega numero do cartao, titular, CPF nem cartoes adicionais', () => {
  const dirty = {
    ...CREDIT,
    number: '1234',
    owner: 'Fulano de Tal',
    taxNumber: '00000000000',
    creditData: {
      ...CREDIT.creditData,
      number: '5555',
      holderName: 'Fulano',
      additionalCards: [{ number: '9999', name: 'Outro' }],
    },
  }
  const snap = cardSnapshotFromAccount(dirty, CTX)
  const allowed = [
    'accountId', 'itemId', 'person', 'name', 'brand', 'level', 'status', 'isLimitFlexible',
    'creditLimitCents', 'availableLimitCents', 'balanceCents',
  ]
  assert.deepEqual(Object.keys(snap).sort(), [...allowed].sort())
  const json = JSON.stringify(snap)
  for (const secret of ['1234', '5555', '9999', 'Fulano', '00000000000', 'additional']) {
    assert.ok(!json.includes(secret), `vazou ${secret}`)
  }
})

test('cardLimitView com os numeros reais do dono: usado 181,41, 91% e warn', () => {
  const view = cardLimitView({ creditLimitCents: 20000, availableLimitCents: 1859, balanceCents: 18141 })
  assert.deepEqual(view, {
    limitCents: 20000,
    availableCents: 1859,
    usedCents: 18141,
    usedPct: 91,
    state: 'warn',
    billCents: 18141,
  })
})

test('cardLimitView: ok abaixo de 80, over acima de 100 (pct passa de 100)', () => {
  const ok = cardLimitView({ creditLimitCents: 10000, availableLimitCents: 9000, balanceCents: 1000 })
  assert.equal(ok.usedPct, 10)
  assert.equal(ok.state, 'ok')
  const over = cardLimitView({ creditLimitCents: 10000, availableLimitCents: -500, balanceCents: 10500 })
  assert.equal(over.usedCents, 10500)
  assert.equal(over.usedPct, 105)
  assert.equal(over.state, 'over')
})

test('cardLimitView: dado faltando vira null, nunca zero', () => {
  const none = cardLimitView({ creditLimitCents: null, availableLimitCents: 100, balanceCents: null })
  assert.deepEqual(none, {
    limitCents: null,
    availableCents: 100,
    usedCents: null,
    usedPct: null,
    state: null,
    billCents: null,
  })
  const noAvail = cardLimitView({ creditLimitCents: 20000, availableLimitCents: null, balanceCents: 5 })
  assert.equal(noAvail.usedCents, null)
  assert.equal(noAvail.usedPct, null)
  assert.equal(noAvail.state, null)
  assert.equal(noAvail.limitCents, 20000)
  const zeroLimit = cardLimitView({ creditLimitCents: 0, availableLimitCents: 0, balanceCents: 0 })
  assert.equal(zeroLimit.usedCents, null)
  assert.equal(zeroLimit.usedPct, null)
  assert.equal(zeroLimit.billCents, 0)
  const empty = cardLimitView(null)
  assert.equal(empty.limitCents, null)
  assert.equal(empty.billCents, null)
})
