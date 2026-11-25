import { test } from 'node:test'
import assert from 'node:assert/strict'
import { limitEvents } from './pushEvents.js'
import { DEFAULT_PUSH_PREFS, deliveryDecision } from './pushPrefs.js'

// 23:30 em Sao Paulo (UTC-3) e 02:30 UTC do dia seguinte.
const AT_2330 = new Date('2026-11-26T02:30:00Z')
// 10:00 em Sao Paulo do dia seguinte.
const AT_1000 = new Date('2026-11-26T13:00:00Z')

const QUIET = { ...DEFAULT_PUSH_PREFS, quiet: { enabled: true, from: '22:00', to: '08:00' } }

test('tracer: gasto que saltou direto para 100 gera o 100 visivel e o 80 silencioso', () => {
  const events = limitEvents({
    hid: 'h1',
    person: 'ele',
    cycleKey: '2026-11',
    rows: [{ categoryId: 'alimentacao', spentCents: 11000, limitCents: 10000 }],
  })
  assert.equal(events.length, 2)
  const e80 = events.find((e) => e.threshold === 80)
  const e100 = events.find((e) => e.threshold === 100)
  assert.equal(e80.silent, true)
  assert.equal(e100.silent, false)
  assert.equal(e100.id, 'h1__limite__ele__2026-11__alimentacao__100')
  assert.ok(!e100.id.includes('/'))
  assert.equal(e100.tag, 'limite-alimentacao-2026-11')
  assert.equal(e100.url, '/')
})

test('tracer: o 100 que cai as 23:30 no silencio e retido; as 10:00 e enviado', () => {
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'limite100', now: AT_2330 }), 'reter')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'limite100', now: AT_1000 }), 'enviar')
})
