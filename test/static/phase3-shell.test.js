// Guarda estatica da casca da Fase 3: dock, AppShell, rotas e remocao da navegacao antiga
// (IDEN-07, CENT-01, CENT-06, D-20, D-23).
// Rodar: node --test test/static/phase3-shell.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const exists = (f) => fs.existsSync(path.join(ROOT, f))
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const NAVRAIL = 'src/components/layout/NavRail.tsx'
const SHELL = 'src/components/layout/AppShell.tsx'
const APP = 'src/App.tsx'
const COUPLE = 'src/pages/CouplePage.tsx'

const REMOVED = [
  'src/components/layout/Header.tsx',
  'src/components/layout/BottomNav.tsx',
  'src/components/layout/MainLayout.tsx',
  'src/components/layout/NotificationsBell.tsx',
  'src/components/shared/AreaSelector.tsx',
]
const REMOVED_NAMES = ['Header', 'BottomNav', 'MainLayout', 'NotificationsBell', 'AreaSelector']

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem "${text}"`)
  }
}

function listSrc(dir) {
  const out = []
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) out.push(...listSrc(rel))
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(rel)
  }
  return out
}

test('NavRail traz os 9 destinos, cada um com nome e rota, e o contrato do dock', () => {
  const src = code(NAVRAIL)
  const destinations = [
    ['/', 'Início'],
    ['/transacoes', 'Transações'],
    ['/calendario', 'Calendário'],
    ['/limites', 'Central de limites'],
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
  for (const icon of ['House', 'Receipt', 'Calendar', 'Gauge', 'Repeat', 'Flag', 'ChartPie', 'Users', 'PiggyBank', 'Plus']) {
    assert.match(src, new RegExp(`\\b${icon}\\b`), `${NAVRAIL} sem o icone ${icon}`)
  }
  assert.doesNotMatch(src, /<span\b/, 'o dock nao tem rotulo de texto')
  assert.match(src, /setCurrentArea\('porquinho'\)/)
  assert.match(src, /setCurrentArea\(lastPerson\)/)
  assert.match(src, /passive:\s*true/, 'scroll e resize passivos')
})

test('AppShell compoe barra superior, faixa de somente leitura, conteudo, dock e sheet', () => {
  assertIncludes(SHELL, ['<TopBar', '<ReadOnlyBanner', '<NavRail', '<LaunchSheet', '112px', 'env(safe-area-inset-bottom)'])
  assert.match(code(SHELL), /export function AppShell\b/)
})

test('App.tsx usa AppShell na ordem dos providers e registra /casal', () => {
  const src = code(APP)
  assert.doesNotMatch(src, /\bMainLayout\b/, 'App.tsx voltou a usar MainLayout')
  assert.match(src, /<Route\s+path="\/casal"\s+element=\{<CouplePage\s*\/>\}/)
  assert.doesNotMatch(src, /path="\/limites"/, 'a rota /limites e do Plano 21')
  const order = ['<ToastProvider', '<ProtectedRoute', '<CycleProvider', '<LimitAlertsProvider', '<LaunchProvider', '<AppShell']
  let last = -1
  for (const tag of order) {
    const at = src.indexOf(tag)
    assert.ok(at >= 0, `App.tsx sem ${tag}`)
    assert.ok(at > last, `App.tsx: ${tag} fora da ordem (ToastProvider, ProtectedRoute, CycleProvider, LimitAlertsProvider, LaunchProvider, AppShell)`)
    last = at
  }
})

test('a navegacao antiga foi removida e nada em src a importa', () => {
  for (const file of REMOVED) {
    assert.equal(exists(file), false, `${file} deveria ter sido removido`)
  }
  const importRe = new RegExp(`from\\s+['"][^'"]*/(${REMOVED_NAMES.join('|')})['"]`)
  for (const file of listSrc('src')) {
    assert.doesNotMatch(code(file), importRe, `${file} importa a navegacao antiga`)
  }
})

test('CouplePage guarda o conteudo antigo do Dashboard e o aviso em breve', () => {
  assertIncludes(COUPLE, [
    'Casal',
    'O relatório do casal completo chega em breve.',
    'useTransactions',
    'useSavings',
    'recharts',
    'ResponsiveContainer',
    'MonthSelector',
  ])
  const src = code(COUPLE)
  assert.match(src, /export function CouplePage\b/)
  assert.doesNotMatch(src, /BankStatusNotice/)
})

test('os arquivos do plano nao usam HTML bruto, emoji, pesos 500 e 600 nem console', () => {
  for (const file of [NAVRAIL, SHELL, COUPLE]) {
    const src = code(file)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${file} usa HTML bruto`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${file} tem emoji`)
    assert.doesNotMatch(src, /\bfont-medium\b|\bfont-semibold\b/, `${file} usa peso 500 ou 600`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
  }
  // O comparativo movido do Dashboard guarda o labelStyle antigo; so os arquivos novos sao checados.
  for (const file of [NAVRAIL, SHELL]) {
    assert.doesNotMatch(code(file), /fontWeight:\s*(500|600)/, `${file} usa peso 500 ou 600`)
    assert.doesNotMatch(code(file), /\bEl[ea]\b/, `${file} escreve Ele ou Ela fixo (use settings.tabNames)`)
  }
})
