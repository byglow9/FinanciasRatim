import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_TZ,
  zonedParts,
  zonedTimeToInstant,
  monthRange,
  monthRangeOf,
  daysRemainingInMonth,
} from './time.js'

test('DEFAULT_TZ e America/Sao_Paulo', () => {
  assert.equal(DEFAULT_TZ, 'America/Sao_Paulo')
})

test('monthRange: 2026-11-01T02:30Z ainda e 31/10 em Sao Paulo', () => {
  const r = monthRange(new Date('2026-11-01T02:30:00Z'))
  assert.equal(r.year, 2026)
  assert.equal(r.month, 10)
  assert.equal(r.daysInMonth, 31)
  assert.equal(r.start.toISOString(), '2026-10-01T03:00:00.000Z')
  assert.equal(r.end.toISOString(), '2026-11-01T02:59:59.999Z')
})

test('monthRange: 2026-11-01T03:00Z ja e novembro', () => {
  const r = monthRange(new Date('2026-11-01T03:00:00Z'))
  assert.equal(r.month, 11)
  assert.equal(r.start.toISOString(), '2026-11-01T03:00:00.000Z')
})

test('monthRangeOf: fevereiro bissexto e dezembro', () => {
  assert.equal(monthRangeOf(2028, 2).daysInMonth, 29)
  assert.equal(monthRangeOf(2026, 2).daysInMonth, 28)
  assert.equal(monthRangeOf(2026, 12).end.toISOString(), '2027-01-01T02:59:59.999Z')
})

test('daysRemainingInMonth conta o dia de hoje', () => {
  assert.equal(daysRemainingInMonth(new Date('2026-11-09T15:00:00Z')), 22)
  // 31/10 22:30 em Sao Paulo: resta 1 dia (hoje)
  assert.equal(daysRemainingInMonth(new Date('2026-11-01T01:30:00Z')), 1)
})

test('zonedParts de 2026-11-09T15:00Z em Sao Paulo: dia 9, hora 12', () => {
  const p = zonedParts(new Date('2026-11-09T15:00:00Z'), 'America/Sao_Paulo')
  assert.deepEqual([p.year, p.month, p.day, p.hour], [2026, 11, 9, 12])
})

test('zonedTimeToInstant e o inverso de zonedParts', () => {
  const d = zonedTimeToInstant(2026, 11, 9, 12, 0, 0)
  assert.equal(d.toISOString(), '2026-11-09T15:00:00.000Z')
})

test('resultado independe do fuso do host (usa o tz explicito)', () => {
  const r = monthRange(new Date('2026-06-15T12:00:00Z'), 'Asia/Tokyo')
  assert.equal(r.month, 6)
  assert.equal(r.start.toISOString(), '2026-05-31T15:00:00.000Z')
})
