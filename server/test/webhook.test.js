import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import * as webhook from '../src/webhook.js'

// Pecas puras do webhook da Pluggy (REV-06): segredo, corpo e idempotencia por eventId.
const SECRET = 'segredo-de-teste-0123456789abcdef'

describe('secretMatches', () => {
  test('igual vale; diferente, vazio, nao string e lista sem o valor nao valem', () => {
    assert.equal(webhook.secretMatches(SECRET, SECRET), true)
    assert.equal(webhook.secretMatches('outro', SECRET), false)
    assert.equal(webhook.secretMatches('', SECRET), false)
    assert.equal(webhook.secretMatches(undefined, SECRET), false)
    assert.equal(webhook.secretMatches(123, SECRET), false)
    assert.equal(webhook.secretMatches(SECRET, []), false)
    assert.equal(webhook.secretMatches(SECRET, ['a', 'b']), false)
    assert.equal(webhook.secretMatches(SECRET, undefined), false)
  })

  test('lista aceita o segredo anterior durante a rotacao', () => {
    assert.equal(webhook.secretMatches('antigo', ['novo', 'antigo']), true)
    assert.equal(webhook.secretMatches('novo', ['novo', 'antigo']), true)
  })
})

describe('validateWebhookBody', () => {
  const valid = { event: 'item/updated', eventId: 'ev-1', itemId: 'item-webhook-1' }

  test('corpo valido devolve event, eventId e itemId', () => {
    assert.deepEqual(webhook.validateWebhookBody(valid), { ok: true, ...valid })
  })

  test('corpo invalido devolve ok false', () => {
    const bad = [
      { ...valid, eventId: undefined },
      { ...valid, eventId: '' },
      { ...valid, eventId: 'x'.repeat(201) },
      { ...valid, event: undefined },
      { ...valid, itemId: 'x' },
      { ...valid, itemId: 'item/../etc' },
      { ...valid, itemId: undefined },
      undefined,
      null,
      'texto',
      [],
    ]
    for (const body of bad) {
      assert.deepEqual(webhook.validateWebhookBody(body), { ok: false })
    }
  })
})

describe('createSeenEvents', () => {
  test('primeira vez false, repeticao true', () => {
    const seen = webhook.createSeenEvents(3)
    assert.equal(seen.seen('a'), false)
    assert.equal(seen.seen('a'), true)
  })

  test('descarta o mais antigo quando passa do limite', () => {
    const seen = webhook.createSeenEvents(3)
    for (const id of ['a', 'b', 'c', 'd']) assert.equal(seen.seen(id), false)
    assert.equal(seen.seen('a'), false, 'a foi descartado e volta a valer false')
    assert.equal(seen.seen('d'), true)
  })
})
