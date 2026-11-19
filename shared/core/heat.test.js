import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heatLevels } from './heat.js'

test('saldo positivo vira pos e zero vira none', () => {
  const level = heatLevels([-100, -200, 300, 0])
  assert.equal(level(1), 'pos')
  assert.equal(level(30000), 'pos')
  assert.equal(level(0), 'none')
})

test('saldo negativo vira h1 a h4 pelos quartis dos dias gastadores', () => {
  // 8 dias gastadores, valores absolutos 1 a 8; positivo e zero nao entram nos quartis
  const level = heatLevels([-1, -2, -3, -4, -5, -6, -7, -8, 500, 0])
  assert.equal(level(-1), 'h1')
  assert.equal(level(-2), 'h1')
  assert.equal(level(-8), 'h4')
})

test('quartis: ate o 1o, 2o e 3o quartil e acima do 3o', () => {
  // abs ordenados [1..8]: q1 = vals[2] = 3, q2 = vals[4] = 5, q3 = vals[6] = 7
  const level = heatLevels([-8, -7, -6, -5, -4, -3, -2, -1])
  assert.equal(level(-1), 'h1')
  assert.equal(level(-3), 'h1')
  assert.equal(level(-4), 'h2')
  assert.equal(level(-5), 'h2')
  assert.equal(level(-6), 'h3')
  assert.equal(level(-7), 'h3')
  assert.equal(level(-8), 'h4')
})

test('todos os dias gastadores iguais viram h1', () => {
  const level = heatLevels([-10, -10, -10, -10])
  assert.equal(level(-10), 'h1')
  // um valor maior que o conhecido ja e acima de todos os quartis
  assert.equal(level(-11), 'h4')
})

test('um unico dia gastador vira h1', () => {
  const level = heatLevels([-5000, 0, 1200])
  assert.equal(level(-5000), 'h1')
})

test('dois dias gastadores [3, 9] viram h1 e h2', () => {
  const level = heatLevels([-9, -3, 0])
  assert.equal(level(-3), 'h1')
  assert.equal(level(-9), 'h2')
})

test('tres dias gastadores: niveis crescentes sem passar de h3', () => {
  const level = heatLevels([-1, -5, -9])
  assert.equal(level(-1), 'h1')
  assert.equal(level(-5), 'h2')
  assert.equal(level(-9), 'h3')
})

test('empates compartilham o mesmo nivel (comparacao inclusiva)', () => {
  const level = heatLevels([-5, -5, -9])
  assert.equal(level(-5), 'h1')
  assert.equal(level(-9), 'h3')
  const many = heatLevels([-2, -2, -2, -2, -2, -2, -2, -9])
  assert.equal(many(-2), 'h1')
  assert.equal(many(-9), 'h4')
})

test('o resultado nao depende da ordem de entrada', () => {
  const values = [-40, 100, -10, -70, 0, -20, -90, -30, -60, -50, -80]
  const shuffled = [...values].reverse()
  const rotated = [...values.slice(4), ...values.slice(0, 4)]
  const a = heatLevels(values)
  const b = heatLevels(shuffled)
  const c = heatLevels(rotated)
  for (let v = -100; v <= 100; v += 5) {
    assert.equal(b(v), a(v), `reverso em ${v}`)
    assert.equal(c(v), a(v), `rotacionado em ${v}`)
  }
})

test('ciclo sem dia gastador: gasto desconhecido cai em h1; positivo e zero seguem as regras', () => {
  const level = heatLevels([0, 500, 0])
  assert.equal(level(500), 'pos')
  assert.equal(level(0), 'none')
  assert.equal(level(-1), 'h1')
  assert.equal(heatLevels([])(-1), 'h1')
})

test('nao muta a entrada e ignora valores nao finitos', () => {
  const values = [-3, Number.NaN, -9, 0, Number.POSITIVE_INFINITY]
  const snapshot = [...values]
  const level = heatLevels(values)
  assert.deepEqual(values.map(String), snapshot.map(String))
  assert.equal(level(-3), 'h1')
  assert.equal(level(-9), 'h2')
  assert.equal(level(Number.NaN), 'none')
})
