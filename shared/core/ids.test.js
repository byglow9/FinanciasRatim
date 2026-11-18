import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paymentDocId } from './ids.js'

test('paymentDocId: formato <conta>__<ano>-<mm> com mes de dois digitos', () => {
  assert.equal(paymentDocId('abc123', 2026, 3), 'abc123__2026-03')
  assert.equal(paymentDocId('abc123', 2026, 11), 'abc123__2026-11')
})

test('paymentDocId: a mesma entrada gera sempre o mesmo ID', () => {
  assert.equal(paymentDocId('conta', 2026, 7), paymentDocId('conta', 2026, 7))
})

test('paymentDocId: meses, anos e contas diferentes geram IDs diferentes', () => {
  const base = paymentDocId('conta', 2026, 7)
  assert.notEqual(base, paymentDocId('conta', 2026, 8))
  assert.notEqual(base, paymentDocId('conta', 2027, 7))
  assert.notEqual(base, paymentDocId('outra', 2026, 7))
})
