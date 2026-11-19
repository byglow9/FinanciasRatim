import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Spring, SPRING_PARAMS, CRITICAL_MIN_K, springZeta } from './vintemSpring.js'
import { STATE_KEYS, STATE_DEFAULTS, STATE_PARAMS } from './vintemStates.js'

const [PP_K, PP_C] = SPRING_PARAMS.pp

// Roda a mola ate assentar; devolve o tempo em segundos ou Infinity.
function settleTime(spring, dt, limit = 6) {
  let t = 0
  while (t < limit) {
    spring.step(dt)
    t += dt
    if (Math.abs(spring.x - spring.t) < 1e-3 && Math.abs(spring.v) < 1e-2) return t
  }
  return Infinity
}

test('SPRING_PARAMS tem as 15 molas e esta congelado', () => {
  assert.equal(Object.keys(SPRING_PARAMS).length, 15)
  assert.ok(Object.isFrozen(SPRING_PARAMS))
  assert.deepEqual([...SPRING_PARAMS.pp], [260, 21])
  assert.equal(CRITICAL_MIN_K, 420)
})

test('springZeta da mola pp fica entre 0,6 e 0,7', () => {
  const z = springZeta(PP_K, PP_C)
  assert.ok(z > 0.6 && z < 0.7, `zeta ${z}`)
})

test('cada chave de STATE_KEYS converge ao valor do neutro em menos de 3 s', () => {
  for (const key of STATE_KEYS) {
    const from = STATE_DEFAULTS[key]
    const to = { ...STATE_DEFAULTS, ...STATE_PARAMS.neutro }[key]
    const s = new Spring(from, PP_K, PP_C)
    s.t = to
    const t = settleTime(s, 1 / 60)
    assert.ok(t < 3, `${key} assentou em ${t}s`)
  }
})

test('salto de 1000 unidades com dt de 1/30 s continua finito e assenta em menos de 3 s', () => {
  const s = new Spring(0, PP_K, PP_C)
  s.t = 1000
  let t = 0
  let settled = Infinity
  while (t < 6) {
    s.step(1 / 30)
    t += 1 / 30
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.v), 'divergiu')
    if (settled === Infinity && Math.abs(s.x - s.t) < 1e-3 && Math.abs(s.v) < 1e-2) settled = t
  }
  assert.ok(settled < 3, `assentou em ${settled}s`)
})

test('snap pula para o alvo e zera a velocidade', () => {
  const s = new Spring(0, PP_K, PP_C)
  s.t = 5
  s.step(0.1)
  s.snap(2)
  assert.equal(s.x, 2)
  assert.equal(s.t, 2)
  assert.equal(s.v, 0)
})
