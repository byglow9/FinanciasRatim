import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupKeyOf, compareGroupKeys } from './categoryOrder.js'

const defs = [
  { id: 'alimentacao', name: 'Alimentacao' },
  { id: 'antiga', name: 'Antiga', archived: true },
  { id: 'transporte', name: 'Transporte' },
  { id: 'moradia', name: 'Moradia', archived: true },
]

test('groupKeyOf resolve por categoryId', () => {
  const g = groupKeyOf({ categoryId: 'transporte', category: 'qualquer' }, defs)
  assert.equal(g.key, 'transporte')
  assert.equal(g.label, 'Transporte')
  assert.equal(g.def?.id, 'transporte')
})

test('groupKeyOf sem id resolve o texto pelo nome da categoria, sem caixa nem acento', () => {
  const g = groupKeyOf({ category: 'ALIMENTAÇÃO' }, defs)
  assert.equal(g.key, 'alimentacao')
  assert.equal(g.def?.id, 'alimentacao')
})

test('groupKeyOf de id desconhecido cai no texto; texto sem definicao vira grupo legado', () => {
  assert.equal(groupKeyOf({ categoryId: 'sumiu', category: 'Moradia' }, defs).key, 'moradia')
  const legacy = groupKeyOf({ category: '  Pet Shop ' }, defs)
  assert.equal(legacy.def, null)
  assert.equal(legacy.label, 'Pet Shop')
  assert.notEqual(legacy.key, 'pet-shop-def')
  assert.ok(legacy.key.startsWith('legacy:'))
})

test('groupKeyOf sem categoria nenhuma vira legado "Sem categoria"', () => {
  const g = groupKeyOf({}, defs)
  assert.equal(g.def, null)
  assert.equal(g.label, 'Sem categoria')
})

test('ordem: ativas na ordem do array, depois arquivadas, depois legadas em A a Z', () => {
  const items = [
    { category: 'Zebra' },
    { categoryId: 'moradia' },
    { categoryId: 'transporte' },
    { category: 'Abacate' },
    { categoryId: 'antiga' },
    { categoryId: 'alimentacao' },
    { category: 'água' },
  ]
  const keys = items.map((i) => groupKeyOf(i, defs)).sort(compareGroupKeys)
  assert.deepEqual(
    keys.map((k) => k.label),
    ['Alimentacao', 'Transporte', 'Antiga', 'Moradia', 'Abacate', 'água', 'Zebra'],
  )
})

test('a ordem nao depende de pago ou pendente nem de valor', () => {
  const a = { categoryId: 'alimentacao', paid: true, amount: 1 }
  const b = { categoryId: 'transporte', paid: false, amount: 9999 }
  const order = (x, y) => [groupKeyOf(x, defs), groupKeyOf(y, defs)].sort(compareGroupKeys).map((k) => k.key)
  const before = order(a, b)
  const after = order({ ...a, paid: false, amount: 5000 }, { ...b, paid: true, amount: 1 })
  assert.deepEqual(before, ['alimentacao', 'transporte'])
  assert.deepEqual(after, before)
})

test('compareGroupKeys devolve 0 para o mesmo grupo', () => {
  const g = groupKeyOf({ categoryId: 'transporte' }, defs)
  assert.equal(compareGroupKeys(g, groupKeyOf({ category: 'transporte' }, defs)), 0)
})
