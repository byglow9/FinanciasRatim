// Guarda estatica do dock (NavRail) da Fase 3.1. Conteudo inicial: contrato legado movido de
// phase3-shell e phase3-gaps; o plano do dock reescreve estes blocos.
// Rodar: node --test test/static/phase3-1-dock.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, assertIncludes } from './helpers/phase3-1.js'

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
  // O nome vira aria-label e title de cada Link: nenhum destino fica sem rotulo acessivel.
  assert.match(src, /aria-label=\{label\}/)
  assert.match(src, /title=\{label\}/)
  assertIncludes(NAVRAIL, [
    'aria-label="Navegação principal"',
    'aria-current',
    'aria-label="Novo lançamento"',
    'title="Novo lançamento"',
    'scrollIntoView',
    "inline: 'center'",
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
  assert.match(src, /passive:\s*true/, 'scroll e resize passivos')
})

test('o ramo ativo do NavRail usa bg-action text-action-text', () => {
  assert.match(code(NAVRAIL), /bg-action text-action-text/)
})
