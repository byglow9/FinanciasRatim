// Guarda estatica da barra superior da Fase 3 (LIM-07, LIM-10, IDEN-07, D-20).
// Rodar: node --test test/static/phase3-topbar.test.js
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

const BELL = 'src/components/layout/AlertsBell.tsx'
const CYCLE = 'src/components/layout/CycleSelector.tsx'
const PROFILE = 'src/components/layout/ProfileSwitcher.tsx'
const TOPBAR = 'src/components/layout/TopBar.tsx'
const ALL = [BELL, CYCLE, PROFILE, TOPBAR]

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem "${text}"`)
  }
}

test('AlertsBell traz o contrato de acessibilidade e os textos do UI-SPEC', () => {
  assertIncludes(BELL, [
    'aria-label="Avisos"',
    'aria-haspopup="dialog"',
    'role="dialog"',
    'aria-expanded',
    'Marcar todos como lidos',
    'Sem avisos por enquanto',
    'chegou a 80% do limite',
    'passou de 100% do limite',
    'restam',
    'passou ${formatMoney',
    'vence no dia',
    'aria-label="não lido"',
    'Escape',
    'coinki:open-alerts',
    '/limites#cat-',
    '/contas-fixas',
  ])
})

test('AlertsBell usa os avisos guardados e o nucleo no fuso de Sao Paulo', () => {
  const src = code(BELL)
  assert.match(src, /import[^;]*\bnextOccurrence\b[^;]*from\s+'@shared\/core\/cycle\.js'/)
  assert.match(src, /import[^;]*\bdaysBetweenParts\b[^;]*from\s+'@shared\/core\/cycle\.js'/)
  assert.match(src, /\buseLimitAlerts\(\)/)
  assert.match(src, /\bmarkRead\b/)
  assert.match(src, /\bmarkAllRead\b/)
  assert.match(src, /settings\.notificationsEnabled/)
  assert.match(src, /settings\.daysBeforeDueDate/)
  assert.doesNotMatch(src, /\bgetDate\s*\(/, 'vencimento nao pode usar o dia do fuso do host')
})

test('o sino so le e marca como lido: nao grava nem avalia aviso', () => {
  const src = code(BELL)
  assert.doesNotMatch(src, /createLimitAlertIfAbsent|limitAlerts\.service/)
  assert.doesNotMatch(src, /\bevaluate\b|\brekeyForSalaryDay\b/)
})

test('CycleSelector navega pelo nucleo e pelo contexto', () => {
  assertIncludes(CYCLE, [
    'Ciclo anterior',
    'Próximo ciclo',
    'cycleLabel',
    'aria-haspopup="listbox"',
    'role="listbox"',
    'role="option"',
    'aria-selected',
    'Escape',
  ])
  const src = code(CYCLE)
  assert.match(src, /\bshiftCycle\b/)
  assert.match(src, /\bsetOffset\b/)
  assert.match(src, /\buseCycle\(\)/)
  assert.match(src, /disabled=\{isCurrent\}/, 'o proximo ciclo fica desabilitado no ciclo atual')
})

test('ProfileSwitcher traz o contrato de menu e os nomes vem da configuracao', () => {
  assertIncludes(PROFILE, [
    'role="menu"',
    'menuitemradio',
    'aria-checked',
    'aria-haspopup="menu"',
    'role="menuitem"',
    'Sair',
    'somente leitura',
    'seu perfil',
    'Escape',
    'ArrowDown',
    'ArrowUp',
    'tabNames',
    'Trocar perfil',
    'Vendo o perfil de',
  ])
  const src = code(PROFILE)
  assert.match(src, /\bsignOut\b/)
  assert.match(src, /setCurrentArea\(/)
})

test('TopBar compoe ciclo, sino, engrenagem e perfil', () => {
  assertIncludes(TOPBAR, [
    'aria-label="Configurações"',
    'title="Configurações"',
    '/configuracoes',
    '<CycleSelector',
    '<AlertsBell',
    '<ProfileSwitcher',
    "'porquinho'",
    'safe-area-inset-top',
  ])
  const src = code(TOPBAR)
  assert.match(src, /export function TopBar\b/)
  assert.doesNotMatch(src, /\bfixed\b|\bsticky\b/, 'a barra superior rola com a pagina')
})

test('os quatro arquivos nao usam date-fns, HTML bruto, emoji, console nem Ele/Ela fixos', () => {
  for (const file of ALL) {
    const src = code(file)
    assert.doesNotMatch(src, /date-fns/, `${file} importa date-fns`)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${file} usa HTML bruto`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${file} tem emoji`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
    assert.doesNotMatch(src, /\bEl[ea]\b/, `${file} escreve Ele ou Ela fixo (use settings.tabNames)`)
  }
})
