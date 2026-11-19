// Guarda estatica do Calendario da Fase 3.1 (planos 14 e 20). Rodar: node --test test/static/phase3-1-calendar.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertIncludes, code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const CALENDAR_FILES = [
  'src/pages/CalendarPage.tsx',
  'src/components/calendar/MonthGrid.tsx',
  'src/components/calendar/DayCell.tsx',
  'src/components/calendar/AgendaList.tsx',
  'src/components/calendar/AgendaDay.tsx',
]

test('Calendario v3: a pagina segue o ciclo do topo pelo modelo, sem seletor de mes proprio nem consulta direta', () => {
  const file = 'src/pages/CalendarPage.tsx'
  assertIncludes(file, ['useCalendarData', 'MonthGrid', 'AgendaList', 'shift(', 'cycleLabel'])
  const src = code(file)
  assert.doesNotMatch(src, /MonthSelector|setSelectedMonth/, 'seletor de mes proprio')
  assert.doesNotMatch(src, /useCycleMonth|isSameMonth|getTransactions\(/, 'logica do calendario legado')
})

test('MonthGrid usa cycleGrid e DayCell e botao com aria-pressed e aria-current', () => {
  assertIncludes('src/components/calendar/MonthGrid.tsx', ['cycleGrid(cycle)'])
  assertIncludes('src/components/calendar/DayCell.tsx', ['<button', 'aria-pressed', 'aria-current'])
})

test('telas do Calendario: escala tipografica e alvos de toque limpos', () => {
  assert.deepEqual(scaleProblems(CALENDAR_FILES), [])
  assert.deepEqual(touchProblems(CALENDAR_FILES), [])
})

// ---------------------------------------------------------------------------
// Plano 03.1-14: modelo, recolhimento e dados do Calendario (logica, sem interface)
// ---------------------------------------------------------------------------

test('useCollapseOnScroll usa o redutor puro, listener passivo unico e prog em ref', () => {
  const file = 'src/hooks/useCollapseOnScroll.ts'
  assertIncludes(file, [
    'useReducer(collapseReducer',
    '@shared/core/collapse.js',
    'progRef',
    "addEventListener('scroll', onScroll, { passive: true })",
    'removeEventListener',
    'markProgrammatic',
    'scrollRef',
    'locked',
    'toggle',
    'reset',
  ])
  const src = code(file)
  assert.doesNotMatch(src, /console\./, `${file}: valor no console e proibido`)
  // O listener e registrado uma vez: o efeito com addEventListener tem dependencias vazias.
  const effect = src.match(/useEffect\(\(\) => \{[\s\S]*?addEventListener[\s\S]*?\}, \[([^\]]*)\]\)/)
  assert.ok(effect, `${file} sem useEffect que registra o listener`)
  assert.equal(effect[1].trim(), '', 'o listener de scroll nao pode ter dependencia instavel')
  // scrollTop so aparece uma vez, dentro do manipulador do evento (nunca no render).
  const reads = src.match(/\bscrollTop\b/g) ?? []
  assert.equal(reads.length, 1, 'scrollTop lido fora do manipulador de evento')
  const handler = src.slice(src.indexOf('const onScroll'), src.indexOf('addEventListener'))
  assert.match(handler, /\bscrollTop\b/, 'scrollTop deve ser lido dentro de onScroll')
})

test('useCalendarData monta o modelo do dia por buildDayModels, por chave de ciclo e dataVersion', () => {
  const file = 'src/hooks/useCalendarData.ts'
  assertIncludes(file, [
    'buildDayModels(',
    'calendarSummary(',
    '@shared/core/calendarModel.js',
    'useCycleTransactions(person)',
    'useCycleBills(person)',
    'getSavingsTransactions()',
    'getContributionsInRange(cycle.start, cycle.end)',
    'getEventsInRange(cycle.start, cycle.end)',
    'getEventCategories()',
    'getNotes(person)',
    'isInCycle(',
    'dataVersion',
    'loadKey',
    'loaded.key === loadKey',
    'latest.current',
  ])
  const src = code(file)
  assert.doesNotMatch(src, /console\./, `${file}: valor no console e proibido`)
  assert.doesNotMatch(src, /date-fns/, `${file}: limite de intervalo vem do nucleo, nao de date-fns`)
  // A consulta nunca refaz pelo relogio nem pelo objeto do ciclo.
  const effect = src.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\)/)
  assert.ok(effect, `${file} sem useEffect de carga`)
  assert.doesNotMatch(effect[1], /\bcycle\b/, 'o efeito nao pode depender do objeto cycle')
  assert.doesNotMatch(effect[1], /\bnow\b/, 'o efeito nao pode depender do relogio')
  assert.match(effect[1], /dataVersion/, 'o efeito recarrega pelo dataVersion')
})

test('nucleo do Calendario: sem relogio, sem filtrar conta pelo numero do dia e sem a palavra do legado', () => {
  for (const file of ['shared/core/calendarModel.js', 'shared/core/collapse.js']) {
    const src = code(file)
    assert.doesNotMatch(src, /fixedExpense/i, `${file}: nao usar a palavra fixedExpense em shared/core`)
    assert.doesNotMatch(src, /Date\.now\s*\(|new\s+Date\s*\(\s*\)|date-fns/, `${file}: relogio implicito ou pacote`)
    assert.doesNotMatch(src, /dueDay\s*===/, `${file}: conta so pela ocorrencia, nunca pelo numero do dia`)
  }
  assertIncludes('shared/core/calendarModel.js', ['heatLevels', 'billStatus', 'dayKeyOf'])
})
