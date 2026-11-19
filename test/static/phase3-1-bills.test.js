// Guarda estatica de Contas Fixas da Fase 3.1 (variante C do sketch 013, UX-05, UX-08, UX-09).
// Rodar: node --test test/static/phase3-1-bills.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/FixedExpensesPage.tsx'
const GROUP = 'src/components/fixed-expenses/BillGroupCard.tsx'
const ROW = 'src/components/fixed-expenses/BillRow.tsx'

test('a pagina usa os itens por ocorrencia do ciclo e agrupa pelo nucleo, sem seletor de mes proprio', () => {
  const src = code(PAGE)
  assert.match(src, /useCycleBills/, 'a pagina nao usa useCycleBills')
  assert.match(src, /groupBillsByCategory/, 'a pagina nao agrupa por groupBillsByCategory')
  assert.doesNotMatch(src, /MonthSelector/, 'ainda usa o MonthSelector')
  assert.doesNotMatch(src, /setSelectedMonth/, 'ainda guarda mes proprio')
  assert.doesNotMatch(src, /useCycleMonth/, 'ainda deriva o mes em que o ciclo comeca')
  assert.doesNotMatch(src, /useFixedExpenses/, 'ainda usa o hook legado por mes')
})

test('a ordem das categorias nunca depende de pago, valor ou pendente (D-14)', () => {
  for (const f of [PAGE, GROUP, ROW]) {
    const src = code(f)
    assert.doesNotMatch(src, /\.sort\(/, `${f} reordena no componente`)
    assert.doesNotMatch(src, /\.toSorted\(/, `${f} reordena no componente`)
    assert.doesNotMatch(src, /\.reverse\(/, `${f} reordena no componente`)
  }
})

test('BillRow usa SquareCheck de 44px, sem iconSm, e chama togglePaid depois de guard(editar)', () => {
  const src = code(ROW)
  assert.match(src, /SquareCheck/, 'BillRow sem SquareCheck')
  assert.doesNotMatch(src, /iconSm/, 'BillRow usa iconSm')
  assert.match(src, /guard\('editar'\)/, 'BillRow sem guard(editar)')
  assert.match(src, /togglePaid\(item\)/, 'BillRow nao chama togglePaid(item)')
  assert.ok(src.indexOf("guard('editar')") < src.indexOf('togglePaid(item)'), 'guard deve vir antes de togglePaid')
  assert.match(src, /bumpData\(\)/, 'BillRow nao dispara bumpData ao terminar')
  assert.match(src, /aria-busy|busy=/, 'BillRow sem a trava de duplo toque (busy)')
})

test('marcar e desmarcar paga nao mostram toast nem Desfazer (D-05)', () => {
  for (const f of [ROW, GROUP]) {
    const src = code(f)
    assert.doesNotMatch(src, /toast/i, `${f} mostra toast`)
    assert.doesNotMatch(src, /\bshow\(/, `${f} chama show(`)
    assert.doesNotMatch(src, /Desfazer/, `${f} oferece Desfazer`)
  }
  const page = code(PAGE)
  const start = page.indexOf('const toggleFromSheet')
  assert.ok(start >= 0, 'a pagina nao tem toggleFromSheet')
  const end = page.indexOf('\n  }\n', start)
  const flow = page.slice(start, end)
  assert.doesNotMatch(flow, /\bshow\(|toast|Desfazer/i, 'o fluxo de marcar paga da pagina mostra aviso')
})

test('BillGroupCard e secao nomeada com progresso das pagas do grupo e subtotal', () => {
  const src = code(GROUP)
  assert.match(src, /<section aria-labelledby=/, 'grupo sem section aria-labelledby')
  assert.match(src, /<Progress/, 'grupo sem Progress')
  assert.match(src, /tone="ok"/)
  assert.match(src, /Pagas em /, 'label da barra sem "Pagas em"')
  assert.match(src, /paidCount/)
  assert.match(src, /subtotalCents/)
  assert.match(src, /IconCircle/)
})

test('H1 Contas fixas e estados de carregando e erro em portugues', () => {
  const src = code(PAGE)
  assert.match(src, /<h1[^>]*text-\[28px\][^>]*>Contas fixas<\/h1>/, 'H1 deve ser Contas fixas em 28/700')
  assert.ok(src.includes('Carregando as contas fixas'))
  assert.ok(src.includes('Não foi possível carregar as contas fixas.'))
  assert.ok(src.includes('Tentar de novo'))
  assert.doesNotMatch(src, /error\.message/, 'mostra a mensagem crua do erro')
})

test('os arquivos da tela passam nas varreduras de escala e de alvo de toque', () => {
  const files = [PAGE, GROUP, ROW]
  assert.deepEqual(scaleProblems(files), [])
  assert.deepEqual(touchProblems(files), [])
})

test('a pagina tem os tres cartoes de total, o filtro e a apagar em duas etapas', () => {
  const src = code(PAGE)
  for (const needle of ['Total mensal', 'Pagas', 'Pendentes', 'Todas']) {
    assert.ok(src.includes(needle), `FixedExpensesPage sem ${needle}`)
  }
  assert.match(src, /<KpiTrio[\s\S]{0,40}variant="cards"/, 'sem KpiTrio variant="cards"')
  assert.match(src, /<SegmentedControl/, 'sem SegmentedControl')
  assert.match(src, /billsSummary\(items\)/, 'cartoes nao vem de billsSummary sobre todos os itens')
  assert.match(src, /groupBillsByCategory\(categorized, categoryDefs, filter\)/, 'filtro nao passa pelo nucleo')
  assert.match(src, /compactMoney\(/, 'resumo compacto (P-04 truncado) ausente')
  assert.match(src, /decimals: 'always'/, 'valor exato com centavos ausente')
  assert.match(src, /Apagar \$\{current\.name\}\? Esta ação não pode ser desfeita\./)
  assert.ok(src.includes('Conta apagada'))
  assert.match(src, /readOnly=\{readOnly\}/)
  assert.match(src, /onBlocked=/)
  assert.ok(src.includes('Nenhuma conta pendente') && src.includes('Nenhuma conta paga ainda'))
})

test('BillRow calcula o estado por datas e tinge a linha, sem opacity', () => {
  const src = code(ROW)
  assert.match(src, /billStatus\(/)
  assert.match(src, /billSupportText\(/)
  assert.ok(src.includes('bg-bill-od-bg') && src.includes('bg-bill-soon-bg'))
  for (const word of ['vencida', 'hoje', 'em breve', 'pago']) assert.ok(src.includes(word), `chip sem ${word}`)
  assert.match(src, /line-through/)
  assert.doesNotMatch(src, /opacity/, 'BillRow usa opacity')
})
