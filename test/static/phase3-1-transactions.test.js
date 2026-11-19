// Guarda estatica de Transacoes da Fase 3.1 (UX-02, UX-08, UX-09): lista por dia do ciclo exato,
// acoes em Sheet e escala. Rodar: node --test test/static/phase3-1-transactions.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, exists, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/TransactionsPage.tsx'
const ROW = 'src/components/transactions/TransactionRow.tsx'
const GROUP = 'src/components/transactions/TransactionDayGroup.tsx'
const TOTALS = 'src/components/transactions/TransactionTotals.tsx'
const FILTERS = 'src/components/transactions/TransactionFilters.tsx'
const EDIT = 'src/components/transactions/TransactionEditSheet.tsx'

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
  const files = [PAGE, ROW, GROUP, TOTALS, FILTERS, EDIT]
  assert.deepEqual(scaleProblems(files), [])
  assert.deepEqual(touchProblems(files), [])
})

test('os totais recolhem e expandem e o saldo acumulado so e pedido ao abrir Detalhes', () => {
  const src = code(TOTALS)
  assert.match(src, /\bKpiTrio\b/)
  assert.match(src, /variant="joined"/)
  assert.match(src, /aria-expanded=\{open\}/)
  assert.match(src, /aria-controls=/)
  assert.match(src, /<Collapsible\b/)
  assert.match(src, /Detalhes/)
  assert.match(src, /Calculando\.\.\./, 'marcador de carga nunca e R$ 0')
  assert.match(src, /compactMoney\(/, 'P-04: reais inteiros truncados')
  // A chamada fica dentro do gatilho de abertura, nao na montagem.
  assert.equal((src.match(/loadAccumulated\(\)/g) ?? []).length, 1, 'uma unica chamada')
  assert.match(src, /const toggle = \(\) => \{[\s\S]*next &&[\s\S]*loadAccumulated\(\)/)
  assert.doesNotMatch(src, /useEffect/, 'sem efeito: nada carrega na montagem')
  assert.doesNotMatch(src, /text-\[10px\]/)
})

test('busca e chips ficam fixos no topo e a linha de chips rola por dentro', () => {
  const src = code(FILTERS)
  assert.match(src, /sticky top-0/)
  assert.match(src, /<SearchField\b/)
  assert.match(src, /placeholder="Buscar transação"/)
  assert.match(src, /pressed=\{/)
  assert.match(src, /overflow-x-auto/)
  assert.match(src, /no-scrollbar/)
  assert.match(src, /env\(safe-area-inset-top\)/)
  for (const label of ['Tudo', 'Saídas', 'Entradas']) assert.ok(src.includes(label), `chip ${label}`)
  assert.match(code(PAGE), /categoriesPresent\(/, 'chips de categoria vem de categoriesPresent')
  assert.doesNotMatch(src, /text-\[10px\]/)
})

test('o filtro e aplicado antes do agrupamento por dia e os totais seguem o ciclo inteiro', () => {
  const src = code(PAGE)
  const filterAt = src.indexOf('filterTransactions(')
  const groupAt = src.indexOf('transactionDayGroups(filtered)')
  assert.ok(filterAt > 0 && groupAt > filterAt, 'filterTransactions antes de transactionDayGroups')
  assert.match(src, /<TransactionTotals[\s\S]*totalsCents=\{totalsCents\}/)
  assert.match(src, /<TransactionFilters\b/)
})

test('TransactionEditSheet grava categoryId resolvido, le o valor por parseBRL e mantem a categoria atual', () => {
  const src = code(EDIT)
  assert.match(src, /@shared\/core\/categories\.js/)
  assert.match(src, /\bresolveCategoryId\(/, 'resolveCategoryId nao usado')
  assert.match(src, /\bactiveCategoryNames\(/, 'opcoes devem vir das categorias ativas')
  assert.match(src, /\bcategoryDisplayName\(/, 'categoria atual por nome atual')
  assert.match(src, /\bparseBRL\(/, 'valor em centavos inteiros')
  assert.match(src, /\bzonedTimeToInstant\(/, 'data pelo fuso de Sao Paulo')
  assert.match(src, /\bdayKeyOf\(/)
  assert.doesNotMatch(src, /date-fns/)
  assert.doesNotMatch(src, /settings\.categories/)
  assert.match(src, /aria-invalid=/)
  assert.match(src, /role="alert"/)
  assert.match(src, /data-autofocus/)
  assert.match(src, /aria-busy=\{saving\}/)
  assert.match(src, /Salvar transação/)
  assert.match(src, /<Notice tone="danger">/)
  assert.match(src, /Não foi possível salvar\. Confira a conexão e tente de novo\./)
  assert.match(src, /inputMode="decimal"/)
})

test('a pagina edita pelo Sheet, avisa e dispara bumpData; os componentes legados foram removidos', () => {
  const page = code(PAGE)
  assert.match(page, /<TransactionEditSheet\b/)
  assert.match(page, /await update\(id, data\)\s*bumpData\(\)\s*show\('Transação atualizada'\)/)
  assert.equal(exists('src/components/transactions/TransactionList.tsx'), false)
  assert.equal(exists('src/components/transactions/TransactionForm.tsx'), false)
  assert.doesNotMatch(page, /TransactionList|TransactionForm\b/)
})

test('a pagina mostra carregando, vazio, sem resultado e erro em portugues', () => {
  const page = code(PAGE)
  for (const text of [
    'Carregando transações',
    'Nenhuma transação neste ciclo',
    'Lance um gasto ou uma receita para ele aparecer aqui.',
    'Novo lançamento',
    'Nada encontrado',
    'Tente outra palavra ou limpe os filtros.',
    'Limpar filtros',
    'Não foi possível carregar as transações.',
    'Confira a conexão e tente de novo.',
    'Tentar de novo',
  ]) {
    assert.ok(page.includes(text), `pagina sem "${text}"`)
  }
  assert.match(page, /anim-pulse/)
  assert.match(page, /aria-hidden="true"/)
  assert.match(page, /<Notice\s+tone="danger"/)
  assert.match(page, /refetch\(\)/)
})
