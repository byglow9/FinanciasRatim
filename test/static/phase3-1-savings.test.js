// Guarda estatica do Porquinho da Fase 3.1 (variante B do sketch 014, D-18, UX-07, UX-08).
// Rodar: node --test test/static/phase3-1-savings.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/SavingsPage.tsx'
const BANK = 'src/components/savings/PiggyBank.tsx'
const HISTORY = 'src/components/savings/SavingsHistory.tsx'
const FORM = 'src/components/savings/SavingsForm.tsx'
const DECISIONS =
  '.planning/phases/03.1-redesign-das-abas-no-estilo-da-home-ux-mobile-transa-es-cale/03.1-DECISIONS.md'
const FILES = [PAGE, BANK, HISTORY, FORM]

test('o layout implementado e o registrado em DECISIONS (layout.porquinho: b)', () => {
  const m = /^- layout\.porquinho:\s*(\w+)/m.exec(read(DECISIONS))
  assert.ok(m, 'DECISIONS sem a chave layout.porquinho')
  assert.equal(m[1], 'b', 'a variante registrada mudou: reavalie o layout do Porquinho')
  const page = code(PAGE)
  // Variante B: cartao de cofre com barra, filtros Tudo/Guardados/Retirados e historico por mes.
  assert.match(code(BANK), /No cofre/, 'cartao sem a divisao "No cofre"')
  assert.match(code(BANK), /Retirado/, 'cartao sem a divisao "Retirado"')
  assert.match(page, /Guardados/, 'pagina sem o filtro Guardados')
  assert.match(page, /Retirados/, 'pagina sem o filtro Retirados')
  assert.match(code(HISTORY), /groupByMonth/, 'historico nao agrupa por mes')
})

