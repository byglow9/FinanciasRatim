// Guarda estatica dos cartoes, atalhos e avisos da Home e da Central (LIM-05, LIM-06, LIM-07,
// LIM-08, LIM-09, CENT-01, CENT-06, IDEN-07): copia, acessibilidade e regras de apresentacao.
// Rodar: node --test test/static/phase3-home-cards.test.js
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

const MONTH = 'src/components/dashboard/MonthInOneCard.tsx'
const CENTRAL = 'src/components/dashboard/CentralSummaryCard.tsx'
const FIXED = 'src/components/dashboard/FixedMonthCard.tsx'

// Componentes de apresentacao deste plano.
const FILES = [MONTH, CENTRAL, FIXED]

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem ${text}`)
  }
}

test('MonthInOneCard: titulo, linhas, estimativa e link sem renda', () => {
  assertIncludes(MONTH, [
    'O mês em uma conta',
    'estimativa',
    'sobra.projected',
    'Defina a renda',
    '/configuracoes#ciclo',
    'já entrou',
    'esperado',
    'de ${fixos.totalCount} pagos',
    'tudo que não é fixo',
    'projeção até',
    'resultado do ciclo',
    'text-danger-ink',
    'text-ok-ink',
    'text-[28px]',
    'font-display',
    'min-h-11',
  ])
})

test('CentralSummaryCard: link inteiro para /limites com as contagens', () => {
  assertIncludes(CENTRAL, [
    'to="/limites"',
    'Central de Limites',
    'Nenhum limite definido ainda',
    'passou do limite',
    'passaram do limite',
    'em atenção',
    'em dia',
    'min-h-14',
  ])
})

test('FixedMonthCard: ancora fx, titulo focavel, marcar pago e vazio', () => {
  assertIncludes(FIXED, [
    'id="fx"',
    'data-section-title',
    'tabIndex={-1}',
    'Contas fixas do mês',
    'Marcar pago',
    'pago',
    'Gerenciar contas fixas',
    'Ver todas (',
    'Nenhuma conta fixa neste ciclo',
    'Cadastre aluguel, internet e outras contas que se repetem todo mês.',
    'Nova conta fixa',
    'min-w-[120px]',
    'h-11',
    'disabled={readOnly}',
    'onMarkPaid(item)',
  ])
})

test('Cartoes da Home: escala tipografica, pesos, sem HTML bruto, emoji nem console', () => {
  const rawHtml = 'dangerously' + 'SetInnerHTML'
  for (const f of FILES) {
    const src = code(f)
    for (const bad of ['text-sm', 'text-lg', 'text-xl', 'text-2xl', 'font-medium', 'font-semibold', 'font-extrabold']) {
      assert.ok(!src.includes(bad), `${f} usa ${bad}`)
    }
    assert.ok(!src.includes(rawHtml), `${f} injeta HTML bruto (T-03-91)`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${f} contem emoji`)
    assert.doesNotMatch(src, /\bconsole\./, `${f} usa console (T-03-93)`)
    assert.doesNotMatch(src, /text-white/, `${f} usa texto branco`)
  }
})

test('Cartoes da Home: nenhuma formula de orcamento no componente', () => {
  for (const f of FILES) {
    const src = code(f)
    for (const bad of ['incomeCents -', 'safeCents -', 'limitCents * 80', 'safeToSpend', 'perDayCents', 'RHYTHM_CUTS', 'spendByCategory']) {
      assert.ok(!src.includes(bad), `${f} calcula ${bad}`)
    }
  }
})
