// Guarda estatica do Casal da Fase 3.1 (UX-06, UX-08, UX-09, D-17, premissa P-02).
// Rodar: node --test test/static/phase3-1-couple.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, assertIncludes, scaleProblems } from './helpers/phase3-1.js'

const COUPLE = 'src/pages/CouplePage.tsx'
const HOOK = 'src/hooks/useCoupleData.ts'
const HEADLINE = 'src/components/couple/CoupleHeadline.tsx'
const FILES = [COUPLE, HOOK, HEADLINE]

test('a pagina usa useCoupleData, coupleSummary e o alternador Ciclo e Mes', () => {
  assertIncludes(COUPLE, ['useCoupleData', 'coupleSummary', 'SegmentedControl', 'Casal', 'Ciclo', 'Mês'])
  assert.match(code(COUPLE), /export function CouplePage\b/)
})

test('o legado do Casal saiu: sem grafico, seletor de mes, saldo acumulado nem aviso', () => {
  for (const file of FILES) {
    const src = code(file)
    assert.doesNotMatch(src, /recharts/i, `${file} usa recharts`)
    assert.doesNotMatch(src, /ResponsiveContainer/, `${file} usa ResponsiveContainer`)
    assert.doesNotMatch(src, /MonthSelector/, `${file} usa MonthSelector`)
    assert.doesNotMatch(src, /getAccumulatedBalance/, `${file} le o saldo acumulado`)
    assert.doesNotMatch(src, /useTransactions\b/, `${file} usa useTransactions`)
    assert.doesNotMatch(src, /chega em breve/, `${file} tem o aviso de relatorio em breve`)
  }
})

test('os nomes de Ele e Ela vem de tabNames, nunca de texto fixo', () => {
  assertIncludes(COUPLE, ['tabNames'])
  for (const file of FILES) {
    assert.doesNotMatch(code(file), /\bEl[ea]\b/, `${file} escreve Ele ou Ela como texto fixo`)
  }
})

test('o hook faz duas consultas por intervalo com a mesma janela e usa o nucleo do ciclo', () => {
  const src = code(HOOK)
  const calls = src.match(/getTransactionsInRange\(/g) ?? []
  assert.equal(calls.length, 2, 'esperava duas chamadas de getTransactionsInRange')
  assert.ok(src.includes("getTransactionsInRange('ele', win.start, win.end)"))
  assert.ok(src.includes("getTransactionsInRange('ela', win.start, win.end)"))
  assert.ok(src.includes('shiftCycle(cycleOf(now, 1), offset)'), 'modo mes sem shiftCycle(cycleOf(now, 1), offset)')
  assert.ok(src.includes('cycleFor(viewPerson)'), 'modo ciclo sem cycleFor(viewPerson)')
  assert.ok(src.includes('loadKey'), 'sem descarte de resposta velha por loadKey')
  assert.doesNotMatch(src, /date-fns/, 'o hook usa date-fns para limites')
})

test('a pagina tem os estados de carregando, vazio e erro em portugues', () => {
  assertIncludes(COUPLE, [
    'Carregando o casal',
    'Sem lançamentos neste período',
    'Quando vocês lançarem gastos ou receitas, a comparação aparece aqui.',
    'Não foi possível carregar os números do casal.',
    'Confira a conexão e tente de novo.',
    'Tentar de novo',
    'Recorte do ciclo de',
  ])
})

test('o Juntos mostra o saldo somado com ajuste automatico e os dois cartoes', () => {
  assertIncludes(HEADLINE, ['Juntos', 'saldo somado dos dois', 'Entradas juntos', 'Saídas juntos', 'displayTier', 'text-[56px]'])
})

test('os arquivos do Casal ficam na escala tipografica e sem console', () => {
  assert.deepEqual(scaleProblems(FILES), [])
  for (const file of FILES) {
    const src = code(file)
    assert.doesNotMatch(src, /\bfont-medium\b|\bfont-semibold\b/, `${file} usa peso 500 ou 600`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
    assert.doesNotMatch(src, /text-\[10px\]/, `${file} tem texto de 10px`)
  }
})
