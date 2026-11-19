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
