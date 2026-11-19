// Guarda da camada de dados por ciclo (Fase 3.1, plano 09): janela estavel, transacoes do ciclo,
// servicos de intervalo e contas por ocorrencia. Texto estatico, sem rodar o app.
import assert from 'node:assert/strict'
import test from 'node:test'
import { assertIncludes, code, exists, listSrc } from './helpers/phase3-1.js'

const NO_NOISE = (file) => {
  const src = code(file)
  assert.doesNotMatch(src, /bumpData/, `${file}: o gatilho de dados fica na pagina (WR-03)`)
  assert.doesNotMatch(src, /console\./, `${file}: valor financeiro no console e proibido`)
  assert.doesNotMatch(src, /date-fns/, `${file}: limite de intervalo vem do nucleo, nao de date-fns`)
}

test('useCycleWindow guarda o ciclo estavel por chave e dia do salario', () => {
  assertIncludes('src/hooks/useCycleWindow.ts', [
    'cycleFor(person)',
    'stable.key === fresh.key',
    'stable.salaryDay === fresh.salaryDay',
  ])
  NO_NOISE('src/hooks/useCycleWindow.ts')
})

test('useCycleTransactions consulta o intervalo exato e so depende da chave do ciclo', () => {
  const file = 'src/hooks/useCycleTransactions.ts'
  assertIncludes(file, [
    'useCycleWindow(person)',
    'getTransactionsInRange(person, cycle.start, cycle.end)',
    'dataVersion',
    'loadKey',
    'loaded.key === loadKey',
    'latest.current',
    'monthTotals(',
    'toCents(',
  ])
  NO_NOISE(file)
  // O efeito de carga nunca lista o objeto do ciclo nem cycle.start.
  const effect = code(file).match(/useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\)/)
  assert.ok(effect, `${file} sem useEffect de carga`)
  assert.doesNotMatch(effect[1], /\bcycle\b/, 'o efeito nao pode depender do objeto cycle')
  assert.match(effect[1], /dataVersion/, 'o efeito recarrega pelo dataVersion')
})

test('servicos de intervalo existem com ramo MOCK e escopo de dono, sem date-fns nos limites', () => {
  const cases = [
    ['src/services/events.service.ts', 'getEventsInRange'],
    ['src/services/goalContributions.service.ts', 'getContributionsInRange'],
    ['src/services/transactions.service.ts', 'getAccumulatedBalanceUntil'],
  ]
  for (const [file, name] of cases) {
    const src = code(file)
    const start = src.indexOf(`export async function ${name}(`)
    assert.ok(start >= 0, `${file} sem ${name}`)
    const rest = src.slice(start + 1)
    const next = rest.search(/\nexport (async )?function /)
    const body = next === -1 ? rest : rest.slice(0, next)
    assert.ok(body.includes('if (MOCK)'), `${name} sem ramo MOCK`)
    assert.ok(body.includes('...ownerScope()'), `${name} sem ...ownerScope()`)
    assert.ok(body.indexOf('if (MOCK)') < body.indexOf('query('), `${name}: MOCK antes da consulta`)
    assert.doesNotMatch(body, /startOfMonth|endOfMonth|monthRangeOf/, `${name}: limite vem do nucleo`)
  }
})

test('loadAccumulated le o saldo ate o fim do ciclo so sob demanda', () => {
  const src = code('src/hooks/useCycleTransactions.ts')
  assert.ok(src.includes('getAccumulatedBalanceUntil(person, cycle.end)'))
  assert.ok(src.includes('loadAccumulated'))
  // Nao pode rodar na carga: fora do efeito de busca.
  const fetchBody = src.slice(src.indexOf('const fetchData'), src.indexOf('useEffect('))
  assert.doesNotMatch(fetchBody, /getAccumulatedBalanceUntil/)
})

test('useCycleBills grava e apaga o pagamento pela ocorrencia e trava o duplo toque', () => {
  const file = 'src/hooks/useCycleBills.ts'
  assertIncludes(file, [
    'useCycleWindow(person)',
    'billsForCycle',
    'toBills(',
    'toBillPayments(',
    'getPaymentsForMonths(cycleMonths(cycle))',
    'markAsPaid(',
    'unmarkAsPaid(',
    'occurrence.month',
    'occurrence.year',
    '`${item.billId}-${item.occurrence.year}-${item.occurrence.month}`',
    'useRef(new Set<string>())',
    'pending.current.has(key)',
    'pendingKeys',
    'Promise.all',
    'dataVersion',
  ])
  NO_NOISE(file)
  const src = code(file)
  assert.doesNotMatch(src, /getPaymentsForMonth\(/, 'o hook usa os meses da ocorrencia, nunca um mes so')
  assert.doesNotMatch(src, /transactions\.service/, 'contas nao importam o servico de transacoes')
  const effect = src.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\)/)
  assert.ok(effect, 'sem useEffect de carga')
  assert.doesNotMatch(effect[1], /\bcycle\b/, 'o efeito nao pode depender do objeto cycle')
})

// Guarda final do recorte exato do ciclo (plano 23, UX-09, D-19): o mes-calendario em que o ciclo
// comeca saiu do codigo e nao pode voltar como aproximacao.
test('os arquivos legados do mes-calendario nao existem', () => {
  for (const file of [
    'src/hooks/useTransactions.ts',
    'src/hooks/useFixedExpenses.ts',
    'src/hooks/useCycleMonth.ts',
    'src/lib/cycleMonth.ts',
    'src/components/shared/MonthSelector.tsx',
  ]) {
    assert.ok(!exists(file), `${file} voltou`)
  }
})

test('nenhum arquivo de src referencia o hook, a funcao ou o seletor de mes-calendario', () => {
  const banned = [
    /\buseCycleMonth\b/,
    /\bcycleMonthDate\b/,
    /\bMonthSelector\b/,
    /\buseTransactions\b/,
    /\buseFixedExpenses\b/,
    /\bgetTransactions\(/,
    /\bgetAllTransactionsForMonth\b/,
    /\bgetAccumulatedBalance\b/,
    /\bgetEventsForMonth\b/,
    /\bgetContributionsForMonth\b/,
  ]
  for (const file of listSrc('src')) {
    const src = code(file)
    for (const re of banned) assert.doesNotMatch(src, re, `${file} referencia ${re}`)
  }
})

test('as consultas por mes dos servicos nao usam date-fns para limitar o intervalo', () => {
  for (const file of [
    'src/services/transactions.service.ts',
    'src/services/events.service.ts',
    'src/services/goalContributions.service.ts',
  ]) {
    assert.doesNotMatch(code(file), /startOfMonth|endOfMonth|monthRangeOf/, `${file} limita por mes-calendario`)
  }
})

test('as paginas de Transacoes, Contas Fixas, Calendario, Casal e Relatorios usam os hooks por ciclo', () => {
  const pages = [
    ['src/pages/TransactionsPage.tsx', 'useCycleTransactions'],
    ['src/pages/FixedExpensesPage.tsx', 'useCycleBills'],
    ['src/pages/CalendarPage.tsx', 'useCalendarData'],
    ['src/pages/CouplePage.tsx', 'useCoupleData'],
  ]
  for (const [file, hook] of pages) assertIncludes(file, [`${hook}(`])
  // Relatorios: a serie por ciclo chega pelos graficos filhos, a pagina nao deriva mes.
  const reports = ['src/pages/ReportsPage.tsx', ...listSrc('src/components/reports')]
  assert.ok(
    reports.some((f) => code(f).includes('useCycleSeries(')),
    'Relatorios sem useCycleSeries'
  )
})
