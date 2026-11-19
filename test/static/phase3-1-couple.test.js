// Guarda estatica do Casal da Fase 3.1. Conteudo inicial: contrato legado movido de phase3-shell;
// o plano do Casal reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-couple.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, assertIncludes } from './helpers/phase3-1.js'

const COUPLE = 'src/pages/CouplePage.tsx'

test('CouplePage guarda o conteudo antigo do Dashboard e o aviso em breve', () => {
  assertIncludes(COUPLE, [
    'Casal',
    'O relatório do casal completo chega em breve.',
    'useTransactions',
    'useSavings',
    'recharts',
    'ResponsiveContainer',
    'MonthSelector',
  ])
  const src = code(COUPLE)
  assert.match(src, /export function CouplePage\b/)
  assert.doesNotMatch(src, /BankStatusNotice/)
})

test('os arquivos do plano nao usam HTML bruto, emoji, pesos 500 e 600 nem console (CouplePage)', () => {
  for (const file of [COUPLE]) {
    const src = code(file)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${file} usa HTML bruto`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${file} tem emoji`)
    assert.doesNotMatch(src, /\bfont-medium\b|\bfont-semibold\b/, `${file} usa peso 500 ou 600`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
  }
})
