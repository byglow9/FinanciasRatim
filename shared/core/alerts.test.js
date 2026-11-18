import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  THRESHOLDS,
  alertId,
  thresholdsToFire,
  rekeyAlerts,
  visibleAlerts,
  topAlert,
  unreadCount,
} from './alerts.js'

const CTX = { person: 'ele', cycleKey: '2026-11' }
const row = (spentCents, limitCents = 10000, categoryId = 'alimentacao') => ({
  categoryId,
  spentCents,
  limitCents,
})
const fire = (rows, existing = []) => thresholdsToFire(rows, existing, CTX)
const shape = (drafts) => drafts.map((d) => [d.categoryId, d.threshold, d.silent])

test('THRESHOLDS sao 80 e 100, nessa ordem', () => {
  assert.deepEqual([...THRESHOLDS], [80, 100])
})

test('alertId e determinístico, estavel e sem barra', () => {
  const id = alertId('ele', '2026-11', 'alimentacao', 80)
  assert.equal(id, 'ele__2026-11__alimentacao__80')
  assert.ok(!id.includes('/'))
  assert.equal(alertId('ele', '2026-11', 'alimentacao', 80), id)
  assert.notEqual(alertId('ela', '2026-11', 'alimentacao', 80), id)
  assert.notEqual(alertId('ele', '2026-11', 'alimentacao', 100), id)
})

test('abaixo de 80% nao gera nada (50% e 79,99%)', () => {
  assert.deepEqual(fire([row(5000)]), [])
  assert.deepEqual(fire([row(7999)]), [])
})

test('fronteira do 80: 80,00% gera o 80 visivel', () => {
  const r = fire([row(8000)])
  assert.deepEqual(shape(r), [['alimentacao', 80, false]])
  assert.equal(r[0].id, 'ele__2026-11__alimentacao__80')
  assert.equal(r[0].spentCents, 8000)
  assert.equal(r[0].limitCents, 10000)
})

test('fronteira do 100: 100,00% so gera o 80; 100,01% gera o 100', () => {
  assert.deepEqual(shape(fire([row(10000)])), [['alimentacao', 80, false]])
  assert.deepEqual(shape(fire([row(10001)])), [
    ['alimentacao', 80, true],
    ['alimentacao', 100, false],
  ])
})

test('salto de 50% para 130%: o 80 nasce silencioso e o 100 visivel', () => {
  const r = fire([row(13000)])
  assert.deepEqual(shape(r), [
    ['alimentacao', 80, true],
    ['alimentacao', 100, false],
  ])
})

test('com o marcador do 80, 85% e 90% nao geram nada', () => {
  const existing = new Set([alertId('ele', '2026-11', 'alimentacao', 80)])
  assert.deepEqual(fire([row(8500)], existing), [])
  assert.deepEqual(fire([row(9000)], existing), [])
})

test('com o marcador do 80, passar de 100 gera so o 100 visivel', () => {
  const existing = new Set([alertId('ele', '2026-11', 'alimentacao', 80)])
  assert.deepEqual(shape(fire([row(10001)], existing)), [['alimentacao', 100, false]])
})

test('com os dois marcadores nada nasce', () => {
  const existing = [
    alertId('ele', '2026-11', 'alimentacao', 80),
    alertId('ele', '2026-11', 'alimentacao', 100),
  ]
  assert.deepEqual(fire([row(20000)], existing), [])
})

test('reavaliar com os marcadores recem-criados nao gera nada (uma vez por limiar e ciclo)', () => {
  const rows = [row(13000), row(8100, 10000, 'lazer')]
  const first = fire(rows)
  assert.equal(first.length, 3)
  const ids = new Set(first.map((d) => d.id))
  assert.deepEqual(fire(rows, ids), [])
})

test('linha sem limite valido e ignorada', () => {
  const bad = [
    { categoryId: 'a', spentCents: 99999, limitCents: null },
    { categoryId: 'b', spentCents: 99999, limitCents: 0 },
    { categoryId: 'c', spentCents: 99999, limitCents: 100.5 },
    { categoryId: 'd', spentCents: 99999, limitCents: -10 },
    { categoryId: 'e', spentCents: 99999 },
  ]
  assert.deepEqual(fire(bad), [])
})

test('varias categorias geram itens independentes e existingIds pode ser array', () => {
  const rows = [row(9000, 10000, 'alimentacao'), row(12000, 10000, 'lazer'), row(1000, 10000, 'saude')]
  const existing = [alertId('ele', '2026-11', 'alimentacao', 80)]
  assert.deepEqual(shape(fire(rows, existing)), [
    ['lazer', 80, true],
    ['lazer', 100, false],
  ])
})

test('rascunho nao carrega nome de categoria nem descricao (so ids, centavos e chaves)', () => {
  const [d] = fire([{ ...row(9000), name: 'Alimentacao', description: 'Padaria X' }])
  assert.deepEqual(Object.keys(d).sort(), [
    'categoryId',
    'cycleKey',
    'id',
    'limitCents',
    'person',
    'silent',
    'spentCents',
    'threshold',
  ])
})

