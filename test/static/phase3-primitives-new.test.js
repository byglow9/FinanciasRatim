// Guarda estatica do contrato dos primitivos novos da Fase 3 (IDEN-07, LIM-09).
// Rodar: node --test test/static/phase3-primitives-new.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORY_ICONS } from '../../shared/core/categories.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const UI = 'src/components/ui/'

// Todos os arquivos novos deste plano que ja existem (preenchida nas tarefas 2 e 3).
const NEW = [
  `${UI}sheet.tsx`,
  `${UI}toast.tsx`,
  `${UI}notice.tsx`,
  `${UI}chip.tsx`,
  `${UI}icon-circle.tsx`,
  `${UI}collapsible.tsx`,
  `${UI}switch.tsx`,
  `${UI}segmented-control.tsx`,
  `${UI}money-keypad.tsx`,
  'src/lib/categoryIcons.ts',
]

const has = (src, needle, label) => assert.ok(src.includes(needle), `${label} sem ${needle}`)

test('Sheet: dialogo acessivel com portal, camadas, foco e saida animada', () => {
  const src = code(`${UI}sheet.tsx`)
  for (const needle of [
    'role="dialog"',
    'aria-modal',
    'aria-labelledby',
    'createPortal',
    'Escape',
    'Tab',
    'z-[9999]',
    'z-[10000]',
    '92dvh',
    'anim-sheet-in',
    'anim-sheet-out',
    'anim-overlay-in',
    'anim-overlay-out',
    'aria-label="Fechar"',
    'rounded-t-[28px]',
    'h-11 w-11',
    'rgba(0,0,0,.35)',
    'min(480px,100%)',
  ]) {
    has(src, needle, 'sheet.tsx')
  }
  assert.match(src, /\.focus\(\)/, 'sheet.tsx nao devolve nem move o foco')
  assert.match(src, /document\.body\.style\.overflow/, 'sheet.tsx nao trava a rolagem do corpo')
  assert.match(src, /useId/, 'sheet.tsx sem useId para o titulo')
})

test('Sheet nao prende o usuario: Esc, escuro e Fechar chamam onClose (T-03-31)', () => {
  const src = code(`${UI}sheet.tsx`)
  assert.match(src, /e\.key === "Escape"[\s\S]{0,120}onCloseRef\.current\(\)/)
  assert.ok((src.match(/onClose\(\)/g) ?? []).length >= 2, 'escuro e botao Fechar precisam chamar onClose')
})

