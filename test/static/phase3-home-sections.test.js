// Guarda estatica das secoes da Home (LIM-02, LIM-03, LIM-05, LIM-06, CENT-01, CENT-06, IDEN-07):
// composicao, ordem, Marcar pago manual e estado de carregamento.
// Rodar: node --test test/static/phase3-home-sections.test.js
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

const SECTIONS = 'src/components/dashboard/HomeSections.tsx'
const FIXED = 'src/components/dashboard/FixedMonthCard.tsx'
const SERVICE = 'src/services/fixedExpenses.service.ts'

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem ${text}`)
  }
}

test('HomeSections: importa e usa os tres cartoes, o servico, as guardas e o toast', () => {
  assertIncludes(SECTIONS, [
    'MonthInOneCard',
    'LimitsList',
    'FixedMonthCard',
    'markAsPaid',
    'useReadOnly',
    'useCycle',
    'useToast',
    'useArea',
  ])
})

test('HomeSections: ordem das secoes e ancoras', () => {
  const src = code(SECTIONS)
  const order = ['<MonthInOneCard', '<LimitsList', '<FixedMonthCard']
  const idx = order.map((t) => src.indexOf(t))
  idx.forEach((i, n) => assert.ok(i >= 0, `HomeSections sem ${order[n]}`))
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'secoes da Home fora da ordem')
  assertIncludes(SECTIONS, ['id="lm"', 'expandId={expandId}', 'showEditLink', 'neutralOk', 'cycleEnd={cycle.endParts}'])
  // A ancora fx vem do proprio cartao, nao de um invólucro.
  assertIncludes(FIXED, ['id="fx"'])
})

test('HomeSections: Marcar pago manual, guarda de somente leitura, toast e sem lancamento', () => {
  const src = code(SECTIONS)
  assertIncludes(SECTIONS, [
    "guard('editar')",
    'refetch()',
    'bumpData()',
    'Marcado como pago',
    'O Pode gastar não muda, porque as fixas já estão descontadas.',
    'fromCents(item.plannedCents)',
    'Não foi possível marcar como pago',
  ])
  // A guarda vem antes do servico, que vem antes de refetch e bumpData.
  const order = ["guard('editar')", 'markAsPaid(item.billId', 'refetch()', 'bumpData()']
  const idx = order.map((t) => src.indexOf(t))
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'Marcar pago fora da ordem guarda, gravacao, atualizacao')
  assert.doesNotMatch(src, /addTransaction|transactions\.service|createTransaction/, 'Marcar pago nao pode criar lancamento (CENT-06)')
  // O servico segue manual, sem lancamento (guarda existente).
  assert.ok(fs.existsSync(path.join(ROOT, 'test/static/fixed-expense-manual.test.js')))
  assert.ok(read(SERVICE).includes('export async function markAsPaid'), 'markAsPaid saiu do servico')
})

test('HomeSections: carregando mostra blocos neutros e nunca numero', () => {
  const src = code(SECTIONS)
  assertIncludes(SECTIONS, ['anim-pulse', 'aria-hidden="true"', 'bg-card', 'if (!loading) return null'])
  // O bloco de carregamento nao formata dinheiro nem escreve "R$".
  const loadingBlock = src.slice(src.indexOf('if (!view)'), src.indexOf('const onMarkPaid'))
  assert.ok(!loadingBlock.includes('formatMoney') && !loadingBlock.includes('R$'), 'carregando mostra valor')
})

test('HomeSections: nenhuma formula de orcamento, Recharts nem total por pessoa', () => {
  const src = code(SECTIONS)
  for (const bad of [
    'recharts',
    'useTransactions',
    'BankStatusNotice',
    'safeCents -',
    'incomeCents -',
    'limitCents * 80',
    'safeToSpend',
    'perDayCents',
    'RHYTHM_CUTS',
  ]) {
    assert.ok(!src.includes(bad), `${SECTIONS} contem ${bad}`)
  }
})

test('HomeSections: sem console, HTML bruto, emoji, pesos 500 e 600 nem fontes fora da escala', () => {
  const src = code(SECTIONS)
  const rawHtml = 'dangerously' + 'SetInnerHTML'
  assert.doesNotMatch(src, /\bconsole\./, 'HomeSections usa console (T-03-79)')
  assert.ok(!src.includes(rawHtml), 'HomeSections injeta HTML bruto (T-03-78)')
  assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, 'HomeSections contem emoji')
  for (const bad of ['font-medium', 'font-semibold', 'font-extrabold', 'text-sm', 'text-lg', 'text-xl', 'text-2xl']) {
    assert.ok(!src.includes(bad), `HomeSections usa ${bad}`)
  }
})
