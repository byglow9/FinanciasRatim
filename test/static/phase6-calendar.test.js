// Guarda estatica do vencimento da fatura do cartao no Calendario e no sino (CENT-04, 06-13).
// Rodar: node --test test/static/phase6-calendar.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const HOOK = 'src/hooks/useCalendarData.ts'
const BELL = 'src/components/layout/AlertsBell.tsx'
const MODEL = 'shared/core/calendarModel.js'
const PURE = 'shared/core/cardCalendar.js'
const ALL = [HOOK, BELL, MODEL, PURE]

test('useCalendarData passa cardBillItems por cardBillEvents sobre useCards do perfil', () => {
  const src = code(HOOK)
  assert.match(src, /import \{ useCards \} from '@\/hooks\/useCards'/)
  assert.match(src, /cardBillEvents/)
  assert.match(src, /cardBillItems/)
  assert.match(src, /c\.person === person/, 'so os cartoes do perfil')
  assert.match(src, /buildDayModels\(\{[\s\S]*cardBillItems[\s\S]*\}\)/)
})

test('Calendario e sino nao leem compras do cartao: so cards e cardSettings', () => {
  for (const file of [HOOK, BELL, MODEL, PURE]) {
    const src = code(file)
    assert.doesNotMatch(src, /cardTransactions|cardPurchases|cardTx|useCardView|subscribeCardTransactions/, `${file} le compras do cartao`)
    assert.doesNotMatch(src, /services\/(cardPurchases|cardTransactions)/, `${file} importa servico de compras`)
  }
  assert.match(code(HOOK), /useCards\(\)/)
})

test('calendarSummary nao recebe os itens do cartao', () => {
  const src = code(HOOK)
  const call = src.match(/calendarSummary\(\{[^}]*\}\)/)
  assert.ok(call, 'chamada de calendarSummary nao encontrada')
  assert.doesNotMatch(call[0], /card/i, 'calendarSummary recebeu itens do cartao')
  // o modelo nao soma o vencimento em saldo nem em gasto
  const model = code(MODEL)
  assert.match(model, /\[\.\.\.billItems, \.\.\.cardBillItems\]/)
  assert.doesNotMatch(model, /cardBillItems[^\n]*(netCents|spentCents)/)
})

test('AlertsBell usa cardBillAlerts com daysBeforeDueDate e notificationsEnabled e leva a /cartoes', () => {
  const src = code(BELL)
  assert.match(src, /cardBillAlerts/)
  assert.match(src, /settings\.daysBeforeDueDate/)
  assert.match(src, /settings\.notificationsEnabled/)
  assert.match(src, /enabled/)
  assert.match(src, /navigate\('\/cartoes'\)/)
  assert.match(src, /CreditCard/)
  assert.match(src, /venceu há/)
  // o selo conta os avisos de fatura como conta fixa que vence
  assert.match(src, /unread \+ due\.length \+ cardAlerts\.length/)
})

test('guardas anteriores do sino seguem intactas', () => {
  const src = code(BELL)
  for (const text of ['aria-label="Avisos"', 'role="dialog"', 'Sem avisos por enquanto', '/contas-fixas', 'limitHref(alert.categoryId)']) {
    assert.ok(src.includes(text), `AlertsBell sem "${text}"`)
  }
})

test('sem emoji, sem console e sem tipografia fora da escala nos arquivos do plano', () => {
  for (const file of ALL) {
    const src = code(file)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${file} tem emoji`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
  }
  for (const file of [HOOK, BELL]) {
    assert.doesNotMatch(code(file), /text-\[\d/, `${file} usa tamanho de fonte arbitrario`)
  }
})
