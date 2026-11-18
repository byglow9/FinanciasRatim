// Guarda estatica do contrato dos primitivos novos da Fase 3 (IDEN-07, LIM-09).
// Rodar: node --test test/static/phase3-primitives-new.test.js
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

// Todos os arquivos novos deste plano que ja existem (preenchida nas tarefas 2 e 3).
const NEW = [
  `${UI}sheet.tsx`,
  `${UI}toast.tsx`,
  `${UI}notice.tsx`,
  `${UI}chip.tsx`,
  `${UI}icon-circle.tsx`,
  `${UI}collapsible.tsx`,
  `${UI}switch.tsx`,
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

test('Toast: provider, fila de um por vez, 5000ms, status polite e camada 10001', () => {
  const src = code(`${UI}toast.tsx`)
  for (const needle of [
    'ToastProvider',
    'useToast',
    'role="status"',
    'aria-live="polite"',
    '5000',
    'z-[10001]',
    'anim-toast-in',
    'aria-label="Fechar aviso"',
    'h-11 w-11',
    'safe-area-inset-top',
  ]) {
    has(src, needle, 'toast.tsx')
  }
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
  for (const n of ['min-h-11', 'aria-disabled', 'rounded-chip', 'text-xs font-bold', 'export function Chip', 'bg-[#dcfce7]']) {
    has(chip, n, 'chip.tsx')
  }
  const notice = code(`${UI}notice.tsx`)
  for (const n of ['export function Notice', 'rounded-2xl', 'aria-label', 'bg-card', 'p-3', 'role={tone === "danger" ? "alert" : "status"}', 'h-11 w-11']) {
    has(notice, n, 'notice.tsx')
  }
  const ic = code(`${UI}icon-circle.tsx`)
  for (const n of ['aria-hidden', 'h-11 w-11', 'h-12 w-12', 'rounded-full', 'bg-surface-2']) has(ic, n, 'icon-circle.tsx')
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
