// Guarda final e transversal da Fase 3: so confere o que atravessa os planos (rotas, nucleo,
// remocoes, formula so no nucleo, regras e indice, idioma, tema, fontes, emoji, escala
// tipografica e cobertura dos requisitos). O detalhe de cada tela fica nas guardas dos planos.
// Rodar: node --test test/static/phase3-final.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const exists = (f) => fs.existsSync(path.join(ROOT, f))
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
const code = (f) => strip(read(f))

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const srcFiles = (exts) =>
  walk(path.join(ROOT, 'src')).filter((f) => exts.some((e) => f.endsWith(e)))

const PHASE_DIR = '.planning/phases/03-limites-pode-gastar-e-central'

test('App.tsx registra as 10 rotas do app (a)', () => {
  const src = code('src/App.tsx')
  const paths = [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).sort()
  const expected = [
    '/',
    '/transacoes',
    '/contas-fixas',
    '/porquinho',
    '/metas',
    '/relatorios',
    '/configuracoes',
    '/calendario',
    '/limites',
    '/casal',
  ].sort()
  assert.deepEqual(paths, expected)
})

test('os cinco modulos novos do nucleo existem, cada um com o seu teste (b)', () => {
  for (const name of ['cycle', 'limits', 'budget', 'alerts', 'format']) {
    assert.ok(exists(`shared/core/${name}.js`), `shared/core/${name}.js ausente`)
    assert.ok(exists(`shared/core/${name}.test.js`), `shared/core/${name}.test.js ausente`)
  }
  assert.match(code('shared/core/bankStatus.js'), /export function shouldSuppressVerdict\b/)
  assert.match(code('shared/core/categories.js'), /export const CATEGORY_ICONS\b/)
})

test('navegacao antiga e BankStatusNotice foram removidos e ninguem os importa (c)', () => {
  const gone = [
    'src/components/layout/Header.tsx',
    'src/components/layout/BottomNav.tsx',
    'src/components/layout/MainLayout.tsx',
    'src/components/layout/NotificationsBell.tsx',
    'src/components/shared/AreaSelector.tsx',
    'src/components/dashboard/BankStatusNotice.tsx',
  ]
  for (const f of gone) assert.ok(!exists(f), `${f} deveria ter sido removido`)

  const files = srcFiles(['.ts', '.tsx'])
  assert.ok(files.length > 50, `varredura achou so ${files.length} arquivos`)
  const re = /from\s+['"][^'"]*\/(Header|BottomNav|MainLayout|NotificationsBell|AreaSelector|BankStatusNotice)['"]/
  const hits = files
    .filter((f) => re.test(strip(fs.readFileSync(f, 'utf8'))))
    .map((f) => path.relative(ROOT, f))
  assert.deepEqual(hits, [])
})

test('nenhuma formula de orcamento escrita a mao fora de shared/core (d)', () => {
  const files = srcFiles(['.ts', '.tsx'])
  assert.ok(files.length > 50, `varredura achou so ${files.length} arquivos`)
  const patterns = [/\bsafeCents\s*-/, /\bincomeCents\s*-/, /\blimitCents\s*\*\s*80\b/, /\*\s*100\s*>=/]
  const hits = []
  for (const f of files) {
    const src = strip(fs.readFileSync(f, 'utf8'))
    for (const re of patterns) if (re.test(src)) hits.push(`${path.relative(ROOT, f)} ${re}`)
  }
  assert.deepEqual(hits, [])
})

test('regras e indice de limitAlerts e o servico existem (e)', () => {
  const rules = code('firestore.rules')
  const collections = rules.match(/function clientCollections\(\)\s*\{[\s\S]*?\}/)
  assert.ok(collections, 'clientCollections() ausente em firestore.rules')
  assert.match(collections[0], /'limitAlerts'/)
  assert.match(rules, /col in \[[^\]]*'limitAlerts'[^\]]*\]\s*&&\s*resource == null/)

  const idx = JSON.parse(read('firestore.indexes.json')).indexes.filter(
    (i) => i.collectionGroup === 'limitAlerts',
  )
  assert.equal(idx.length, 1, 'deve haver exatamente um indice de limitAlerts')
  assert.equal(idx[0].fields[0].fieldPath, 'ownerId', 'ownerId deve ser o primeiro campo')
  assert.ok(exists('src/services/limitAlerts.service.ts'), 'servico limitAlerts ausente')
})

