// Guarda estatica do Calendario da Fase 3.1. Conteudo inicial: contrato legado movido de
// phase3-gaps; o plano do Calendario reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-calendar.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertIncludes, code } from './helpers/phase3-1.js'

test('Transacoes, Calendario e Contas Fixas seguem o ciclo do topo, sem seletor de mes proprio (Calendario)', () => {
  for (const f of ['src/pages/CalendarPage.tsx']) {
    const src = code(f)
    assert.doesNotMatch(src, /MonthSelector/, `${f} ainda usa o MonthSelector`)
    assert.doesNotMatch(src, /setSelectedMonth/, `${f} ainda guarda mes proprio`)
    assert.match(src, /const selectedMonth = useCycleMonth\(\)/, `${f} nao deriva o mes do ciclo`)
  }
})

test('Calendario: legenda e + na linha do alternador, grade alta e detalhe do dia mantido', () => {
  const page = code('src/pages/CalendarPage.tsx')
  const tabsAt = page.indexOf('<Tabs ')
  const infoAt = page.indexOf('<Info ')
  const plusAt = page.indexOf('<Plus ')
  const gridAt = page.indexOf('{loading ? (')
  assert.ok(tabsAt > 0 && infoAt > tabsAt && plusAt > infoAt && gridAt > plusAt, 'ordem: alternador, legenda, +, grade')
  assert.doesNotMatch(page, /sm:hidden absolute/, 'o + nao e mais absoluto nem so do celular')
  for (const f of ['src/components/calendar/MonthCalendar.tsx', 'src/components/calendar/AgendaCalendar.tsx']) {
    const src = code(f)
    assert.match(src, /min-h-\[max\(320px,calc\(100dvh-296px\)\)\]/, `${f}: a grade nao cresce com a janela`)
    assert.match(src, /grid-rows-6/)
    assert.doesNotMatch(src, /aspect-square/, `${f}: celula quadrada impede a grade de ocupar a tela`)
    // O detalhe do dia segue como painel abaixo da grade (nao virou Sheet) e rola ate ele.
    assert.doesNotMatch(src, /ui\/sheet/)
    assert.match(src, /scrollIntoView/)
    assert.match(src, /size="iconSm"/)
  }
})

test('T2: MonthCalendar.tsx mostra o nome atual por categoryDisplayName', () => {
  const src = code('src/components/calendar/MonthCalendar.tsx')
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/, 'categoryDisplayName nao usado')
  assert.match(src, /\buseArea\(\)/, 'useArea nao chamado para obter categoryDefs')
  assert.doesNotMatch(src, /\{\s*(t|transaction|expense|fe)\.category\s*\}/, 'ainda renderiza o texto cru da categoria')
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
