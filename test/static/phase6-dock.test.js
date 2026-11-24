// Guarda estatica do 9o destino do dock (Cartoes, D-11, CENT-03): ordem, rota, icone, rotulo acessivel,
// alvo de 48px e o auditor de espiada a 360x640 (9 itens, 4 inteiros e 1 parcial).
// Rodar: node --test test/static/phase6-dock.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const NAVRAIL = 'src/components/layout/NavRail.tsx'
const AUDIT = 'scripts/ux-audit/audit.mjs'

const ORDER = [
  ['/', 'Início'],
  ['/transacoes', 'Transações'],
  ['/calendario', 'Calendário'],
  ['/contas-fixas', 'Contas fixas'],
  ['/cartoes', 'Cartões'],
  ['/metas', 'Metas'],
  ['/relatorios', 'Relatórios'],
  ['/casal', 'Casal'],
  ['/porquinho', 'Porquinho'],
]

test('o dock tem exatamente 9 destinos, na ordem do D-11, com Cartões entre Contas fixas e Metas', () => {
  const src = code(NAVRAIL)
  const entries = [...src.matchAll(/\{ href: '([^']+)', label: '([^']+)'/g)].map((m) => [m[1], m[2]])
  assert.equal(entries.length, 9, 'o dock tem exatamente 9 destinos')
  assert.deepEqual(entries, ORDER, 'ordem dos destinos do dock')
  const at = (href) => entries.findIndex(([h]) => h === href)
  assert.ok(at('/cartoes') > at('/contas-fixas'), 'Cartões vem depois de Contas fixas')
  assert.ok(at('/cartoes') < at('/metas'), 'Cartões vem antes de Metas')
})

test('Cartões usa a rota /cartoes e o ícone CreditCard do lucide-react', () => {
  const src = code(NAVRAIL)
  assert.match(src, /\{ href: '\/cartoes', label: 'Cartões', icon: CreditCard \}/)
  assert.match(src, /import \{[^}]*\bCreditCard\b[^}]*\} from 'lucide-react'/)
})

test('todo Link do dock mantém 48px, aria-label e title pelo rótulo e nenhum rótulo visível', () => {
  const src = code(NAVRAIL)
  assert.match(src, /aria-label=\{label\}/)
  assert.match(src, /title=\{label\}/)
  assert.match(src, /'relative flex h-12 w-12 shrink-0 snap-start/, 'cada Link mantém h-12 w-12 (48px) e snap-start')
  assert.doesNotMatch(src, /<span\b/, 'o dock não tem rótulo de texto visível')
})

test('o auditor de espiada confere 9 itens, o link Cartões, 4 inteiros e 1 parcial à direita', () => {
  const src = code(AUDIT)
  assert.match(src, /const DOCK_DESTINATIONS = 9\b/)
  assert.match(src, /m\.total === DOCK_DESTINATIONS/)
  assert.match(src, /labels\.includes\('Cartões'\)/)
  assert.match(src, /m\.full === 4/)
  assert.match(src, /m\.partialRight === 1/)
  assert.match(src, /!m\.firstCutLeft/)
  // O assert dock-peek segue sendo o unico aceito (so vale em 360x640).
  assert.match(src, /name !== 'dock-peek'/)
})

test('o dock respeita a escala tipográfica e o alvo de toque, sem emoji', () => {
  assert.deepEqual(scaleProblems([NAVRAIL]), [])
  assert.deepEqual(touchProblems([NAVRAIL]), [])
  const emoji = /\p{Extended_Pictographic}/u
  assert.doesNotMatch(code(NAVRAIL), emoji)
  assert.doesNotMatch(code(AUDIT), emoji)
})
