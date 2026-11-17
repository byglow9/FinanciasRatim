import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCategoryDefs } from './categories.js'
import { classify, cleanDescription, findDuplicate, mapCategory, toLocalDate } from './classify.js'

const now = new Date('2026-11-09T15:00:00Z')
const tx = (over) => ({
  id: 't1',
  date: '2026-11-05T00:00:00.000Z',
  description: 'Mercado',
  type: 'DEBIT',
  amount: -50.5,
  status: 'POSTED',
  ...over,
})
const bank = { accountType: 'BANK', hasCreditCard: false, now }
const card = { accountType: 'CREDIT', hasCreditCard: true, now }

test('data so-dia nao cai no dia anterior em Brasilia', () => {
  const d = toLocalDate('2026-11-05T00:00:00.000Z')
  assert.equal(d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), '05/11/2026')
})

test('debito em conta vira saida importada', () => {
  const r = classify(tx(), bank)
  assert.deepEqual([r.type, r.amount, r.status], ['saida', 50.5, 'imported'])
})

test('credito em conta vira entrada', () => {
  assert.equal(classify(tx({ type: 'CREDIT', amount: 3000 }), bank).type, 'entrada')
})

test('pendente em conta e ignorado ate efetivar; no cartao entra', () => {
  assert.equal(classify(tx({ status: 'PENDING' }), bank), null)
  assert.equal(classify(tx({ status: 'PENDING', amount: 80 }), card).status, 'imported')
})

test('parcela futura do cartao nao entra', () => {
  assert.equal(classify(tx({ amount: 80, date: '2026-12-05T00:00:00.000Z' }), card), null)
})

test('compra no cartao (valor positivo) vira saida', () => {
  assert.equal(classify(tx({ amount: 120 }), card).type, 'saida')
})

test('pagamento de fatura no lado do cartao e ignorado', () => {
  const r = classify(tx({ amount: -900, operationType: 'PAGAMENTO_FATURA' }), card)
  assert.deepEqual([r.status, r.reason], ['ignored', 'card_payment'])
})

test('pagamento de fatura na conta vai para revisao so se o cartao esta conectado', () => {
  const pay = tx({ description: 'Pagamento de fatura', amount: -900 })
  assert.equal(classify(pay, { ...bank, hasCreditCard: true }).reason, 'card_payment')
  assert.equal(classify(pay, bank).status, 'imported')
})

test('transferencia entre contas proprias vai para revisao', () => {
  const r = classify(tx(), { ...bank, categoryNames: ['Same person transfer - PIX'] })
  assert.deepEqual([r.status, r.reason], ['review', 'self_transfer'])
})

test('duplicata: mesmo tipo e valor em ate 3 dias, usada uma vez so', () => {
  const entry = classify(tx(), bank)
  const manual = [
    { id: 'a', type: 'saida', amount: 50.5, date: new Date('2026-11-06T12:00:00Z') },
    { id: 'b', type: 'saida', amount: 50.5, date: new Date('2026-11-20T12:00:00Z') },
    { id: 'c', type: 'entrada', amount: 50.5, date: new Date('2026-11-05T12:00:00Z') },
  ]
  assert.equal(findDuplicate(entry, manual, new Set()), 'a')
  assert.equal(findDuplicate(entry, manual, new Set(['a'])), null)
})

test('categoria da Pluggy e mapeada para as categorias do site', () => {
  const cats = buildCategoryDefs(['Alimentacao', 'Transporte', 'Servicos', 'Outros'])
  const name = (names) => mapCategory(names, cats).name
  assert.equal(name(['Eating out', 'Food and drinks', 'Services']), 'Alimentacao')
  assert.equal(name(['Taxi and ride-hailing', 'Transportation']), 'Transporte')
  assert.equal(name([]), 'Outros')
  // categoria removida das configuracoes cai em Outros
  assert.equal(name(['Pharmacy', 'Healthcare']), 'Outros')
  assert.deepEqual(mapCategory(['Taxi'], cats), { id: 'transporte', name: 'Transporte' })
})

test('descricoes do banco ficam legiveis', () => {
  const cases = [
    ['PIX QR CODE DINAMICO - DES: UBER DO BRASIL TECNOL 16/11 - DOCTO: 1234', 'Uber do Brasil Tecnol'],
    ['PIX QR CODE DINAMICO - DES: IFOOD.COM AGENCIA DE 16/11 - DOCTO: 1…', 'iFood.com Agencia'],
    ['PIX QR CODE DINAMICO - DES: MAREE INSTITUICAO DE 14/11 - DOCTO: 18…', 'Maree Instituicao'],
    ['PIX ENVIADO - DES: JULIA LOTHAMMER CHAGA 16/11 - DOCTO: 1204569', 'Pix para Julia Lothammer Chaga'],
    ['PIX RECEBIDO - REM: MOISES CORREA GOMES 14/11 - DOCTO: 1304541', 'Pix de Moises Correa Gomes'],
    ['DEPOSIT TRANSFER BDN - DAYSIELI TROYSE CAVENAGHI - DOCTO: 496482', 'Transferencia de Daysieli Troyse Cavenaghi'],
    ['MERCADO LIVRE', 'Mercado Livre'],
    ['', 'Transacao bancaria'],
  ]
  for (const [raw, expected] of cases) assert.equal(cleanDescription(raw), expected, raw)
})
