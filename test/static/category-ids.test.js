// Guarda estatica (FUND-05, FUND-06, D-07, D-08, D-12): categorias com id estavel na interface
// e gasto semanal vindo do nucleo.
//   T1: tipos, AreaContext e SettingsPage (adicionar, renomear, arquivar por id)
//   T2: formularios gravam categoryId; listas e calendario mostram o nome atual
//   T3: relatorios agregam pelo nome resolvido por id; OverviewDashboard usa weeklySpend
// Rodar: node --test test/static/category-ids.test.js
// Por tarefa: node --test --test-name-pattern="^T1" test/static/category-ids.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Le um arquivo do projeto sem comentarios de linha e de bloco.
 * @param {string} rel
 * @returns {string}
 */
function read(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/**
 * Corpo de `export interface Nome { ... }` (sem chaves aninhadas relevantes).
 * @param {string} src
 * @param {string} name
 * @returns {string}
 */
function interfaceBody(src, name) {
  const m = src.match(new RegExp(`export interface ${name}\\s*\\{([\\s\\S]*?)\\n\\}`))
  assert.ok(m, `interface ${name} nao encontrada`)
  return m[1]
}

// ---------------------------------------------------------------- T1

test('T1: types declara CategoryDef, categoryId em Transaction e FixedExpense e categoryDefs em Settings', () => {
  const src = read('src/types/index.ts')
  assert.match(src, /export (interface|type) CategoryDef\b/, 'CategoryDef nao exportado')
  assert.match(interfaceBody(src, 'Transaction'), /categoryId\?\s*:\s*string/, 'Transaction sem categoryId')
  assert.match(interfaceBody(src, 'FixedExpense'), /categoryId\?\s*:\s*string/, 'FixedExpense sem categoryId')
  assert.match(interfaceBody(src, 'Settings'), /categoryDefs\?\s*:\s*CategoryDef\[\]/, 'Settings sem categoryDefs')
  // categoryId de AgendaEvent e de categoria de evento e continua como esta
  assert.match(interfaceBody(src, 'AgendaEvent'), /categoryId\?\s*:\s*string/)
})

test('T1: DEFAULT_CATEGORIES e DEFAULT_SETTINGS derivam de DEFAULT_CATEGORY_DEFS do nucleo', () => {
  const src = read('src/types/index.ts')
  assert.match(
    src,
    /import\s*\{[^}]*DEFAULT_CATEGORY_DEFS[^}]*\}\s*from\s*['"]@shared\/core\/categories\.js['"]/,
    'DEFAULT_CATEGORY_DEFS deve vir de @shared/core/categories.js'
  )
  assert.match(src, /DEFAULT_CATEGORIES[^=]*=\s*DEFAULT_CATEGORY_DEFS\.map/, 'DEFAULT_CATEGORIES nao deriva do nucleo')
  assert.doesNotMatch(src, /name:\s*'Alimentacao'/, 'lista de categorias duplicada no site (D-10)')
  assert.match(src, /categoryDefs:\s*DEFAULT_CATEGORY_DEFS\.map/, 'DEFAULT_SETTINGS sem categoryDefs')
})

