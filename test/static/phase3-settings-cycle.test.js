// Guarda estatica dos cartoes de Configuracoes do ciclo, aparencia e notificacoes da Fase 3
// (LIM-10, LIM-06, CENT-05, PR-08, PR-09, PR-10, PR-13, PR-18).
// Rodar: node --test test/static/phase3-settings-cycle.test.js
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

const CARD = 'src/components/settings/SettingsCard.tsx'
const ROW = 'src/components/settings/FieldRow.tsx'
const PICKER = 'src/components/settings/DayPicker.tsx'
const CYCLE = 'src/components/settings/CycleIncomeCard.tsx'
const APPEARANCE = 'src/components/settings/AppearanceCard.tsx'
const NOTIFICATIONS = 'src/components/settings/NotificationsCard.tsx'
const ACCOUNTS = 'src/components/settings/AccountsSkeletonCard.tsx'
const FILES = [CARD, ROW, PICKER, CYCLE, APPEARANCE, NOTIFICATIONS, ACCOUNTS]

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem "${text}"`)
  }
}

test('CycleIncomeCard traz a ancora, o dia do salario, a ajuda e a confirmacao do UI-SPEC', () => {
  assertIncludes(CYCLE, [
    'id="ciclo"',
    'Dia em que recebo o salário',
    'O ciclo começa nesse dia e termina na véspera do próximo. Em meses sem esse dia, vale o último dia do mês.',
    'Mudar o dia do salário muda o começo e o fim do ciclo atual. Avisos de limite já enviados neste ciclo não se repetem.',
    'Mudar dia',
    'Manter dia atual',
    'Salvar dia do salário',
    'Salvo',
    'Volte ao seu perfil para editar',
    'Não foi possível salvar. Confira a conexão e tente de novo.',
  ])
})

test('o dia do salario passa pelo nucleo, por updatePersonConfig e pela regravacao dos avisos', () => {
  const src = code(CYCLE)
  assert.match(src, /import[^;]*\bsetSalaryDay\b[^;]*from\s+'@shared\/core\/limits\.js'/)
  assert.match(src, /\bsetSalaryDay\(/)
  assert.match(src, /\bupdatePersonConfig\(/)
  assert.match(src, /\brekeyForSalaryDay\(/)
  // Ordem do contrato (PR-08): gravar a configuracao e so depois regravar os marcadores.
  assert.ok(
    src.indexOf('updatePersonConfig(person') < src.indexOf('rekeyForSalaryDay(person'),
    'rekeyForSalaryDay deve vir depois de updatePersonConfig'
  )
  // Mudar o dia nunca reinicia nem apaga limites (PR-09).
  assert.doesNotMatch(src, /\blimits\s*:/, 'a troca do dia nao pode mexer nos limites')
  assert.doesNotMatch(src, /setCategoryLimit|setLimit\b/)
})

test('a pessoa editada e a do perfil visto e o somente leitura desabilita as linhas', () => {
  const src = code(CYCLE)
  assert.match(src, /\buseCycle\(\)/)
  assert.match(src, /\bviewPerson\b/)
  assert.match(src, /\breadOnly\b/)
  assert.match(src, /disabled=\{locked\}/)
  assert.match(src, /\bpersonConfigFor\(person\)/)
})

test('DayPicker e um radiogroup acessivel de 1 a 31 em grade de 7 colunas', () => {
  assertIncludes(PICKER, [
    'role="radiogroup"',
    'role="radio"',
    'aria-checked',
    'aria-label="Dia do mês"',
    'grid-cols-7',
    'h-11 w-11',
    'bg-primary text-primary-foreground',
    'ArrowRight',
    'ArrowLeft',
    'ArrowDown',
    'ArrowUp',
    'length: 31',
  ])
})

test('SettingsCard e FieldRow seguem o contrato de bloco comum', () => {
  assertIncludes(CARD, ['data-section-title', 'tabIndex={-1}', 'scroll-mt', 'IconCircle', '<section id={id}'])
  assertIncludes(ROW, ['min-h-14', 'bg-surface-2', 'rounded-2xl', 'ChevronRight', 'disabled={disabled}', 'hint'])
})

test('a renda esperada passa pelo nucleo e oferece o escopo por ciclo (LIM-06, D-08)', () => {
  assertIncludes(CYCLE, [
    'Renda esperada de',
    'Todos os ciclos',
    'Só este ciclo',
    'Já entrou neste ciclo',
    'Salvar renda esperada',
    'role="radiogroup"',
    'role="alert"',
    'MoneyKeypad',
    'MoneyValue',
    'enableHardwareKeys',
    'Definir',
  ])
  const src = code(CYCLE)
  assert.match(src, /import[^;]*\bsetExpectedIncome\b[^;]*from\s+'@shared\/core\/limits\.js'/)
  assert.match(src, /\bsetExpectedIncome\(/)
  assert.match(src, /\buseCycleBudget\(/)
  assert.match(src, /view\.income\.receivedCents/)
  assert.match(src, /settings\.tabNames/, 'o nome da pessoa vem de settings.tabNames')
  assert.ok(
    src.indexOf('setExpectedIncome(config') < src.indexOf('updatePersonConfig(person, next)', src.indexOf('saveIncome')),
    'a renda grava pelo nucleo antes de updatePersonConfig'
  )
})

test('AppearanceCard tem os nomes das abas, a nota do tema claro e nenhum interruptor de tema (PR-18)', () => {
  assertIncludes(APPEARANCE, [
    'id="aparencia"',
    'Nomes das abas',
    'Aba 1',
    'Aba 2',
    'Poupança',
    'Tema claro. O tema escuro chega numa próxima fase.',
    'Salvar nomes das abas',
    'updateTabNames',
    'Salvo',
    'Volte ao seu perfil para editar',
  ])
  const src = code(APPEARANCE)
  assert.doesNotMatch(src, /\bMoon\b|\bSun\b/, 'sem icone de lua nem de sol')
  assert.doesNotMatch(src, /\btheme\b|updateTheme/, 'sem escrita de tema')
  assert.doesNotMatch(src, /role="switch"|<Switch/, 'sem interruptor de tema')
})

test('NotificationsCard tem o interruptor, a antecedencia de 0 a 30 e os avisos de limite sem interruptor (PR-13)', () => {
  assertIncludes(NOTIFICATIONS, [
    'id="notificacoes"',
    'Avisos de vencimento',
    'Dias de antecedência',
    'Avisos de limite: sempre ligados, em 80% e em 100%.',
    'Salvar avisos',
    'updateNotifications',
    'inputMode="numeric"',
    'role="alert"',
    'Salvo',
    'Volte ao seu perfil para editar',
  ])
  const src = code(NOTIFICATIONS)
  assert.equal((src.match(/<Switch\b/g) ?? []).length, 1, 'so o interruptor dos vencimentos; limite nao tem interruptor')
  assert.match(src, /import\s*\{\s*Switch\s*\}\s*from\s+'@\/components\/ui\/switch'/)
  assert.match(src, /DAYS_MAX\s*=\s*30/)
})

test('AccountsSkeletonCard e so o esqueleto em breve, sem campos nem botoes (CENT-05)', () => {
  assertIncludes(ACCOUNTS, [
    'id="contas"',
    'Contas e cartões',
    'em breve',
    'Fechamento e vencimento do cartão chegam junto com o cartão de crédito.',
  ])
  const src = code(ACCOUNTS)
  assert.doesNotMatch(src, /<Input|<Button|<button|<Switch|<input/)
})

test('os componentes do plano nao usam tipografia fora da escala, HTML bruto, emoji, console nem Ele/Ela fixos', () => {
  for (const file of FILES) {
    const src = code(file)
    assert.doesNotMatch(src, /\btext-sm\b|\btext-lg\b|\btext-xl\b|\btext-2xl\b/, `${file} usa tamanho fora da escala`)
    assert.doesNotMatch(src, /\bfont-medium\b|\bfont-semibold\b|\bfont-extrabold\b/, `${file} usa peso fora de 400 e 700`)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${file} usa HTML bruto`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${file} tem emoji`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console (renda e dia nunca vao a log)`)
    assert.doesNotMatch(src, /\bEl[ea]\b/, `${file} escreve Ele ou Ela fixo (use settings.tabNames)`)
  }
})
