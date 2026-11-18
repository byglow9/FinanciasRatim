import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  LIMIT_MAX_CENTS,
  INCOME_MAX_CENTS,
  limitForCycle,
  setLimit,
  limitsForCycle,
  limitState,
  normalizePersonConfig,
  setSalaryDay,
  setExpectedIncome,
  setCategoryLimit,
} from './limits.js'

const HIST = [
  { from: '2026-10', cents: 40000 },
  { from: '2026-12', cents: 50000 },
]

test('limitForCycle pega a entrada vigente do ciclo', () => {
  assert.equal(limitForCycle(HIST, '2026-11'), 40000)
  assert.equal(limitForCycle(HIST, '2026-12'), 50000)
  assert.equal(limitForCycle(HIST, '2027-01'), 50000)
  assert.equal(limitForCycle(HIST, '2026-10'), 40000)
  assert.equal(limitForCycle(HIST, '2026-09'), null)
})

test('limitForCycle com historico vazio ou ausente e null', () => {
  assert.equal(limitForCycle([], '2026-11'), null)
  assert.equal(limitForCycle(undefined, '2026-11'), null)
  assert.equal(limitForCycle(null, '2026-11'), null)
})

test('limitForCycle: cents null vale como sem limite dali em diante', () => {
  const h = [
    { from: '2026-10', cents: 40000 },
    { from: '2026-12', cents: null },
  ]
  assert.equal(limitForCycle(h, '2026-11'), 40000)
  assert.equal(limitForCycle(h, '2026-12'), null)
  assert.equal(limitForCycle(h, '2027-03'), null)
})

test('limitForCycle nao depende da ordem do array', () => {
  assert.equal(limitForCycle([...HIST].reverse(), '2027-01'), 50000)
})

test('setLimit substitui a entrada do mesmo ciclo (historico nao cresce)', () => {
  const h = [{ from: '2026-11', cents: 40000 }]
  const once = setLimit(h, '2026-11', 45000)
  const twice = setLimit(once, '2026-11', 47000)
  assert.equal(once.length, 1)
  assert.equal(twice.length, 1)
  assert.equal(twice[0].cents, 47000)
})

test('setLimit mantem ordem por from e nao muta o original', () => {
  const original = [{ from: '2026-12', cents: 50000 }]
  const snapshot = JSON.stringify(original)
  const next = setLimit(original, '2026-10', 30000)
  assert.deepEqual(
    next.map((e) => e.from),
    ['2026-10', '2026-12'],
  )
  assert.equal(JSON.stringify(original), snapshot)
  assert.deepEqual(setLimit(undefined, '2026-11', 100), [{ from: '2026-11', cents: 100 }])
})

test('setLimit com null grava sem limite', () => {
  const next = setLimit(HIST, '2027-01', null)
  assert.equal(limitForCycle(next, '2027-01'), null)
  assert.equal(limitForCycle(next, '2026-12'), 50000)
})

test('setLimit recusa valor invalido', () => {
  for (const bad of [0, -1, 10.5, LIMIT_MAX_CENTS + 1, NaN, '100']) {
    assert.throws(() => setLimit([], '2026-11', bad), /Limite invalido/)
  }
  assert.doesNotThrow(() => setLimit([], '2026-11', LIMIT_MAX_CENTS))
})

test('setLimit recusa ciclo fora do formato YYYY-MM', () => {
  for (const bad of ['2026-1', '2026-13', '2026-00', '26-11', '', 'novembro', 202611]) {
    assert.throws(() => setLimit([], bad, 100), /Ciclo invalido/)
  }
})

test('ciclos passados mantem o limite da epoca depois de nova edicao', () => {
  const h = setLimit(HIST, '2027-01', 60000)
  assert.equal(limitForCycle(h, '2026-11'), 40000)
  assert.equal(limitForCycle(h, '2026-12'), 50000)
  assert.equal(limitForCycle(h, '2027-01'), 60000)
})

test('limitsForCycle devolve so categorias com limite no ciclo', () => {
  const limits = {
    alim: [{ from: '2026-10', cents: 40000 }],
    lazer: [{ from: '2026-12', cents: 20000 }],
    saude: [{ from: '2026-09', cents: null }],
  }
  assert.deepEqual(limitsForCycle(limits, '2026-11'), { alim: 40000 })
  assert.deepEqual(limitsForCycle(limits, '2026-12'), { alim: 40000, lazer: 20000 })
  assert.deepEqual(limitsForCycle(undefined, '2026-11'), {})
})

