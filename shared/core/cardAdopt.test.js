import { test } from 'node:test'
import assert from 'node:assert/strict'
import { descriptionMatches, matchManualAdoptions, matchReverseAdoptions } from './cardAdopt.js'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const T0 = Date.UTC(2026, 10, 20, 15)
const CARD = 'acc-credit'

// manual do cartao com descricao generica (igual ao nome da categoria)
const manual = (docId, extra = {}) => ({
  docId,
  cents: 5230,
  description: 'Alimentacao',
  category: 'Alimentação',
  dateMs: T0,
  cardId: CARD,
  ...extra,
})
const bank = (bankId, extra = {}) => ({
  bankId,
  cents: 5230,
  description: 'Supermercado X',
  dateMs: T0,
  cardId: CARD,
  ...extra,
})
const imported = (docId, bankId, extra = {}) => ({
  docId,
  bankId,
  cents: 5230,
  description: 'Supermercado X',
  dateMs: T0,
  cardId: CARD,
  adoptedFromManual: false,
  ...extra,
})
const forward = (candidates, incoming) => matchManualAdoptions({ candidates, incoming })
const reverse = (candidates, list) => matchReverseAdoptions({ candidates, imported: list })

test('adota o manual generico do cartao pela compra do dia seguinte', () => {
  const r = forward([manual('m1')], [bank('b1', { dateMs: T0 + DAY })])
  assert.deepEqual(r.adoptions, [{ docId: 'm1', bankId: 'b1', legacy: false }])
  assert.equal(r.nearMiss, 0)
  assert.equal(r.ambiguous, 0)
})

test('descricao especifica diferente nao e adotada e conta nearMiss', () => {
  const r = forward(
    [manual('m1', { description: 'almoço com a ana' })],
    [bank('b1', { description: 'Restaurante Xyz' })]
  )
  assert.deepEqual(r.adoptions, [])
  assert.equal(r.nearMiss, 1)
})

test('descricao contida adota com 5 ou mais caracteres e nao com menos', () => {
  const ok = forward([manual('m1', { description: 'mercado' })], [bank('b1', { description: 'Supermercado X' })])
  assert.equal(ok.adoptions.length, 1)
  const short = forward([manual('m1', { description: 'merc' })], [bank('b1', { description: 'Supermercado X' })])
  assert.deepEqual(short.adoptions, [])
  assert.equal(short.nearMiss, 1)
})

test('manual antigo sem cardId de 8 meses atras e adotado como legado', () => {
  const old = T0 - 243 * DAY
  const r = forward([manual('m1', { cardId: null, dateMs: old })], [bank('b1', { dateMs: old })])
  assert.deepEqual(r.adoptions, [{ docId: 'm1', bankId: 'b1', legacy: true }])
})

test('manual de outro cartao nao e adotado nem contado', () => {
  const r = forward([manual('m1', { cardId: 'outro-cartao' })], [bank('b1')])
  assert.deepEqual(r.adoptions, [])
  assert.equal(r.nearMiss, 0)
})

test('3 dias casa, 4 dias nao, 1 centavo de diferenca nao', () => {
  assert.equal(forward([manual('m1')], [bank('b1', { dateMs: T0 + 3 * DAY })]).adoptions.length, 1)
  assert.equal(forward([manual('m1')], [bank('b1', { dateMs: T0 - 3 * DAY })]).adoptions.length, 1)
  assert.equal(forward([manual('m1')], [bank('b1', { dateMs: T0 + 4 * DAY })]).adoptions.length, 0)
  assert.equal(forward([manual('m1')], [bank('b1', { cents: 5231 })]).adoptions.length, 0)
})

test('dois manuais e duas compras identicas viram duas adocoes distintas', () => {
  const r = forward([manual('m1'), manual('m2')], [bank('b1'), bank('b2')])
  assert.equal(r.adoptions.length, 2)
  assert.deepEqual(new Set(r.adoptions.map((a) => a.docId)), new Set(['m1', 'm2']))
  assert.deepEqual(new Set(r.adoptions.map((a) => a.bankId)), new Set(['b1', 'b2']))
  assert.equal(r.ambiguous, 0)
})

test('dois manuais e uma compra: menor diferenca de data', () => {
  const r = forward([manual('m1', { dateMs: T0 - 2 * DAY }), manual('m2', { dateMs: T0 - DAY })], [bank('b1')])
  assert.deepEqual(r.adoptions, [{ docId: 'm2', bankId: 'b1', legacy: false }])
})

test('no empate de data vence o manual do cartao e depois o menor docId', () => {
  const card = forward([manual('a-legado', { cardId: null }), manual('z-cartao')], [bank('b1')])
  assert.deepEqual(card.adoptions, [{ docId: 'z-cartao', bankId: 'b1', legacy: false }])
  const ids = forward([manual('m9'), manual('m1')], [bank('b1')])
  assert.deepEqual(ids.adoptions, [{ docId: 'm1', bankId: 'b1', legacy: false }])
})

test('um manual generico e duas compras de lojas diferentes igualmente proximas: nao adota nenhuma', () => {
  const r = forward(
    [manual('m1')],
    [bank('b1', { description: 'Padaria Sol' }), bank('b2', { description: 'Posto Lua', dateMs: T0 + 2 * HOUR })]
  )
  assert.deepEqual(r.adoptions, [])
  assert.equal(r.ambiguous, 1)
  assert.equal(r.nearMiss, 0)
  assert.deepEqual(r.ambiguousIds, ['m1'])
})

