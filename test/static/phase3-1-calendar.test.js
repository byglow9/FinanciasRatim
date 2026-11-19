// Guarda estatica do Calendario da Fase 3.1. Conteudo inicial: contrato legado movido de
// phase3-gaps; o plano do Calendario reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-calendar.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

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
