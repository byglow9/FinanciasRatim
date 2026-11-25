import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLimiter } from '../src/limiter.js'

test('primeira chamada passa; segunda na mesma janela e bloqueada com retryAfterMs coerente', () => {
  let t = 1000
  const lim = createLimiter({ max: 1, windowMs: 60_000, now: () => t })
  assert.deepEqual(lim.take('a'), { ok: true, retryAfterMs: 0 })
  t += 20_000
  assert.deepEqual(lim.take('a'), { ok: false, retryAfterMs: 40_000 })
})

test('depois da janela libera de novo', () => {
  let t = 0
  const lim = createLimiter({ max: 1, windowMs: 60_000, now: () => t })
  assert.equal(lim.take('a').ok, true)
  t = 59_999
  assert.equal(lim.take('a').ok, false)
  t = 60_000
  assert.equal(lim.take('a').ok, true)
})

test('max maior que 1 permite varias chamadas na janela', () => {
  const lim = createLimiter({ max: 3, windowMs: 1000, now: () => 0 })
  assert.equal(lim.take('a').ok, true)
  assert.equal(lim.take('a').ok, true)
  assert.equal(lim.take('a').ok, true)
  assert.equal(lim.take('a').ok, false)
})

test('chaves sao independentes', () => {
  const lim = createLimiter({ max: 1, windowMs: 60_000, now: () => 0 })
  assert.equal(lim.take('a').ok, true)
  assert.equal(lim.take('b').ok, true)
  assert.equal(lim.take('a').ok, false)
  assert.equal(lim.take('b').ok, false)
})

test('o teto de chaves nao cresce e descarta as mais antigas', () => {
  const lim = createLimiter({ max: 1, windowMs: 60_000, now: () => 0 })
  for (let i = 0; i < 1500; i++) lim.take(`k${i}`)
  assert.ok(lim.size() <= 1000, `tamanho ${lim.size()}`)
  // a mais antiga foi descartada (libera de novo); a mais nova segue bloqueada
  assert.equal(lim.take('k0').ok, true)
  assert.equal(lim.take('k1499').ok, false)
})

test('chaves vencidas sao limpas a cada chamada', () => {
  let t = 0
  const lim = createLimiter({ max: 1, windowMs: 1000, now: () => t })
  for (let i = 0; i < 10; i++) lim.take(`k${i}`)
  assert.equal(lim.size(), 10)
  t = 5000
  lim.take('novo')
  assert.equal(lim.size(), 1)
})

test('parametros invalidos lancam erro', () => {
  assert.throws(() => createLimiter({ max: 0, windowMs: 1000 }))
  assert.throws(() => createLimiter({ max: 1, windowMs: 0 }))
})
