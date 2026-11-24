import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32 } from './vintemSpring.js'
import { STATE_KEYS, STATE_PARAMS } from './vintemStates.js'
import { World, VintemModel } from './vintemModel.js'
import {
  ENTRADA_STATES,
  ENTRADA_DEFAULTS,
  ENTRADA_PARAMS,
  ENTRADA_ACCESSORY,
  ENTRADA_EYE,
} from './vintemEntrada.js'

const DT60 = 1 / 60

/** Mescla um estado de entrada com os padroes de entrada. */
const merged = (name) => ({ ...ENTRADA_DEFAULTS, ...ENTRADA_PARAMS[name] })

/** Modelo de entrada com acaso determinista. */
function make(seed = 1, opts = {}) {
  const world = new World()
  const model = new VintemModel({ state: 'neutro', rand: mulberry32(seed), world, look: 'entrada', ...opts })
  return { world, model }
}

function run(world, seconds, each = () => {}) {
  const n = Math.round(seconds / DT60)
  for (let i = 0; i < n; i++) {
    world.step(DT60)
    each(i)
  }
}

test('os tres estados de entrada mesclados tem as chaves de STATE_KEYS, valores finitos e tabelas congeladas', () => {
  assert.deepEqual([...ENTRADA_STATES], ['neutro', 'triste', 'dormindo'])
  assert.ok(Object.isFrozen(ENTRADA_STATES))
  assert.ok(Object.isFrozen(ENTRADA_DEFAULTS))
  assert.ok(Object.isFrozen(ENTRADA_PARAMS))
  assert.ok(Object.isFrozen(ENTRADA_ACCESSORY))
  assert.ok(Object.isFrozen(ENTRADA_EYE))
  for (const name of ENTRADA_STATES) {
    assert.ok(Object.isFrozen(ENTRADA_PARAMS[name]), `${name} nao congelado`)
    const m = merged(name)
    assert.deepEqual(Object.keys(m).sort(), [...STATE_KEYS].sort(), `${name}: chaves`)
    for (const k of STATE_KEYS) assert.ok(Number.isFinite(m[k]), `${name}.${k} nao finito`)
  }
})

test('simetria: cvL igual a cvR e sem inclinacao de sobrancelha em todos os estados', () => {
  for (const name of ENTRADA_STATES) {
    const m = merged(name)
    assert.equal(m.cvL, m.cvR, `${name}: palpebras diferentes`)
    assert.equal(m.ba, 0, `${name}: ba`)
    assert.equal(m.bc, 0, `${name}: bc`)
  }
})

test('neutro: olho mais largo que alto, palpebra entre 8% e 25% da altura e pupila grande', () => {
  const m = merged('neutro')
  assert.equal(m.ew, 21)
  assert.equal(m.eh, 18)
  assert.ok(m.ew > m.eh)
  assert.ok(m.cvL >= 0.08 && m.cvL <= 0.25, `palpebra ${m.cvL}`)
  assert.ok(m.pr >= 0.55, `pr ${m.pr}`)
})

test('dormindo fecha as duas palpebras com Zzz; neutro e triste sem acessorio', () => {
  const d = merged('dormindo')
  assert.equal(d.cvL, 1)
  assert.equal(d.cvR, 1)
  assert.equal(ENTRADA_ACCESSORY.dormindo, 'zzz')
  assert.equal(ENTRADA_ACCESSORY.neutro, null)
  assert.equal(ENTRADA_ACCESSORY.triste, null)
})

test('olhos em dx 29 e y 109 com vao de pelo menos 8 unidades no neutro', () => {
  assert.equal(ENTRADA_EYE.dx, 29)
  assert.equal(ENTRADA_EYE.y, 109)
  const gap = 2 * ENTRADA_EYE.dx - 2 * merged('neutro').ew
  assert.ok(gap >= 8, `vao ${gap}`)
})

test('modelo de entrada dormindo assenta com cvL perto de 1 e o acessorio Z ligado', () => {
  const { world, model } = make(3)
  model.setState('dormindo')
  assert.equal(model.state, 'dormindo')
  run(world, 3)
  assert.ok(model.pose.e.cvL > 0.97, `cvL ${model.pose.e.cvL}`)
  assert.ok(model.pose.e.cvR > 0.97, `cvR ${model.pose.e.cvR}`)
  assert.ok(model.pose.acc.z > 0.9, `acc.z ${model.pose.acc.z}`)
  assert.equal(model.isSettled(), true)
})

test('triste de entrada: olho menor e palpebras iguais; sem Zzz', () => {
  const { world, model } = make(4)
  model.setState('triste')
  run(world, 3)
  assert.ok(Math.abs(model.pose.e.cvL - model.pose.e.cvR) < 1e-6)
  assert.ok(Math.abs(model.pose.e.ew - 18) < 0.2, `ew ${model.pose.e.ew}`)
  assert.ok(model.pose.acc.z < 0.05)
})

test('com o look padrao o nome dormindo e recusado e o neutro do app nao muda', () => {
  const world = new World()
  const model = new VintemModel({ state: 'neutro', rand: mulberry32(2), world })
  model.setState('dormindo')
  assert.equal(model.state, 'neutro')
  const m2 = new VintemModel({ state: 'dormindo', rand: mulberry32(2), world: new World() })
  assert.equal(m2.state, 'neutro')
  model.snapPose()
  assert.equal(model.pose.e.cvL, STATE_PARAMS.neutro.cvL)
  assert.equal(model.pose.e.cvR, STATE_PARAMS.neutro.cvR)
  assert.equal(model.pose.e.cvL, 0.48)
  assert.equal(model.pose.e.cvR, 0.02)
})

test('estado desconhecido na variante de entrada vira neutro', () => {
  const { model } = make(5, { state: 'bravo' })
  assert.equal(model.state, 'neutro')
  model.setState('feliz')
  assert.equal(model.state, 'neutro')
})

test('neutro de entrada: centro do olhar sem vies lateral e y perto de 0,1', () => {
  const events = []
  const { world } = make(11, { onEvent: (kind, t, data) => kind === 'gaze-center' && events.push(data) })
  run(world, 240)
  assert.ok(events.length > 40, `poucos eventos: ${events.length}`)
  let sum = 0
  for (const e of events) {
    assert.ok(Math.abs(e.x) <= 0.25 + 1e-9, `x ${e.x}`)
    assert.ok(e.y >= -0.075 - 1e-9 && e.y <= 0.275 + 1e-9, `y ${e.y}`)
    sum += e.x
  }
  assert.ok(Math.abs(sum / events.length) < 0.06, `media x ${sum / events.length}`)
})

test('o neutro do app ainda tem vies lateral no centro do olhar', () => {
  const events = []
  const world = new World()
  new VintemModel({
    state: 'neutro',
    rand: mulberry32(11),
    world,
    onEvent: (kind, t, data) => kind === 'gaze-center' && events.push(data),
  })
  run(world, 240)
  const xs = events.map((e) => e.x)
  assert.ok(Math.max(...xs) > 0.4, 'o app deve continuar olhando alem de 0,25')
})

test('a pose de entrada fica finita em 20 s de repouso nos tres estados', () => {
  for (const state of ENTRADA_STATES) {
    const { world, model } = make(7, { state })
    run(world, 20, () => {
      const p = model.pose
      for (const k of STATE_KEYS) assert.ok(Number.isFinite(p.e[k]), `${state}.${k}`)
      assert.ok(Number.isFinite(p.look.x) && Number.isFinite(p.look.y))
    })
  }
})
