import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withTimeout } from './async.js'

const never = () => new Promise(() => {})

test('withTimeout: o valor que chega antes do prazo passa intacto', async () => {
  assert.equal(await withTimeout(Promise.resolve(42), 50), 42)
})

test('withTimeout: a rejeicao que chega antes do prazo passa intacta (mesma instancia)', async () => {
  const boom = new Error('falhou')
  await assert.rejects(withTimeout(Promise.reject(boom), 50), (err) => err === boom)
})

test('withTimeout: passado o prazo rejeita com Error de code "timeout"', async () => {
  await assert.rejects(withTimeout(never(), 10), (err) => {
    assert.ok(err instanceof Error)
    assert.equal(err.code, 'timeout')
    return true
  })
})

test('withTimeout: a promessa lenta que resolve depois do prazo nao vence o timeout', async () => {
  const slow = new Promise((resolve) => setTimeout(() => resolve('tarde'), 40))
  await assert.rejects(withTimeout(slow, 5), (err) => err.code === 'timeout')
})

test('withTimeout: limpa o temporizador no sucesso e na rejeicao', async () => {
  const realSet = globalThis.setTimeout
  const realClear = globalThis.clearTimeout
  const live = new Set()
  globalThis.setTimeout = (fn, ms) => {
    const id = realSet(fn, ms)
    live.add(id)
    return id
  }
  globalThis.clearTimeout = (id) => {
    live.delete(id)
    realClear(id)
  }
  try {
    await withTimeout(Promise.resolve(1), 10_000)
    assert.equal(live.size, 0, 'temporizador ficou vivo apos o sucesso')
    await assert.rejects(withTimeout(Promise.reject(new Error('x')), 10_000))
    assert.equal(live.size, 0, 'temporizador ficou vivo apos a rejeicao')
  } finally {
    globalThis.setTimeout = realSet
    globalThis.clearTimeout = realClear
  }
})
