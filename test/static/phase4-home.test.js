// Guarda estatica da Home com o Vintem da Fase 4 (plano 04-12): slot no arco, balao, fala e regiao viva.
// Rodar: node --test test/static/phase4-home.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, listSrc, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const ARC = 'src/components/dashboard/ArcGauge.tsx'
const PAGE = 'src/pages/DashboardPage.tsx'
const CONTEXT = 'src/contexts/VintemContext.tsx'
const SLOT = 'src/components/vintem/VintemSlot.tsx'
const BALLOON = 'src/components/vintem/VintemHomeBalloon.tsx'
const HOOK = 'src/hooks/useHomeVintem.ts'
const APP = 'src/App.tsx'
const NEW_TSX = [CONTEXT, SLOT, BALLOON]

test('ArcGauge segue com o PiggyBank e nao importa nada do Vintem (o Vintem entra como children)', () => {
  const src = code(ARC)
  assert.match(src, /PiggyBank/, 'ArcGauge sem o PiggyBank padrao')
  assert.doesNotMatch(src, /vintem/i, 'ArcGauge editado para importar ou citar o Vintem')
})

test('DashboardPage: useHomeVintem antes do primeiro return, slot como filho do arco e balao', () => {
  const src = code(PAGE)
  assert.match(src, /VintemSlot/, 'pagina sem VintemSlot')
  assert.match(src, /VintemHomeBalloon/, 'pagina sem VintemHomeBalloon')
  const hook = src.indexOf('useHomeVintem(')
  const firstReturn = src.indexOf('return ')
  assert.ok(hook >= 0, 'pagina sem a chamada useHomeVintem(')
  assert.ok(hook < firstReturn, 'useHomeVintem( deve vir antes do primeiro return (regra dos hooks)')
  assert.match(src, /<ArcGauge[\s\S]*?>\s*<VintemSlot[\s\S]*?<\/ArcGauge>/, 'VintemSlot nao e filho do ArcGauge')
})

test('App: VintemProvider entre LimitAlertsProvider e LaunchProvider', () => {
  const src = code(APP)
  const alerts = src.indexOf('<LimitAlertsProvider>')
  const vintem = src.indexOf('<VintemProvider>')
  const launch = src.indexOf('<LaunchProvider>')
  assert.ok(alerts >= 0 && vintem > alerts && launch > vintem, 'ordem dos provedores incorreta')
})

test('VintemContext: regiao viva sempre montada, historico em sessionStorage e sem acaso nativo', () => {
  const src = code(CONTEXT)
  for (const needle of ['role="status"', 'aria-live="polite"', 'sessionStorage', 'vintem:recent:v1', 'pickPhrase', 'mulberry32']) {
    assert.ok(src.includes(needle), `${CONTEXT} sem "${needle}"`)
  }
  assert.doesNotMatch(src, /Math\.random/, 'acaso nativo no provedor')
  assert.doesNotMatch(src, /setTimeout/, 'temporizador no provedor (o balao nao some sozinho)')
})

test('VintemSlot: nome acessivel e caixa de 84 por 84', () => {
  const src = code(SLOT)
  assert.ok(src.includes('aria-label="Vintém, toque para ouvir uma fala"'), 'slot sem o nome acessivel')
  assert.ok(src.includes('h-[84px] w-[84px]'), 'slot sem a caixa de 84 px')
  assert.match(src, /data-vintem-state/, 'slot sem data-vintem-state')
})

test('VintemHomeBalloon: sem temporizador de sumico e com os atributos de teste', () => {
  const src = code(BALLOON)
  assert.doesNotMatch(src, /setTimeout|setInterval/, 'balao com temporizador de sumico')
  assert.match(src, /data-situation/)
  assert.match(src, /data-phrase/)
  assert.match(src, /onDismiss=\{dismiss\}/)
})

test('useHomeVintem: humor puro, toque por situationForTap e giro so sem movimento reduzido', () => {
  const src = code(HOOK)
  for (const needle of ['situationForTap', 'deriveVintemState', 'useReducedMotion']) {
    assert.ok(src.includes(needle), `${HOOK} sem "${needle}"`)
  }
  assert.match(src, /announce:\s*false/, 'a fala de entrada deve usar announce: false')
  assert.match(src, /announce:\s*true/, 'a fala por toque deve usar announce: true')
  assert.match(src, /!reduced\s*&&[\s\S]{0,80}handle/, 'o giro precisa ficar atras de !reduced')
  assert.doesNotMatch(src, /Math\.random/, 'acaso nativo no hook')
})

test('nenhum HTML bruto em src/components/vintem e as telas novas respeitam escala e alvo de toque', () => {
  for (const file of listSrc('src/components/vintem')) {
    assert.doesNotMatch(read(file), /innerHTML|dangerouslySetInnerHTML/, `${file}: HTML bruto`)
  }
  assert.deepEqual(scaleProblems(NEW_TSX), [])
  assert.deepEqual(touchProblems(NEW_TSX), [])
})
