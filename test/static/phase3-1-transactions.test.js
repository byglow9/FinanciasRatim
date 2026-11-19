// Guarda estatica de Transacoes da Fase 3.1 (UX-02, UX-08, UX-09): lista por dia do ciclo exato,
// acoes em Sheet e escala. Rodar: node --test test/static/phase3-1-transactions.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/TransactionsPage.tsx'
const ROW = 'src/components/transactions/TransactionRow.tsx'
const GROUP = 'src/components/transactions/TransactionDayGroup.tsx'

test('a pagina usa o ciclo exato e o agrupamento por dia, sem seletor de mes nem consulta por mes', () => {
  const src = code(PAGE)
  assert.match(src, /\buseCycleTransactions\(/, 'dados do ciclo exato')
  assert.match(src, /\btransactionDayGroups\(/, 'agrupamento por dia de Sao Paulo')
  assert.doesNotMatch(src, /useCycleMonth/, 'nao deriva mais o mes do calendario')
  assert.doesNotMatch(src, /getTransactions\(/, 'nao consulta por mes')
  assert.doesNotMatch(src, /MonthSelector/)
  assert.doesNotMatch(src, /setSelectedMonth/)
})

test('a chave do dia vem de dayKeyOf, nunca de date-fns', () => {
  for (const f of [PAGE, ROW, GROUP]) {
    const src = code(f)
    assert.doesNotMatch(src, /date-fns/, `${f} importa date-fns`)
    assert.doesNotMatch(src, /\bisToday\b|\bisYesterday\b/, `${f} usa isToday ou isYesterday`)
  }
  assert.match(code(PAGE), /\bdayKeyOf\(/)
})

test('WR-03: bumpData depois de apagar mora na pagina, nunca no hook', () => {
  const page = code(PAGE)
  assert.match(page, /await remove\(transaction\.id\)\s*(?:\/\/[^\n]*\s*)?bumpData\(\)/)
  assert.match(page, /RowActionsSheet/)
  assert.match(page, /guard\('editar'\)/)
  assert.doesNotMatch(code('src/hooks/useCycleTransactions.ts'), /bumpData/)
  assert.doesNotMatch(code('src/hooks/useTransactions.ts'), /bumpData/)
})

test('criar usa o LaunchSheet do dock, sem formulario proprio (D-03)', () => {
  const page = code(PAGE)
  assert.match(page, /useLaunch\(\)/)
  assert.match(page, /openLaunch\('gasto'\)/)
  assert.match(page, /aria-label="Nova transação"/)
})

test('TransactionRow e um botao de 56px que mostra a categoria pelo nome atual', () => {
  const src = code(ROW)
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bcategoryDisplayName\(/, 'categoryDisplayName nao usado')
  assert.match(src, /\buseArea\(\)/, 'useArea nao chamado para obter categoryDefs')
  assert.match(src, /<button/)
  assert.match(src, /min-h-14/)
  assert.doesNotMatch(src, /\{\s*(t|transaction)\.category\s*\}/, 'ainda renderiza o texto cru da categoria')
})

test('o cabecalho do dia tem 32px por min-h-8 e a pagina e a linha passam na escala e no alvo de toque', () => {
  assert.match(code(GROUP), /min-h-8/)
  const files = [PAGE, ROW, GROUP]
  assert.deepEqual(scaleProblems(files), [])
  assert.deepEqual(touchProblems(files), [])
})
