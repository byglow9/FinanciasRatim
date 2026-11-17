import { test } from 'node:test'
import assert from 'node:assert/strict'

// D-10: o servidor enxerga o nucleo compartilhado por caminho relativo
// (zero copia). No Railway a imagem leva server/ e shared/ lado a lado.
test('servidor resolve ../../shared por caminho relativo', async () => {
  const sync = await import('../src/sync.js')
  assert.equal(typeof sync.syncAll, 'function')

  const time = await import('../../shared/core/time.js')
  const classify = await import('../../shared/core/classify.js')
  const categories = await import('../../shared/core/categories.js')
  const ledger = await import('../../shared/core/ledger.js')

  assert.equal(typeof time.monthRange, 'function')
  assert.equal(typeof classify.classify, 'function')
  assert.equal(typeof categories.addCategory, 'function')
  assert.equal(typeof ledger.weeklySpend, 'function')
})
