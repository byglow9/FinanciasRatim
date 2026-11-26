import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as pushEvents from './pushEvents.js'
import { DEFAULT_PUSH_PREFS, DEFAULT_SPONTANEOUS_WINDOW, deliveryDecision } from './pushPrefs.js'

const { limitEvents, spontaneousEvent, collapseHeld, eventDayKey } = pushEvents

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
  const lateSp = spontaneousEvent({ hid: 'h1', person: 'ela', now: new Date('2026-11-26T02:30:00Z'), slot: 3 })
  assert.equal(lateSp.id, 'h1__ela__espontanea__2026-11-25__3')
  assert.equal(eventDayKey(new Date('2026-11-26T02:30:00Z')), '2026-11-25')
  // 03:00 UTC e a meia-noite de Sao Paulo: vira o dia 26.
  const next = spontaneousEvent({ hid: 'h1', person: 'ela', now: new Date('2026-11-26T03:00:00Z'), slot: 1 })
  assert.equal(next.id, 'h1__ela__espontanea__2026-11-26__1')
  assert.equal(next.kind, 'espontanea')
  assert.equal(next.tag, 'espontanea-1')
  assert.equal(next.url, '/')
  // mesmo dia e vaga, mesmo id; outra vaga ou outra pessoa, outro id
  const same = { hid: 'h1', person: 'ela', now: new Date('2026-11-26T14:00:00Z'), slot: 1 }
  assert.equal(spontaneousEvent(same).id, next.id)
  const second = spontaneousEvent({ ...same, slot: 2 })
  assert.notEqual(second.id, next.id)
  assert.notEqual(second.tag, next.tag)
  assert.notEqual(spontaneousEvent({ ...same, person: 'ele' }).id, next.id)
})

// Hora de parede de Sao Paulo (UTC-3) em um dia de novembro, em minutos do dia.
const spMinute = (day, minute) => new Date(Date.parse(`2026-11-${String(day).padStart(2, '0')}T03:00:00Z`) + minute * 60_000)

const slotAt = (now, extra = {}) =>
  pushEvents.spontaneousSlot({
    now,
    window: DEFAULT_SPONTANEOUS_WINDOW,
    total: 3,
    tickMinutes: 15,
    hid: 'h1',
    person: 'ele',
    ...extra,
  })

// Primeiro minuto liberado de cada vaga, andando o dia de um em um.
const targets = (day, extra) => {
  const out = new Map()
  for (let minute = 0; minute < 24 * 60; minute += 1) {
    const got = slotAt(spMinute(day, minute), extra)
    if (got?.due && !out.has(got.slot)) out.set(got.slot, minute)
  }
  return out
}

test('com 3 vagas de 09:00 a 21:00, cada alvo cai na propria faixa de 4 horas, com folga de um relogio', () => {
  const seen = { 1: new Set(), 2: new Set(), 3: new Set() }
  for (const person of ['ele', 'ela']) {
    for (let day = 1; day <= 28; day += 1) {
      const got = targets(day, { person })
      assert.deepEqual([...got.keys()], [1, 2, 3])
      for (const [slot, minute] of got) {
        const bandStart = 9 * 60 + (slot - 1) * 240
        assert.ok(minute >= bandStart && minute < bandStart + 240 - 15, `dia ${day} vaga ${slot}: ${minute}`)
        seen[slot].add(minute - bandStart)
      }
    }
  }
  // sorteado de verdade: o minuto muda de dia para dia e de pessoa para pessoa
  for (const set of Object.values(seen)) assert.ok(set.size >= 20, `poucos minutos distintos: ${set.size}`)
  assert.notDeepEqual([...targets(5)], [...targets(5, { person: 'ela' })])
})

test('depois do alvo a vaga segue liberada ate o fim da faixa, e a vaga perdida e perdida', () => {
  const first = targets(17).get(1)
  assert.deepEqual(slotAt(spMinute(17, first - 1)), { slot: 1, due: false })
  assert.deepEqual(slotAt(spMinute(17, 13 * 60 - 1)), { slot: 1, due: true })
  // as 13:00 ja e a segunda faixa: a primeira nao volta
  assert.equal(slotAt(spMinute(17, 13 * 60)).slot, 2)
  // reinicio no fim do dia: so a terceira vaga pode estar liberada
  for (let day = 1; day <= 28; day += 1) {
    assert.deepEqual(slotAt(spMinute(day, 20 * 60 + 55)), { slot: 3, due: true })
  }
})

test('fora da janela ou com total zero nao ha vaga', () => {
  assert.equal(slotAt(spMinute(17, 8 * 60 + 59)), null)
  assert.equal(slotAt(spMinute(17, 21 * 60)), null)
  assert.equal(slotAt(spMinute(17, 2 * 60)), null)
  assert.equal(slotAt(spMinute(17, 12 * 60), { total: 0 }), null)
  assert.notEqual(slotAt(spMinute(17, 9 * 60)), null)
})

test('outro total e outra janela redividem as faixas', () => {
  const window = { from: '08:00', to: '09:00' }
  const got = targets(17, { window, total: 2, tickMinutes: 15 })
  assert.deepEqual([...got.keys()], [1, 2])
  assert.ok(got.get(1) >= 8 * 60 && got.get(1) < 8 * 60 + 15)
  assert.ok(got.get(2) >= 8 * 60 + 30 && got.get(2) < 8 * 60 + 45)
  assert.deepEqual([...targets(17, { total: 6 }).keys()], [1, 2, 3, 4, 5, 6])
})

test('ids de limite e espontaneo sao deterministicos e sem barra', () => {
  const rows = [{ categoryId: 'lazer', spentCents: 9000, limitCents: 10000 }]
  const a = limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows })
  const b = limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows })
  assert.deepEqual(a, b)
  const all = [...a, spontaneousEvent({ hid: 'h/1', person: 'ele', now: at('2026-11-25'), slot: 2 })]
  assert.equal(all.length, 2)
  for (const e of all) assert.ok(!e.id.includes('/'), e.id)
  assert.equal(all[1].id, 'h_1__ele__espontanea__2026-11-25__2')
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
  // mesma vaga em dois dias: mesma tag, fica o mais novo por id
  const d1 = spontaneousEvent({ hid: 'h1', person: 'ele', now: at('2026-11-24'), slot: 2 })
  const d2 = spontaneousEvent({ hid: 'h1', person: 'ele', now: at('2026-11-25'), slot: 2 })
  const { keep, drop } = collapseHeld([d2, d1])
  assert.deepEqual(keep, [d2])
  assert.deepEqual(drop, [d1])
  // vagas diferentes tem tags diferentes e nao se colapsam
  const other = spontaneousEvent({ hid: 'h1', person: 'ele', now: at('2026-11-25'), slot: 3 })
  assert.deepEqual(collapseHeld([d2, other]).keep, [d2, other])
  assert.deepEqual(collapseHeld([]), { keep: [], drop: [] })
  assert.deepEqual(collapseHeld(/** @type {any} */ (null)), { keep: [], drop: [] })
})

test('os eventos nao carregam texto de aviso nem valor financeiro', () => {
  const events = [
    ...limitEvents({ hid: 'h1', person: 'ele', cycleKey: '2026-11', rows: [{ categoryId: 'c', spentCents: 9000, limitCents: 10000 }] }),
    spontaneousEvent({ hid: 'h1', person: 'ele', now: at('2026-11-25'), slot: 1 }),
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
