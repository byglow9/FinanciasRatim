// Guarda estatica do dock (NavRail) da Fase 3.1, contrato D-01 (sketch 012 variante A): pilula
// com scroll-snap, uma so cor de acao, sem fade e com o ativo alinhado ao inicio.
// Rodar: node --test test/static/phase3-1-dock.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, assertIncludes, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const NAVRAIL = 'src/components/layout/NavRail.tsx'

test('NavRail traz os 8 destinos (sem a Central de Limites), cada um com nome e rota, e o contrato do dock', () => {
  const src = code(NAVRAIL)
  const destinations = [
    ['/', 'Início'],
    ['/transacoes', 'Transações'],
    ['/calendario', 'Calendário'],
    ['/contas-fixas', 'Contas fixas'],
    ['/metas', 'Metas'],
    ['/relatorios', 'Relatórios'],
    ['/casal', 'Casal'],
    ['/porquinho', 'Porquinho'],
  ]
  let last = -1
  for (const [href, label] of destinations) {
    const entry = `{ href: '${href}', label: '${label}'`
    const at = src.indexOf(entry)
    assert.ok(at >= 0, `${NAVRAIL} sem o destino ${label} (${href})`)
    assert.ok(at > last, `${NAVRAIL}: destino ${label} fora da ordem do UI-SPEC`)
    last = at
  }
  assert.equal(src.split("{ href: '").length - 1, 8, 'o dock tem exatamente 8 destinos')
  // O nome vira aria-label e title de cada Link: nenhum destino fica sem rotulo acessivel.
  assert.match(src, /aria-label=\{label\}/)
  assert.match(src, /title=\{label\}/)
  assertIncludes(NAVRAIL, [
    'aria-label="Navegação principal"',
    'aria-current',
    'aria-label="Novo lançamento"',
    'title="Novo lançamento"',
    'no-scrollbar',
    'overscroll-x-contain',
    'env(safe-area-inset-bottom)',
    'useLaunch',
    "open('gasto')",
    'aria-disabled',
    'prefers-reduced-motion',
    'z-40',
  ])
  assert.match(src, /export function NavRail\b/)
})

test('NavRail so tem icones (sem rotulo visivel) e a regra do Porquinho vem da rota', () => {
  const src = code(NAVRAIL)
  for (const icon of ['House', 'Receipt', 'Calendar', 'Repeat', 'Flag', 'ChartPie', 'Users', 'PiggyBank', 'Plus']) {
    assert.match(src, new RegExp(`\\b${icon}\\b`), `${NAVRAIL} sem o icone ${icon}`)
  }
  assert.doesNotMatch(src, /<span\b/, 'o dock nao tem rotulo de texto')
  assert.match(src, /setCurrentArea\('porquinho'\)/)
  assert.match(src, /setCurrentArea\(lastPerson\)/)
})

test('o dock usa scroll-snap, o ativo em tinta suave e uma so cor de acao (D-01)', () => {
  assertIncludes(NAVRAIL, ['snap-x', 'snap-mandatory', 'scroll-px-1.5', 'snap-start', 'bg-action/10'])
  const src = code(NAVRAIL)
  // O ramo ativo e o botao + dividem a mesma cor de acao; o botao + deixa de usar bg-brand.
  assert.match(src, /bg-action text-action-text/, 'o botao + usa bg-action text-action-text')
  assert.doesNotMatch(src, /bg-brand/, 'o dock nao usa bg-brand')
})

test('o dock centraliza o ativo pelo inicio, sem fade, mascara, scrollIntoView nem listener de scroll', () => {
  const src = code(NAVRAIL)
  assert.match(src, /function center\(/, 'funcao center portada de themes/dock.js')
  assert.match(src, /scrollTo\(/)
  for (const banned of ['fadeStyle', 'mask', 'scrollIntoView', 'addEventListener']) {
    assert.ok(!src.includes(banned), `${NAVRAIL} nao pode conter ${banned}`)
  }
  assert.doesNotMatch(src, /<span\b/)
})

test('o dock respeita a escala tipografica e o alvo de toque', () => {
  assert.deepEqual(scaleProblems([NAVRAIL]), [])
  assert.deepEqual(touchProblems([NAVRAIL]), [])
})
