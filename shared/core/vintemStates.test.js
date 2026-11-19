import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  STATE_KEYS,
  STATE_DEFAULTS,
  STATE_PARAMS,
  VINTEM_STATES,
  ACCESSORY_BY_STATE,
  stateFromPct,
} from './vintemStates.js'

const merged = (state) => ({ ...STATE_DEFAULTS, ...STATE_PARAMS[state] })

test('sao 19 chaves, sem chaves de boca nem cv unico', () => {
  assert.equal(STATE_KEYS.length, 19)
  assert.equal(new Set(STATE_KEYS).size, 19)
  for (const banned of ['sm', 'op', 'cv']) assert.ok(!STATE_KEYS.includes(banned), banned)
  assert.deepEqual(Object.keys(STATE_DEFAULTS).sort(), [...STATE_KEYS].sort())
})

test('os sete estados existem e todos mesclam em 19 numeros finitos', () => {
  assert.equal(VINTEM_STATES.length, 7)
  assert.deepEqual(Object.keys(STATE_PARAMS).sort(), [...VINTEM_STATES].sort())
  for (const state of VINTEM_STATES) {
    const full = merged(state)
    assert.deepEqual(Object.keys(full).sort(), [...STATE_KEYS].sort(), state)
    for (const key of STATE_KEYS) {
      assert.ok(Number.isFinite(full[key]), `${state}.${key}`)
    }
    for (const banned of ['sm', 'op', 'cv']) {
      assert.ok(!(banned in STATE_PARAMS[state]), `${state} define ${banned}`)
    }
  }
})

test('tabelas exportadas estao congeladas', () => {
  assert.ok(Object.isFrozen(STATE_KEYS))
  assert.ok(Object.isFrozen(VINTEM_STATES))
  assert.ok(Object.isFrozen(STATE_DEFAULTS))
  assert.ok(Object.isFrozen(STATE_PARAMS))
  assert.ok(Object.isFrozen(ACCESSORY_BY_STATE))
  for (const state of VINTEM_STATES) assert.ok(Object.isFrozen(STATE_PARAMS[state]), state)
})

test('o neutro e esperto e debochado (correcao 1)', () => {
  const n = merged('neutro')
  assert.ok(n.cvL - n.cvR >= 0.15, `cvL - cvR = ${n.cvL - n.cvR}`)
  assert.ok(Math.abs(n.ba) >= 5, `ba = ${n.ba}`)
})

test('o triste nao e um disco achatado e as orelhas dobram (correcao 2)', () => {
  const t = merged('triste')
  assert.ok(t.sy >= 0.92)
  assert.equal(t.py, 5)
  assert.equal(t.rt, 5)
  assert.equal(t.ea, 70)
  assert.equal(t.es, 0.72)
  assert.equal(t.lt, -15)
  assert.equal(t.bt, -22)
  assert.equal(t.wet, 1)
  assert.equal(t.pr, 0.74)
})

test('fora do neutro, cvL e cvR valem o mesmo numero', () => {
  for (const state of VINTEM_STATES) {
    if (state === 'neutro') continue
    const s = merged(state)
    assert.equal(s.cvL, s.cvR, state)
  }
})

test('valores dos demais estados conferem com a tabela do UI-SPEC', () => {
  const feliz = merged('feliz')
  assert.equal(feliz.arc, 1)
  assert.equal(feliz.by, -5)
  assert.equal(feliz.bc, 3)
  assert.equal(feliz.sy, 1.02)
  assert.equal(feliz.ea, 8)
  assert.equal(feliz.es, 1.08)
  const bravo = merged('bravo')
  assert.equal(bravo.cvL, 0.38)
  assert.equal(bravo.lt, 22)
  assert.equal(bravo.bt, 24)
  assert.equal(bravo.ea, 60)
  const sono = merged('sonolento')
  assert.equal(sono.cvL, 0.62)
  assert.equal(sono.ea, 42)
  const surp = merged('surpreso')
  assert.equal(surp.eh, 27)
  assert.equal(surp.py, -3)
  assert.equal(surp.es, 1.2)
  const atento = merged('atento')
  assert.equal(atento.sy, 1.12)
  assert.equal(atento.ea, 0)
  assert.equal(atento.ly, -0.25)
})

test('stateFromPct respeita as fronteiras', () => {
  assert.equal(stateFromPct(0), 'feliz')
  assert.equal(stateFromPct(39), 'feliz')
  assert.equal(stateFromPct(40), 'neutro')
  assert.equal(stateFromPct(74), 'neutro')
  assert.equal(stateFromPct(75), 'atento')
  assert.equal(stateFromPct(100), 'atento')
  assert.equal(stateFromPct(101), 'bravo')
  assert.equal(stateFromPct(130), 'bravo')
  assert.equal(stateFromPct(131), 'triste')
  assert.equal(stateFromPct(500), 'triste')
})

test('stateFromPct so devolve estados conhecidos', () => {
  for (let p = 0; p <= 200; p += 1) {
    assert.ok(VINTEM_STATES.includes(stateFromPct(p)), String(p))
  }
})

test('ACCESSORY_BY_STATE mapeia um acessorio por estado', () => {
  assert.deepEqual(
    { ...ACCESSORY_BY_STATE },
    {
      neutro: null,
      feliz: 'spark',
      triste: 'tear',
      bravo: 'anger',
      sonolento: 'zzz',
      surpreso: 'excl',
      atento: 'sweat',
    },
  )
})
