import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cardAmountCents,
  parseBillForecast,
  classifyCardTx,
  PURCHASE_DATE_FIELD,
} from './cardTx.js'
import { isCardBillPayment, isSelfTransfer } from './classify.js'

// Dados sinteticos: nenhuma loja, valor ou identificador real do dono.
const brl = (amount, extra = {}) => ({
  type: 'DEBIT',
  status: 'PENDING',
  amount,
  currencyCode: 'BRL',
  description: 'LOJA TESTE',
  date: '2026-11-20T00:00:00.000Z',
  billForecastDate: '2026-12',
  ...extra,
})

test('cardAmountCents: dolar usa o valor convertido (D-08), 5,00 USD = R$ 30,08', () => {
  const usd = { amount: 5, currencyCode: 'USD', amountInAccountCurrency: 30.08 }
  assert.equal(cardAmountCents(usd), 3008)
})

test('cardAmountCents: BRL e moeda ausente usam amount; absoluto', () => {
  assert.equal(cardAmountCents({ amount: 12.34, currencyCode: 'BRL' }), 1234)
  assert.equal(cardAmountCents({ amount: 12.34 }), 1234)
  assert.equal(cardAmountCents({ amount: -12.34, currencyCode: 'BRL' }), 1234)
  assert.equal(cardAmountCents({ amount: 0.1 + 0.2 }), 30)
})

test('cardAmountCents: moeda estrangeira sem valor convertido devolve null', () => {
  assert.equal(cardAmountCents({ amount: 5, currencyCode: 'USD' }), null)
  assert.equal(cardAmountCents({ amount: 5, currencyCode: 'USD', amountInAccountCurrency: null }), null)
  assert.equal(cardAmountCents({ amount: 5, currencyCode: 'USD', amountInAccountCurrency: 'x' }), null)
})

test('as seis compras de exemplo somam exatamente 18141 centavos', () => {
  const six = [
    { amount: 50.1, currencyCode: 'BRL' },
    { amount: 22.5, currencyCode: 'BRL' },
    { amount: 5, currencyCode: 'USD', amountInAccountCurrency: 30.08 },
    { amount: 1.13, currencyCode: 'BRL' },
    { amount: 40, currencyCode: 'BRL' },
    { amount: 37.6, currencyCode: 'BRL' },
  ]
  const total = six.reduce((s, tx) => s + cardAmountCents(tx), 0)
  assert.equal(total, 18141)
  assert.equal(cardAmountCents(six[2]), 3008)
})

test('parseBillForecast aceita AAAA-MM e ISO; rejeita o resto', () => {
  assert.equal(parseBillForecast('2026-12'), '2026-12')
  assert.equal(parseBillForecast('2026-12-01T00:00:00Z'), '2026-12')
  assert.equal(parseBillForecast('2026-12-01'), '2026-12')
  assert.equal(parseBillForecast(new Date('2026-12-01T00:00:00Z')), '2026-12')
  assert.equal(parseBillForecast(null), null)
  assert.equal(parseBillForecast(undefined), null)
  assert.equal(parseBillForecast('2026-13'), null)
  assert.equal(parseBillForecast('2026-00'), null)
  assert.equal(parseBillForecast('x'), null)
  assert.equal(parseBillForecast(202612), null)
})

test('classifyCardTx: DEBIT pendente vira compra pendente com mes da fatura da Pluggy', () => {
  const r = classifyCardTx(brl(10), { categoryNames: [] })
  assert.ok(r)
  assert.equal(r.kind, 'purchase')
  assert.equal(r.status, 'pending')
  assert.equal(r.cents, 1000)
  assert.equal(r.billMonth, '2026-12')
  assert.equal(r.billMonthSource, 'pluggy')
  // meia-noite UTC vira 12h de Brasilia (15h UTC)
  assert.equal(r.date.toISOString(), '2026-11-20T15:00:00.000Z')
  assert.equal(r.description, 'Loja Teste')
  assert.equal(r.raw, 'LOJA TESTE')
  assert.equal(r.installment, null)
})

test('classifyCardTx: sem mes da fatura, billMonth e a fonte ficam null', () => {
  const r = classifyCardTx(brl(10, { billForecastDate: null }), {})
  assert.equal(r.billMonth, null)
  assert.equal(r.billMonthSource, null)
})

test('classifyCardTx: status diferente de PENDING e posted', () => {
  assert.equal(classifyCardTx(brl(10, { status: 'POSTED' }), {}).status, 'posted')
  assert.equal(classifyCardTx(brl(10, { status: undefined }), {}).status, 'posted')
})

test('classifyCardTx: DEBIT negativo ainda e compra pelo valor absoluto', () => {
  const r = classifyCardTx(brl(-25), {})
  assert.equal(r.kind, 'purchase')
  assert.equal(r.cents, 2500)
})

