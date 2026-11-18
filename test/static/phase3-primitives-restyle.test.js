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
const RESTYLED = ['progress', 'card', 'button', 'badge', 'alert']

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

test('Button: alvos de 44px ou mais, raio do contrato e variantes circulares', () => {
  const src = code(`${UI}button.tsx`)
  for (const token of ['rounded-btn', 'h-12', 'h-14', 'h-11', 'circle:', 'circleLg:', 'text-base font-bold']) {
    assert.ok(src.includes(token), `Button sem ${token}`)
  }
  assert.match(src, /bg-primary text-primary-foreground/)
  // Nenhum tamanho interativo abaixo de 44px (h-11): h-9 e h-10 reprovam.
  assert.doesNotMatch(src, /\bh-(8|9|10)\b/)
  assert.doesNotMatch(src, /\bw-(8|9|10)\b/)
  assert.doesNotMatch(src, /rounded-md/)
})

test('Badge: success e warning com tinta AA, nunca branco sobre verde ou amarelo', () => {
  const src = code(`${UI}badge.tsx`)
  assert.match(src, /text-ok-ink/)
  assert.match(src, /text-warn-ink/)
  assert.doesNotMatch(src, /bg-green-500|bg-yellow-500/)
  assert.doesNotMatch(src, /text-white/)
})

test('Alert: formato notice sem borda, mantendo role alert e as exportacoes', () => {
  const src = code(`${UI}alert.tsx`)
  assert.match(src, /role="alert"/)
  assert.match(src, /rounded-2xl/)
  assert.match(src, /text-ok-ink/)
  assert.match(src, /text-warn-ink/)
  assert.match(src, /text-danger-ink/)
  assert.doesNotMatch(src, /\bborder-(destructive|yellow|green)/)
  assert.match(src, /export \{ Alert, AlertTitle, AlertDescription \}/)
})

test('primitivos restilizados nao usam pesos fora de 400 e 700', () => {
  for (const name of RESTYLED) {
    const src = code(`${UI}${name}.tsx`)
    for (const weight of ['font-medium', 'font-semibold', 'font-extrabold']) {
      assert.ok(!src.includes(weight), `${name}.tsx usa ${weight}`)
    }
  }
})
