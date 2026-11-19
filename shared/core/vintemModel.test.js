import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32 } from './vintemSpring.js'
import { STATE_KEYS } from './vintemStates.js'
import { World, VintemModel, POSE_KEYS, ACCESSORY_KEYS } from './vintemModel.js'

const DT60 = 1 / 60

/** Cria mundo e modelo com acaso determinista. */
function make(seed = 1, opts = {}) {
  const world = new World()
  const model = new VintemModel({ state: 'neutro', rand: mulberry32(seed), world, ...opts })
  return { world, model }
}

/** Percorre a pose e falha se achar numero nao finito. */
function assertFinitePose(pose, where = '') {
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'number') assert.ok(Number.isFinite(v), `${where} ${path}${k} nao finito: ${v}`)
      else if (Array.isArray(v)) v.forEach((it, i) => walk(it, `${path}${k}[${i}].`))
      else if (v && typeof v === 'object') walk(v, `${path}${k}.`)
    }
  }
  walk(pose, '')
}

/** Roda `seconds` de relogio simulado, chamando `each` a cada quadro. */
function run(world, seconds, dt = DT60, each = () => {}) {
  const n = Math.round(seconds / dt)
  for (let i = 0; i < n; i++) {
    world.step(dt)
    each(i)
  }
}

test('a pose tem todas as chaves do contrato e as 19 chaves de expressao', () => {
  const { model } = make()
  for (const k of POSE_KEYS) assert.ok(k in model.pose, `falta pose.${k}`)
  for (const k of STATE_KEYS) assert.ok(k in model.pose.e, `falta pose.e.${k}`)
  for (const k of ACCESSORY_KEYS) assert.ok(k in model.pose.acc, `falta pose.acc.${k}`)
  assert.equal(model.pose.coin.on, false)
  assert.deepEqual(model.pose.coins, [])
})

test('neutro respira 20 s com meia amplitude de sy entre 0,018 e 0,07 e volume preservado', () => {
  const { world, model } = make(3)
  let lo = Infinity
  let hi = -Infinity
  let worst = 0
  run(world, 20, DT60, () => {
    const p = model.pose
    assertFinitePose(p, 'repouso')
    lo = Math.min(lo, p.sy)
    hi = Math.max(hi, p.sy)
    worst = Math.max(worst, Math.abs(p.sx * p.sy - 1))
  })
  const half = (hi - lo) / 2
  assert.ok(half >= 0.018 && half <= 0.07, `meia amplitude ${half}`)
  assert.ok(worst < 0.08, `volume desviou ${worst}`)
})

test('setState triste assenta as molas de expressao em menos de 3 s', () => {
  const { world, model } = make(5)
  run(world, 1)
  model.setState('triste')
  assert.equal(model.state, 'triste')
  run(world, 3, DT60, () => assertFinitePose(model.pose, 'triste'))
  assert.equal(model.isSettled(), true)
  assert.ok(Math.abs(model.pose.e.ea - 70) < 1, `ea ${model.pose.e.ea}`)
  assert.ok(Math.abs(model.pose.e.sy - 0.93) < 0.01, `e.sy ${model.pose.e.sy}`)
})

test('estado desconhecido e ignorado e o construtor cai no neutro', () => {
  const { model } = make(7, { state: 'inexistente' })
  assert.equal(model.state, 'neutro')
  model.setState('nao-existe')
  assert.equal(model.state, 'neutro')
})

test('snapPose pula as molas para os alvos', () => {
  const { model } = make(9)
  model.setState('bravo')
  assert.equal(model.isSettled(), false)
  model.snapPose()
  assert.equal(model.isSettled(), true)
  assert.ok(Math.abs(model.pose.e.lt - 22) < 1e-9)
})
