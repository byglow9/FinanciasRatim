import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scopedId, unscopedId } from './household.js'

const HID_A = 'casal-aaaa-0001'
const HID_B = 'casal-bbbb-0002'

test('scopedId junta hid, dois sublinhados e o id logico', () => {
  assert.equal(scopedId(HID_A, 'ele__2026-11__alimentacao__80'), `${HID_A}__ele__2026-11__alimentacao__80`)
})

test('unscopedId desfaz o scopedId (ida e volta)', () => {
  for (const id of ['x', 'ele__2026-11__alimentacao__80', 'a__b__c']) {
    assert.equal(unscopedId(HID_A, scopedId(HID_A, id)), id)
  }
})

test('unscopedId devolve o id intacto quando o documento e antigo (sem prefixo)', () => {
  assert.equal(unscopedId(HID_A, 'ele__2026-11__alimentacao__80'), 'ele__2026-11__alimentacao__80')
  assert.equal(unscopedId(HID_A, 'main'), 'main')
  // prefixo de outro grupo nao e removido
  assert.equal(unscopedId(HID_A, scopedId(HID_B, 'x')), scopedId(HID_B, 'x'))
  // so o prefixo, sem id logico: nada a remover
  assert.equal(unscopedId(HID_A, `${HID_A}__`), `${HID_A}__`)
})

test('scopedId lanca para hid invalido e para id vazio', () => {
  for (const hid of ['', 'curto', 'tem espaco aqui', 'tem/barra-aqui', 'a'.repeat(65), null, undefined, 12345678]) {
    assert.throws(() => scopedId(/** @type {any} */ (hid), 'x'), /hid invalido/)
  }
  assert.throws(() => scopedId(HID_A, ''), /id vazio/)
  assert.throws(() => scopedId(HID_A, /** @type {any} */ (undefined)), /id vazio/)
})

test('ids de dois grupos para a mesma categoria e ciclo diferem', () => {
  const logico = 'ele__2026-11__alimentacao__80'
  assert.notEqual(scopedId(HID_A, logico), scopedId(HID_B, logico))
})
