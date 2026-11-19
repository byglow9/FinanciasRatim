// Guarda estatica da pagina de teste oculta do Vintem da Fase 4 (MASC-06, D-17, UI-SPEC S7).
// Rodar: node --test test/static/phase4-testpage.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const APP = 'src/App.tsx'
const PAGE = 'src/pages/VintemTestPage.tsx'
const NAVRAIL = 'src/components/layout/NavRail.tsx'
const SETTINGS = 'src/pages/SettingsPage.tsx'
const SHORTCUT = 'src/components/dashboard/ShortcutRow.tsx'
const FILES = [PAGE]

test('a rota /vintem-teste esta em App.tsx dentro de AnimatedRoutes, atras do ProtectedRoute', () => {
  const src = code(APP)
  assert.match(src, /<Route path="\/vintem-teste" element=\{<VintemTestPage \/>\} \/>/, 'App.tsx sem a rota')
  const routes = src.indexOf('function AnimatedRoutes')
  const app = src.indexOf('function App()')
  const at = src.indexOf('/vintem-teste')
  assert.ok(routes >= 0 && app > routes && at > routes && at < app, 'a rota fica fora de AnimatedRoutes')
  assert.ok(src.indexOf('<ProtectedRoute>') < src.indexOf('<AnimatedRoutes />'), 'AnimatedRoutes fora do ProtectedRoute')
})

test('nenhum link para a rota oculta: a string vintem-teste nao aparece em NavRail, Configuracoes nem atalhos', () => {
  for (const f of [NAVRAIL, SETTINGS, SHORTCUT]) {
    assert.doesNotMatch(code(f), /vintem-teste/, `${f} aponta para a rota oculta`)
  }
})

test('a pagina tem noindex, o titulo e a legenda do contrato', () => {
  const src = code(PAGE)
  assert.match(src, /name', 'robots'/, 'pagina sem a meta robots')
  assert.match(src, /'noindex'/, 'pagina sem noindex')
  assert.match(src, /meta\.remove\(\)/, 'a meta noindex nao e removida ao desmontar')
  assert.match(src, /Teste do Vintém/, 'pagina sem o H1 "Teste do Vintém"')
  assert.match(src, /Página de testes\. Nada aqui grava dados\./, 'pagina sem a legenda')
  assert.match(src, /Toque no Vintém: no estado sonolento ele desperta com susto/, 'palco sem a legenda do contrato')
})

test('a pagina usa a escala tipografica e alvos de toque do app', () => {
  assert.deepEqual(scaleProblems(FILES), [])
  assert.deepEqual(touchProblems(FILES), [])
})
