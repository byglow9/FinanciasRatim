// Guarda estatica de Relatorios da Fase 3.1. Conteudo inicial: contrato legado movido de
// category-ids (nome de categoria por categoryDisplayName e weeklySpend); o plano de Relatorios
// reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-reports.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

test('T3: IncomeBreakdown.tsx agrega por categoryDisplayName', () => {
  const src = code('src/components/reports/IncomeBreakdown.tsx')
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /categoryDefs/)
  assert.doesNotMatch(src, /acc\[t\.category\]/, 'ainda agrega pelo texto cru da categoria')
})

test('T3: ReportsPage.tsx agrega por categoryDisplayName', () => {
  const src = code('src/pages/ReportsPage.tsx')
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /categoryDefs/)
  assert.doesNotMatch(src, /acc\[t\.category\]/, 'ainda agrega pelo texto cru da categoria')
})

test('T3: OverviewDashboard.tsx agrega por categoryDisplayName', () => {
  const src = code('src/components/reports/OverviewDashboard.tsx')
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/)
  assert.match(src, /categoryDefs/)
  assert.doesNotMatch(src, /acc\[t\.category\]/, 'ainda agrega pelo texto cru da categoria')
})

test('T3: OverviewDashboard usa weeklySpend do nucleo e nao o calculo local com date-fns', () => {
  const src = code('src/components/reports/OverviewDashboard.tsx')
  assert.match(src, /import\s*\{[^}]*\bweeklySpend\b[^}]*\}\s*from\s*['"]@shared\/core\/ledger\.js['"]/)
  assert.match(src, /weeklySpend\(\{/)
  assert.doesNotMatch(src, /differenceInCalendarDays/)
  assert.doesNotMatch(src, /\bendOfMonth\b/)
  assert.doesNotMatch(src, /weeksRemaining\s*=\s*Math\.ceil/, 'formula local duplicada de semanas')
})
