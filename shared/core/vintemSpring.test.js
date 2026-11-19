import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  Spring,
  SPRING_PARAMS,
  CRITICAL_MIN_K,
  springZeta,
  BLINK,
  blinkEnv,
  mulberry32,
} from './vintemSpring.js'
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

test('blinkEnv: fecha em 80 ms, segura, abre e passa pelo overshoot', () => {
  assert.equal(blinkEnv(0), 0)
  assert.ok(Math.abs(blinkEnv(0.08) - 1) < 1e-9)
  assert.equal(BLINK.close, 0.08)
  assert.equal(BLINK.hold, 0.04)
  assert.ok(blinkEnv(0.04) > 0 && blinkEnv(0.04) < 1)
  assert.ok(Math.abs(blinkEnv(0.1) - 1) < 1e-9)
  assert.ok(Math.abs(blinkEnv(0.119) - 1) < 1e-3)
  assert.ok(Math.abs(blinkEnv(0.29)) < 1e-9)
  let min = 0
  for (let t = 0.29; t < 0.36; t += 0.001) {
    const v = blinkEnv(t)
    assert.ok(v >= -0.14 - 1e-9 && v <= 1e-9, `t ${t} v ${v}`)
    if (v < min) min = v
  }
  assert.ok(min < -0.13, `pico ${min}`)
  assert.equal(blinkEnv(-0.01), 0)
  assert.equal(blinkEnv(0.36), 0)
  assert.equal(blinkEnv(5), 0)
})

test('mulberry32: mesma semente repete, valores em [0,1), sementes diferentes divergem', () => {
  const a = mulberry32(42)
  const b = mulberry32(42)
  const c = mulberry32(43)
  const seqA = Array.from({ length: 50 }, () => a())
  const seqB = Array.from({ length: 50 }, () => b())
  const seqC = Array.from({ length: 50 }, () => c())
  assert.deepEqual(seqA, seqB)
  assert.notDeepEqual(seqA, seqC)
  for (const v of seqA) assert.ok(v >= 0 && v < 1)
})

// Maior valor de x - t ao longo de 4 s de passos de 1/240 s.
function overshoot(spring, critical) {
  let max = -Infinity
  for (let i = 0; i < 4 * 240; i++) {
    spring.step(1 / 240, critical)
    max = Math.max(max, spring.x - spring.t)
  }
  return max
}

test('amortecimento critico: k de 60 vira k >= 420 e chega sem overshoot', () => {
  const s = new Spring(0, 60, 13)
  s.t = 1
  let time = 0
  let settled = Infinity
  let max = -Infinity
  while (time < 4) {
    s.step(1 / 240, true)
    time += 1 / 240
    max = Math.max(max, s.x - s.t)
    if (settled === Infinity && Math.abs(s.x - s.t) < 1e-3 && Math.abs(s.v) < 1e-2) settled = time
  }
  assert.ok(max < 0.01, `overshoot ${max}`)
  // Com k 60 o assentamento passaria de 1 s; com k >= 420 fica abaixo disso.
  assert.ok(settled < 0.8, `assentou em ${settled}s`)
  assert.equal(s.k, 60, 'a mola em si nao e alterada')
  assert.ok(Math.max(s.k, CRITICAL_MIN_K) >= 420)
})

test('sem amortecimento critico a orelha balanca (overshoot > .1)', () => {
  const [k, c] = SPRING_PARAMS.ear
  const s = new Spring(0, k, c)
  s.t = 1
  const over = overshoot(s, false)
  assert.ok(over > 0.1, `overshoot ${over}`)
})
