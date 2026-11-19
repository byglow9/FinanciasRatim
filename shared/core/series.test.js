import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf, shiftCycle } from './cycle.js'
import { cycleSeries } from './series.js'
import { DEFAULT_CATEGORY_DEFS } from './categories.js'

const tx = (type, amount, iso, extra = {}) => ({ type, amount, date: new Date(iso), ...extra })

// Dia de salario 15, "agora" em 20/01/2026: ciclo atual 15/01 a 14/02 (SP, UTC-3).
const jan = cycleOf(new Date('2026-01-20T15:00:00Z'), 15)
const dez = shiftCycle(jan, -1)
const nov = shiftCycle(jan, -2)

test('os ciclos de teste cruzam a virada do ano', () => {
  assert.equal(nov.key, '2025-11')
  assert.equal(dez.key, '2025-12')
  assert.equal(jan.key, '2026-01')
  assert.equal(dez.start.toISOString(), '2025-12-15T03:00:00.000Z')
  assert.equal(dez.end.toISOString(), '2026-01-15T02:59:59.999Z')
})

test('uma entrada por ciclo pedido, do mais antigo ao mais recente, mesmo vazio', () => {
  const r = cycleSeries({ transactions: [], cycles: [jan, nov, dez], defs: DEFAULT_CATEGORY_DEFS })
  assert.deepEqual(
    r.map((p) => p.key),
    ['2025-11', '2025-12', '2026-01']
  )
  for (const p of r) {
    assert.equal(p.entradasCents, 0)
    assert.equal(p.saidasCents, 0)
    assert.equal(p.saldoCents, 0)
    assert.deepEqual(p.byCategory, [])
  }
  assert.equal(r[0].cycle, nov)
})

test('fronteiras: cycle.start e cycle.end entram; 1 ms depois do fim vai para o proximo ciclo', () => {
  const list = [
    tx('saida', 10, '2025-12-15T03:00:00.000Z', { categoryId: 'lazer' }), // start de dez
    tx('saida', 20, '2026-01-15T02:59:59.999Z', { categoryId: 'lazer' }), // end de dez
    tx('saida', 40, '2026-01-15T03:00:00.000Z', { categoryId: 'lazer' }), // start de jan
    tx('saida', 80, '2025-12-15T02:59:59.999Z', { categoryId: 'lazer' }), // 1 ms antes de dez: nov
  ]
  const r = cycleSeries({ transactions: list, cycles: [nov, dez, jan], defs: DEFAULT_CATEGORY_DEFS })
  assert.equal(r[0].saidasCents, 8000)
  assert.equal(r[1].saidasCents, 3000)
  assert.equal(r[2].saidasCents, 4000)
})

test('lancamento fora de todos os ciclos pedidos e ignorado', () => {
  const list = [tx('saida', 99, '2025-06-01T15:00:00Z'), tx('entrada', 99, '2026-06-01T15:00:00Z')]
  const r = cycleSeries({ transactions: list, cycles: [dez, jan], defs: DEFAULT_CATEGORY_DEFS })
  assert.equal(r[0].entradasCents + r[0].saidasCents + r[1].entradasCents + r[1].saidasCents, 0)
})

test('soma em centavos inteiros, ignora transfer verdadeiro e calcula o saldo', () => {
  const list = [
    tx('entrada', 0.1, '2026-01-20T15:00:00Z'),
    tx('entrada', 0.2, '2026-01-21T15:00:00Z'),
    tx('saida', 0.05, '2026-01-22T15:00:00Z', { categoryId: 'outros' }),
    tx('saida', 500, '2026-01-23T15:00:00Z', { categoryId: 'outros', transfer: true }),
    tx('entrada', 700, '2026-01-24T15:00:00Z', { transfer: true }),
    tx('saida', 3, '2026-01-25T15:00:00Z', { categoryId: 'outros', transfer: false }),
  ]
  const [p] = cycleSeries({ transactions: list, cycles: [jan], defs: DEFAULT_CATEGORY_DEFS })
  assert.equal(p.entradasCents, 30)
  assert.equal(p.saidasCents, 305)
  assert.equal(p.saldoCents, -275)
  assert.ok(Number.isInteger(p.entradasCents) && Number.isInteger(p.saidasCents))
})

test('byCategory soma so saidas por categoria resolvida, ordenada por valor decrescente', () => {
  const list = [
    tx('saida', 30, '2026-01-20T15:00:00Z', { categoryId: 'lazer' }),
    tx('saida', 100, '2026-01-21T15:00:00Z', { category: 'Alimentacao' }),
    tx('saida', 50, '2026-01-22T15:00:00Z', { categoryId: 'alimentacao' }),
    tx('saida', 20, '2026-01-23T15:00:00Z', { category: 'Texto Legado' }),
    tx('entrada', 9999, '2026-01-24T15:00:00Z', { categoryId: 'salario' }),
  ]
  const [p] = cycleSeries({ transactions: list, cycles: [jan], defs: DEFAULT_CATEGORY_DEFS })
  assert.deepEqual(p.byCategory, [
    { key: 'alimentacao', label: 'Alimentacao', cents: 15000 },
    { key: 'lazer', label: 'Lazer', cents: 3000 },
    { key: 'legacy:texto legado', label: 'Texto Legado', cents: 2000 },
  ])
})

test('empate de valor na categoria desempata pela chave, de forma estavel', () => {
  const list = [
    tx('saida', 10, '2026-01-20T15:00:00Z', { categoryId: 'saude' }),
    tx('saida', 10, '2026-01-21T15:00:00Z', { categoryId: 'lazer' }),
  ]
  const [p] = cycleSeries({ transactions: list, cycles: [jan], defs: DEFAULT_CATEGORY_DEFS })
  assert.deepEqual(
    p.byCategory.map((c) => c.key),
    ['lazer', 'saude']
  )
})

test('o resultado e o mesmo em qualquer fuso do host (rodado em UTC e Asia/Tokyo)', () => {
  // 31/12 23:30 em SP e 01/01 de manha em Toquio: precisa cair no ciclo de dezembro.
  const list = [
    tx('saida', 12.34, '2026-01-01T02:30:00Z', { categoryId: 'lazer' }),
    tx('entrada', 1000, '2025-12-15T03:00:00.000Z'),
    tx('saida', 1, '2026-01-15T03:00:00.000Z', { categoryId: 'lazer' }),
  ]
  const r = cycleSeries({ transactions: list, cycles: [dez, jan], defs: DEFAULT_CATEGORY_DEFS })
  assert.equal(r[0].saidasCents, 1234)
  assert.equal(r[0].entradasCents, 100000)
  assert.equal(r[1].saidasCents, 100)
})

test('nao altera as listas recebidas', () => {
  const list = [tx('saida', 5, '2026-01-20T15:00:00Z', { categoryId: 'lazer' })]
  const cycles = [jan, nov, dez]
  cycleSeries({ transactions: list, cycles, defs: DEFAULT_CATEGORY_DEFS })
  assert.deepEqual(
    cycles.map((c) => c.key),
    ['2026-01', '2025-11', '2025-12']
  )
  assert.equal(list.length, 1)
})
