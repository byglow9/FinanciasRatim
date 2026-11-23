// Guarda estatica do autoteste por pixels do Vintem da Fase 4 (D-05b, D-05c, MASC-02, MASC-03, UI-SPEC S6).
// Rodar: node --test test/static/phase4-selftest.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, read, scaleProblems } from './helpers/phase3-1.js'

const SELFTEST = 'src/lib/vintem/selftest.ts'
const PAGE = 'src/pages/VintemTestPage.tsx'
const RUNNER = 'scripts/ux-audit/vintem.mjs'
const VIEW = 'src/lib/vintem/view.ts'
const MODEL = 'shared/core/vintemModel.js'
const COMPONENT = 'src/components/vintem/Vintem.tsx'

test('o autoteste nao tem cor em hexadecimal nem cor funcional literal: o fundo vem do token computado', () => {
  const src = code(SELFTEST)
  assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/, 'hex literal no autoteste')
  assert.doesNotMatch(src, /\b(rgb|rgba|hsl|hsla)\(\s*\d/, 'cor funcional literal no autoteste')
  assert.match(src, /hsl\(var\(--background\)\)/, 'o fundo da mascara nao e lido do token --background')
  assert.match(src, /hsl\(var\(--card\)\)/, 'o cartao nao e lido do token --card')
  assert.match(src, /getComputedStyle/, 'sem leitura de estilo computado')
})

test('o autoteste so mede o desenho: nao importa servico, hook de dados, contexto nem armazenamento', () => {
  const src = code(SELFTEST)
  for (const bad of ['@/services', '@/hooks', '@/contexts', 'firebase', 'localStorage', 'sessionStorage', 'fetch(', 'mockStorage']) {
    assert.ok(!src.includes(bad), `o autoteste usa ${bad}`)
  }
  for (const m of src.matchAll(/from '([^']+)'/g)) {
    assert.match(m[1], /^(react|react-dom|react-dom\/client|@\/components\/vintem\/Vintem|@\/lib\/vintem\/(view|geometry)|@shared\/core\/vintemStates\.js)$/, `import inesperado: ${m[1]}`)
  }
})

test('os limiares do autoteste sao constantes nomeadas (12, 50 e 70 por cento) e o 12 nao e relaxado', () => {
  const src = code(SELFTEST)
  assert.match(src, /const MIN_PAIR_DIFF_PCT = 12\b/, 'limiar de distincao diferente de 12')
  assert.match(src, /const MIN_TURN_WIDTH_RATIO = 0\.5\b/, 'largura minima do giro diferente de 50%')
  assert.match(src, /const MIN_TURN_AREA_RATIO = 0\.7\b/, 'area minima do giro diferente de 70%')
  assert.match(src, /const MIN_ACCESSORY_PIXELS = 12\b/, 'minimo de pixels de acessorio no perfil diferente de 12')
  assert.match(src, /const MASK_THRESHOLD = \d+/, 'limiar da mascara sem constante nomeada')
  assert.match(src, /MIN_PAIR_DIFF_PCT/, 'o limiar nao e usado')
})

test('o autoteste cobre pares, controle negativo, pontos fracos, giro, orelhas, acessorios no perfil e contraste', () => {
  const src = code(SELFTEST)
  assert.match(src, /isPointInFill/, 'sem a ancora das orelhas por isPointInFill')
  for (const text of ['controle negativo', 'neutro assimetrico', 'triste com altura', 'giro sem vazamento', 'giro sem colapso', 'orelhas ancoradas', 'acessorios de triste, atento, bravo e sonolento', 'contraste esclera sobre corpo', 'contraste sobrancelha sobre corpo']) {
    assert.ok(src.includes(text), `autoteste sem a verificacao "${text}"`)
  }
  assert.match(src, /SIZE_HERO|SIZE_INLINE/, 'sem as larguras de 84 e 48 px')
  assert.match(src, /const SIZE_HERO = 84\b/, 'largura de 84 px')
  assert.match(src, /const SIZE_INLINE = 48\b/, 'largura de 48 px')
  assert.match(src, /const TURN_STEPS = 20\b/, 'giro sem 21 angulos')
})

test('o autoteste fecha com a linha FALHAS n, conta as falhas com o prefixo FALHA: e liga window.__done', () => {
  const src = code(SELFTEST)
  assert.match(src, /FALHAS \$\{r\.fails\}/, 'sem a linha de fechamento FALHAS')
  assert.match(src, /`FALHA: /, 'sem o prefixo FALHA: nas linhas de falha')
  assert.match(src, /window\.__done = true/, 'sem window.__done')
  assert.match(src, /document\.title = /, 'sem ajuste do titulo')
  assert.match(src, /export function runSelfTest\(/, 'sem runSelfTest exportado')
})

test('a pagina de teste so importa o autoteste por import() dinamico atras do parametro test', () => {
  const src = code(PAGE)
  assert.match(src, /import\('@\/lib\/vintem\/selftest'\)/, 'sem o import dinamico do autoteste')
  assert.doesNotMatch(src, /^import .*selftest/m, 'import estatico do autoteste')
  assert.match(src, /\.has\('test'\)/, 'sem a leitura do parametro test')
  assert.match(src, /\{selfTest && <SelfTestCard \/>\}/, 'o cartao do autoteste nao esta atras do parametro')
  assert.match(src, /id="selftest"/, 'sem o pre#selftest')
  assert.match(src, /Autoteste/, 'sem o titulo do cartao')
  assert.deepEqual(scaleProblems([PAGE, SELFTEST]), [])
})

test('o modo congelado existe no modelo, na view e no componente', () => {
  assert.match(code(MODEL), /freezeAt\(/, 'sem freezeAt no modelo')
  assert.match(code(VIEW), /freeze\(o\)|freeze: \(/, 'sem freeze na view')
  assert.match(code(COMPONENT), /frozen\?: VintemFreeze/, 'sem a prop frozen no componente')
  assert.match(code(COMPONENT), /svg: \(\) => svgRef\.current/, 'o componente nao expoe o svg')
  assert.match(code(COMPONENT), /-profHead|-profBody/, 'sem ids do perfil para a ancora das orelhas')
})

test('o executor CDP aceita --test, le o autoteste e termina em FALHAS n', () => {
  const src = read(RUNNER)
  assert.match(src, /process\.argv\.includes\('--test'\)/, 'sem a flag --test')
  assert.match(src, /\/vintem-teste\?test&w=360/, 'sem a rota com ?test')
  assert.match(src, /window\.__done === true/, 'nao espera window.__done')
  assert.match(src, /startsWith\('FALHA:'\)/, 'nao conta as linhas FALHA:')
  assert.match(src, /console\.log\(`FALHAS \$\{failed\.length\}`\)/, 'o executor nao termina em FALHAS n')
  assert.match(src, /MutationObserver/, 'sem a verificacao de repouso por MutationObserver')
  assert.match(src, /Emulation\.setEmulatedMedia/, 'sem a midia de movimento reduzido emulada')
  assert.match(src, /prefers-reduced-motion/, 'sem a midia prefers-reduced-motion')
})
