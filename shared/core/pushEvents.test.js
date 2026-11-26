import { test } from 'node:test'
import assert from 'node:assert/strict'
import { limitEvents, spontaneousEvent, collapseHeld, eventDayKey } from './pushEvents.js'
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

// Meio-dia em Sao Paulo (15:00 UTC): nunca cruza a virada do dia em UTC nem em Tokyo.
const at = (day) => new Date(`${day}T15:00:00Z`)

test('o id do espontaneo muda a meia-noite de Sao Paulo e nao a de UTC', () => {
  // 02:30 UTC do dia 26 ainda e 23:30 do dia 25 em Sao Paulo.
  const lateSp = spontaneousEvent({ hid: 'h1', person: 'ela', now: new Date('2026-11-26T02:30:00Z') })
  assert.equal(lateSp.id, 'h1__ela__espontanea__2026-11-25')
  assert.equal(eventDayKey(new Date('2026-11-26T02:30:00Z')), '2026-11-25')
  // 03:00 UTC e a meia-noite de Sao Paulo: vira o dia 26.
  const next = spontaneousEvent({ hid: 'h1', person: 'ela', now: new Date('2026-11-26T03:00:00Z') })
  assert.equal(next.id, 'h1__ela__espontanea__2026-11-26')
  assert.equal(next.kind, 'espontanea')
  assert.equal(next.tag, 'espontanea')
  assert.equal(next.url, '/')
  // mesmo dia, mesmo id; outra pessoa, outro id
  assert.equal(spontaneousEvent({ hid: 'h1', person: 'ela', now: new Date('2026-11-26T14:00:00Z') }).id, next.id)
  assert.notEqual(spontaneousEvent({ hid: 'h1', person: 'ele', now: new Date('2026-11-26T14:00:00Z') }).id, next.id)
})

test('ids de limite e espontaneo sao deterministicos e sem barra', () => {
  const rows = [{ categoryId: 'lazer', spentCents: 9000, limitCents: 10000 }]
  const a = limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows })
  const b = limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows })
  assert.deepEqual(a, b)
  const all = [...a, spontaneousEvent({ hid: 'h/1', person: 'ele', now: at('2026-11-25') })]
  assert.equal(all.length, 2)
  for (const e of all) assert.ok(!e.id.includes('/'), e.id)
})

test('limitEvents respeita os marcadores ja conhecidos (ids sem o prefixo do casal)', () => {
  const rows = [{ categoryId: 'lazer', spentCents: 9000, limitCents: 10000 }]
  const known = ['ele__2026-11__lazer__80']
  assert.deepEqual(limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows, knownAlertIds: known }), [])
  assert.deepEqual(limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows: [] }), [])
})

test('limitEvents usa a fronteira do cliente: 80 por cento inclusive, 100 por cento exclusive', () => {
  const only = (spentCents) =>
    limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows: [{ categoryId: 'c', spentCents, limitCents: 10000 }] })
  assert.equal(only(7999).length, 0)
  assert.deepEqual(only(8000).map((e) => [e.threshold, e.silent]), [[80, false]])
  assert.deepEqual(only(10000).map((e) => [e.threshold, e.silent]), [[80, false]])
  assert.deepEqual(only(10001).map((e) => [e.threshold, e.silent]), [[80, true], [100, false]])
})

test('collapseHeld: 80 e 100 da mesma categoria mantem o de 100', () => {
  const [e80, e100] = limitEvents({
    hid: 'h1',
    person: 'ele',
    cycleKey: '2026-11',
    rows: [{ categoryId: 'lazer', spentCents: 11000, limitCents: 10000 }],
  })
  const other = limitEvents({
    hid: 'h1',
    person: 'ele',
    cycleKey: '2026-11',
    rows: [{ categoryId: 'mercado', spentCents: 8500, limitCents: 10000 }],
  })[0]
  const { keep, drop } = collapseHeld([e100, other, e80])
  assert.deepEqual(keep, [e100, other])
  assert.deepEqual(drop, [e80])
  assert.deepEqual(collapseHeld([e80, e100]).keep, [e100])
})

test('collapseHeld: nos demais tipos fica o mais recente por id; entrada vazia nao lanca', () => {
  const d1 = spontaneousEvent({ hid: 'h1', person: 'ele', now: at('2026-11-24') })
  const d2 = spontaneousEvent({ hid: 'h1', person: 'ele', now: at('2026-11-25') })
  const { keep, drop } = collapseHeld([d2, d1])
  assert.deepEqual(keep, [d2])
  assert.deepEqual(drop, [d1])
  assert.deepEqual(collapseHeld([]), { keep: [], drop: [] })
  assert.deepEqual(collapseHeld(/** @type {any} */ (null)), { keep: [], drop: [] })
})

test('os eventos nao carregam texto de aviso nem valor financeiro', () => {
  const events = [
    ...limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows: [{ categoryId: 'c', spentCents: 9000, limitCents: 10000 }] }),
    spontaneousEvent({ hid: 'h1', person: 'ele', now: at('2026-11-25') }),
  ]
  const forbidden = ['text', 'body', 'title', 'name', 'amount', 'amountCents', 'spentCents', 'limitCents']
  for (const e of events) {
    for (const key of forbidden) assert.ok(!(key in e), `${e.kind} carrega ${key}`)
  }
})

test('collapseHeld: com daysLeft nos dois, fica o de menos dias, nao o de maior id', () => {
  const stage = (daysLeft) => ({
    kind: 'conta',
    id: `h1__ele__conta__b1__2026-11-20__d${daysLeft}`,
    tag: 'conta-b1-2026-11-20',
    daysLeft,
  })
  const { keep, drop } = collapseHeld([stage(2), stage(0), stage(1)])
  assert.deepEqual(keep, [stage(0)])
  assert.deepEqual(drop, [stage(2), stage(1)])
  // mesmos dias: volta para o id mais recente
  const a = { kind: 'fatura', id: 'h1__a', tag: 't', daysLeft: 1 }
  const b = { kind: 'fatura', id: 'h1__b', tag: 't', daysLeft: 1 }
  assert.deepEqual(collapseHeld([b, a]).keep, [b])
})
