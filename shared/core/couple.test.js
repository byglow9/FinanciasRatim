import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NEAR_TIE_RATIO, coupleSummary, leadCategories, splitShare } from './couple.js'

const DEFS = [
  { id: 'mercado', name: 'Mercado' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'lazer', name: 'Lazer' },
  { id: 'antiga', name: 'Antiga', archived: true },
]

const D = new Date('2026-11-10T15:00:00Z')
const out = (amount, categoryId, extra = {}) => ({ type: 'saida', amount, date: D, categoryId, ...extra })
const inn = (amount, extra = {}) => ({ type: 'entrada', amount, date: D, ...extra })

test('splitShare: percentuais inteiros que somam 100 por maior resto', () => {
  assert.deepEqual(splitShare(3915, 3410), { aPct: 53, bPct: 47, total: 7325 })
  const thirds = splitShare(1, 2)
  assert.equal(thirds.aPct + thirds.bPct, 100)
  assert.deepEqual(thirds, { aPct: 33, bPct: 67, total: 3 })
  const other = splitShare(2, 1)
  assert.deepEqual(other, { aPct: 67, bPct: 33, total: 3 })
})

test('splitShare: 53 e 47 nao viram 53 e 48', () => {
  const r = splitShare(5300, 4700)
  assert.deepEqual(r, { aPct: 53, bPct: 47, total: 10000 })
  assert.equal(r.aPct + r.bPct, 100)
})

test('splitShare: soma 100 para qualquer par pequeno', () => {
  for (let a = 0; a <= 40; a += 1) {
    for (let b = 0; b <= 40; b += 1) {
      if (a + b === 0) continue
      const r = splitShare(a, b)
      assert.equal(r.aPct + r.bPct, 100, `${a} e ${b}`)
      assert.equal(r.total, a + b)
    }
  }
})

test('splitShare: total zero nao inventa percentual', () => {
  assert.deepEqual(splitShare(0, 0), { aPct: 0, bPct: 0, total: 0 })
})

test('splitShare: um lado zero leva 100 e o outro 0', () => {
  assert.deepEqual(splitShare(500, 0), { aPct: 100, bPct: 0, total: 500 })
  assert.deepEqual(splitShare(0, 500), { aPct: 0, bPct: 100, total: 500 })
})

test('splitShare: valor invalido ou negativo conta como zero', () => {
  assert.deepEqual(splitShare(-5, 10), { aPct: 0, bPct: 100, total: 10 })
  assert.deepEqual(splitShare(Number.NaN, 0), { aPct: 0, bPct: 0, total: 0 })
})

test('coupleSummary: soma entradas, saidas e saldo de cada um e juntos em centavos', () => {
  const s = coupleSummary({
    first: [inn(5200), out(1210.1, 'mercado'), out(2704.9, 'transporte')],
    second: [inn(4050.55), out(3410.2, 'transporte')],
    defs: DEFS,
  })
  assert.deepEqual(s.first, { inCents: 520000, outCents: 391500, balanceCents: 128500 })
  assert.deepEqual(s.second, { inCents: 405055, outCents: 341020, balanceCents: 64035 })
  assert.deepEqual(s.together, { inCents: 925055, outCents: 732520, balanceCents: 192535 })
  assert.deepEqual(s.split, { aPct: 53, bPct: 47, total: 732520 })
})

test('coupleSummary: centavos inteiros, sem erro de ponto flutuante', () => {
  const s = coupleSummary({
    first: [out(0.1, 'mercado'), out(0.2, 'mercado')],
    second: [],
    defs: DEFS,
  })
  assert.equal(s.first.outCents, 30)
  assert.ok(Number.isInteger(s.together.outCents))
})

test('coupleSummary: ignora transferencia verdadeira em entradas e saidas', () => {
  const s = coupleSummary({
    first: [inn(1000), inn(500, { transfer: true }), out(200, 'mercado'), out(900, 'mercado', { transfer: true })],
    second: [out(100, 'lazer', { transfer: true })],
    defs: DEFS,
  })
  assert.equal(s.first.inCents, 100000)
  assert.equal(s.first.outCents, 20000)
  assert.equal(s.second.outCents, 0)
  // transfer false ou ausente conta
  const s2 = coupleSummary({ first: [out(10, 'lazer', { transfer: false })], second: [], defs: DEFS })
  assert.equal(s2.first.outCents, 1000)
})