test('limitState nas fronteiras de 80% e 100% (limite 10000)', () => {
  const rows = [
    [0, 'ok', 0, 10000, 0],
    [7999, 'ok', 79, 2001, 0],
    [8000, 'warn', 80, 2000, 0],
    [9999, 'warn', 99, 1, 0],
    [10000, 'warn', 100, 0, 0],
    [10001, 'over', 100, 0, 1],
    [25000, 'over', 100, 0, 15000],
  ]
  for (const [spent, state, pct, remaining, excess] of rows) {
    assert.deepEqual(
      limitState(spent, 10000),
      { state, pct, remainingCents: remaining, excessCents: excess },
      `gasto ${spent}`,
    )
  }
})

test('limitState sem limite valido devolve null', () => {
  assert.equal(limitState(5, 0), null)
  assert.equal(limitState(5, null), null)
  assert.equal(limitState(5, undefined), null)
  assert.equal(limitState(5, 2.5), null)
  assert.equal(limitState(5, -10), null)
})

test('limitState usa inteiros: 9 e 10 sobre limite 11 ja e atencao', () => {
  assert.deepEqual(limitState(9, 11), { state: 'warn', pct: 81, remainingCents: 2, excessCents: 0 })
  assert.equal(limitState(10, 11)?.state, 'warn')
  assert.equal(limitState(8, 11)?.state, 'ok')
})

test('limitState com valor maximo nao perde precisao', () => {
  const max = LIMIT_MAX_CENTS
  assert.deepEqual(limitState(max, max), { state: 'warn', pct: 100, remainingCents: 0, excessCents: 0 })
  assert.equal(limitState(max + 1, max)?.state, 'over')
  assert.equal(limitState(max + 1, max)?.excessCents, 1)
  assert.equal(limitState(max - 1, max)?.pct, 99)
})

test('normalizePersonConfig: defaults para dado ausente ou ruim', () => {
  const empty = { salaryDay: 1, expectedIncomeCents: 0, incomeOverrides: {}, limits: {} }
  for (const raw of [undefined, null, {}, 'texto', 42, [], { salaryDay: 0 }, { salaryDay: '5' }]) {
    assert.deepEqual(normalizePersonConfig(raw), empty, JSON.stringify(raw))
  }
  assert.equal(normalizePersonConfig({ salaryDay: 5 }).salaryDay, 5)
  assert.equal(normalizePersonConfig({ salaryDay: 32 }).salaryDay, 1)
  assert.equal(normalizePersonConfig({ salaryDay: 5.5 }).salaryDay, 1)
})

test('normalizePersonConfig: renda esperada invalida vira 0', () => {
  for (const bad of [-1, 1.5, '5000', NaN, INCOME_MAX_CENTS + 1, null]) {
    assert.equal(normalizePersonConfig({ expectedIncomeCents: bad }).expectedIncomeCents, 0)
  }
  assert.equal(normalizePersonConfig({ expectedIncomeCents: 600000 }).expectedIncomeCents, 600000)
})

test('normalizePersonConfig: sobreposicoes so com chave YYYY-MM e inteiro >= 0', () => {
  const cfg = normalizePersonConfig({
    incomeOverrides: { '2026-11': 650000, '2026-12': 0, '2026-13': 1, novembro: 5, '2027-01': -1, '2027-02': 1.5 },
  })
  assert.deepEqual(cfg.incomeOverrides, { '2026-11': 650000, '2026-12': 0 })
})

test('normalizePersonConfig: limites so com from valido e cents null ou positivo, ordenados', () => {
  const cfg = normalizePersonConfig({
    limits: {
      alim: [
        { from: '2026-12', cents: 50000 },
        { from: '2026-10', cents: 40000 },
        { from: '2026-11', cents: 0 },
        { from: '2026-09', cents: -5 },
        { from: 'x', cents: 100 },
        { from: '2026-08', cents: 1.5 },
        { from: '2027-01', cents: null },
        null,
      ],
      lazer: 'ruim',
      vazio: [{ from: 'x', cents: 1 }],
    },
  })
  assert.deepEqual(cfg.limits, {
    alim: [
      { from: '2026-10', cents: 40000 },
      { from: '2026-12', cents: 50000 },
      { from: '2027-01', cents: null },
    ],
  })
})