test('T1: AreaContext expoe categoryDefs e updateCategoryDefs (sem updateCategories)', () => {
  const src = read('src/contexts/AreaContext.tsx')
  assert.match(src, /categoryDefs\s*:\s*CategoryDef\[\]/, 'tipo do contexto sem categoryDefs')
  assert.match(src, /updateCategoryDefs\s*:\s*\(defs:\s*CategoryDef\[\]\)\s*=>\s*Promise<void>/)
  assert.match(src, /buildCategoryDefs\(/, 'derivacao a partir de settings.categories ausente')
  assert.match(src, /activeCategoryNames\(/, 'categories derivada das ativas ausente')
  assert.doesNotMatch(src, /\bupdateCategories\b/, 'updateCategories antigo deve sair')
})

test('T1: o editor de categoria, o cartao e a pagina adicionam, renomeiam e arquivam pelo nucleo e nao bloqueiam por lancamentos', () => {
  // A logica de categoria mudou de SettingsPage para o editor (Fase 3, plano 19); a intencao
  // (ID estavel, arquivar em vez de apagar, sem bloqueio por lancamentos) e a mesma e agora
  // vale para os tres arquivos em conjunto.
  const editor = read('src/components/settings/CategoryEditorSheet.tsx')
  const src = [
    editor,
    read('src/components/settings/CategoriesCard.tsx'),
    read('src/pages/SettingsPage.tsx'),
  ].join('\n')
  const imp = editor.match(/import\s*\{([^}]*)\}\s*from\s*['"]@shared\/core\/categories\.js['"]/)
  assert.ok(imp, 'CategoryEditorSheet deve importar de @shared/core/categories.js')
  for (const fn of ['addCategory', 'renameCategory', 'archiveCategory']) {
    assert.match(imp[1], new RegExp(`\\b${fn}\\b`), `${fn} nao importado`)
  }
  assert.match(src, /updateCategoryDefs/)
  assert.match(src, /renameCategory\(/, 'renomear deve passar pelo nucleo')
  assert.match(src, /archiveCategory\(/, 'arquivar deve passar pelo nucleo')
  assert.doesNotMatch(src, /getTransactionsByCategory/)
  assert.doesNotMatch(src, /getFixedExpensesByCategory/)
  assert.doesNotMatch(src, /Nao e possivel remover/)
  assert.match(src, /Arquivar categoria/)
})

// ---------------------------------------------------------------- T2

for (const file of [
  'src/components/transactions/TransactionForm.tsx',
  'src/components/fixed-expenses/FixedExpenseForm.tsx',
]) {
  test(`T2: ${path.basename(file)} grava categoryId resolvido e mantem a categoria atual no select`, () => {
    const src = read(file)
    assert.match(src, /@shared\/core\/categories\.js/)
    assert.match(src, /\bresolveCategoryId\(/, 'resolveCategoryId nao usado')
    assert.match(src, /\bcategoryId\b/, 'categoryId nao enviado no onSubmit')
    assert.match(src, /\bactiveCategoryNames\(/, 'opcoes devem vir das categorias ativas')
    assert.match(src, /categoryDefs/, 'categoryDefs de useArea nao usado')
    assert.doesNotMatch(src, /settings\.categories/, 'select nao deve mais ler settings.categories')
  })
}

for (const file of [
  'src/components/transactions/TransactionList.tsx',
  'src/components/fixed-expenses/FixedExpenseList.tsx',
  'src/components/calendar/MonthCalendar.tsx',
]) {
  test(`T2: ${path.basename(file)} mostra o nome atual por categoryDisplayName`, () => {
    const src = read(file)
    assert.match(src, /@shared\/core\/categories\.js/)
    assert.match(src, /\bcategoryDisplayName\(/, 'categoryDisplayName nao usado')
    assert.match(src, /\buseArea\(\)/, 'useArea nao chamado para obter categoryDefs')
    assert.doesNotMatch(src, /\{\s*(t|transaction|expense|fe)\.category\s*\}/, 'ainda renderiza o texto cru da categoria')
  })
}

// ---------------------------------------------------------------- T3

for (const file of [
  'src/components/reports/IncomeBreakdown.tsx',
  'src/pages/ReportsPage.tsx',
  'src/components/reports/OverviewDashboard.tsx',
]) {
  test(`T3: ${path.basename(file)} agrega por categoryDisplayName`, () => {
    const src = read(file)
    assert.match(src, /@shared\/core\/categories\.js/)
    assert.match(src, /\bcategoryDisplayName\(/)
    assert.match(src, /categoryDefs/)
    assert.doesNotMatch(src, /acc\[t\.category\]/, 'ainda agrega pelo texto cru da categoria')
  })
}

test('T3: OverviewDashboard usa weeklySpend do nucleo e nao o calculo local com date-fns', () => {
  const src = read('src/components/reports/OverviewDashboard.tsx')
  assert.match(src, /import\s*\{[^}]*\bweeklySpend\b[^}]*\}\s*from\s*['"]@shared\/core\/ledger\.js['"]/)
  assert.match(src, /weeklySpend\(\{/)
  assert.doesNotMatch(src, /differenceInCalendarDays/)
  assert.doesNotMatch(src, /\bendOfMonth\b/)
  assert.doesNotMatch(src, /weeksRemaining\s*=\s*Math\.ceil/, 'formula local duplicada de semanas')
})
