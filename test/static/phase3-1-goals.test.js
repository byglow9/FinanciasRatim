// Guarda estatica de Metas da Fase 3.1 (variante A do sketch 015, UX-07, UX-08, D-18, D-03).
// Rodar: node --test test/static/phase3-1-goals.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/GoalsPage.tsx'
const CARD = 'src/components/goals/GoalCard.tsx'

// Arquivos de Metas ja migrados para o novo padrao; as tarefas seguintes acrescentam os demais.
const FORM = 'src/components/goals/GoalForm.tsx'
const CONTRIBUTION = 'src/components/goals/ContributionForm.tsx'
const GOAL_FILES = [PAGE, CARD, FORM, CONTRIBUTION]

test('a pagina usa RowActionsSheet, le o erro do hook e oferece Tentar de novo', () => {
  const src = code(PAGE)
  assert.match(src, /RowActionsSheet/, 'a pagina nao usa RowActionsSheet')
  assert.match(src, /\berror\b/, 'a pagina nao le o error do hook')
  assert.match(src, /Não foi possível carregar as metas\./)
  assert.match(src, /Tentar de novo/, 'sem o botao Tentar de novo')
  assert.match(src, /refetch/, 'Tentar de novo nao chama refetch')
})

test('apagar passa por confirmacao em duas etapas, guard(editar) e toast', () => {
  const src = code(PAGE)
  assert.match(src, /deletion=/, 'sem deletion no RowActionsSheet')
  assert.match(src, /Esta ação não pode ser desfeita\./)
  assert.match(src, /show\('Meta apagada'\)/, 'sem o toast Meta apagada')
  const start = src.indexOf('const handleDelete')
  assert.ok(start >= 0, 'sem handleDelete')
  const flow = src.slice(start, src.indexOf('\n  }\n', start))
  assert.ok(flow.indexOf("guard('editar')") >= 0, 'handleDelete sem guard(editar)')
  assert.ok(flow.indexOf("guard('editar')") < flow.indexOf('remove('), 'guard deve vir antes de remove')
})

test('GoalCard e um cartao tocavel de 56px, sem botoes de 28px nem apagar direto', () => {
  const src = code(CARD)
  assert.doesNotMatch(src, /h-7 w-7/, 'GoalCard com h-7 w-7')
  assert.doesNotMatch(src, /h-8 w-8/, 'GoalCard com h-8 w-8')
  assert.doesNotMatch(src, /onDelete/, 'GoalCard apaga direto')
  assert.match(src, /min-h-14/, 'topo do cartao sem min-h-14')
  assert.match(src, /<button/, 'cartao sem botao')
  assert.match(src, /<Progress/, 'cartao sem Progress')
  assert.match(src, /tone="ok"/)
  assert.match(src, /do alvo/, 'Progress sem nome acessivel')
  assert.match(src, /Concluída/, 'meta concluida sem o texto Concluída')
  assert.match(src, /formatMoney/, 'valores sem formatMoney')
  assert.match(src, /title=\{goal\.name\}/, 'nome sem title')
})

test('a pagina usa o botao circular Nova meta e o perfil do parceiro fica aria-disabled', () => {
  const src = code(PAGE)
  assert.match(src, /size="circle"/)
  assert.match(src, /aria-label="Nova meta"/)
  assert.match(src, /aria-disabled=\{readOnly/)
  assert.match(src, /useReadOnly/)
})

test('GoalForm e ContributionForm sao Sheets com parseBRL e validacao por campo, sem Dialog', () => {
  for (const f of [FORM, CONTRIBUTION]) {
    const src = code(f)
    assert.match(src, /<Sheet\b/, `${f} sem Sheet`)
    assert.match(src, /parseBRL/, `${f} sem parseBRL`)
    assert.match(src, /aria-invalid/, `${f} sem aria-invalid`)
    assert.match(src, /role="alert"/, `${f} sem mensagem sob o campo`)
    assert.match(src, /\.focus\(\)/, `${f} sem foco no primeiro erro`)
    assert.match(src, /aria-busy=\{saving\}/, `${f} sem aria-busy no salvar`)
    assert.match(src, /<Notice tone="danger">/, `${f} sem aviso de falha ao salvar`)
    assert.doesNotMatch(src, /Dialog/, `${f} ainda usa Dialog`)
    assert.doesNotMatch(src, /react-hook-form|zodResolver/, `${f} ainda usa react-hook-form`)
  }
  assert.match(code(FORM), /zonedTimeToInstant\(/, 'prazo sem zonedTimeToInstant')
  assert.match(code(FORM), /Salvar meta/)
  assert.match(code(FORM), /Informe o nome da meta/)
  assert.match(code(FORM), /Informe um valor maior que zero/)
  assert.match(code(CONTRIBUTION), /Salvar aporte/)
  assert.match(code(CONTRIBUTION), /Novo aporte/)
})

test('a pagina liga Editar e Aportar aos Sheets depois de guard(editar) e mostra os toasts', () => {
  const src = code(PAGE)
  assert.match(src, /<GoalForm/)
  assert.match(src, /<ContributionForm/)
  assert.match(src, /show\('Meta salva'\)/)
  assert.match(src, /show\('Aporte salvo'\)/)
  for (const fn of ['const openEdit', 'const openContribution', 'const openNew']) {
    const start = src.indexOf(fn)
    assert.ok(start >= 0, `sem ${fn}`)
    const flow = src.slice(start, src.indexOf('\n  }\n', start))
    assert.match(flow, /guard\('editar'\)/, `${fn} sem guard(editar)`)
  }
})

test('escala tipografica e alvos de toque limpos nos arquivos de Metas', () => {
  assert.deepEqual(scaleProblems(GOAL_FILES), [])
  assert.deepEqual(touchProblems(GOAL_FILES), [])
})
