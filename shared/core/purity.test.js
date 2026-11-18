import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (name) => readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (name) => read(name).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// Descoberta automatica: todo .js da pasta que nao e teste entra na guarda, entao
// modulo novo do nucleo fica coberto sem editar lista.
const ALL = readdirSync(fileURLToPath(new URL('./', import.meta.url)))
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .sort()
// classify.js usa new Date() como valor padrao de now (decisao antiga e documentada).
const CLOCK_FREE = ALL.filter((name) => name !== 'classify.js')

test('a descoberta automatica enxerga os modulos conhecidos do nucleo', () => {
  for (const name of ['time.js', 'classify.js', 'categories.js', 'ledger.js', 'bankStatus.js', 'cycle.js']) {
    assert.ok(ALL.includes(name), `${name} nao foi descoberto`)
  }
  assert.ok(ALL.length >= 6, `esperava ao menos 6 modulos, achou ${ALL.length}`)
  assert.ok(!ALL.some((name) => name.endsWith('.test.js')))
})

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
