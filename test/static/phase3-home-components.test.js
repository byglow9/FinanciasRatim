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

// Arquivos de apresentacao deste plano (completada com LimitRow.tsx na Tarefa 2).
const FILES = [ARC, PILL, RHYTHM, REVEAL]

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
    'h-[84px] w-[84px]',
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
  for (const f of [ARC, PILL]) {
    const src = code(f)
    for (const bad of ['incomeCents', 'fixedCents', 'spentCents', 'safeToSpend', 'perDayCents', 'RHYTHM_CUTS']) {
      assert.ok(!src.includes(bad), `${f} calcula ${bad}`)
    }
  }
})