test('coupleSummary: scaleMaxCents e a maior das seis medidas absolutas', () => {
  const s = coupleSummary({
    first: [inn(1000), out(300, 'mercado')],
    second: [inn(200), out(900, 'mercado')],
    defs: DEFS,
  })
  // medidas: 1000, 300, 700 / 200, 900, -700 -> maior 1000
  assert.equal(s.scaleMaxCents, 100000)

  const negative = coupleSummary({
    first: [out(5000, 'mercado'), inn(100)],
    second: [out(10, 'lazer')],
    defs: DEFS,
  })
  // saldo da primeira pessoa = -4900 (abs 4900), saida = 5000
  assert.equal(negative.first.balanceCents, -490000)
  assert.equal(negative.scaleMaxCents, 500000)

  const empty = coupleSummary({ first: [], second: [], defs: DEFS })
  assert.equal(empty.scaleMaxCents, 0)
  assert.deepEqual(empty.split, { aPct: 0, bPct: 0, total: 0 })
  assert.deepEqual(empty.leads, [])
})

test('coupleSummary: saldo negativo de um nao quebra o conjunto', () => {
  const s = coupleSummary({
    first: [out(300, 'mercado')],
    second: [inn(1000)],
    defs: DEFS,
  })
  assert.equal(s.together.balanceCents, 70000)
  assert.equal(s.first.balanceCents, -30000)
})

test('leadCategories: lider de cada categoria por groupKeyOf', () => {
  const leads = leadCategories(
    [out(1210, 'mercado'), out(100, 'transporte')],
    [out(300, 'mercado'), out(980, 'transporte')],
    DEFS,
  )
  const by = Object.fromEntries(leads.map((l) => [l.key, l]))
  assert.equal(by.mercado.leader, 'first')
  assert.equal(by.mercado.firstCents, 121000)
  assert.equal(by.mercado.secondCents, 30000)
  assert.equal(by.transporte.leader, 'second')
  // maior gasto do casal primeiro
  assert.deepEqual(leads.map((l) => l.key), ['mercado', 'transporte'])
})

test('leadCategories: quase empatado quando os dois gastaram e a diferenca e de ate 10% do maior', () => {
  assert.equal(NEAR_TIE_RATIO, 0.1)
  const tie = leadCategories([out(410, 'lazer')], [out(395, 'lazer')], DEFS)
  assert.equal(tie[0].leader, 'tie')

  // exatamente 10% do maior: ainda empate (1000 contra 900)
  const edge = leadCategories([out(1000, 'lazer')], [out(900, 'lazer')], DEFS)
  assert.equal(edge[0].leader, 'tie')

  // acima de 10%: lider
  const beyond = leadCategories([out(1000, 'lazer')], [out(899.99, 'lazer')], DEFS)
  assert.equal(beyond[0].leader, 'first')
})

test('leadCategories: so um gastou nunca e empate, mesmo com valor pequeno', () => {
  const only = leadCategories([out(5, 'lazer')], [], DEFS)
  assert.equal(only[0].leader, 'first')
  assert.equal(only[0].secondCents, 0)
  const onlySecond = leadCategories([], [out(5, 'lazer')], DEFS)
  assert.equal(onlySecond[0].leader, 'second')
})

test('leadCategories: ignora transferencia e entrada, e agrupa legado pelo texto', () => {
  const leads = leadCategories(
    [out(100, 'mercado', { transfer: true }), inn(900), { type: 'saida', amount: 50, date: D, category: 'Pet' }],
    [{ type: 'saida', amount: 20, date: D, category: 'pet' }],
    DEFS,
  )
  assert.equal(leads.length, 1)
  assert.equal(leads[0].key, 'legacy:pet')
  assert.equal(leads[0].leader, 'first')
})

test('leadCategories: ordem por maior valor do casal, empate pela ordem das categorias', () => {
  const leads = leadCategories(
    [out(100, 'lazer'), out(100, 'mercado')],
    [out(100, 'transporte')],
    DEFS,
  )
  assert.deepEqual(leads.map((l) => l.key), ['mercado', 'transporte', 'lazer'])
})

// Regressao do cartao (D-14, D-12): a compra conta como gasto da pessoa na data
// da compra; o pagamento da fatura e o estorno sao transferencia e ficam fora.
test('coupleSummary conta a compra do cartao e ignora pagamento da fatura e estorno', () => {
  const compra = out(181.41, 'mercado', { cardKind: 'purchase' })
  const manual = out(20, 'mercado', { cardKind: 'purchase', cardId: 'acc-1' })
  const pagamento = out(181.41, undefined, { cardKind: 'payment', transfer: true })
  const estorno = inn(30, { cardKind: 'refund', transfer: true })
  const s = coupleSummary({ first: [compra, manual, pagamento, estorno], second: [inn(1000)], defs: DEFS })
  assert.equal(s.first.outCents, 20141)
  assert.equal(s.first.inCents, 0)
  assert.equal(s.second.inCents, 100000)
  assert.equal(s.together.outCents, 20141)
})
