// Guarda estatica dos componentes de apresentacao da Home e da Central (LIM-02, LIM-03,
// LIM-04, LIM-08, LIM-09, CENT-02, IDEN-07): arco, ritmo, rolagem com destaque e linhas de limite.
// Rodar: node --test test/static/phase3-home-components.test.js
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

const ARC = 'src/components/dashboard/ArcGauge.tsx'
const PILL = 'src/components/dashboard/RhythmPill.tsx'
const RHYTHM = 'src/lib/rhythm.ts'
const REVEAL = 'src/hooks/useSectionReveal.ts'
const LIMIT = 'src/components/limits/LimitRow.tsx'

// Arquivos de apresentacao deste plano.
const FILES = [ARC, PILL, RHYTHM, REVEAL, LIMIT]

const has = (src, needle, label) => assert.ok(src.includes(needle), `${label} sem ${needle}`)

test('ArcGauge: geometria do arco, acessibilidade e slot do mascote', () => {
  const src = code(ARC)
  for (const needle of [
    'viewBox="0 0 200 110"',
    'M16 104 A84 84 0 0 1 184 104',
    '264',
    'strokeWidth={13}',
    'strokeLinecap="round"',
    'role="img"',
    'Restam',
    'do dinheiro do ciclo',
    'PiggyBank',
    'stroke-track',
    'stroke-brand',
    'stroke-warn',
    'stroke-danger',
    'stroke-muted-foreground',
    'stroke-dashoffset 500ms',
    'requestAnimationFrame',
    'anim-pulse',
    'h-[125px] w-[150px]',
  ]) {
    has(src, needle, ARC)
  }
  // O preenchimento visual nunca passa de 100 (BudgetRow.pct e restPct podem exceder).
  has(src, 'Math.min(Math.max(restPct as number, 0), 100)', ARC)
})

test('RhythmPill e rhythm.ts: 5 niveis com rotulo e icone, e estado aguardando dados', () => {
  const rhythm = code(RHYTHM)
  const pill = code(PILL)
  for (const label of ['Folgado', 'No ritmo', 'Atenção', 'Acima do ritmo', 'Estourou']) {
    has(rhythm, label, RHYTHM)
  }
  for (const icon of ['trending-up', 'check', 'triangle-alert', 'arrow-up-right', 'octagon-alert']) {
    has(rhythm, icon, RHYTHM)
  }
  for (let n = 0; n <= 4; n++) {
    has(rhythm, `bg-rhythm-${n}-bg`, RHYTHM)
    has(rhythm, `text-rhythm-${n}-fg`, RHYTHM)
  }
  has(rhythm, 'export function arcToneFor', RHYTHM)
  has(rhythm, 'export const RHYTHM_LEVELS', RHYTHM)
  has(pill, 'Aguardando dados do banco', PILL)
  has(pill, 'Clock', PILL)
  has(pill, 'export function RhythmPill', PILL)
  // Pilula nao e interativa.
  assert.doesNotMatch(pill, /onClick|<button/, 'RhythmPill nao deve ser interativa')
})

test('useSectionReveal: hash so por getElementById, com decodeURIComponent e movimento reduzido', () => {
  const src = code(REVEAL)
  for (const needle of [
    'getElementById',
    'decodeURIComponent',
    'prefers-reduced-motion',
    'anim-section-highlight',
    'section-highlight-static',
    'data-section-title',
    'export function useSectionReveal',
    'export function useHashReveal',
    'preventScroll: true',
    '1200',
  ]) {
    has(src, needle, REVEAL)
  }
  // O hash nunca vira seletor (T-03-55): nenhum querySelector com variavel de id ou de hash.
  assert.doesNotMatch(src, /querySelector(All)?\(\s*(`|[a-zA-Z_])/, 'querySelector com valor dinamico')
  assert.doesNotMatch(src, /querySelector(All)?\(.*\bhash\b/, 'querySelector com hash')
})

test('LimitRow e LimitsList: acessibilidade, copia exata e estados do limite', () => {
  const src = code(LIMIT)
  for (const needle of [
    'export function LimitRow',
    'export function LimitsList',
    'aria-expanded',
    'aria-controls',
    'id={`cat-${row.categoryId}`}',
    'expandId',
    'Gasto geral',
    'em categorias sem limite, somadas. Já descontado do Pode gastar.',
    'TOP_CATEGORIES = 5',
    'Ver mais',
    'Nenhum limite definido',
    'Escolha um limite por categoria para acompanhar o gasto. Passar do limite só avisa.',
    'Definir limites',
    'Limites do mês',
    'Editar em Configurações',
    'Ver todos em Transações',
    'Nenhum lançamento neste ciclo',
    'Sem categoria',
    'data-section-title',
    'tabIndex={-1}',
    'passou ',
    ' do limite',
    'restam ',
    'text-danger-ink',
    'text-warn-ink',
    'CircleAlert',
    'TriangleAlert',
    'rotate-180',
    'Collapsible',
    'IconCircle',
    'Progress',
    'neutralOk',
    '/configuracoes#categorias',
    '/transacoes',
    'import type { BudgetRow }',
  ]) {
    has(src, needle, LIMIT)
  }
  // O preenchimento da barra nunca passa de 100: BudgetRow.pct nao satura (aviso do 03-06).
  has(src, 'Math.min(Math.max(row.spentCents, 0), row.limitCents)', LIMIT)
  // Passar do limite so avisa (D-09): nenhuma trava na linha.
  assert.doesNotMatch(src, /disabled\b/, 'LimitRow nao pode bloquear nada (D-09)')
})

test('LimitRow: nenhum seletor montado de texto externo (T-03-55)', () => {
  assert.doesNotMatch(code(LIMIT), /querySelector/, 'LimitRow usa querySelector')
})

test('Componentes da Home: escala tipografica, pesos, sem HTML bruto, emoji nem console', () => {
  const rawHtml = 'dangerously' + 'SetInnerHTML'
  for (const f of FILES) {
    const src = code(f)
    for (const bad of ['text-sm', 'text-lg', 'text-xl', 'text-2xl', 'font-medium', 'font-semibold', 'font-extrabold']) {
      assert.ok(!src.includes(bad), `${f} usa ${bad}`)
    }
    assert.ok(!src.includes(rawHtml), `${f} injeta HTML bruto (T-03-54)`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${f} contem emoji`)
    assert.doesNotMatch(src, /\bconsole\./, `${f} usa console (T-03-58)`)
    assert.doesNotMatch(src, /text-white/, `${f} usa texto branco`)
  }
})

test('Componentes da Home: nenhuma formula de orcamento no componente', () => {
  for (const f of [ARC, PILL, LIMIT]) {
    const src = code(f)
    for (const bad of ['incomeCents', 'fixedCents', 'safeToSpend', 'perDayCents', 'RHYTHM_CUTS', 'limitState', 'spendByCategory']) {
      assert.ok(!src.includes(bad), `${f} calcula ${bad}`)
    }
  }
  // Os componentes de apresentacao nao somam gasto: so exibem a linha pronta.
  assert.doesNotMatch(code(ARC), /spentCents/)
  assert.doesNotMatch(code(PILL), /spentCents/)
  assert.doesNotMatch(code(LIMIT), /\.reduce\(|spentCents\s*[-+*\/]|[-+*\/]\s*row\.spentCents/, 'LimitRow faz conta de gasto')
})
