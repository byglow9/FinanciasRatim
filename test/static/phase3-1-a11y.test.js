// Guarda transversal da Fase 3.1 (plano 24): escala, alvos de toque, emoji, HTML bruto, confirmacao nativa e rotas.
// Rodar: node --test test/static/phase3-1-a11y.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, code, exists, listSrc, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

// Arquivos novos e reescritos da fase (files_modified dos planos 03, 08, 11 a 21), so os de src.
const CANDIDATES = [
  // 03 primitivas
  'src/components/ui/square-check.tsx',
  'src/components/ui/popover.tsx',
  'src/components/ui/search-field.tsx',
  'src/components/ui/row-actions-sheet.tsx',
  'src/components/ui/kpi-trio.tsx',
  'src/components/ui/chip.tsx',
  'src/components/ui/progress.tsx',
  // 08 dock
  'src/components/layout/NavRail.tsx',
  // 09 e 14 e 18 hooks
  'src/hooks/useCycleWindow.ts',
  'src/hooks/useCycleTransactions.ts',
  'src/hooks/useCycleBills.ts',
  'src/hooks/useCalendarData.ts',
  'src/hooks/useCollapseOnScroll.ts',
  'src/hooks/useCalendarActions.ts',
  'src/hooks/useCycleSeries.ts',
  'src/hooks/useCoupleData.ts',
  // 11 transacoes
  'src/pages/TransactionsPage.tsx',
  'src/components/transactions/TransactionDayGroup.tsx',
  'src/components/transactions/TransactionRow.tsx',
  'src/components/transactions/TransactionTotals.tsx',
  'src/components/transactions/TransactionFilters.tsx',
  'src/components/transactions/TransactionEditSheet.tsx',
  'src/components/transactions/TransactionList.tsx',
  'src/components/transactions/TransactionForm.tsx',
  // 12 contas fixas
  'src/pages/FixedExpensesPage.tsx',
  'src/components/fixed-expenses/BillGroupCard.tsx',
  'src/components/fixed-expenses/BillRow.tsx',
  'src/components/fixed-expenses/BillFormSheet.tsx',
  'src/components/fixed-expenses/FixedExpenseList.tsx',
  'src/components/fixed-expenses/FixedExpenseForm.tsx',
  // 13 casal
  'src/pages/CouplePage.tsx',
  'src/components/couple/CoupleHeadline.tsx',
  'src/components/couple/SplitBar.tsx',
  'src/components/couple/DualBars.tsx',
  'src/components/couple/TopCategoryRows.tsx',
  'src/components/couple/PiggyCard.tsx',
  // 15 e 20 e 22 calendario
  'src/pages/CalendarPage.tsx',
  'src/components/calendar/NoteSheet.tsx',
  'src/components/calendar/EventSheet.tsx',
  'src/components/calendar/MonthGrid.tsx',
  'src/components/calendar/DayCell.tsx',
  'src/components/calendar/MiniPostIt.tsx',
  'src/components/calendar/CalendarLegend.tsx',
  'src/components/calendar/AgendaList.tsx',
  'src/components/calendar/AgendaDay.tsx',
  'src/components/calendar/PostItCard.tsx',
  'src/components/calendar/MonthCalendar.tsx',
  'src/components/calendar/AgendaCalendar.tsx',
  'src/components/calendar/EventForm.tsx',
  'src/components/notes/NoteForm.tsx',
  // 16 porquinho
  'src/pages/SavingsPage.tsx',
  'src/components/savings/PiggyBank.tsx',
  'src/components/savings/SavingsHistory.tsx',
  'src/components/savings/SavingsForm.tsx',
  // 17 metas
  'src/pages/GoalsPage.tsx',
  'src/components/goals/GoalCard.tsx',
  'src/components/goals/GoalForm.tsx',
  'src/components/goals/ContributionForm.tsx',
  'src/components/goals/GoalDetailModal.tsx',
  'src/components/goals/GoalDetailSheet.tsx',
  // 19 login
  'src/components/auth/LoginForm.tsx',
  // 21 relatorios
  'src/pages/ReportsPage.tsx',
  'src/components/reports/SummaryCards.tsx',
  'src/components/reports/CategoryPieChart.tsx',
  'src/components/reports/MonthlyEvolutionChart.tsx',
  'src/components/reports/ComparisonBarChart.tsx',
  'src/components/reports/OverviewDashboard.tsx',
  'src/components/reports/IncomeBreakdown.tsx',
  'src/components/reports/EmptyState.tsx',
]

// Ausencias aceitas, cada uma com o motivo. O plano 20 trocou os quatro arquivos legados do Calendario
// (MonthCalendar, AgendaCalendar, EventForm, NoteForm) por MonthGrid, AgendaList e os Sheets do plano 15.
// O plano 17 pode ter substituido o modal de meta pelo Sheet (ou o contrario).
const ABSENT_OK = {
  'src/components/calendar/MonthCalendar.tsx': 'legado removido pelo plano 20 (substituido por MonthGrid)',
  'src/components/calendar/AgendaCalendar.tsx': 'legado removido pelo plano 20 (substituido por AgendaList)',
  'src/components/calendar/EventForm.tsx': 'legado removido pelo plano 20 (substituido por EventSheet)',
  'src/components/notes/NoteForm.tsx': 'legado removido pelo plano 20 (substituido por NoteSheet)',
  'src/components/goals/GoalDetailModal.tsx': 'substituido por GoalDetailSheet no plano 17',
  'src/components/transactions/TransactionList.tsx': 'legado removido pelo plano 11 (substituido por TransactionDayGroup e TransactionRow)',
  'src/components/transactions/TransactionForm.tsx': 'legado removido pelo plano 11 (substituido por TransactionEditSheet e LaunchSheet)',
  'src/components/fixed-expenses/FixedExpenseList.tsx': 'legado removido pelo plano 12 (substituido por BillGroupCard e BillRow)',
  'src/components/fixed-expenses/FixedExpenseForm.tsx': 'legado removido pelo plano 12 (substituido por BillFormSheet)',
}

