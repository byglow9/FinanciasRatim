import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addAmount, goalProgress } from './goals.js'

test('99,5% nao e concluida: continua com falta e percentual 99', () => {
  const p = goalProgress(995, 1000)
  assert.equal(p.complete, false)
  assert.equal(p.percent, 99)
  assert.equal(p.remainingCents, 500)
})

test('concluida so quando o guardado alcanca o alvo em centavos', () => {
  assert.deepEqual(goalProgress(1000, 1000), { complete: true, percent: 100, remainingCents: 0 })
  assert.equal(goalProgress(1200, 1000).complete, true)
  assert.equal(goalProgress(1200, 1000).remainingCents, 0)
  assert.equal(goalProgress(999.99, 1000).complete, false)
})

test('meta sem alvo valido nunca fica concluida', () => {
  assert.deepEqual(goalProgress(10, 0), { complete: false, percent: 0, remainingCents: 0 })
})

test('percentual intermediario arredonda normalmente', () => {
  assert.equal(goalProgress(500, 1000).percent, 50)
  assert.equal(goalProgress(0, 1000).percent, 0)
})

test('addAmount soma em centavos inteiros, sem residuo de ponto flutuante', () => {
  assert.equal(addAmount(0.1, 0.2), 0.3)
  assert.notEqual(0.1 + 0.2, 0.3)
  let total = 0
  for (let i = 0; i < 10; i += 1) total = addAmount(total, 0.1)
  assert.equal(total, 1)
  assert.equal(addAmount(186.3, 0.05), 186.35)
})
