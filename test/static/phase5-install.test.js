// Guarda estatica dos passos de adicionar o Coinc a tela inicial (IDEN-03, D-11, D-12, P-02, P-06).
// Rodar: node --test test/static/phase5-install.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, exists, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const STEPS = 'src/components/onboarding/InstallSteps.tsx'
// Plano 05-23 (D-11, D-22): a cena de adicionar do onboarding e a casca tambem nunca dizem instalar.
const SCENE = 'src/components/onboarding/InstallScene.tsx'
const SHELL = 'src/components/onboarding/Onboarding.tsx'
const CARD = 'src/components/settings/AppCard.tsx'
const PAGE = 'src/pages/SettingsPage.tsx'
const AUDIT = 'scripts/ux-audit/install.mjs'

test('InstallSteps usa usePwaInstall e o botao Adicionar agora so existe com canPrompt', () => {
  const src = code(STEPS)
  assert.match(src, /usePwaInstall\(\)/, 'InstallSteps sem usePwaInstall()')
  assert.match(src, /\{canPrompt \? \(\s*<Button[\s\S]*?Adicionar agora/, 'Adicionar agora fora da condicao canPrompt')
  assert.match(src, /Download/, 'botao sem o icone Download')
  assert.match(src, /outcome === 'accepted'/, 'so o resultado aceito muda a tela')
})

test('InstallSteps tem os seis passos do contrato e o texto de ja e app', () => {
  const src = code(STEPS)
  const fragments = [
    // Android
    'Toque no ',
    'menu',
    ' no canto superior direito do Chrome.',
    'Escolha Adicionar à tela inicial (ou Instalar app).',
    'Confirme em Adicionar. O ícone do Coinc aparece na sua tela.',
    // iPhone
    'Abra o Coinc no Safari. Em outros navegadores essa opção pode não aparecer.',
    'Toque em ',
    'Compartilhar',
    ' na barra do Safari.',
    'Role e escolha ',
    'Adicionar à Tela de Início',
    ', depois toque em Adicionar.',
    // estados
    'Adicionado. Procure o ícone do Coinc na tela inicial.',
    'Você já está usando o Coinc como app.',
    'Adicionar agora',
  ]
  for (const text of fragments) assert.ok(src.includes(`'${text}'`) || src.includes(`>${text}`) || src.includes(`${text}\n`), `InstallSteps sem "${text}"`)
  for (const icon of ['EllipsisVertical', 'Share', 'SquarePlus', 'CircleCheck']) {
    assert.match(src, new RegExp(`\\b${icon}\\b`), `InstallSteps sem o icone ${icon}`)
  }
})

test('InstallSteps tem seletor Aparelho, lista ordenada e icones decorativos', () => {
  const src = code(STEPS)
  assert.match(src, /<SegmentedControl[\s\S]*?ariaLabel="Aparelho"/, 'seletor sem ariaLabel="Aparelho"')
  assert.match(src, /label: 'Android'/)
  assert.match(src, /label: 'iPhone'/)
  assert.match(src, /<ol\b/, 'passos fora de uma lista ordenada')
  assert.match(src, /aria-hidden="true"/, 'icones sem aria-hidden')
  assert.match(src, /platform/, 'padrao do seletor nao vem da plataforma')
})

test('o texto da interface nunca diz instalar fora da citacao do menu do Chrome', () => {
  for (const f of [STEPS, CARD, SCENE, SHELL]) {
    const src = code(f).replaceAll('Instalar app', '')
    assert.doesNotMatch(src, /instalar/i, `${f}: "instalar" fora da citacao do menu do Chrome`)
    assert.doesNotMatch(src, /\binstale\b/i, `${f}: "Instale"`)
    assert.doesNotMatch(src, /instalad[oa]/i, `${f}: "instalado"`)
  }
})

test('AppCard tem a ancora, o icone, os textos do contrato e a folha', () => {
  const src = code(CARD)
  assert.match(src, /<SettingsCard id="aplicativo"/, 'AppCard sem id="aplicativo"')
  assert.match(src, /\bSmartphone\b/, 'AppCard sem o icone Smartphone')
  for (const text of [
    'Aplicativo',
    'Coinc na tela inicial',
    'Adicionar à tela inicial',
    'Passo a passo para Android e iPhone',
    'Já está na tela inicial',
  ]) {
    assert.ok(src.includes(text), `AppCard sem "${text}"`)
  }
  assert.match(src, /<Sheet[\s\S]*?title="Adicionar à tela inicial"/, 'AppCard sem a folha')
  assert.match(src, /<InstallSteps\s*\/>/, 'folha sem InstallSteps')
  assert.match(src, /min-h-14/, 'linha sem min-h-14')
  // A segunda linha (Rever a apresentacao) nasceu no 05-14 e tem guarda propria em phase5-onboarding.test.js.
  assert.doesNotMatch(src, /useArea|readOnly/, 'o cartao nao depende de area nem de somente leitura')
})

test('SettingsPage: AppCard depois de Notificacoes e antes de Sair da conta, ordem anterior intacta', () => {
  const src = code(PAGE)
  const order = [
    '<CycleIncomeCard',
    '<CategoriesCard',
    '<AccountsCard',
    '<BankConnections',
    '<AppearanceCard',
    '<VintemToneCard',
    '<NotificationsCard',
    '<AppCard',
    'Sair da conta',
  ].map((tag) => {
    const at = src.indexOf(tag)
    assert.ok(at >= 0, `SettingsPage sem ${tag}`)
    return at
  })
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'cartoes fora da ordem')
  assert.ok(src.includes('Ciclo, categorias, bancos e aparência'), 'subtitulo do cabecalho mudou')
})

test('HTML bruto, escala, emoji e alvos de toque limpos nos arquivos novos', () => {
  assert.deepEqual(scaleProblems([STEPS, CARD, SCENE]), [])
  assert.deepEqual(touchProblems([STEPS, CARD, SCENE]), [])
  for (const f of [STEPS, CARD, SCENE]) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b/, `${f}: hex literal`)
  }
})
test('o executor install.mjs existe e cobre os sete cenarios', () => {
  assert.ok(exists(AUDIT), 'scripts/ux-audit/install.mjs ausente')
  const src = read(AUDIT)
  assert.match(src, /5195/, 'porta 5195')
  assert.match(src, /FALHAS \$\{/, 'sem a linha final FALHAS n')
  const scenarios = [
    ['1 folha abre pelo cartao', /cenario 1/],
    ['2 seletor e passos', /cenario 2/],
    ['3 padrao por agente de usuario', /cenario 3/],
    ['4 evento de adicao simulado', /cenario 4/],
    ['5 standalone emulado', /cenario 5/],
    ['6 Esc fecha e devolve o foco', /cenario 6/],
    ['7 sem rolagem horizontal e alvos de 43,5 px', /cenario 7/],
  ]
  for (const [label, re] of scenarios) assert.match(src, re, `executor sem o cenario ${label}`)
  for (const needle of ['beforeinstallprompt', 'setUserAgentOverride', 'setEmulatedMedia', 'display-mode', 'Escape', '43.5']) {
    assert.ok(src.includes(needle), `executor sem ${needle}`)
  }
})