const PHASE31_FILES = CANDIDATES.filter((f) => exists(f))
const MISSING = CANDIDATES.filter((f) => !exists(f))
const SCREEN_DIRS = ['calendar', 'couple', 'fixed-expenses', 'goals', 'savings', 'transactions', 'reports']

test('a lista da fase cobre os arquivos esperados e toda ausencia tem motivo registrado', () => {
  assert.ok(PHASE31_FILES.length >= 55, `so ${PHASE31_FILES.length} arquivos da fase existem`)
  const unexplained = MISSING.filter((f) => !(f in ABSENT_OK))
  assert.deepEqual(unexplained, [], 'arquivo da fase ausente sem motivo registrado')
})

test('escala 12/16/28/56, pesos 400/700, sem emoji e sem HTML bruto em todos os arquivos da fase', () => {
  assert.deepEqual(scaleProblems(PHASE31_FILES), [])
})

// Excecao registrada no plano 03 (D-04): a caixa interna de 28px do SquareCheck e o desenho dentro da area de toque,
// nao o alvo. O alvo e a area h-11 w-11 (44px), afirmada abaixo no lugar do par h-7 w-7.
const INNER_BOX_FILE = 'src/components/ui/square-check.tsx'

test('nenhum alvo de toque menor que 44px nos arquivos da fase', () => {
  assert.deepEqual(touchProblems(PHASE31_FILES.filter((f) => f !== INNER_BOX_FILE)), [])
  const problems = touchProblems([INNER_BOX_FILE]).filter((p) => !p.endsWith('par h-7 w-7'))
  assert.deepEqual(problems, [])
  assert.match(code(INNER_BOX_FILE), /(?<![\w-])h-11 w-11(?![\w-])/, 'SquareCheck sem a area de toque de 44px')
})

test('nenhum arquivo de src usa a confirmacao nativa do navegador', () => {
  const offenders = listSrc('src').filter((f) => /\bwindow\.confirm\b|(?<![\w.])confirm\(/.test(code(f)))
  assert.deepEqual(offenders, [], 'confirmacao nativa (use o Sheet de duas etapas)')
})

test('nenhum arquivo de src usa dangerouslySetInnerHTML', () => {
  const offenders = listSrc('src').filter((f) => /dangerouslySetInnerHTML/.test(code(f)))
  assert.deepEqual(offenders, [])
})

test('as pastas das telas redesenhadas nao usam text-[8px], text-[10px] nem text-[11px]', () => {
  const offenders = []
  for (const dir of SCREEN_DIRS) {
    for (const f of listSrc(`src/components/${dir}`)) {
      if (/text-\[(8|10|11)px\]/.test(code(f))) offenders.push(f)
    }
  }
  assert.deepEqual(offenders, [])
})

test('as nove rotas de App.tsx continuam, mais a rota oculta de teste do Vintem e /cartoes', () => {
  const routes = [...code('src/App.tsx').matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1])
  assert.equal(routes.length, 11, `rotas encontradas: ${routes.join(', ')}`)
  assert.deepEqual(
    [...routes].sort(),
    [
      '/', '/calendario', '/cartoes', '/casal', '/configuracoes', '/contas-fixas', '/metas', '/porquinho', '/relatorios',
      '/transacoes', '/vintem-teste',
    ],
  )
})

test('a guarda de bg-primary solido da Fase 3 segue valendo em todo src', () => {
  for (const f of listSrc('src')) {
    const src = code(f)
    assert.doesNotMatch(src, /(?<![\w-])bg-primary(?![/\w-])/, `${f} usa bg-primary solido (use bg-action)`)
    assert.doesNotMatch(src, /text-primary-foreground/, `${f} usa text-primary-foreground`)
  }
  const gaps = read('test/static/phase3-gaps.test.js')
  assert.match(gaps, /nenhum arquivo de src usa bg-primary solido/, 'a guarda da Fase 3 foi removida')
})

test('os hooks novos da fase nao tem console.', () => {
  const hooks = PHASE31_FILES.filter((f) => f.startsWith('src/hooks/'))
  assert.ok(hooks.length >= 6)
  const offenders = hooks.filter((f) => /\bconsole\./.test(code(f)))
  assert.deepEqual(offenders, [])
})

test('nenhum teste da guarda foi enfraquecido: sem skip, only nem todo nos testes da fase', () => {
  const dir = path.join(ROOT, 'test/static')
  const offenders = fs
    .readdirSync(dir)
    .filter((n) => /^phase3.*\.test\.js$/.test(n))
    .filter((n) => /\b(test|it|describe)\.(skip|only|todo)\b|\{\s*skip\s*:/.test(fs.readFileSync(path.join(dir, n), 'utf8')))
  assert.deepEqual(offenders, [])
})
