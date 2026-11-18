import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (name) => readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (name) => read(name).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const ALL = ['time.js', 'classify.js', 'categories.js', 'ledger.js', 'bankStatus.js']
const CLOCK_FREE = ['time.js', 'categories.js', 'ledger.js', 'bankStatus.js']

for (const file of ALL) {
  test(`${file} nao importa pacote (so caminhos relativos)`, () => {
    const src = code(file)
    const specs = [
      ...[...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
      ...[...src.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
      ...[...src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
      ...[...src.matchAll(/\brequire\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
    ]
    for (const spec of specs) {
      assert.match(spec, /^\.\.?\//, `${file} importa pacote: ${spec}`)
    }
  })
}

for (const file of ALL) {
  test(`${file} nao usa Date.now`, () => {
    assert.doesNotMatch(code(file), /Date\.now\s*\(/)
  })
}

for (const file of CLOCK_FREE) {
  test(`${file} nao chama new Date() sem argumento`, () => {
    assert.doesNotMatch(code(file), /new\s+Date\s*\(\s*\)/)
  })
}
