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

test('os seis estados de entrada mesclados tem as chaves de STATE_KEYS, valores finitos e tabelas congeladas', () => {
  // plano 05-23: atento, surpreso e feliz entram na variante de entrada (cenas do onboarding)
  assert.deepEqual([...ENTRADA_STATES], ['neutro', 'triste', 'dormindo', 'atento', 'surpreso', 'feliz'])
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
  // plano 05-23: feliz agora existe na entrada; os desconhecidos passam a ser bravo e sonolento
  const { model } = make(5, { state: 'bravo' })
  assert.equal(model.state, 'neutro')
  model.setState('sonolento')
  assert.equal(model.state, 'neutro')
  model.setState('bravo')
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

test('a pose de entrada fica finita em 20 s de repouso nos seis estados', () => {
  for (const state of ENTRADA_STATES) {
    const { world, model } = make(7, { state })
    run(world, 20, () => {
      const p = model.pose
      for (const k of STATE_KEYS) assert.ok(Number.isFinite(p.e[k]), `${state}.${k}`)
      assert.ok(Number.isFinite(p.look.x) && Number.isFinite(p.look.y))
    })
  }
})

// ---- plano 05-23: atento, surpreso e feliz (numeros do POSE do sketch 029) ----

test('atento: olho 20 por 19, pupila 0,58, palpebras 0,08, corpo esticado e suor', () => {
  const m = merged('atento')
  assert.equal(m.ew, 20)
  assert.equal(m.eh, 19)
  assert.equal(m.pr, 0.58)
  assert.equal(m.by, -8)
  assert.equal(m.sy, 1.12)
  assert.equal(m.ea, 0)
  assert.equal(m.es, 1.12)
  assert.equal(m.cvL, 0.08)
  assert.equal(m.cvR, 0.08)
  assert.equal(ENTRADA_ACCESSORY.atento, 'sweat')
})

test('surpreso: olho 22 por 22, palpebras abertas, pupila 0,42 e exclamacao', () => {
  const m = merged('surpreso')
  assert.equal(m.ew, 22)
  assert.equal(m.eh, 22)
  assert.equal(m.cvL, 0)
  assert.equal(m.cvR, 0)
  assert.equal(m.pr, 0.42)
  assert.equal(m.by, -13)
  assert.equal(m.sy, 1.04)
  assert.equal(m.py, -3)
  assert.equal(m.ea, 26)
  assert.equal(m.es, 1.2)
  assert.equal(ENTRADA_ACCESSORY.surpreso, 'excl')
})

test('feliz: olhos em arco, corpo levemente erguido e faisca', () => {
  const m = merged('feliz')
  assert.equal(m.arc, 1)
  assert.equal(m.by, -5)
  assert.equal(m.sy, 1.02)
  assert.equal(m.ea, 8)
  assert.equal(m.es, 1.08)
  assert.equal(ENTRADA_ACCESSORY.feliz, 'spark')
})

test('modelo de entrada: atento liga o suor, surpreso a exclamacao e feliz o arco com faisca', () => {
  const a = make(21)
  a.model.setState('atento')
  assert.equal(a.model.state, 'atento')
  run(a.world, 3)
  assert.ok(a.model.pose.acc.sweat > 0.9, `sweat ${a.model.pose.acc.sweat}`)
  assert.ok(a.model.pose.acc.excl < 0.05)

  const s = make(22)
  s.model.setState('surpreso')
  assert.equal(s.model.state, 'surpreso')
  run(s.world, 3)
  assert.ok(s.model.pose.acc.excl > 0.9, `excl ${s.model.pose.acc.excl}`)
  assert.ok(Math.abs(s.model.pose.e.ew - 22) < 0.2)

  const f = make(23)
  f.model.setState('feliz')
  assert.equal(f.model.state, 'feliz')
  run(f.world, 3)
  assert.ok(f.model.pose.e.arc > 0.95, `arc ${f.model.pose.e.arc}`)
  assert.ok(f.model.pose.acc.spark > 0.9, `spark ${f.model.pose.acc.spark}`)
})

test('reacao susto na entrada leva ao surpreso e volta ao estado de fundo', () => {
  const { world, model } = make(31, { state: 'atento' })
  run(world, 2)
  model.react('susto')
  assert.equal(model.effState(), 'surpreso')
  run(world, 0.4)
  assert.ok(model.pose.acc.excl > 0.5, `excl ${model.pose.acc.excl}`)
  run(world, 3)
  assert.equal(model.effState(), 'atento')
  assert.ok(model.pose.acc.sweat > 0.9)
  assert.ok(model.pose.acc.excl < 0.05)
})

test('reacao festa na entrada leva ao feliz com moedinhas e volta ao estado de fundo', () => {
  const { world, model } = make(32, { state: 'neutro' })
  run(world, 2)
  model.react('festa')
  assert.equal(model.effState(), 'feliz')
  let maxCoins = 0
  run(world, 1.5, () => {
    const n = model.pose.coins ? model.pose.coins.length : 0
    if (n > maxCoins) maxCoins = n
  })
  assert.ok(maxCoins > 0, 'sem moedinhas')
  assert.ok(model.pose.e.arc > 0.9, `arc ${model.pose.e.arc}`)
  run(world, 4)
  assert.equal(model.effState(), 'neutro')
  assert.ok(model.pose.e.arc < 0.05)
})

test('a simetria dos seis estados vale tambem na pose assentada do modelo', () => {
  for (const state of ENTRADA_STATES) {
    const { world, model } = make(41, { state })
    run(world, 3)
    assert.ok(Math.abs(model.pose.e.cvL - model.pose.e.cvR) < 1e-6, `${state}: cv`)
    assert.ok(Math.abs(model.pose.e.ba) < 1e-6 && Math.abs(model.pose.e.bc) < 1e-6, `${state}: sobrancelha`)
  }
})
