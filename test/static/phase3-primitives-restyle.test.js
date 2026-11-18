// Guarda estatica do contrato dos primitivos restilizados da Fase 3 (IDEN-07, CENT-02).
// Rodar: node --test test/static/phase3-primitives-restyle.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const UI = 'src/components/ui/'

// Primitivos reescritos: so pesos 400 e 700 (UI-SPEC Typography).
const RESTYLED = ['progress', 'card']

test('Progress expoe progressbar com aria e as quatro tones (LIM-02)', () => {
  const src = code(`${UI}progress.tsx`)
  assert.match(src, /role="progressbar"/)
  for (const attr of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-label']) {
    assert.ok(src.includes(attr), `Progress sem ${attr}`)
  }
  for (const tone of ['ok', 'warn', 'over', 'neutral']) {
    assert.match(src, new RegExp(`\\b${tone}\\b`), `Progress sem a tone ${tone}`)
  }
  for (const fill of ['bg-brand', 'bg-warn', 'bg-danger', 'bg-track']) {
    assert.ok(src.includes(fill), `Progress sem ${fill}`)
  }
  assert.match(src, /duration-\[400ms\]/)
  assert.match(src, /\bh-2\b/)
})

test('Card sem borda e sem sombra, com raio de cartao e titulo 16/700', () => {
  const src = code(`${UI}card.tsx`)
  assert.match(src, /rounded-card/)
  assert.doesNotMatch(src, /shadow-sm/)
  assert.doesNotMatch(src, /rounded-lg border/)
  assert.match(src, /text-base font-bold/)
})

test('primitivos restilizados nao usam pesos fora de 400 e 700', () => {
  for (const name of RESTYLED) {
    const src = code(`${UI}${name}.tsx`)
    for (const weight of ['font-medium', 'font-semibold', 'font-extrabold']) {
      assert.ok(!src.includes(weight), `${name}.tsx usa ${weight}`)
    }
  }
})
