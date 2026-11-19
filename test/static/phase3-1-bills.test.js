// Guarda estatica de Contas Fixas da Fase 3.1. Conteudo inicial: contrato legado movido de
// phase3-gaps; o plano de Contas Fixas reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-bills.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

test('Transacoes, Calendario e Contas Fixas seguem o ciclo do topo, sem seletor de mes proprio (Contas Fixas)', () => {
  for (const f of ['src/pages/FixedExpensesPage.tsx']) {
    const src = code(f)
    assert.doesNotMatch(src, /MonthSelector/, `${f} ainda usa o MonthSelector`)
    assert.doesNotMatch(src, /setSelectedMonth/, `${f} ainda guarda mes proprio`)
    assert.match(src, /const selectedMonth = useCycleMonth\(\)/, `${f} nao deriva o mes do ciclo`)
  }
})

test('iconSm tem rounded-md e Marcar pago movel nao combina size=icon com h-8/h-7 (FixedExpenseList)', () => {
  const list = code('src/components/fixed-expenses/FixedExpenseList.tsx')
  assert.match(list, /size="iconSm"/)
  assert.doesNotMatch(list, /size="icon"[\s\S]{0,80}?h-(7|8) w-(7|8)/)
  assert.doesNotMatch(list, /h-7 w-7/)
  assert.doesNotMatch(list, /'shrink-0 h-8 w-8/)
})

test('Contas Fixas mantem os tres cartoes de total e o + Nova, sem seletor de mes', () => {
  const src = code('src/pages/FixedExpensesPage.tsx')
  for (const needle of ['Total Mensal', 'Pagas', 'Pendentes', 'Nova']) {
    assert.ok(src.includes(needle), `FixedExpensesPage sem ${needle}`)
  }
  assert.doesNotMatch(src, /MonthSelector/)
})
