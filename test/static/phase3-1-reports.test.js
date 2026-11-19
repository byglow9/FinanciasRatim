// Guarda estatica de Relatorios da Fase 3.1. Conteudo inicial: contrato legado movido de
// category-ids (nome de categoria por categoryDisplayName e weeklySpend); o plano de Relatorios
// reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-reports.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const REPORT_FILES = [
  'src/pages/ReportsPage.tsx',
  'src/components/reports/SummaryCards.tsx',
  'src/components/reports/CategoryPieChart.tsx',
  'src/components/reports/IncomeBreakdown.tsx',
]

test('T3: IncomeBreakdown.tsx agrega por categoryDisplayName', () => {
  const src = code('src/components/reports/IncomeBreakdown.tsx')
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /categoryDefs/)
  assert.doesNotMatch(src, /acc\[t\.category\]/, 'ainda agrega pelo texto cru da categoria')
})

// Plano 03.1-21 (D-18, D-19): Relatorios na variante A do sketch 016, por ciclo e sem consulta por mes.
test('21: a pagina segue o ciclo do topo e nao usa seletor de mes nem consulta por mes', () => {
  const src = code('src/pages/ReportsPage.tsx')
  assert.match(src, /\buseCycleTransactions\(/)
  assert.match(src, /\buseCycleSeries\(/)
  // o ciclo vem so do seletor global do topo: nada de setas proprias na pagina
  assert.doesNotMatch(src, /\bshift\(/)
  assert.doesNotMatch(src, /Ciclo anterior|Próximo ciclo|ChevronLeft|ChevronRight/)
  assert.match(src, /\bisCurrent\b/)
  assert.match(src, /\bcycleLabel\(/)
  assert.match(src, /\bbillsSummary\(/)
  assert.doesNotMatch(src, /MonthSelector/)
  assert.doesNotMatch(src, /subMonths\(/)
  assert.doesNotMatch(src, /getTransactions\(/)
  assert.doesNotMatch(src, /getAccumulatedBalance/)
})

test('21: as quatro abas cabem sem quebrar linha (flex-auto e rotulo sem quebra)', () => {
  const src = code('src/pages/ReportsPage.tsx')
  assert.match(src, /role="tablist"/)
  assert.match(src, /flex-auto/)
  assert.match(src, /whitespace-nowrap/)
  assert.doesNotMatch(src, /flex-wrap/)
  for (const label of ['Visão geral', 'Categorias', 'Evolução', 'Comparação']) {
    assert.ok(src.includes(`'${label}'`), `aba "${label}" ausente ou sem acento`)
  }
})

test('21: CategoryPieChart usa categoryDisplayName, useArea e tem nome acessivel com lista de valores', () => {
  const src = code('src/components/reports/CategoryPieChart.tsx')
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /\buseArea\(\)/)
  assert.match(src, /role="img"/)
  assert.match(src, /aria-label=/)
  assert.match(src, /<ul\b/)
  assert.doesNotMatch(src, /<Tooltip/)
})

test('21: IncomeBreakdown agrega por categoryDisplayName e tem texto equivalente', () => {
  const src = code('src/components/reports/IncomeBreakdown.tsx')
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /\buseArea\(\)/)
  assert.match(src, /role="img"/)
  assert.match(src, /<ul\b/)
})

test('21: o resumo e o grafico de categorias usam so a escala e a paleta Moeda', () => {
  const files = REPORT_FILES
  assert.deepEqual(scaleProblems(files), [])
  assert.deepEqual(touchProblems(files), [])
  for (const f of files) {
    const src = read(f)
    assert.doesNotMatch(src, /fontSize:\s*11\b/, `${f}: marca de 11px`)
    assert.doesNotMatch(src, /text-\[11px\]/, `${f}: text-[11px]`)
  }
})

test('T3: OverviewDashboard.tsx agrega por categoryDisplayName', () => {
  const src = code('src/components/reports/OverviewDashboard.tsx')
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /categoryDefs/)
  assert.doesNotMatch(src, /acc\[t\.category\]/, 'ainda agrega pelo texto cru da categoria')
})

test('21: OverviewDashboard usa weeklySpendForCycle do nucleo, sem consulta por mes nem date-fns', () => {
  const src = code('src/components/reports/OverviewDashboard.tsx')
  assert.match(src, /import\s*\{[^}]*\bweeklySpendForCycle\b[^}]*\}\s*from\s*['"]@shared\/core\/ledger\.js['"]/)
  assert.match(src, /weeklySpendForCycle\(\{/)
  assert.doesNotMatch(src, /\bweeklySpend\(/)
  assert.doesNotMatch(src, /differenceInCalendarDays/)
  assert.doesNotMatch(src, /\bendOfMonth\b/)
  assert.doesNotMatch(src, /getAccumulatedBalance/)
  assert.doesNotMatch(src, /getTransactions\(/)
  assert.doesNotMatch(src, /subMonths\(/)
  assert.doesNotMatch(src, /weeksRemaining\s*=\s*Math\.ceil/, 'formula local duplicada de semanas')
})

// Plano 03.1-18: dados de Relatorios por ciclo exato (UX-09), uma consulta por janela larga.
test('18: useCycleSeries faz uma unica consulta por janela larga e respeita ciclo e dataVersion', () => {
  const src = code('src/hooks/useCycleSeries.ts')
  const calls = src.match(/getTransactionsInRange\(/g) ?? []
  assert.equal(calls.length, 1, 'esperava exatamente uma chamada a getTransactionsInRange')
  assert.match(src, /\bshiftCycle\(/)
  assert.match(src, /\bdataVersion\b/)
  assert.match(src, /\buseCycleWindow\(/)
  assert.match(src, /\bcycleSeries\(/)
  assert.doesNotMatch(src, /console\./)
  assert.doesNotMatch(src, /date-fns/)
})

test('18: series.js usa isInCycle do nucleo e nao tem relogio nem date-fns', () => {
  const src = code('shared/core/series.js')
  assert.match(src, /\bisInCycle\b/)
  assert.match(src, /export function cycleSeries\b/)
  assert.doesNotMatch(src, /Date\.now|new Date\(\)|date-fns/)
})

test('18: ledger.js exporta weeklySpendForCycle e continua exportando weeklySpend', () => {
  const src = code('shared/core/ledger.js')
  assert.match(src, /export function weeklySpendForCycle\b/)
  assert.match(src, /export function weeklySpend\b/)
  assert.doesNotMatch(src, /Date\.now|new Date\(\)|date-fns/)
})

// Plano 03.1-21, tarefa 2: evolucao e comparacao por ciclo, uma consulta por serie e dado em texto.
for (const f of ['src/components/reports/MonthlyEvolutionChart.tsx', 'src/components/reports/ComparisonBarChart.tsx']) {
  const name = f.split('/').pop()

  test(`21: ${name} usa useCycleSeries, nao consulta por mes e tem nome acessivel e tabela`, () => {
    const src = code(f)
    assert.match(src, /\buseCycleSeries\(/)
    assert.match(src, /role="img"/)
    assert.match(src, /aria-label=/)
    assert.match(src, /<table\b/)
    assert.match(src, /<caption\b/)
    assert.doesNotMatch(src, /subMonths\(/)
    assert.doesNotMatch(src, /getTransactions\(/)
    assert.doesNotMatch(src, /getAccumulatedBalance/)
    assert.doesNotMatch(src, /date-fns/)
    assert.doesNotMatch(src, /fontSize:\s*11\b/)
    assert.doesNotMatch(src, /text-\[11px\]/)
  })

  test(`21: ${name} usa marca de eixo de 12px, SegmentedControl e texto de carregando em portugues`, () => {
    const src = code(f)
    assert.match(src, /fontSize:\s*12\b/)
    assert.match(src, /<SegmentedControl\b/)
    assert.match(src, /Carregando os relatórios/)
    assert.match(src, /Tentar de novo/)
    assert.match(src, /<EmptyState\b/)
    assert.deepEqual(scaleProblems([f]), [])
    assert.deepEqual(touchProblems([f]), [])
  })
}

test('21: ComparisonBarChart usa as cores Ele e Ela da paleta Moeda e os nomes das configuracoes', () => {
  const src = code('src/components/reports/ComparisonBarChart.tsx')
  assert.match(src, /#14532d/)
  assert.match(src, /#c2410c/)
  assert.match(src, /area1Name/)
  assert.match(src, /area2Name/)
  assert.doesNotMatch(src, /['">]Ele['"<]/)
  assert.doesNotMatch(src, /['">]Ela['"<]/)
})

// Plano 03.1-21, tarefa 3: visao geral, estados e escala de todos os arquivos de Relatorios.
const ALL_REPORT_FILES = [
  'src/pages/ReportsPage.tsx',
  'src/components/reports/SummaryCards.tsx',
  'src/components/reports/CategoryPieChart.tsx',
  'src/components/reports/MonthlyEvolutionChart.tsx',
  'src/components/reports/ComparisonBarChart.tsx',
  'src/components/reports/OverviewDashboard.tsx',
  'src/components/reports/IncomeBreakdown.tsx',
  'src/components/reports/EmptyState.tsx',
]

test('21: OverviewDashboard agrega os gastos por categoryDisplayName e usa a serie do ciclo', () => {
  const src = code('src/components/reports/OverviewDashboard.tsx')
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /\buseArea\(\)/)
  assert.match(src, /categoryDefs/)
  assert.match(src, /\bseries\b/)
})

test('21: a pagina tem os estados carregando, erro e vazio em portugues', () => {
  const src = code('src/pages/ReportsPage.tsx')
  assert.ok(src.includes('Carregando os relatórios'))
  assert.ok(src.includes('Tentar de novo'))
  assert.ok(src.includes('Não foi possível carregar os relatórios.'))
  assert.ok(src.includes('Confira a conexão e tente de novo.'))
  assert.match(src, /<Notice\s+tone="danger"/)
  const empty = code('src/components/reports/EmptyState.tsx')
  assert.ok(empty.includes('Sem lançamentos neste ciclo'))
  assert.ok(empty.includes('Quando houver gastos ou receitas, os gráficos aparecem aqui.'))
})

test('21: nenhum arquivo de Relatorios usa seletor de mes, consulta por mes ou saldo acumulado', () => {
  for (const f of ALL_REPORT_FILES) {
    const src = code(f)
    assert.doesNotMatch(src, /MonthSelector/, f)
    assert.doesNotMatch(src, /subMonths\(/, f)
    assert.doesNotMatch(src, /getTransactions\(/, f)
    assert.doesNotMatch(src, /getAccumulatedBalance/, f)
    assert.doesNotMatch(src, /fontSize:\s*11\b/, f)
    assert.doesNotMatch(src, /text-\[11px\]/, f)
  }
})

test('21: todos os arquivos de Relatorios passam na escala tipografica e no alvo de toque', () => {
  assert.deepEqual(scaleProblems(ALL_REPORT_FILES), [])
  assert.deepEqual(touchProblems(ALL_REPORT_FILES), [])
})

test('21: nenhum texto de Relatorios perdeu o acento', () => {
  for (const f of ALL_REPORT_FILES) {
    const src = code(f)
    for (const bad of ['Relatorios', 'Evolucao', 'Comparacao', 'Saidas', 'Visao geral', 'transacoes', 'lancamentos', 'Nao foi']) {
      assert.ok(!src.includes(bad), `${f}: "${bad}" sem acento`)
    }
  }
})
