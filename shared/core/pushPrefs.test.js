import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PUSH_PREFS, isQuiet, deliveryDecision } from './pushPrefs.js'

const QUIET = { ...DEFAULT_PUSH_PREFS, quiet: { enabled: true, from: '22:00', to: '08:00' } }
// Hora de parede de Sao Paulo (UTC-3) para instante: soma 3 horas.
const sp = (hhmm) => new Date(`2026-11-25T${hhmm}:00-03:00`)

test('padroes da D-06 e da D-21: sem silencio e tres tipos ligados', () => {
  assert.deepEqual(DEFAULT_PUSH_PREFS.types, { limite80: true, limite100: true, espontanea: true })
  assert.equal(DEFAULT_PUSH_PREFS.quiet.enabled, false)
})

test('tracer: silencio entende a janela que cruza a meia-noite', () => {
  assert.equal(isQuiet(QUIET, sp('23:30')), true)
  assert.equal(isQuiet(QUIET, sp('10:00')), false)
})

test('tracer: limite no silencio e retido, espontaneo e pulado, fora dele envia', () => {
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'limite80', now: sp('23:30') }), 'reter')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'fatura', now: sp('23:30') }), 'reter')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'espontanea', now: sp('23:30') }), 'pular')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'espontanea', now: sp('12:00') }), 'enviar')
})