test('a pagina usa useSavings e apaga pelo RowActionsSheet depois de guard(editar)', () => {
  const page = code(PAGE)
  assert.match(page, /useSavings\(\)/, 'a pagina nao usa useSavings')
  assert.match(page, /RowActionsSheet/, 'a pagina nao usa RowActionsSheet')
  assert.match(page, /deletion=/, 'o RowActionsSheet sem apagar em duas etapas (deletion)')
  assert.match(page, /Esta ação não pode ser desfeita\./, 'pergunta de apagar sem o aviso')
  assert.match(page, /show\('Movimentação apagada'\)/, 'sem o aviso "Movimentação apagada"')
  const start = page.indexOf('const handleDelete')
  assert.ok(start >= 0, 'a pagina nao tem handleDelete')
  const flow = page.slice(start, page.indexOf('\n  }\n', start))
  assert.match(flow, /guard\('editar'\)/, 'handleDelete sem guard(editar)')
  assert.ok(flow.indexOf("guard('editar')") < flow.indexOf('remove('), 'guard deve vir antes de remove')
  assert.doesNotMatch(page, /window\.confirm|\bconfirm\(/, 'confirmacao nativa')
})

test('o historico tem linhas tocaveis, sem apagar direto nem botoes de 28 ou 32px', () => {
  const src = code(HISTORY)
  assert.match(src, /<button/, 'linha do historico nao e botao')
  assert.match(src, /min-h-16/, 'linha com altura menor que 64px')
  assert.match(src, /onSelect\(t\)/, 'tocar na linha nao chama onSelect')
  assert.match(src, /dayKeyOf/, 'historico sem dayKeyOf')
  assert.doesNotMatch(src, /onDelete/, 'historico apaga direto, sem confirmacao')
  assert.doesNotMatch(src, /Trash2/, 'historico ainda tem a lixeira')
  assert.doesNotMatch(src, /h-7 w-7|h-8 w-8/, 'historico com botao de 28 ou 32px')
  assert.doesNotMatch(src, /date-fns/, 'historico usa date-fns para a chave do dia')
})

test('o cartao do cofre nao tem degrade nem rosa', () => {
  const src = code(BANK)
  assert.doesNotMatch(src, /from-pink|to-pink|gradient|pink-/, 'cartao ainda tem o degrade rosa')
  assert.match(src, /displayTier/, 'saldo sem o ajuste automatico de displayTier')
  assert.match(src, /bg-card/, 'cartao fora do token Moeda')
})

test('o Porquinho nao tem ciclo', () => {
  for (const f of FILES) {
    assert.doesNotMatch(code(f), /useCycle|CycleSelector|cycle\./, `${f} usa ciclo`)
  }
})

test('escala tipografica e alvos de toque limpos', () => {
  assert.deepEqual(scaleProblems(FILES), [])
  assert.deepEqual(touchProblems(FILES), [])
})

test('SavingsForm e um Sheet com parseBRL e validacao por campo, sem Dialog', () => {
  const src = code(FORM)
  assert.match(src, /<Sheet\b/, 'SavingsForm nao usa Sheet')
  assert.match(src, /parseBRL/, 'SavingsForm sem parseBRL')
  assert.match(src, /aria-invalid/, 'SavingsForm sem aria-invalid')
  assert.match(src, /role="alert"/, 'mensagens de campo sem role="alert"')
  assert.match(src, /\.focus\(\)/, 'SavingsForm sem foco no primeiro erro')
  assert.match(src, /inputMode="decimal"/, 'valor sem inputMode decimal')
  assert.match(src, /zonedTimeToInstant/, 'data sem zonedTimeToInstant')
  assert.match(src, /dayKeyOf/, 'data inicial sem dayKeyOf')
  assert.match(src, /SegmentedControl/, 'sem o seletor Guardar e Retirar')
  assert.match(src, /'Guardar'/)
  assert.match(src, /'Retirar'/)
  assert.match(src, /Informe um valor maior que zero/, 'sem a mensagem do valor')
  assert.match(src, /<Notice tone="danger">/, 'falha de gravacao sem Notice de perigo')
  assert.match(src, /Não foi possível salvar\. Confira a conexão e tente de novo\./)
  assert.match(src, /aria-busy/, 'CTA sem aria-busy')
  assert.doesNotMatch(src, /\bDialog/, 'SavingsForm ainda usa Dialog')
  assert.doesNotMatch(src, /type="number"/, 'valor ainda e type=number')
})

test('a pagina abre o Sheet depois de guard(editar) e mostra o aviso de salvo', () => {
  const page = code(PAGE)
  assert.match(page, /<SavingsForm/, 'pagina sem SavingsForm')
  assert.match(page, /show\('Movimentação salva'\)/, 'sem o aviso "Movimentação salva"')
  const start = page.indexOf('const openNew')
  assert.ok(start >= 0, 'a pagina nao tem openNew')
  const flow = page.slice(start, page.indexOf('\n  }\n', start))
  assert.match(flow, /guard\('editar'\)/, 'openNew sem guard(editar)')
  assert.match(page, /aria-label="Nova movimentação"/, 'botao sem o nome "Nova movimentação"')
  assert.match(page, /size="circle"/, 'botao + nao e o redondo de 44px')
})

test('textos do Porquinho com acento completo', () => {
  for (const f of [PAGE, BANK, HISTORY, FORM]) {
    const src = code(f)
    assert.doesNotMatch(src, /Movimentacao|Historico|[Pp]oupanca|Descricao|Responsavel|Deposito\b/, `${f} com texto sem acento`)
  }
})

test('estados de carregando, vazio e erro em portugues, com Tentar de novo', () => {
  const page = code(PAGE)
  assert.match(page, /Carregando o Porquinho/, 'sem o texto de carregamento')
  assert.match(page, /anim-pulse/, 'carregando sem blocos neutros')
  assert.match(page, /aria-hidden="true" className="anim-pulse/, 'blocos de carregamento sem aria-hidden')
  assert.match(page, /Não foi possível carregar o Porquinho\./, 'sem a mensagem de erro')
  assert.match(page, /Confira a conexão e tente de novo\./, 'erro sem a orientacao')
  assert.match(page, /Tentar de novo/, 'erro sem o botao Tentar de novo')
  assert.match(page, /refetch\(\)/, 'Tentar de novo nao usa o refetch do useSavings')
  assert.match(page, /Nenhuma movimentação ainda\./, 'sem o estado vazio')
  assert.match(page, /Guardar o primeiro valor/, 'vazio sem o botao que abre o Sheet')
  assert.doesNotMatch(page, /error\.message|String\(error\)/, 'mensagem crua do servidor na tela')
  assert.doesNotMatch(page, /R\$ 0\b/, 'R$ 0 como marcador de carregamento')
})

test('somente leitura: o botao + fica aria-disabled e as acoes do Sheet seguem o perfil', () => {
  const page = code(PAGE)
  assert.match(page, /useReadOnly\(\)/, 'pagina sem useReadOnly')
  assert.match(page, /aria-disabled=\{readOnly \? true : undefined\}/, 'botao + sem aria-disabled')
  assert.match(page, /readOnly=\{readOnly\}/, 'RowActionsSheet sem readOnly')
  assert.match(page, /onBlocked=\{\(\) => guard\('editar'\)\}/, 'RowActionsSheet sem o aviso de bloqueio')
})
