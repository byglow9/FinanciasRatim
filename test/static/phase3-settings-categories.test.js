// Guarda estatica do cartao Categorias, do editor de categoria e da pagina de Configuracoes da Fase 3
// (LIM-01, CENT-05, CENT-02, D-08, D-12, D-21, PR-07, PR-09, PR-18).
// Rodar: node --test test/static/phase3-settings-categories.test.js
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
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const PAGE = 'src/pages/SettingsPage.tsx'
const CARD = 'src/components/settings/CategoriesCard.tsx'
const EDITOR = 'src/components/settings/CategoryEditorSheet.tsx'
const PICKER = 'src/components/settings/IconPicker.tsx'
const FILES = [PAGE, CARD, EDITOR, PICKER]

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem "${text}"`)
  }
}

test('SettingsPage tem o titulo, a legenda, os seis cartoes na ordem e o botao Sair da conta', () => {
  assertIncludes(PAGE, [
    'Configurações',
    'Ciclo, categorias, bancos e aparência',
    'Sair da conta',
    'useHashReveal',
    'BankConnections',
    'MeuPluggy · Atualizado há',
    'text-danger-ink',
    'h-12',
  ])
  const src = code(PAGE)
  const order = [
    '<CycleIncomeCard',
    '<CategoriesCard',
    '<AccountsSkeletonCard',
    '<BankConnections',
    '<AppearanceCard',
    '<NotificationsCard',
  ].map((tag) => {
    const at = src.indexOf(tag)
    assert.ok(at >= 0, `SettingsPage sem ${tag}`)
    return at
  })
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'os seis cartoes estao fora da ordem do UI-SPEC')
  assert.match(src, /useHashReveal\(undefined,\s*settingsStatus === 'ready'\)/)
  assert.match(src, /\bsignOut\b/)
})

test('SettingsPage nao traz interruptor de tema nem a logica de categoria (ela vive no editor)', () => {
  const src = code(PAGE)
  assert.doesNotMatch(src, /updateTheme|\bMoon\b|\bSun\b/, 'sem interruptor de tema (PR-18)')
  assert.doesNotMatch(src, /@shared\/core\/categories\.js/, 'a logica de categoria fica no CategoryEditorSheet')
  assert.doesNotMatch(src, /handleSave|updateTabNames|updateSettings/, 'sem botao Salvar unico na pagina')
})

test('CategoriesCard traz a ancora, as abas, a lista com limite ou Definir e a aba Calendario preservada', () => {
  assertIncludes(CARD, [
    'id="categorias"',
    'Gastos',
    'Receitas',
    'Calendário',
    '+ Nova',
    'limite mensal',
    'sem limite',
    'Definir',
    'useEventCategories',
    'DEFAULT_EVENT_CATEGORY_COLORS',
    'Tipo de categoria',
    'Nenhuma categoria de evento cadastrada',
    'Volte ao seu perfil para editar',
    'CategoryEditorSheet',
  ])
  const src = code(CARD)
  assert.match(src, /limitForCycle\(/, 'o limite mostrado e o vigente do ciclo')
  assert.match(src, /cycleOf\(now,\s*config\.salaryDay\)/, 'a chave e a do ciclo atual da pessoa')
  assert.match(src, /!d\.archived/, 'so categorias nao arquivadas')
  assert.match(src, /\bcategoryKind\(/)
})

test('CategoryEditorSheet traz os campos, a ajuda, a confirmacao de arquivar e as gravacoes pelo nucleo', () => {
  assertIncludes(EDITOR, [
    'Nova categoria',
    'Editar categoria',
    'Limite mensal',
    'Sem limite',
    'Vale para este ciclo e os próximos. Ciclos passados mantêm o limite da época.',
    'Salvar categoria',
    'Arquivar categoria',
    'O histórico continua mostrando o nome e o limite da época',
    'Para reativar, crie uma categoria com o mesmo nome.',
    'Manter',
    'Não foi possível salvar. Confira a conexão e tente de novo.',
    'Volte ao seu perfil para editar',
    'setCategoryLimit',
    'setCategoryMeta',
    'updatePersonConfig',
    'updateCategoryDefs',
    'role="alert"',
    "kind === 'gasto'",
    'MoneyKeypad',
    'MoneyValue',
    'enableHardwareKeys',
    'IconPicker',
    'ColorPalette',
  ])
  const src = code(EDITOR)
  const imp = src.match(/import\s*\{([^}]*)\}\s*from\s*'@shared\/core\/categories\.js'/)
  assert.ok(imp, 'sem import de @shared/core/categories.js')
  for (const fn of ['addCategory', 'renameCategory', 'archiveCategory', 'setCategoryMeta']) {
    assert.match(imp[1], new RegExp(`\\b${fn}\\b`), `${fn} nao importado do nucleo`)
  }
  assert.match(src, /import[^;]*\bsetCategoryLimit\b[^;]*from\s+'@shared\/core\/limits\.js'/)
  assert.match(src, /\bsetCategoryLimit\(config,\s*categoryId,\s*cycleKey,\s*nextLimit\)/)
  // Chave do ciclo atual da pessoa editada, nao do ciclo visto na tela (PR-09).
  assert.match(src, /cycleOf\(now,\s*config\.salaryDay\)\.key/)
  assert.doesNotMatch(src, /cycleFor\(/, 'o limite nao usa o ciclo visto na tela')
  // O limite grava na configuracao antes das definicoes (limite orfao e inofensivo; retry idempotente).
  assert.ok(
    src.indexOf('await updatePersonConfig(person,') < src.indexOf('await updateCategoryDefs('),
    'a configuracao grava antes das definicoes'
  )
})

test('arquivar nunca apaga nem consulta lancamentos, e o editor nao bloqueia por limite (D-08, D-09)', () => {
  for (const file of [EDITOR, CARD, PAGE]) {
    const src = code(file)
    assert.doesNotMatch(src, /getTransactionsByCategory|getFixedExpensesByCategory/, `${file} consulta lancamentos`)
    assert.doesNotMatch(src, /Nao e possivel remover/, `${file} bloqueia a remocao`)
    assert.doesNotMatch(src, /deleteCategory|removeCategory/, `${file} apaga categoria`)
  }
})

test('o limite so se edita em Configuracoes > Categorias (D-21)', () => {
  const dir = path.join(ROOT, 'src')
  const hits = []
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        if (/\bsetCategoryLimit\(/.test(fs.readFileSync(full, 'utf8'))) hits.push(path.relative(ROOT, full))
      }
    }
  }
  walk(dir)
  assert.deepEqual(hits, [EDITOR], 'setCategoryLimit so pode ser chamado pelo CategoryEditorSheet')
})

test('IconPicker e um radiogroup de 6 colunas, por grupo e com busca, com os icones do nucleo e rotulos em portugues', () => {
  assertIncludes(PICKER, [
    'CATEGORY_ICON_GROUPS',
    'SearchField',
    'overflow-y-auto',
    'role="radiogroup"',
    'role="radio"',
    'aria-checked',
    'aria-label="Ícone"',
    'CATEGORY_ICONS',
    'grid-cols-6',
    'h-11 w-11',
    'bg-action text-action-text',
    'ArrowRight',
    'ArrowDown',
    'DEFAULT_EVENT_CATEGORY_COLORS',
    'h-8 w-8',
  ])
  const src = code(PICKER)
  assert.match(src, /import\s*\{[^}]*\biconComponent\b[^}]*\}\s*from\s*'@\/lib\/categoryIcons'/, 'tabela de icones unica')
  // Todo icone permitido tem rotulo em portugues.
  for (const icon of CATEGORY_ICONS) {
    assert.ok(src.includes(`'${icon}':`), `IconPicker sem rotulo para ${icon}`)
  }
})

test('os arquivos nao usam tipografia fora da escala, HTML bruto, emoji, console nem Ele/Ela fixos', () => {
  const allowedPx = new Set(['12', '16', '28', '56'])
  for (const file of FILES) {
    const src = code(file)
    assert.doesNotMatch(src, /\btext-sm\b|\btext-lg\b|\btext-xl\b|\btext-2xl\b/, `${file} usa tamanho fora da escala`)
    for (const match of src.matchAll(/text-\[(\d+)px\]/g)) {
      assert.ok(allowedPx.has(match[1]), `${file} usa text-[${match[1]}px] fora de 12, 16, 28 e 56`)
    }
    assert.doesNotMatch(src, /\bfont-medium\b|\bfont-semibold\b|\bfont-extrabold\b/, `${file} usa peso fora de 400 e 700`)
    assert.doesNotMatch(src, /fontWeight\s*:\s*(500|600|800)/, `${file} usa peso fora de 400 e 700`)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${file} usa HTML bruto`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${file} tem emoji`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console (nome e limite nunca vao a log)`)
    assert.doesNotMatch(src, /\bEl[ea]\b/, `${file} escreve Ele ou Ela fixo (use settings.tabNames)`)
  }
})