test('nao ha ambiguidade quando uma compra esta claramente mais perto ou e identica', () => {
  const closer = forward(
    [manual('m1')],
    [bank('b1', { description: 'Padaria Sol' }), bank('b2', { description: 'Posto Lua', dateMs: T0 + 2 * DAY })]
  )
  assert.deepEqual(closer.adoptions, [{ docId: 'm1', bankId: 'b1', legacy: false }])
  const same = forward([manual('m1')], [bank('b1'), bank('b2', { dateMs: T0 + HOUR })])
  assert.equal(same.adoptions.length, 1)
  assert.equal(same.ambiguous, 0)
})

test('descricao digitada igual a do banco desempata contra uma compra so parecida', () => {
  const r = forward(
    [manual('m1', { description: 'mercado central' })],
    [bank('b1', { description: 'Mercado Central' }), bank('b2', { description: 'Supermercado Central Ltda', dateMs: T0 + HOUR })]
  )
  assert.deepEqual(r.adoptions, [{ docId: 'm1', bankId: 'b1', legacy: false }])
})

test('reassentamento: manual do cartao assume o lancamento importado', () => {
  const r = reverse([manual('m1')], [imported('bank_b1', 'b1', { dateMs: T0 + DAY })])
  assert.deepEqual(r.reverse, [{ docId: 'm1', replacesDocId: 'bank_b1', bankId: 'b1' }])
})

test('reassentamento ignora importado ja adotado ou ja ligado a um manual, e manual sem cardId', () => {
  assert.deepEqual(reverse([manual('m1')], [imported('d1', 'b1', { adoptedFromManual: true })]).reverse, [])
  assert.deepEqual(reverse([manual('m1')], [imported('d1', 'b1', { matchedTransactionId: 'outro' })]).reverse, [])
  assert.deepEqual(reverse([manual('m1', { cardId: null })], [imported('d1', 'b1')]).reverse, [])
})

test('reassentamento segue a mesma regra de descricao, janela e ambiguidade', () => {
  assert.deepEqual(reverse([manual('m1', { description: 'almoço com a ana' })], [imported('d1', 'b1')]).reverse, [])
  assert.deepEqual(reverse([manual('m1')], [imported('d1', 'b1', { dateMs: T0 + 4 * DAY })]).reverse, [])
  const doubt = reverse(
    [manual('m1')],
    [imported('d1', 'b1', { description: 'Padaria Sol' }), imported('d2', 'b2', { description: 'Posto Lua' })]
  )
  assert.deepEqual(doubt.reverse, [])
  assert.equal(doubt.ambiguous, 1)
})

test('candidato do banco, entrada, transferencia ou de outra pessoa nunca e candidato', () => {
  const bad = [
    manual('m1', { bankImportId: 'x' }),
    manual('m2', { type: 'entrada' }),
    manual('m3', { transfer: true }),
    manual('m4', { person: 'ele' }),
  ]
  const incoming = [bank('b1', { person: 'ela' }), bank('b2', { person: 'ela' })]
  const r = forward(bad, incoming)
  assert.deepEqual(r.adoptions, [])
  assert.equal(r.nearMiss, 0)
  assert.deepEqual(reverse(bad, [imported('d1', 'b1', { person: 'ela' })]).reverse, [])
})

test('as funcoes nao mutam a entrada', () => {
  const candidates = [manual('m2'), manual('m1')]
  const incoming = [bank('b2'), bank('b1')]
  const list = [imported('d2', 'b2'), imported('d1', 'b1')]
  const before = JSON.stringify([candidates, incoming, list])
  forward(candidates, incoming)
  reverse(candidates, list)
  assert.equal(JSON.stringify([candidates, incoming, list]), before)
})

test('entrada fora do tipo devolve vazio e nunca lanca', () => {
  const empty = { adoptions: [], nearMiss: 0, ambiguous: 0, ambiguousIds: [] }
  assert.deepEqual(matchManualAdoptions(undefined), empty)
  assert.deepEqual(matchManualAdoptions(null), empty)
  assert.deepEqual(matchManualAdoptions({ candidates: 'x', incoming: 3 }), empty)
  assert.deepEqual(forward([null, {}, manual('m1', { cents: NaN })], [null, bank('b1', { dateMs: undefined })]), empty)
  assert.deepEqual(matchReverseAdoptions(null), { reverse: [], ambiguous: 0 })
  assert.deepEqual(matchReverseAdoptions({ candidates: [manual('m1')] }), { reverse: [], ambiguous: 0 })
})

test('descriptionMatches: generica, igual ou contida; o resto nao', () => {
  assert.equal(descriptionMatches({ description: '', category: 'Lazer' }, 'Cinema'), true)
  assert.equal(descriptionMatches({ description: 'ALIMENTAÇÃO', category: 'Alimentacao' }, 'Posto'), true)
  assert.equal(descriptionMatches({ description: 'Uber', category: 'Transporte' }, 'uber'), true)
  assert.equal(descriptionMatches({ description: 'mercado', category: 'Casa' }, 'Supermercado X'), true)
  assert.equal(descriptionMatches({ description: 'Supermercado X Filial', category: 'Casa' }, 'Supermercado X'), true)
  assert.equal(descriptionMatches({ description: 'uber', category: 'Transporte' }, 'Uber do Brasil'), false)
  assert.equal(descriptionMatches({ description: 'farmacia', category: 'Saude' }, 'Posto Lua'), false)
  assert.equal(descriptionMatches({ description: 'farmacia', category: 'Saude' }, ''), false)
  assert.equal(descriptionMatches(null, 'Posto'), false)
})
