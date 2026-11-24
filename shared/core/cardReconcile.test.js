import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reconcileCardTxs } from './cardReconcile.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = Date.UTC(2026, 10, 20, 15)

const ex = (docId, bankId, extra = {}) => ({
  docId,
  bankId,
  cents: 1000,
  description: 'Loja Teste',
  dateMs: T0,
  status: 'pending',
  ...extra,
})
const inc = (bankId, extra = {}) => ({
  bankId,
  cents: 1000,
  description: 'Loja Teste',
  dateMs: T0,
  status: 'posted',
  ...extra,
})
const run = (existing, incoming, fetchedFromMs = T0 - 30 * DAY) =>
  reconcileCardTxs({ existing, incoming, fetchedFromMs })

test('mesmo id: pendente vira confirmada e apenas atualiza', () => {
  const r = run([ex('d1', 'X')], [inc('X')])
  assert.equal(r.updates.length, 1)
  assert.equal(r.updates[0].docId, 'd1')
  assert.equal(r.updates[0].incoming.status, 'posted')
  assert.deepEqual([r.rebinds, r.creates, r.vanished], [[], [], []])
})

test('id recriado: religa A para B pelo valor, descricao e data a ate 3 dias', () => {
  const r = run(
    [ex('d1', 'A', { status: 'posted' })],
    [inc('B', { dateMs: T0 + 3 * DAY })]
  )
  assert.equal(r.rebinds.length, 1)
  assert.equal(r.rebinds[0].docId, 'd1')
  assert.equal(r.rebinds[0].fromBankId, 'A')
  assert.equal(r.rebinds[0].incoming.bankId, 'B')
  assert.deepEqual([r.updates, r.creates, r.vanished], [[], [], []])
})

test('duas compras identicas no mesmo dia com ids trocados religam uma a uma', () => {
  const r = run([ex('d1', 'A'), ex('d2', 'B')], [inc('C'), inc('D')])
  assert.equal(r.rebinds.length, 2)
  assert.deepEqual(new Set(r.rebinds.map((x) => x.docId)), new Set(['d1', 'd2']))
  assert.deepEqual(new Set(r.rebinds.map((x) => x.incoming.bankId)), new Set(['C', 'D']))
  assert.equal(r.creates.length, 0)
})

test('duas entradas para uma existente: so uma religa, a outra e criacao', () => {
  const r = run([ex('d1', 'A')], [inc('C'), inc('D')])
  assert.equal(r.rebinds.length, 1)
  assert.equal(r.creates.length, 1)
})

test('um centavo de diferenca, descricao diferente ou mais de 3 dias nao casam', () => {
  for (const diff of [
    { cents: 1001 },
    { description: 'Outra Coisa Qualquer' },
    { dateMs: T0 + 3 * DAY + 1 },
  ]) {
    const r = run([ex('d1', 'A')], [inc('B', diff)])
    assert.equal(r.rebinds.length, 0, JSON.stringify(diff))
    assert.equal(r.creates.length, 1)
    assert.deepEqual(r.vanished, ['d1'])
  }
})

test('vanished: so pendente sem par dentro da janela buscada', () => {
  const from = T0 - 10 * DAY
  const r = run(
    [
      ex('pend', 'P'),
      ex('posted', 'Q', { status: 'posted' }),
      ex('antiga', 'R', { dateMs: from - DAY }),
    ],
    [],
    from
  )
  assert.deepEqual(r.vanished, ['pend'])
})

test('descricao contida na outra casa quando a menor tem 5 ou mais caracteres', () => {
  const ok = run([ex('d1', 'A', { description: 'Mercado Bom Preco' })], [inc('B', { description: 'mercado' })])
  assert.equal(ok.rebinds.length, 1)
  const curta = run([ex('d1', 'A', { description: 'Mercado Bom Preco' })], [inc('B', { description: 'merc' })])
  assert.equal(curta.rebinds.length, 0)
})

test('mesma entrada com duas existentes: menor diferenca de data, e no empate a pendente', () => {
  const porData = run(
    [ex('longe', 'A', { dateMs: T0 + 2 * DAY }), ex('perto', 'B', { dateMs: T0 + DAY })],
    [inc('N')]
  )
  assert.equal(porData.rebinds[0].docId, 'perto')

  const empate = run(
    [ex('conf', 'A', { status: 'posted' }), ex('pend', 'B', { status: 'pending' })],
    [inc('N')]
  )
  assert.equal(empate.rebinds[0].docId, 'pend')
})

test('historico completo (D-13): fetchedFromMs 0 nao descarta por idade', () => {
  const old = T0 - 14 * 30 * DAY
  const r = run(
    [ex('pend', 'P', { dateMs: old }), ex('conf', 'C', { dateMs: old, status: 'posted' })],
    [],
    0
  )
  assert.deepEqual(r.vanished, ['pend'])
})

test('id igual tem prioridade sobre o pareamento por valor', () => {
  const r = run([ex('d1', 'A'), ex('d2', 'B')], [inc('A'), inc('C')])
  assert.equal(r.updates.length, 1)
  assert.equal(r.updates[0].docId, 'd1')
  assert.equal(r.rebinds.length, 1)
  assert.equal(r.rebinds[0].docId, 'd2')
})

test('contrato: so lancamentos de origem banco, entrada manual nao e conhecida aqui', () => {
  // existing e so o que o servidor gravou do banco; sem docId de manual, nada dele some
  const r = run([], [inc('A')])
  assert.equal(r.creates.length, 1)
  assert.deepEqual(r.vanished, [])
})

test('funcao pura: nao altera as listas recebidas', () => {
  const existing = [ex('d1', 'A')]
  const incoming = [inc('B')]
  const a = JSON.stringify([existing, incoming])
  run(existing, incoming)
  assert.equal(JSON.stringify([existing, incoming]), a)
})