test('BankConnections: cartao com linhas limpas, um botao Conectar banco, sincronizar em icone e acoes guardadas', () => {
  const src = code('src/components/settings/BankConnections.tsx')
  assert.match(src, /export function BankConnections\(/)
  assert.match(src, /subscribeBankConnections/)
  for (const text of ['id="bancos"', 'Bancos conectados', 'aria-label="Sincronizar agora"', 'Conectar banco', 'De quem é essa conexão?', 'settings.tabNames', 'EllipsisVertical']) {
    assert.ok(src.includes(text), `BankConnections sem "${text}"`)
  }
  // so um botao de conectar (o do cartao): nada de "Conectar banco (Nome)" por pessoa
  assert.doesNotMatch(src, /Conectar banco \(/)
  // a pagina nao esconde mais o cabecalho do cartao por CSS
  assert.doesNotMatch(code(PAGE), /first-child\]:hidden/)
})

test('BankConnections: toda acao passa por useReadOnly().guard(editar) e nunca mostra o texto cru do erro (CR-02, WR-10)', () => {
  const src = code('src/components/settings/BankConnections.tsx')
  assert.match(src, /useReadOnly\(\)/)
  for (const fn of ['const sync', 'const openChooser', 'const choosePerson', 'const askReconnect', 'const askRemove', 'const confirmRemove']) {
    const at = src.indexOf(fn)
    assert.ok(at >= 0, `sem ${fn}`)
    assert.match(src.slice(at, at + 160), /guard\('editar'\)/, `${fn} sem guard('editar')`)
  }
  assert.match(src, /aria-disabled=\{blocked/)
  assert.doesNotMatch(src, /err(or)?\.message|\.message\b/, 'texto cru de erro na tela')
  assert.match(src, /Não foi possível conectar\. Tente de novo\./)
})
