// Guarda estatica dos primitivos e dos tokens novos da Fase 3.1 (plano 03).
// Rodar: node --test test/static/phase3-1-primitives.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertIncludes, code, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const UI = 'src/components/ui/'

// Arquivos novos deste plano que ja existem (cresce a cada tarefa).
const NEW = [
  `${UI}square-check.tsx`,
  `${UI}popover.tsx`,
  `${UI}search-field.tsx`,
  `${UI}chip.tsx`,
  `${UI}progress.tsx`,
  `${UI}row-actions-sheet.tsx`,
  `${UI}kpi-trio.tsx`,
]

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

test('Popover tem gatilho de 44px, aria-expanded e fecha com Esc devolvendo o foco', () => {
  assertIncludes(`${UI}popover.tsx`, ['export function Popover', 'aria-expanded', 'aria-controls', 'Escape', 'mousedown', 'h-11 w-11', 'rounded-full bg-card', 'z-30', 'min(272px,calc(100vw-32px))', 'triggerRef.current?.focus()'])
})

test('SearchField e pilula de 48px, type="search" e limpa com botao de 44px', () => {
  assertIncludes(`${UI}search-field.tsx`, ['export { SearchField }', 'forwardRef', 'type="search"', 'h-12', 'rounded-full', 'Limpar busca', 'h-11 w-11'])
})

test('Chip repassa pressed como aria-pressed', () => {
  assertIncludes(`${UI}chip.tsx`, ['pressed?: boolean', 'aria-pressed={pressed}'])
})

test('Progress aceita os tons ele e ela e o tamanho md sem perder o contrato', () => {
  assertIncludes(`${UI}progress.tsx`, ['bg-ele', 'bg-ela', 'h-3', 'h-2', 'size?: ProgressSize', 'role="progressbar"', 'aria-label', 'duration-[400ms]'])
})

test('RowActionsSheet reaproveita o Sheet e confirma o apagar em duas etapas no mesmo Sheet', () => {
  const file = `${UI}row-actions-sheet.tsx`
  assertIncludes(file, ['from "@/components/ui/sheet"', 'export function RowActionsSheet', 'export type { RowAction', 'Manter', 'Apagar', 'aria-disabled', 'onBlocked', 'Notice tone="danger"', 'wasOpen', 'h-14'])
  const src = code(file)
  assert.ok(!/from "@\/components\/ui\/dialog"/.test(src), 'nao recria o Sheet nem usa Dialog')
  // Falha na gravacao mantem o Sheet aberto: onClose so depois do await bem sucedido.
  assert.ok(src.indexOf('await deletion.onConfirm()') < src.lastIndexOf('onClose()'), 'onClose deve vir depois da gravacao')
})

test('KpiTrio mostra o texto compacto e leva o valor exato no title e no aria-label', () => {
  assertIncludes(`${UI}kpi-trio.tsx`, ['export function KpiTrio', 'title=', 'aria-label=', 'num-display', 'tabular-nums', 'rounded-[22px]', "'joined' | 'cards'".replace(/'/g, '"')])
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
