// Guarda estatica de Transacoes da Fase 3.1. Conteudo inicial: contrato legado movido de
// phase3-gaps; o plano de Transacoes reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-transactions.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

test('Transacoes, Calendario e Contas Fixas seguem o ciclo do topo, sem seletor de mes proprio (Transacoes)', () => {
  for (const f of ['src/pages/TransactionsPage.tsx']) {
    const src = code(f)
    assert.doesNotMatch(src, /MonthSelector/, `${f} ainda usa o MonthSelector`)
    assert.doesNotMatch(src, /setSelectedMonth/, `${f} ainda guarda mes proprio`)
    assert.match(src, /const selectedMonth = useCycleMonth\(\)/, `${f} nao deriva o mes do ciclo`)
  }
})

test('WR-03: bumpData depois de lancar, editar ou apagar em Transacoes', () => {
  const tx = code('src/pages/TransactionsPage.tsx')
  assert.match(tx, /await update\(editingTransaction\.id, data\)[\s\S]*await add\(data\)[\s\S]*bumpData\(\)/)
  assert.match(tx, /await remove\(id\)\s*bumpData\(\)/)
  assert.match(tx, /onDelete=\{handleDelete\}/)
  // O gatilho nao mora em useTransactions (Casal e Relatorios tambem o usam).
  assert.doesNotMatch(code('src/hooks/useTransactions.ts'), /bumpData/)
})
