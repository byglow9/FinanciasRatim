import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isCardId, manualCardFields, isManualCardPurchase, cardChoices } from './cardManual.js'

// Dados sinteticos: nenhum id, apelido ou valor real do dono.
const ID = 'card-aaaa1111'
const manual = (extra = {}) => ({ type: 'saida', cardKind: 'purchase', cardId: ID, ...extra })

test('manualCardFields devolve so cardId e cardKind purchase', () => {
  const fields = manualCardFields(ID)
  assert.deepEqual(fields, { cardId: ID, cardKind: 'purchase' })
  assert.deepEqual(Object.keys(fields).sort(), ['cardId', 'cardKind'])
  assert.ok(!('billMonth' in fields) && !('cardStatus' in fields) && !('source' in fields))
})

test('manualCardFields recusa id vazio, nao texto, com espaco, curto ou longo', () => {
  for (const bad of ['', '   ', null, undefined, 123, {}, 'card 1111aaaa', 'curto12', 'a'.repeat(65), 'card/aaaa1111']) {
    assert.equal(manualCardFields(bad), null, `aceitou ${JSON.stringify(bad)}`)
  }
  assert.ok(manualCardFields('a'.repeat(64)))
  assert.ok(manualCardFields('abcd1234'))
  assert.equal(isCardId('abcd_12-34'), true)
  assert.equal(isCardId('abcd123'), false)
})

test('isManualCardPurchase: saida com cardKind purchase e cardId, sem origem banco', () => {
  assert.equal(isManualCardPurchase(manual()), true)
  assert.equal(isManualCardPurchase(manual({ source: undefined, transfer: false })), true)
})

test('isManualCardPurchase: falso para importado, estorno, pagamento, transferencia, sem cardId e entrada', () => {
  assert.equal(isManualCardPurchase(manual({ source: 'bank' })), false)
  assert.equal(isManualCardPurchase(manual({ bankImportId: 'imp-1' })), false)
  assert.equal(isManualCardPurchase(manual({ cardKind: 'refund' })), false)
  assert.equal(isManualCardPurchase(manual({ cardKind: 'payment' })), false)
  assert.equal(isManualCardPurchase(manual({ transfer: true })), false)
  assert.equal(isManualCardPurchase(manual({ cardId: undefined })), false)
  assert.equal(isManualCardPurchase(manual({ cardId: 'curto' })), false)
  assert.equal(isManualCardPurchase(manual({ type: 'entrada' })), false)
  assert.equal(isManualCardPurchase(null), false)
  assert.equal(isManualCardPurchase('texto'), false)
})

test('cardChoices: so os cartoes da pessoa, rotulo por apelido, nome ou Cartao', () => {
  const cards = [
    { id: 'zzzz0003', person: 'ele', displayName: 'Roxinho', name: 'Banco X' },
    { id: 'aaaa0001', person: 'ele', displayName: '', name: 'Banco Y' },
    { id: 'bbbb0002', person: 'ela', displayName: 'Dela', name: 'Banco Z' },
    { id: 'cccc0004', person: 'ele' },
    { id: 'curto', person: 'ele', displayName: 'Invalido' },
  ]
  assert.deepEqual(cardChoices(cards, 'ele'), [
    { id: 'aaaa0001', label: 'Banco Y' },
    { id: 'cccc0004', label: 'Cartão' },
    { id: 'zzzz0003', label: 'Roxinho' },
  ])
  assert.deepEqual(cardChoices(cards, 'ela'), [{ id: 'bbbb0002', label: 'Dela' }])
})

test('cardChoices: ordena por rotulo e, no empate, por id', () => {
  const cards = [
    { id: 'bbbb0002', person: 'ele', displayName: 'Mesmo' },
    { id: 'aaaa0001', person: 'ele', displayName: 'Mesmo' },
  ]
  assert.deepEqual(
    cardChoices(cards, 'ele').map((c) => c.id),
    ['aaaa0001', 'bbbb0002']
  )
})

test('cardChoices: lista vazia, pessoa sem cartao e entrada fora do tipo dao lista vazia', () => {
  assert.deepEqual(cardChoices([], 'ele'), [])
  assert.deepEqual(cardChoices([{ id: 'aaaa0001', person: 'ela' }], 'ele'), [])
  for (const bad of [null, undefined, 'x', 5, {}]) assert.deepEqual(cardChoices(bad, 'ele'), [])
  assert.deepEqual(cardChoices([null, 3, 'x'], 'ele'), [])
})

test('nenhuma funcao muta a entrada', () => {
  const cards = Object.freeze([Object.freeze({ id: 'aaaa0001', person: 'ele', displayName: 'A' })])
  const tx = Object.freeze(manual())
  assert.doesNotThrow(() => cardChoices(cards, 'ele'))
  assert.doesNotThrow(() => isManualCardPurchase(tx))
})