test('normalizePersonConfig nao muta a entrada e devolve copia profunda', () => {
  const raw = { salaryDay: 5, limits: { alim: [{ from: '2026-10', cents: 40000 }] } }
  const snapshot = JSON.stringify(raw)
  const cfg = normalizePersonConfig(raw)
  cfg.limits.alim[0].cents = 1
  cfg.limits.alim.push({ from: '2027-01', cents: 2 })
  assert.equal(JSON.stringify(raw), snapshot)
})

test('normalizePersonConfig ignora chaves perigosas', () => {
  const raw = JSON.parse('{"limits":{"__proto__":[{"from":"2026-10","cents":1}]},"incomeOverrides":{"__proto__":5}}')
  const cfg = normalizePersonConfig(raw)
  assert.deepEqual(Object.keys(cfg.limits), [])
  assert.deepEqual(Object.keys(cfg.incomeOverrides), [])
  assert.equal({}.cents, undefined)
})

test('setSalaryDay devolve novo objeto e recusa dia invalido', () => {
  const cfg = normalizePersonConfig({ expectedIncomeCents: 100 })
  const next = setSalaryDay(cfg, 5)
  assert.notEqual(next, cfg)
  assert.equal(next.salaryDay, 5)
  assert.equal(cfg.salaryDay, 1)
  assert.equal(next.expectedIncomeCents, 100)
  for (const bad of [0, 32, 1.5, NaN, '5']) {
    assert.throws(() => setSalaryDay(cfg, bad), /Dia do salario invalido/)
  }
})

test('setExpectedIncome altera a base e preserva sobreposicoes', () => {
  const cfg = normalizePersonConfig({ incomeOverrides: { '2026-11': 650000 } })
  const next = setExpectedIncome(cfg, 600000, null)
  assert.equal(next.expectedIncomeCents, 600000)
  assert.deepEqual(next.incomeOverrides, { '2026-11': 650000 })
  assert.equal(setExpectedIncome(cfg, 700000).expectedIncomeCents, 700000)
})

test('setExpectedIncome com ciclo grava so a sobreposicao', () => {
  const cfg = normalizePersonConfig({ expectedIncomeCents: 600000 })
  const next = setExpectedIncome(cfg, 650000, '2026-11')
  assert.equal(next.expectedIncomeCents, 600000)
  assert.deepEqual(next.incomeOverrides, { '2026-11': 650000 })
  assert.deepEqual(cfg.incomeOverrides, {})
})

test('setExpectedIncome recusa valor e ciclo invalidos', () => {
  const cfg = normalizePersonConfig({})
  for (const bad of [-1, 1.5, INCOME_MAX_CENTS + 1, NaN, '100']) {
    assert.throws(() => setExpectedIncome(cfg, bad, null), /Renda invalida/)
  }
  assert.throws(() => setExpectedIncome(cfg, 100, '2026-13'), /Ciclo invalido/)
  assert.equal(setExpectedIncome(cfg, 0).expectedIncomeCents, 0)
})

test('setCategoryLimit atualiza so o historico da categoria', () => {
  const cfg = normalizePersonConfig({
    limits: { lazer: [{ from: '2026-10', cents: 20000 }] },
  })
  const next = setCategoryLimit(cfg, 'alimentacao', '2026-11', 40000)
  assert.deepEqual(next.limits.alimentacao, [{ from: '2026-11', cents: 40000 }])
  assert.deepEqual(next.limits.lazer, [{ from: '2026-10', cents: 20000 }])
  assert.equal(cfg.limits.alimentacao, undefined)
  const again = setCategoryLimit(next, 'alimentacao', '2026-11', 45000)
  assert.equal(again.limits.alimentacao.length, 1)
  assert.equal(again.limits.alimentacao[0].cents, 45000)
})

test('setCategoryLimit recusa categoria, ciclo e limite invalidos', () => {
  const cfg = normalizePersonConfig({})
  assert.throws(() => setCategoryLimit(cfg, '', '2026-11', 100), /Categoria invalida/)
  assert.throws(() => setCategoryLimit(cfg, '__proto__', '2026-11', 100), /Categoria invalida/)
  assert.throws(() => setCategoryLimit(cfg, 'alim', 'x', 100), /Ciclo invalido/)
  assert.throws(() => setCategoryLimit(cfg, 'alim', '2026-11', 0), /Limite invalido/)
})
