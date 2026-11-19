import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterTransactions, categoriesPresent } from './txFilter.js'

const defs = [
  { id: 'alimentacao', name: 'Alimentacao' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'antiga', name: 'Antiga', archived: true },
]

const d = (day) => new Date(`2026-11-${String(day).padStart(2, '0')}T15:00:00Z`)
const txs = [
  { id: '1', type: 'saida', amount: 30, date: d(1), description: 'Padaria São João', categoryId: 'alimentacao' },
  { id: '2', type: 'entrada', amount: 3000, date: d(2), description: 'Salário', category: 'Outros' },
  { id: '3', type: 'saida', amount: 12, date: d(3), description: 'Uber', categoryId: 'transporte' },
  { id: '4', type: 'saida', amount: 55, date: d(4), description: 'Mercado', category: 'ALIMENTAÇÃO' },
  { id: '5', type: 'saida', amount: 9, date: d(5), description: 'Xerox', category: 'Papelaria' },
  { id: '6', type: 'saida', amount: 20, date: d(6), description: 'Antigo', categoryId: 'antiga' },
]
const ids = (list) => list.map((t) => t.id)

test('sem filtro devolve tudo, na ordem de entrada', () => {
  assert.deepEqual(ids(filterTransactions(txs, {}, defs)), ['1', '2', '3', '4', '5', '6'])
})

test('type mantem so entradas ou so saidas', () => {
  assert.deepEqual(ids(filterTransactions(txs, { type: 'saida' }, defs)), ['1', '3', '4', '5', '6'])
  assert.deepEqual(ids(filterTransactions(txs, { type: 'entrada' }, defs)), ['2'])
})

test('categoryId mantem so a categoria, inclusive item que so tem o texto', () => {
  assert.deepEqual(ids(filterTransactions(txs, { categoryId: 'alimentacao' }, defs)), ['1', '4'])
  assert.deepEqual(ids(filterTransactions(txs, { categoryId: 'antiga' }, defs)), ['6'])
})

test('query casa descricao e nome de categoria, sem caixa nem acento', () => {
  assert.deepEqual(ids(filterTransactions(txs, { query: 'padaria sao joao' }, defs)), ['1'])
  assert.deepEqual(ids(filterTransactions(txs, { query: 'SALARIO' }, defs)), ['2'])
  assert.deepEqual(ids(filterTransactions(txs, { query: 'transp' }, defs)), ['3'])
  assert.deepEqual(ids(filterTransactions(txs, { query: 'alimentacao' }, defs)), ['1', '4'])
  assert.deepEqual(ids(filterTransactions(txs, { query: '   ' }, defs)), ['1', '2', '3', '4', '5', '6'])
  assert.deepEqual(ids(filterTransactions(txs, { query: 'nada disso' }, defs)), [])
})

test('filtros combinam e a query nao e tratada como regex', () => {
  assert.deepEqual(ids(filterTransactions(txs, { type: 'saida', categoryId: 'alimentacao', query: 'merc' }, defs)), ['4'])
  assert.deepEqual(ids(filterTransactions(txs, { query: '.*' }, defs)), [])
  assert.deepEqual(ids(filterTransactions(txs, { query: '(' }, defs)), [])
})

test('filterTransactions nao muta a entrada', () => {
  const copy = [...txs]
  filterTransactions(txs, { type: 'saida' }, defs)
  assert.deepEqual(txs, copy)
})

test('categoriesPresent: so as que existem no conjunto, na ordem de groupKeyOf, com contagem', () => {
  const present = categoriesPresent(txs, defs)
  assert.deepEqual(
    present.map((c) => [c.key, c.label, c.count]),
    [
      ['alimentacao', 'Alimentacao', 2],
      ['transporte', 'Transporte', 1],
      ['antiga', 'Antiga', 1],
      ['legacy:outros', 'Outros', 1],
      ['legacy:papelaria', 'Papelaria', 1],
    ],
  )
})

test('categoriesPresent de conjunto filtrado e de lista vazia', () => {
  assert.deepEqual(categoriesPresent([txs[2]], defs).map((c) => c.key), ['transporte'])
  assert.deepEqual(categoriesPresent([], defs), [])
})