test('idioma pt-BR, sem fonte do Google e tema escuro nunca aplicado (f)', () => {
  const html = read('index.html')
  assert.match(html, /<html[^>]*\blang="pt-BR"/)
  const files = [path.join(ROOT, 'index.html'), ...srcFiles(['.ts', '.tsx', '.css'])]
  const google = /fonts\.googleapis\.com|fonts\.gstatic\.com/
  assert.deepEqual(
    files.filter((f) => google.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f)),
    [],
  )
  const area = code('src/contexts/AreaContext.tsx')
  assert.doesNotMatch(area, /classList\.(add|toggle)\(\s*['"]dark['"]/)
  assert.doesNotMatch(html, /classList\.(add|toggle)\(\s*['"]dark['"]/)
})

test('package.json tem as duas fontes e nenhum runner de interface (g, PR-16)', () => {
  const pkg = JSON.parse(read('package.json'))
  const all = { ...pkg.dependencies, ...pkg.devDependencies }
  assert.ok(pkg.dependencies['@fontsource-variable/sora'], 'Sora ausente')
  assert.ok(pkg.dependencies['@fontsource-variable/bricolage-grotesque'], 'Bricolage ausente')
  for (const name of ['vitest', 'jsdom', '@testing-library/react']) {
    assert.equal(all[name], undefined, `${name} nao deve ser instalado (PR-16)`)
  }
})

// Arquivos criados ou reescritos pela fase. Ficam de fora, de proposito:
// - src/pages/CouplePage.tsx: conteudo legado do Dashboard apenas realocado (03-18); a
//   normalizacao tipografica dele e IDEN-06 (Fase 5).
// - src/components/ui/dialog.tsx: so ganhou acessibilidade; DialogDescription legado segue
//   com a escala antiga ate IDEN-06.
const NEW_AND_REWRITTEN = [
  // primitivos restilizados e novos
  ...['progress', 'card', 'button', 'badge', 'alert', 'input', 'label', 'select', 'sheet', 'toast', 'notice', 'chip', 'icon-circle', 'collapsible', 'switch', 'segmented-control', 'money-keypad'].map(
    (n) => `src/components/ui/${n}.tsx`,
  ),
  'src/lib/rhythm.ts',
  'src/lib/categoryIcons.ts',
  'src/lib/cycleData.ts',
  // Home
  ...['ArcGauge', 'RhythmPill', 'MonthInOneCard', 'CentralSummaryCard', 'FixedMonthCard', 'ShortcutRow', 'ReadOnlyBanner', 'StaleNotice', 'LimitAlertNotice', 'HomeSections'].map(
    (n) => `src/components/dashboard/${n}.tsx`,
  ),
  'src/components/limits/LimitRow.tsx',
  'src/components/launcher/CategoryPicker.tsx',
  'src/components/launcher/LaunchSheet.tsx',
  // casca
  ...['AlertsBell', 'CycleSelector', 'ProfileSwitcher', 'TopBar', 'NavRail', 'AppShell'].map(
    (n) => `src/components/layout/${n}.tsx`,
  ),
  // Configuracoes
  ...['SettingsCard', 'FieldRow', 'DayPicker', 'CycleIncomeCard', 'AppearanceCard', 'NotificationsCard', 'AccountsSkeletonCard', 'IconPicker', 'CategoryEditorSheet', 'CategoriesCard'].map(
    (n) => `src/components/settings/${n}.tsx`,
  ),
  // paginas, contextos e hooks
  'src/pages/DashboardPage.tsx',
  'src/pages/LimitsPage.tsx',
  'src/pages/SettingsPage.tsx',
  'src/contexts/CycleContext.tsx',
  'src/contexts/LimitAlertsContext.tsx',
  'src/contexts/LaunchContext.tsx',
  'src/hooks/useBankFreshness.ts',
  'src/hooks/useCycleBudget.ts',
  'src/hooks/useReadOnly.ts',
  'src/hooks/useSectionReveal.ts',
]

test('arquivos novos e reescritos respeitam a escala 12/16/28/56 e pesos 400/700 (h)', () => {
  assert.ok(NEW_AND_REWRITTEN.length > 55, 'a lista de arquivos da fase encolheu')
  const missing = NEW_AND_REWRITTEN.filter((f) => !exists(f))
  assert.deepEqual(missing, [], 'arquivo da lista nao existe')

  const emoji = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|️/u
  const offScale = /\btext-(sm|lg|xl|[2-9]xl)\b/
  const weights = /\bfont-(medium|semibold|extrabold|light|thin|black)\b/
  const inlineWeight = /fontWeight\s*:\s*['"]?(500|600|800|900|medium|semibold)/
  const rawHtml = /dangerouslySetInnerHTML/
  const problems = []
  for (const f of NEW_AND_REWRITTEN) {
    const src = code(f)
    if (offScale.test(src)) problems.push(`${f}: tamanho Tailwind fora da escala`)
    if (weights.test(src)) problems.push(`${f}: peso fora de 400 e 700`)
    if (inlineWeight.test(src)) problems.push(`${f}: fontWeight fora de 400 e 700`)
    if (rawHtml.test(src)) problems.push(`${f}: HTML bruto`)
    if (emoji.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) problems.push(`${f}: emoji`)
    for (const m of src.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)) {
      if (!['12', '16', '28', '56'].includes(m[1])) problems.push(`${f}: text-[${m[1]}px] fora da escala`)
    }
  }
  assert.deepEqual(problems, [])
})

test('os 15 requisitos da fase aparecem em algum plano anterior ao 23 (i)', () => {
  const dir = path.join(ROOT, PHASE_DIR)
  const plans = fs
    .readdirSync(dir)
    .filter((n) => /^03-\d\d-PLAN\.md$/.test(n) && n !== '03-23-PLAN.md')
  assert.ok(plans.length >= 20, `achou so ${plans.length} planos`)
  const covered = new Set()
  for (const name of plans) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8')
    const front = text.match(/^---\n([\s\S]*?)\n---/)
    assert.ok(front, `${name} sem frontmatter`)
    const inline = front[1].match(/^requirements:\s*\[([^\]]*)\]/m)
    if (inline) inline[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => covered.add(id))
  }
  const required = [
    ...Array.from({ length: 10 }, (_, i) => `LIM-${String(i + 1).padStart(2, '0')}`),
    'CENT-01',
    'CENT-02',
    'CENT-05',
    'CENT-06',
    'IDEN-07',
  ]
  assert.equal(required.length, 15)
  assert.deepEqual(
    required.filter((id) => !covered.has(id)),
    [],
  )
})
