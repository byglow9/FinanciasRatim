// Guarda estatica da pagina de teste oculta do Vintem da Fase 4 (MASC-06, D-17, UI-SPEC S7).
// Rodar: node --test test/static/phase4-testpage.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, listSrc, scaleProblems, touchProblems } from './helpers/phase3-1.js'

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

test('a pagina tem todos os rotulos e botoes do contrato de controles', () => {
  const src = code(PAGE)
  for (const text of [
    'Estado', 'Limite gasto', 'Tom', 'Seguir o cursor', 'Girar de lado', 'Movimento reduzido',
    'Lançar gasto', 'Susto', 'Bronca', 'Festa', 'Falar',
    'Neutro', 'Feliz', 'Triste', 'Bravo', 'Sonolento', 'Surpreso', 'Atento',
    'Suave', 'Direto', 'Sem filtro',
    'Vintém grande', 'Controles',
  ]) {
    assert.ok(src.includes(text), `pagina sem "${text}"`)
  }
})

test('o limite gasto e um controle nativo de 0 a 160 que aplica stateFromPct', () => {
  const src = code(PAGE)
  assert.match(src, /type="range"/, 'sem input type=range')
  assert.match(src, /min=\{0\}/, 'o controle nao comeca em 0')
  assert.match(src, /max=\{160\}/, 'o controle nao vai a 160')
  assert.match(src, /min-h-11/, 'o controle nao tem alvo de 44px')
  assert.match(src, /stateFromPct/, 'a pagina nao usa stateFromPct')
})

test('Falar usa o seletor de frases com encaixes ficticios e historico local', () => {
  const src = code(PAGE)
  for (const needle of ['SAMPLE_SITUATION_BY_STATE', 'pick(', 'buildSlots', 'pushRecent', 'recentKey', 'recentLimit']) {
    assert.ok(src.includes(needle), `pagina sem ${needle}`)
  }
})

test('a pagina nao le nem grava dado do usuario: nenhum servico, hook de dados ou contexto', () => {
  const src = code(PAGE)
  assert.doesNotMatch(src, /from ['"]@\/services/, 'a pagina importa um servico')
  assert.doesNotMatch(src, /from ['"]@\/hooks\/use(?!ReducedMotion)/, 'a pagina importa um hook de dados')
  assert.doesNotMatch(src, /from ['"]@\/contexts/, 'a pagina importa um contexto de dados')
  assert.doesNotMatch(src, /localStorage|sessionStorage|updateVintemTone|updateSettings/, 'a pagina grava algo')
})

const BALLOON = 'src/components/vintem/VintemBalloon.tsx'
const INLINE_ROW = 'src/components/vintem/VintemInlineRow.tsx'
const WORLD = 'src/lib/vintem/world.ts'
const NEW_FILES = [PAGE, BALLOON, INLINE_ROW]

test('a pagina tem os cartoes Sete estados em 84px, No medidor e Balao de fala', () => {
  const src = code(PAGE)
  for (const title of ['Sete estados em 84px', 'No medidor', 'Balão de fala', 'Toque em Falar para ouvir uma fala']) {
    assert.ok(src.includes(title), `pagina sem "${title}"`)
  }
  assert.match(src, /<ArcGauge\b/, 'o medidor nao e o ArcGauge real')
  assert.match(src, /<VintemInlineRow\b/, 'a pagina nao usa a linha em linha')
  const order = ['Vintém grande', 'Controles', 'Sete estados em 84px', 'No medidor', 'Balão de fala'].map((t) => src.indexOf(t))
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'cartoes fora da ordem do UI-SPEC S7')
})

test('o balao e botao dispensavel, texto simples dentro de aria-hidden, sem corte nem HTML bruto', () => {
  const src = code(BALLOON)
  assert.match(src, /aria-label="Dispensar fala do Vintém"/, 'balao sem o aria-label do contrato')
  assert.match(src, /<span aria-hidden="true">\{text\}<\/span>/, 'o texto nao fica dentro de aria-hidden como filho React')
  assert.match(src, /type="button"/, 'o balao nao e um botao')
  assert.doesNotMatch(src, /line-clamp|truncate|text-ellipsis/, 'o balao trunca a fala')
  assert.doesNotMatch(src, /\bitalic\b/, 'o balao usa italico')
  assert.doesNotMatch(src, /dangerouslySetInnerHTML|innerHTML/, 'o balao injeta HTML')
  assert.match(src, /bg-\[var\(--vintem-balloon\)\]/, 'balao sem o token de fundo')
  assert.match(src, /text-\[var\(--vintem-balloon-fg\)\]/, 'balao sem o token de texto')
})

test('o pop do balao usa o laco unico (onFrame) e nao cria outro requestAnimationFrame nem estado por quadro', () => {
  const balloon = code(BALLOON)
  assert.match(balloon, /onFrame\(/, 'o balao nao usa onFrame')
  assert.match(balloon, /SPRING_PARAMS\.bub/, 'o balao nao usa a mola bub')
  assert.doesNotMatch(balloon, /useState/, 'o balao guarda estado por quadro')
  assert.match(code(WORLD), /export function onFrame\(/, 'world.ts nao exporta onFrame')
  const raf = [...listSrc('src')].filter((f) => /requestAnimationFrame\s*\(/.test(code(f)))
  const outside = raf.filter((f) => f !== WORLD && !/ArcGauge|useSectionReveal/.test(f))
  assert.deepEqual(outside, [], 'requestAnimationFrame novo fora de world.ts')
  assert.equal((code(WORLD).match(/requestAnimationFrame\s*\(/g) ?? []).length, 2, 'world.ts deve ter so o rAF do laco (inicio e continuacao)')
})

test('a linha em linha some sem texto e usa o Vintem de 48px', () => {
  const src = code(INLINE_ROW)
  assert.match(src, /size="inline"/, 'linha sem o Vintem de 48px')
  assert.match(src, /if \(!text\) return null/, 'a linha nao some sem texto')
  assert.match(src, /aria-label="Vintém, toque para ouvir uma fala"/, 'linha sem o aria-label do contrato')
  assert.match(src, /h-12 w-12/, 'o botao do Vintem nao tem 48x48')
})

test('as pecas novas seguem a escala tipografica e os alvos de toque', () => {
  assert.deepEqual(scaleProblems(NEW_FILES), [])
  assert.deepEqual(touchProblems(NEW_FILES), [])
})