test('classifyCardTx: CREDIT com texto de pagamento e payment; sem o texto e refund', () => {
  const pay = classifyCardTx(
    brl(100, { type: 'CREDIT', description: 'Pagamento de fatura' }),
    {}
  )
  assert.equal(pay.kind, 'payment')
  const op = classifyCardTx(brl(100, { type: 'CREDIT', operationType: 'PAGAMENTO_FATURA' }), {})
  assert.equal(op.kind, 'payment')
  const cat = classifyCardTx(brl(100, { type: 'CREDIT' }), { categoryNames: ['Credit card payment'] })
  assert.equal(cat.kind, 'payment')
  const refund = classifyCardTx(brl(100, { type: 'CREDIT', description: 'ESTORNO LOJA' }), {})
  assert.equal(refund.kind, 'refund')
})

test('classifyCardTx: sem type, o sinal decide', () => {
  assert.equal(classifyCardTx(brl(10, { type: undefined }), {}).kind, 'purchase')
  assert.equal(classifyCardTx(brl(-10, { type: undefined }), {}).kind, 'refund')
  const pay = classifyCardTx(
    brl(-10, { type: undefined, description: 'Pagamento recebido fatura cartao' }),
    {}
  )
  assert.equal(pay.kind, 'payment')
})

test('classifyCardTx: IOF e compra comum em BRL; zero devolve null; data futura fica', () => {
  const iof = classifyCardTx(brl(1.13, { description: 'IOF de compra internacional' }), {})
  assert.equal(iof.kind, 'purchase')
  assert.equal(iof.cents, 113)
  assert.equal(classifyCardTx(brl(0), {}), null)
  const future = classifyCardTx(brl(10, { date: '2099-01-10T00:00:00.000Z' }), {})
  assert.ok(future)
  assert.equal(future.date.getUTCFullYear(), 2099)
})

test('classifyCardTx: moeda estrangeira traz currency e valor em reais convertido', () => {
  const r = classifyCardTx(
    brl(5, { currencyCode: 'USD', amountInAccountCurrency: 30.08 }),
    {}
  )
  assert.equal(r.cents, 3008)
  assert.deepEqual(r.currency, { code: 'USD', originalCents: 500 })
  const local = classifyCardTx(brl(5), {})
  assert.equal('currency' in local, false)
})

test('classifyCardTx: dolar sem conversao fica sem valor em reais, nunca chutado', () => {
  const r = classifyCardTx(brl(5, { currencyCode: 'USD' }), {})
  assert.ok(r)
  assert.equal(r.cents, null)
  assert.equal(r.brlMissing, true)
  assert.deepEqual(r.currency, { code: 'USD', originalCents: 500 })
  const ok = classifyCardTx(brl(5), {})
  assert.equal(ok.brlMissing, false)
})

test('classifyCardTx: a saida tem so campos de lista fechada (sem cartao nem titular)', () => {
  const r = classifyCardTx(
    brl(10, {
      creditCardMetadata: { cardNumber: '1234' },
      paymentData: { payer: { documentNumber: { value: '123.456.789-00' } } },
      accountId: 'acc',
    }),
    {}
  )
  assert.deepEqual(Object.keys(r).sort(), [
    'billMonth',
    'billMonthSource',
    'brlMissing',
    'cents',
    'date',
    'description',
    'installment',
    'kind',
    'raw',
    'status',
  ])
  assert.doesNotMatch(JSON.stringify(r), /1234|123\.456|payer|cardNumber/)
})

test('a data da compra vem de um campo nomeado e documentado (regra ainda a confirmar)', () => {
  assert.equal(PURCHASE_DATE_FIELD, 'date')
  // se o campo escolhido faltar, cai no date
  const r = classifyCardTx(brl(10, { date: '2026-11-20T10:00:00.000Z' }), {})
  assert.equal(r.date.toISOString(), '2026-11-20T10:00:00.000Z')
})

test('isCardBillPayment e isSelfTransfer exportadas mantem o comportamento', () => {
  assert.equal(isCardBillPayment({ operationType: 'PAGAMENTO_FATURA' }, ''), true)
  assert.equal(isCardBillPayment({ description: 'PAGAMENTO DE FATURA' }, ''), true)
  assert.equal(isCardBillPayment({ description: 'Mercado' }, ''), false)
  assert.equal(isCardBillPayment({ description: 'x' }, 'credit card payment'), true)
  assert.equal(isSelfTransfer({ description: 'x' }, 'same person transfer'), true)
  assert.equal(
    isSelfTransfer(
      {
        paymentData: {
          payer: { documentNumber: { value: '111.222.333-44' } },
          receiver: { documentNumber: { value: '11122233344' } },
        },
      },
      ''
    ),
    true
  )
  assert.equal(isSelfTransfer({ description: 'x' }, ''), false)
})
