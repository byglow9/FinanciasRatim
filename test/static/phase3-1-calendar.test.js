// Guarda estatica do Calendario da Fase 3.1 (planos 14 e 20). Rodar: node --test test/static/phase3-1-calendar.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertIncludes, code, exists, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const CALENDAR_FILES = [
  'src/pages/CalendarPage.tsx',
  'src/components/calendar/MonthGrid.tsx',
  'src/components/calendar/DayCell.tsx',
  'src/components/calendar/AgendaList.tsx',
  'src/components/calendar/AgendaDay.tsx',
  'src/components/calendar/MiniPostIt.tsx',
  'src/components/calendar/CalendarLegend.tsx',
  'src/components/calendar/PostItCard.tsx',
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

test('DayCell: memo, rotulo, roving tabindex e tokens de calor e pontinho', () => {
  const file = 'src/components/calendar/DayCell.tsx'
  assertIncludes(file, ['memo(', 'aria-label', 'tabIndex', 'bg-heat-', 'bg-dot-', 'dayAriaLabel(', 'MiniPostIt'])
  const src = code(file)
  assert.doesNotMatch(src, /text-muted-foreground/, 'texto muted sobre o calor reprova no contraste')
})

test('MiniPostIt: 12px, decorativo e com dobra; CalendarLegend em Popover com as tres secoes', () => {
  assertIncludes('src/components/calendar/MiniPostIt.tsx', ['aria-hidden', 'size-3', 'pointer-events-none', 'bg-pit-'])
  assertIncludes('src/components/calendar/CalendarLegend.tsx', [
    'Popover',
    'Cor do dia',
    'Pontinhos',
    'Post-it',
    'gasto maior, comparado ao seu ciclo',
    'entrou mais do que saiu',
    'nota do dia',
  ])
  assertIncludes('src/pages/CalendarPage.tsx', ['CalendarLegend'])
})

test('Calendario: nenhum texto de 8px ou 10px', () => {
  for (const f of CALENDAR_FILES) {
    assert.doesNotMatch(code(f), /text-\[(8|10)px\]/, `${f}: texto abaixo de 12px`)
  }
})

test('Calendario: sem confirmacao nativa e sem os quatro arquivos legados', () => {
  for (const f of CALENDAR_FILES) {
    assert.doesNotMatch(code(f), /window\.confirm|\bconfirm\(/, `${f}: confirmacao nativa do navegador`)
  }
  for (const f of [
    'src/components/calendar/MonthCalendar.tsx',
    'src/components/calendar/AgendaCalendar.tsx',
    'src/components/calendar/EventForm.tsx',
    'src/components/notes/NoteForm.tsx',
  ]) {
    assert.equal(exists(f), false, `${f} deveria ter sido removido`)
  }
})

test('Calendario: a pagina liga NoteSheet, EventSheet e as acoes depois de guard("editar")', () => {
  assertIncludes('src/pages/CalendarPage.tsx', [
    'NoteSheet',
    'EventSheet',
    'useCalendarActions(',
    "guard('editar')",
    'readOnly={readOnly}',
    'onBlocked=',
    'Nova nota',
    'Novo evento',
    'Adicionar post-it',
    'Adicionar evento',
    'Nada agendado neste ciclo',
    'Carregando o calendário',
    'Não foi possível carregar o calendário.',
    'Tentar de novo',
  ])
})

test('AgendaDay e PostItCard: nome de categoria atual, estado da conta, token de post-it e dobra', () => {
  const day = 'src/components/calendar/AgendaDay.tsx'
  assertIncludes(day, ['@shared/core/categories.js', 'categoryDisplayName(', 'useArea()', 'billSupportText', 'shortSigned(', 'PostItCard'])
  const src = code(day)
  assert.doesNotMatch(src, /\{\s*(t|tx|item|transaction)\.category\s*\}/, 'renderiza o texto cru da categoria')
  assertIncludes('src/components/calendar/PostItCard.tsx', ['bg-pit-', 'rounded-[4px_4px_16px_4px]', 'motion-reduce:rotate-0', '<button'])
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

// ---------------------------------------------------------------------------
// Plano 03.1-22: recolhimento do mes, abertura em hoje, teclado, gesto e cenario real
// ---------------------------------------------------------------------------

test('Calendario: a agenda e o unico conteiner rolavel e recebe o scrollRef do hook', () => {
  const page = 'src/pages/CalendarPage.tsx'
  assertIncludes(page, [
    'useCollapseOnScroll(',
    'scrollRef',
    'containerRef={scrollRef}',
    'markProgrammatic',
    'agendaScrollTarget(',
    'aria-expanded',
    'Recolher mês',
    'Mostrar mês inteiro',
    'collapsed={collapsed}',
    'onClick={toggle}',
    '100dvh',
  ])
  assertIncludes('src/components/calendar/AgendaList.tsx', ['overflow-y-auto', 'overscroll-contain', 'relative'])
  for (const f of CALENDAR_FILES.filter((x) => x !== 'src/components/calendar/AgendaList.tsx')) {
    assert.doesNotMatch(code(f), /overflow-y-(auto|scroll)/, `${f}: so a agenda rola`)
  }
})

test('Calendario: scrollTop nunca e lido fora do hook e nao ha listener de scroll na pagina', () => {
  for (const f of CALENDAR_FILES) {
    const src = code(f)
    assert.doesNotMatch(src, /\bscrollTop\b/, `${f}: leitura de scrollTop fora do hook`)
    assert.doesNotMatch(src, /addEventListener\(\s*['"]scroll['"]/, `${f}: listener de scroll fora do hook`)
    assert.doesNotMatch(src, /\bonScroll=/, `${f}: onScroll no JSX`)
  }
})

test('Calendario: toda rolagem programatica liga markProgrammatic antes de rolar e o mes anima so com movimento permitido', () => {
  const page = code('src/pages/CalendarPage.tsx')
  const scrolls = page.match(/\.scrollTo\(/g) ?? []
  assert.equal(scrolls.length, 1, 'a rolagem da agenda passa por uma unica funcao')
  const fn = page.slice(0, page.indexOf('.scrollTo('))
  assert.ok(
    fn.lastIndexOf('markProgrammatic()') > fn.lastIndexOf('const scrollAgendaTo'),
    'markProgrammatic() precisa vir antes do scrollTo'
  )
  assert.match(page, /reset\(\)/, 'trocar de ciclo reabre o mes (reset)')
  const grid = code('src/components/calendar/MonthGrid.tsx')
  assert.match(grid, /collapsed/, 'MonthGrid tem a prop collapsed')
  assert.match(grid, /motion-reduce:transition-none/, 'transicao de altura instantanea com movimento reduzido')
  assert.match(grid, /inert/, 'linhas recolhidas saem do foco')
})
