import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collapseReducer, COLLAPSE_AT } from './collapse.js'

const OPEN = { collapsed: false, lock: false }
const COLLAPSED = { collapsed: true, lock: false }
const LOCKED = { collapsed: false, lock: true }
const scroll = (top) => ({ type: 'scroll', top })

test('o limiar de recolhimento e 24px', () => {
  assert.equal(COLLAPSE_AT, 24)
})

test('rolar alem de 24 sem lock recolhe e devolve um estado novo', () => {
  const next = collapseReducer(OPEN, scroll(25))
  assert.deepEqual(next, { collapsed: true, lock: false })
  assert.notEqual(next, OPEN)
})

test('ate 24 devolve o MESMO objeto (sem laco de re-render)', () => {
  assert.equal(collapseReducer(OPEN, scroll(24)), OPEN)
  assert.equal(collapseReducer(OPEN, scroll(10)), OPEN)
  assert.equal(collapseReducer(OPEN, scroll(1)), OPEN)
  assert.equal(collapseReducer(OPEN, scroll(0)), OPEN)
})

test('recolhido: rolar mais nao muda nada, e voltar ao topo reabre e limpa o lock', () => {
  assert.equal(collapseReducer(COLLAPSED, scroll(300)), COLLAPSED)
  assert.equal(collapseReducer(COLLAPSED, scroll(5)), COLLAPSED)
  assert.deepEqual(collapseReducer(COLLAPSED, scroll(0)), { collapsed: false, lock: false })
  assert.deepEqual(collapseReducer(COLLAPSED, scroll(-3)), { collapsed: false, lock: false })
})

test('toggle: aberto para recolhido nao trava; recolhido para aberto trava', () => {
  assert.deepEqual(collapseReducer(OPEN, { type: 'toggle' }), { collapsed: true, lock: false })
  assert.deepEqual(collapseReducer(COLLAPSED, { type: 'toggle' }), { collapsed: false, lock: true })
  assert.deepEqual(collapseReducer(LOCKED, { type: 'toggle' }), { collapsed: true, lock: false })
})

test('com lock e aberto, rolar alem de 24 nao recolhe sozinho', () => {
  assert.equal(collapseReducer(LOCKED, scroll(100)), LOCKED)
  assert.equal(collapseReducer(LOCKED, scroll(25)), LOCKED)
  assert.equal(collapseReducer(LOCKED, scroll(5)), LOCKED)
})

test('com lock, voltar ao topo limpa o lock sem recolher', () => {
  assert.deepEqual(collapseReducer(LOCKED, scroll(0)), { collapsed: false, lock: false })
})

test('depois de limpar o lock, rolar de novo volta a recolher', () => {
  let state = collapseReducer(LOCKED, scroll(0))
  state = collapseReducer(state, scroll(40))
  assert.deepEqual(state, { collapsed: true, lock: false })
})

test('reset devolve aberto e sem lock', () => {
  assert.deepEqual(collapseReducer(COLLAPSED, { type: 'reset' }), { collapsed: false, lock: false })
  assert.deepEqual(collapseReducer(LOCKED, { type: 'reset' }), { collapsed: false, lock: false })
  // ja aberto e sem lock: mesma referencia
  assert.equal(collapseReducer(OPEN, { type: 'reset' }), OPEN)
})

test('acao desconhecida, ausente ou com valor invalido devolve o mesmo estado', () => {
  assert.equal(collapseReducer(OPEN, { type: 'nada' }), OPEN)
  assert.equal(collapseReducer(COLLAPSED, /** @type {any} */ (undefined)), COLLAPSED)
  assert.equal(collapseReducer(OPEN, scroll(Number.NaN)), OPEN)
  assert.equal(collapseReducer(OPEN, { type: 'scroll' }), OPEN)
})
