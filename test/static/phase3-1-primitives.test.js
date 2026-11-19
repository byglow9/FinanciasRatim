// Guarda estatica dos primitivos e dos tokens novos da Fase 3.1 (plano 03).
// Rodar: node --test test/static/phase3-1-primitives.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertIncludes, code, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const UI = 'src/components/ui/'

// Arquivos novos deste plano que ja existem (cresce a cada tarefa).
const NEW = [`${UI}square-check.tsx`]

const TOKENS = {
  'heat-1': '#fef2f2',
  'heat-2': '#fee2e2',
  'heat-3': '#fecaca',
  'heat-4': '#fca5a5',
  'heat-pos': '#dcfce7',
  'pit-yellow': '#fde047',
  'pit-blue': '#67e8f9',
  'pit-green': '#bef264',
  'pit-pink': '#e879f9',
  'pit-purple': '#c4b5fd',
  'dot-in': '#16a34a',
  'dot-out': '#ef4444',
  'dot-bill-pending': '#ea580c',
  'dot-bill-paid': '#65a30d',
  'dot-pig': '#ec4899',
  'dot-goal': '#8b5cf6',
  ele: '#14532d',
  ela: '#c2410c',
  'bill-od-bg': '#fef2f2',
  'bill-soon-bg': '#fff7ed',
}

test('index.css traz os 20 tokens da fase em hex literal', () => {
  const css = code('src/index.css')
  assert.equal(Object.keys(TOKENS).length, 20)
  for (const [name, hex] of Object.entries(TOKENS)) {
    assert.match(css, new RegExp(`--color-${name}:\\s*${hex};`), `token --color-${name} ausente ou fora de ${hex}`)
  }
})

test('os tokens da fase ficam no @theme inline e sem variante escura', () => {
  const css = code('src/index.css')
  const themeStart = css.indexOf('@theme inline')
  const themeEnd = css.indexOf('@layer base', themeStart)
  const theme = css.slice(themeStart, themeEnd)
  const dark = css.slice(css.indexOf('.dark {'))
  for (const name of Object.keys(TOKENS)) {
    assert.ok(theme.includes(`--color-${name}:`), `--color-${name} fora do @theme inline`)
    assert.ok(!dark.includes(`--color-${name}`), `--color-${name} com variante escura`)
  }
})

test('SquareCheck e quadrada, de 28px, em area de toque de 44px, com aria-pressed', () => {
  assertIncludes(`${UI}square-check.tsx`, ['export function SquareCheck', 'aria-pressed', 'aria-label', 'aria-disabled', 'aria-busy', 'h-11 w-11', 'h-7 w-7', 'rounded-lg', 'border-2'])
  const src = code(`${UI}square-check.tsx`)
  assert.ok(!/rounded-full/.test(src), 'a caixa de marcar nao pode ser circular')
  assert.ok(!/toast/i.test(src), 'marcar nao mostra toast (D-05)')
})

test('arquivos novos respeitam escala, pesos, emoji e HTML bruto', () => {
  assert.deepEqual(scaleProblems(NEW), [])
})

test('arquivos novos respeitam o alvo de toque de 44px', () => {
  // A caixa interna de 28px do SquareCheck (D-04) fica dentro da area de 44px (h-11 w-11):
  // o par h-7 w-7 e o desenho, nao o alvo. Os demais arquivos seguem a varredura normal.
  assert.deepEqual(touchProblems(NEW.filter((f) => !f.endsWith('square-check.tsx'))), [])
  assert.ok(/h-11 w-11/.test(read(`${UI}square-check.tsx`)))
})