test('rekeyAlerts regrava os marcadores do ciclo antigo como silenciosos na chave nova', () => {
  const existing = [
    { person: 'ele', cycleKey: '2026-11', categoryId: 'alimentacao', threshold: 80, spentCents: 8000, limitCents: 10000 },
    { person: 'ele', cycleKey: '2026-11', categoryId: 'alimentacao', threshold: 100, spentCents: 10100, limitCents: 10000 },
  ]
  const r = rekeyAlerts(existing, { person: 'ele', fromKey: '2026-11', toKey: '2026-10' })
  assert.equal(r.length, 2)
  assert.ok(r.every((d) => d.silent === true && d.cycleKey === '2026-10'))
  assert.deepEqual(
    r.map((d) => d.id),
    ['ele__2026-10__alimentacao__80', 'ele__2026-10__alimentacao__100']
  )
})

test('rekeyAlerts ignora outra pessoa e outro ciclo', () => {
  const existing = [
    { person: 'ela', cycleKey: '2026-11', categoryId: 'lazer', threshold: 80, spentCents: 1, limitCents: 1 },
    { person: 'ele', cycleKey: '2026-10', categoryId: 'lazer', threshold: 80, spentCents: 1, limitCents: 1 },
  ]
  assert.deepEqual(rekeyAlerts(existing, { person: 'ele', fromKey: '2026-11', toKey: '2026-12' }), [])
})

test('rekeyAlerts com chaves iguais devolve vazio e ids repetidos aparecem uma vez', () => {
  const a = { person: 'ele', cycleKey: '2026-11', categoryId: 'lazer', threshold: 80, spentCents: 8000, limitCents: 10000 }
  assert.deepEqual(rekeyAlerts([a], { person: 'ele', fromKey: '2026-11', toKey: '2026-11' }), [])
  const r = rekeyAlerts([a, { ...a }], { person: 'ele', fromKey: '2026-11', toKey: '2026-12' })
  assert.equal(r.length, 1)
})

test('o ciclo regravado nao dispara de novo o aviso ja enviado', () => {
  const sent = fire([row(10001)])
  const rekeyed = rekeyAlerts(sent, { person: 'ele', fromKey: '2026-11', toKey: '2026-10' })
  const again = thresholdsToFire([row(10001)], new Set(rekeyed.map((d) => d.id)), {
    person: 'ele',
    cycleKey: '2026-10',
  })
  assert.deepEqual(again, [])
})

const stored = (threshold, createdAt, extra = {}) => ({
  id: `x-${threshold}-${createdAt}`,
  person: 'ele',
  cycleKey: '2026-11',
  categoryId: 'alimentacao',
  threshold,
  silent: false,
  spentCents: 1,
  limitCents: 1,
  createdAt: new Date(createdAt),
  readAt: null,
  ...extra,
})

test('visibleAlerts remove os silenciosos, ordena do mais recente e nao muta a entrada', () => {
  const list = [
    stored(80, '2026-11-02T10:00:00Z'),
    stored(80, '2026-11-05T10:00:00Z', { silent: true }),
    stored(100, '2026-11-04T10:00:00Z'),
  ]
  const copy = [...list]
  const r = visibleAlerts(list)
  assert.deepEqual(r.map((a) => a.createdAt.toISOString()), [
    '2026-11-04T10:00:00.000Z',
    '2026-11-02T10:00:00.000Z',
  ])
  assert.deepEqual(list, copy)
})

test('unreadCount conta so visiveis nao lidos', () => {
  const list = [
    stored(80, '2026-11-02T10:00:00Z'),
    stored(100, '2026-11-03T10:00:00Z', { readAt: new Date('2026-11-03T12:00:00Z') }),
    stored(80, '2026-11-04T10:00:00Z', { silent: true }),
    stored(100, '2026-11-05T10:00:00Z'),
  ]
  assert.equal(unreadCount(list), 2)
  assert.equal(unreadCount([]), 0)
})

test('topAlert prefere o 100 ao 80 e, no mesmo limiar, o mais recente', () => {
  const list = [
    stored(100, '2026-11-02T10:00:00Z'),
    stored(80, '2026-11-09T10:00:00Z'),
    stored(100, '2026-11-05T10:00:00Z'),
  ]
  assert.equal(topAlert(list)?.createdAt.toISOString(), '2026-11-05T10:00:00.000Z')
  assert.equal(topAlert(list)?.threshold, 100)
  const eighties = [stored(80, '2026-11-02T10:00:00Z'), stored(80, '2026-11-09T10:00:00Z')]
  assert.equal(topAlert(eighties)?.createdAt.toISOString(), '2026-11-09T10:00:00.000Z')
})

test('topAlert devolve null sem visivel nao lido', () => {
  assert.equal(topAlert([]), null)
  assert.equal(topAlert([stored(100, '2026-11-02T10:00:00Z', { silent: true })]), null)
  assert.equal(
    topAlert([stored(100, '2026-11-02T10:00:00Z', { readAt: new Date('2026-11-03T00:00:00Z') })]),
    null
  )
})
