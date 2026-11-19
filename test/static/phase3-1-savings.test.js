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
const FILES = [PAGE, BANK, HISTORY]

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
