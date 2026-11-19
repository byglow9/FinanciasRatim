import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOOD_BANDS, limitBand, deriveVintemState } from './vintemMood.js'

// Linha de limite como a Home entrega: state vem do orcamento (over so com gasto > limite).
const line = (spentCents, limitCents = 10000, categoryId = 'alimentacao') => ({
  categoryId,
  spentCents,
  limitCents,
  state: spentCents > limitCents ? 'over' : spentCents * 100 >= limitCents * 80 ? 'warn' : 'ok',
  pct: Math.floor((spentCents * 100) / limitCents),
})

// Fatos neutros e seguros: so o que o teste muda importa.
const facts = (over = {}) => ({
  loading: false,
  readOnly: false,
  isPast: false,
  noIncome: false,
  suppressed: false,
  tone: 'sem-filtro',
  todayKey: '2026-11-19',
  rhythmLevel: null,
  rows: [],
  cheer: null,
  insights: [],
  ...over,
})

const NOW = Date.UTC(2026, 10, 19, 15, 0, 0)
const derive = (over) => deriveVintemState(facts(over), null, NOW)

test('MOOD_BANDS congelado com 75, 80 e 130', () => {
  assert.deepEqual({ ...MOOD_BANDS }, { atento: 75, perto: 80, estourouBravoAte: 130 })
  assert.ok(Object.isFrozen(MOOD_BANDS))
})

test('limitBand: fronteiras em centavos para limite de 10000', () => {
  assert.equal(limitBand(line(7499)), 'abaixo')
  assert.equal(limitBand(line(7500)), 'atento')
  assert.equal(limitBand(line(7999)), 'atento')
  assert.equal(limitBand(line(8000)), 'perto')
})

test('limitBand: gasto igual ao limite ainda e perto, 10001 estourou', () => {
  assert.equal(limitBand({ spentCents: 10000, limitCents: 10000, state: 'warn' }), 'perto')
  assert.equal(limitBand({ spentCents: 10001, limitCents: 10000, state: 'over' }), 'estourou')
})

test('limitBand: estourou segue row.state, nao o pct', () => {
  const r = line(10001)
  assert.equal(r.pct, 100)
  assert.equal(limitBand(r), 'estourou')
  assert.equal(limitBand({ ...line(10000), pct: 100 }), 'perto')
})

test('limitBand: limite invalido ou gasto invalido fica abaixo', () => {
  assert.equal(limitBand({ spentCents: 500, limitCents: 0, state: 'ok' }), 'abaixo')
  assert.equal(limitBand({ spentCents: Number.NaN, limitCents: 10000, state: 'ok' }), 'abaixo')
})

test('estouro 10001: faixa de 100 a 130, tom decide entre triste e bravo', () => {
  const rows = [line(10001)]
  assert.equal(derive({ rows, tone: 'suave' }).state, 'triste')
  assert.equal(derive({ rows, tone: 'direto' }).state, 'bravo')
  assert.equal(derive({ rows, tone: 'sem-filtro' }).state, 'bravo')
  assert.equal(derive({ rows }).situation, 'limite-estourou')
})

test('estouro a 120 por cento: bravo em sem-filtro e direto, triste em suave', () => {
  const rows = [line(12000)]
  assert.equal(derive({ rows, tone: 'sem-filtro' }).state, 'bravo')
  assert.equal(derive({ rows, tone: 'direto' }).state, 'bravo')
  assert.equal(derive({ rows, tone: 'suave' }).state, 'triste')
})

test('estouro a 131 por cento: triste nos tres tons', () => {
  const rows = [line(13100)]
  for (const tone of ['suave', 'direto', 'sem-filtro']) {
    assert.equal(derive({ rows, tone }).state, 'triste', tone)
  }
})

test('130 por cento exatos ainda e a faixa do tom, 13001 ja e triste em todos', () => {
  assert.equal(derive({ rows: [line(13000)], tone: 'sem-filtro' }).state, 'bravo')
  assert.equal(derive({ rows: [line(13001)], tone: 'sem-filtro' }).state, 'triste')
})

test('perto e atento viram estado atento com a situacao da faixa', () => {
  const near = derive({ rows: [line(8000)] })
  assert.deepEqual(near, { state: 'atento', situation: 'limite-perto', subject: { categoryId: 'alimentacao' } })
  const watch = derive({ rows: [line(7500)] })
  assert.equal(watch.state, 'atento')
  assert.equal(watch.situation, 'limite-atento')
  // gasto igual ao limite nao estourou
  assert.equal(derive({ rows: [line(10000)] }).situation, 'limite-perto')
})

test('sem faixa o estado e neutro com situacao inicio', () => {
  assert.deepEqual(derive({ rows: [line(7499)] }), { state: 'neutro', situation: 'inicio', subject: null })
  assert.deepEqual(derive({ rows: [] }), { state: 'neutro', situation: 'inicio', subject: null })
})

test('a pior linha vence: estourou antes de perto, maior pct, empate por categoryId', () => {
  const rows = [line(9000, 10000, 'lazer'), line(10001, 10000, 'mercado'), line(8000, 10000, 'bar')]
  assert.equal(derive({ rows }).subject.categoryId, 'mercado')
  const near = [line(9000, 10000, 'lazer'), line(9500, 10000, 'bar'), line(8100, 10000, 'casa')]
  assert.equal(derive({ rows: near }).subject.categoryId, 'bar')
  const tie = [line(9000, 10000, 'lazer'), line(9000, 10000, 'bar')]
  assert.equal(derive({ rows: tie }).subject.categoryId, 'bar')
})

test('estouro com pct empatado a um perto: o estourado vence', () => {
  // 10001 de 10000 e 10000 de 10000 dao pct 100 nos dois
  const rows = [line(10000, 10000, 'aaa'), line(10001, 10000, 'zzz')]
  const out = derive({ rows })
  assert.equal(out.situation, 'limite-estourou')
  assert.equal(out.subject.categoryId, 'zzz')
})

test('portao neutro: cada uma das cinco condicoes devolve neutro sem situacao', () => {
  const rows = [line(15000)]
  for (const key of ['loading', 'readOnly', 'isPast', 'noIncome', 'suppressed']) {
    assert.deepEqual(
      derive({ rows, [key]: true }),
      { state: 'neutro', situation: null, subject: null },
      key,
    )
  }
})

test('portao neutro: sem a condicao o estouro fala normalmente', () => {
  assert.equal(derive({ rows: [line(15000)] }).situation, 'limite-estourou')
})
