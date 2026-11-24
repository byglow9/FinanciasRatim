// Guarda estatica da regra de caixa em Transacoes (Fase 6, 06-11: CARD-06, CARD-03).
// Rodar: node --test test/static/phase6-transactions.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const SERVICE = 'src/services/transactions.service.ts'
const HOOK = 'src/hooks/useCycleTransactions.ts'
const ROW = 'src/components/transactions/TransactionRow.tsx'
const TOTALS = 'src/components/transactions/TransactionTotals.tsx'
const PAGE = 'src/pages/TransactionsPage.tsx'

test('T-06-38: o saldo acumulado leva cardKind e transfer nos dois ramos (simulado e Firestore)', () => {
  const src = code(SERVICE)
  const start = src.indexOf('export async function getAccumulatedBalanceUntil')
  assert.ok(start >= 0, 'getAccumulatedBalanceUntil existe')
  const body = src.slice(start)
  // Uma ocorrencia de cada campo por ramo: simulado (t.) e Firestore (data.).
  assert.equal((body.match(/\bcardKind:\s*t\.cardKind\b/g) ?? []).length, 1, 'ramo simulado leva cardKind')
  assert.equal((body.match(/\btransfer:\s*t\.transfer\b/g) ?? []).length, 1, 'ramo simulado leva transfer')
  assert.equal((body.match(/\bcardKind:\s*data\.cardKind\b/g) ?? []).length, 1, 'ramo Firestore leva cardKind')
  assert.equal((body.match(/\btransfer:\s*data\.transfer\b/g) ?? []).length, 1, 'ramo Firestore leva transfer')
  assert.match(body, /accumulatedBalance\(/, 'o acumulado vem do nucleo')
})

test('o hook usa monthTotals e cardSpendCents do nucleo e nao soma valores na mao', () => {
  const src = code(HOOK)
  assert.match(src, /import \{[^}]*\bcardSpendCents\b[^}]*\} from '@shared\/core\/ledger\.js'/)
  assert.match(src, /import \{[^}]*\bmonthTotals\b[^}]*\} from '@shared\/core\/ledger\.js'/)
  assert.match(src, /\bmonthTotals\(transactions\)/)
  assert.match(src, /\bcardSpendCents\(transactions\)/)
  assert.doesNotMatch(src, /\.reduce\(/, 'nenhuma soma na mao')
  assert.doesNotMatch(src, /\bamount\b/, 'o hook nao le valores dos lancamentos: so o nucleo soma')
  assert.match(src, /cardSpendCents:\s*cardSpendCentsValue/, 'o hook devolve o total do cartao')
})

test('a linha tem as quatro marcas textuais do cartao', () => {
  const src = code(ROW)
  for (const label of ['Cartão', 'Pendente', 'Pagamento de fatura', 'Estorno no cartão']) {
    assert.ok(src.includes(`'${label}'`), `marca "${label}" sumiu`)
  }
  assert.match(src, /cardStatus === 'pending'/, 'Pendente so quando o banco ainda nao confirmou')
  assert.match(src, /cardKind === 'purchase'/)
  assert.match(src, /cardKind === 'payment'/)
  assert.match(src, /cardKind === 'refund'/)
})

test('a linha do cartao nos totais so aparece com compra no cartao e usa o texto combinado', () => {
  const src = code(TOTALS)
  assert.match(src, /cardSpendCents = 0/, 'padrao zero')
  assert.match(src, /hasCardSpend = cardSpendCents > 0/)
  assert.match(src, /hasCardSpend \?/, 'linha condicionada')
  assert.ok(src.includes('fora do saldo até você pagar a fatura'), 'texto da linha')
  assert.match(src, /Compras no cartão:/)
  assert.match(src, /id: 'cartao'/, 'Detalhes repete o valor exato')
  assert.match(code(PAGE), /cardSpendCents=\{cardSpendCents\}/, 'a pagina passa o total do cartao')
})

test('as compras do cartao seguem na lista: a pagina nao filtra por cardKind', () => {
  assert.doesNotMatch(code(PAGE), /cardKind/, 'nenhuma compra do cartao some da lista')
})

test('sem emoji, sem tipografia fora da escala e alvos de 44px nos tres componentes', () => {
  const files = [ROW, TOTALS, PAGE]
  assert.deepEqual(scaleProblems(files), [])
  assert.deepEqual(touchProblems(files), [])
})
