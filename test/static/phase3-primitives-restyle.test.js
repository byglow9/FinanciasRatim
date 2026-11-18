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
const RESTYLED = ['progress', 'card', 'button', 'badge', 'alert', 'input', 'label', 'select', 'dialog']

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
  for (const token of ['rounded-btn', 'h-12', 'h-14', 'h-11', 'circle:', 'circleLg:', 'iconSm:', 'text-base font-bold']) {
    assert.ok(src.includes(token), `Button sem ${token}`)
  }
  // Fundo e texto de acao por tokens com hex literal (nao dependem de hsl(var(--primary))).
  assert.match(src, /bg-action text-action-text/)
  // Nenhum tamanho interativo abaixo de 44px (h-11): h-9 e h-10 reprovam. O unico compacto e o
  // iconSm (32px, so lista densa do celular), que tambem e o unico com rounded-md.
  const semIconSm = src.split('\n').filter((l) => !l.includes('iconSm:')).join('\n')
  assert.doesNotMatch(semIconSm, /\bh-(8|9|10)\b/)
  assert.doesNotMatch(semIconSm, /\bw-(8|9|10)\b/)
  assert.doesNotMatch(semIconSm, /rounded-md/)
  assert.match(src, /iconSm:[^\n]*rounded-md/)
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

test('Input, Select e Label: campo de 48px, texto de 16px e rotulo 700', () => {
  const input = code(`${UI}input.tsx`)
  assert.match(input, /\bh-12\b/)
  assert.match(input, /\btext-base\b/)
  assert.match(input, /rounded-btn/)
  const select = code(`${UI}select.tsx`)
  assert.match(select, /\bh-12\b/)
  assert.match(select, /\btext-base\b/)
  assert.doesNotMatch(select, /\btext-sm\b/)
  const label = code(`${UI}label.tsx`)
  assert.match(label, /font-bold/)
  assert.match(label, /text-base/)
  assert.match(label, /peer-disabled/)
})

test('Dialog: role, aria-modal, Esc, retorno de foco e rotulo Fechar em portugues (T-03-28)', () => {
  const src = code(`${UI}dialog.tsx`)
  assert.match(src, /role="dialog"/)
  assert.match(src, /aria-modal/)
  assert.match(src, /Escape/)
  assert.match(src, /\.focus\(\)/)
  assert.match(src, /Fechar/)
  assert.doesNotMatch(src, /\bClose\b/)
  assert.match(src, /\bh-11 w-11\b/)
  // Camadas e trava de rolagem preservadas.
  assert.match(src, /z-\[9999\]/)
  assert.match(src, /z-\[10000\]/)
  assert.match(src, /document\.body\.style\.overflow/)
})

test('Dialog mantem todas as exportacoes publicas', () => {
  const src = code(`${UI}dialog.tsx`)
  for (const name of [
    'Dialog', 'DialogPortal', 'DialogOverlay', 'DialogTrigger', 'DialogContent',
    'DialogHeader', 'DialogFooter', 'DialogTitle', 'DialogDescription',
  ]) {
    assert.match(src, new RegExp(`\\b${name},?\\n`), `Dialog perdeu a exportacao ${name}`)
  }
})

test('primitivos restilizados nao usam pesos fora de 400 e 700', () => {
  for (const name of RESTYLED) {
    const src = code(`${UI}${name}.tsx`)
    for (const weight of ['font-medium', 'font-semibold', 'font-extrabold']) {
      assert.ok(!src.includes(weight), `${name}.tsx usa ${weight}`)
    }
  }
})