test('Toast: provider, fila de um por vez, 3000ms, status polite, camada 10001 e posicao acima da dock', () => {
  const src = code(`${UI}toast.tsx`)
  for (const needle of [
    'ToastProvider',
    'useToast',
    'role="status"',
    'aria-live="polite"',
    '3000',
    'detail',
    'w-fit',
    'z-[10001]',
    'anim-toast-in',
    'aria-label="Fechar aviso"',
    'h-11 w-11',
    'safe-area-inset-bottom',
  ]) {
    has(src, needle, 'toast.tsx')
  }
  assert.doesNotMatch(src, /safe-area-inset-top/, 'o aviso nao pode cobrir o cabecalho (sino e perfil)')
  assert.match(src, /onMouseEnter/, 'toast.tsx nao pausa em hover')
  assert.match(src, /onFocus/, 'toast.tsx nao pausa em foco')
  assert.match(src, /throw new Error\(/, 'useToast precisa lancar fora do provider')
  assert.match(read(`${UI}toast.tsx`), /eslint-disable-next-line react-refresh\/only-export-components/)
})

test('Switch, Collapsible, Chip e Notice seguem o contrato do UI-SPEC', () => {
  const sw = code(`${UI}switch.tsx`)
  for (const n of ['role="switch"', 'aria-checked', 'h-11 w-11', 'disabled']) has(sw, n, 'switch.tsx')
  const co = code(`${UI}collapsible.tsx`)
  for (const n of ['grid-rows-[0fr]', 'grid-rows-[1fr]', 'transition-[grid-template-rows]', 'duration-200', 'overflow-hidden', 'aria-hidden']) {
    has(co, n, 'collapsible.tsx')
  }
  const chip = code(`${UI}chip.tsx`)
  for (const n of ['min-h-11', 'aria-disabled', 'rounded-chip', 'text-xs font-bold', 'export function Chip', 'bg-ok-bg']) {
    has(chip, n, 'chip.tsx')
  }
  const notice = code(`${UI}notice.tsx`)
  for (const n of ['export function Notice', 'rounded-2xl', 'aria-label', 'bg-card', 'p-3', 'role={tone === "danger" ? "alert" : "status"}', 'h-11 w-11']) {
    has(notice, n, 'notice.tsx')
  }
  const ic = code(`${UI}icon-circle.tsx`)
  for (const n of ['aria-hidden', 'h-11 w-11', 'h-12 w-12', 'rounded-full', 'bg-surface-2']) has(ic, n, 'icon-circle.tsx')
})

test('SegmentedControl: tablist com setas, Home e End e sem reutilizar Tabs', () => {
  const src = code(`${UI}segmented-control.tsx`)
  for (const n of ['role="tablist"', 'role="tab"', 'aria-selected', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'aria-label={ariaLabel}', 'bg-card', 'rounded-full', 'bg-inset', 'h-11', 'tabIndex', 'collapseInactive', 'title={iconOnly']) {
    has(src, n, 'segmented-control.tsx')
  }
  assert.doesNotMatch(src, /from ["']\.\/tabs["']/, 'SegmentedControl nao pode reutilizar Tabs')
})

test('MoneyKeypad: usa a logica pura em centavos e nao usa input numerico (T-03-32)', () => {
  const src = code(`${UI}money-keypad.tsx`)
  assert.match(src, /import \{[^}]*applyKeypad[^}]*\} from ['"]@shared\/core\/format\.js['"]/)
  for (const n of ["aria-label={key === \"backspace\" ? \"Apagar\"", "'00'", 'displayTier', 'formatMoneyParts', 'grid-cols-3', 'gap-2', 'h-14', 'h-12', 'text-[28px]', 'text-[56px]', 'num-display', 'Backspace', 'ctrlKey', 'metaKey', 'altKey', 'isContentEditable']) {
    has(src, n, 'money-keypad.tsx')
  }
  assert.ok(read(`${UI}money-keypad.tsx`).includes('aria-label'), 'sem aria-label')
  assert.match(code(`${UI}money-keypad.tsx`), /Apagar/)
  assert.doesNotMatch(src, /type=["']number["']/, 'dinheiro nao entra por input type=number')
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) has(src, tag, 'money-keypad.tsx')
})

test('categoryIcons: um componente Lucide (importado um a um) para cada nome de CATEGORY_ICONS, com Tag de reserva', () => {
  const src = code('src/lib/categoryIcons.ts')
  assert.ok(CATEGORY_ICONS.length >= 60)
  assert.doesNotMatch(src, /import \* as|from ['"]lucide-react\/dynamic/, 'importacao individual (tree-shaking)')
  for (const name of CATEGORY_ICONS) {
    assert.match(src, new RegExp(`['"]${name}['"]\\s*:`), `categoryIcons.ts sem a chave ${name}`)
  }
  assert.match(src, /export function iconComponent/)
  assert.match(src, /export const CATEGORY_ICON_COMPONENTS/)
  assert.match(src, /return Tag/)
  // Nenhuma chave alem das permitidas.
  const keys = [...src.matchAll(/^\s*['"]([a-z0-9-]+)['"]\s*:/gm)].map((m) => m[1])
  assert.deepEqual([...keys].sort(), [...CATEGORY_ICONS].sort())
})

test('Primitivos novos: sem pesos 500, 600 ou 800, sem emoji, sem HTML bruto e sem console', () => {
  const rawHtml = 'dangerously' + 'SetInnerHTML'
  for (const f of NEW) {
    const src = code(f)
    for (const bad of ['font-medium', 'font-semibold', 'font-extrabold']) {
      assert.ok(!src.includes(bad), `${f} usa ${bad}`)
    }
    assert.ok(!src.includes(rawHtml), `${f} injeta HTML bruto (T-03-30)`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${f} contem emoji`)
    assert.doesNotMatch(src, /\bconsole\./, `${f} usa console (T-03-33)`)
  }
})
