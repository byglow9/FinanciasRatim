// Guarda estatica da Home (LIM-02 a LIM-06, LIM-08, LIM-09, CENT-01, CENT-06): composicao, ordem,
// textos exatos, regiao viva e ausencia de formula de orcamento na pagina.
// Rodar: node --test test/static/phase3-home.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const HOME = 'src/pages/DashboardPage.tsx'

test('Home: importa e usa os hooks e componentes da composicao', () => {
  const src = code(HOME)
  for (const name of [
    'useCycleBudget',
    'ArcGauge',
    'RhythmPill',
    'ShortcutRow',
    'HomeSections',
    'StaleNotice',
    'LimitAlertNotice',
    'useLaunch',
    'useSectionReveal',
  ]) {
    assert.match(src, new RegExp(`import[^\\n]*\\b${name}\\b`), `Home nao importa ${name}`)
    assert.ok(src.split(name).length > 2, `Home importa ${name} mas nao usa`)
  }
})

test('Home: ordem de cima para baixo (aviso velho, aviso de limite, hero, banco atualizado, atalhos, secoes)', () => {
  const src = code(HOME)
  const order = [
    '<StaleNotice placement="top"',
    '<LimitAlertNotice',
    '<ArcGauge',
    '<StaleNotice placement="below"',
    '<ShortcutRow',
    '<HomeSections',
  ]
  const idx = order.map((t) => src.indexOf(t))
  idx.forEach((i, n) => assert.ok(i >= 0, `Home sem ${order[n]}`))
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'blocos da Home fora da ordem')
})

test('Home: textos exatos, regiao viva e acoes dos atalhos', () => {
  const src = code(HOME)
  for (const text of [
    'Pode gastar',
    'Sobrou no ciclo',
    'Passou no ciclo',
    'Falta saber quanto entra',
    'Informe sua renda esperada para ver quanto pode gastar neste ciclo.',
    'Informar renda esperada',
    '/configuracoes#ciclo',
    'Sem folga neste ciclo',
    'Carregando seus números',
    'Não foi possível carregar seus números.',
    'Confira a conexão e tente de novo.',
    'Tentar de novo',
    'Ciclo encerrado em',
    'aria-live="polite"',
    "reveal('fx')",
    "reveal('lm')",
    "open('gasto')",
    "open('receita')",
  ]) {
    assert.ok(src.includes(text), `Home sem ${text}`)
  }
})

test('Home: so exibe a BudgetView (sem Recharts, useTransactions nem formula escrita a mao)', () => {
  const src = code(HOME)
  for (const bad of [
    'recharts',
    'useTransactions',
    'BankStatusNotice',
    'markAsPaid',
    'safeCents -',
    'incomeCents -',
    'limitCents * 80',
    'safeToSpend',
    'RHYTHM_CUTS',
  ]) {
    assert.ok(!src.includes(bad), `Home contem ${bad}`)
  }
  assert.doesNotMatch(src, /\bconsole\./, 'Home usa console (T-03-95)')
})

test('Home: carregando e erro nao mostram numero e o Porquinho nao consulta o ciclo', () => {
  const src = code(HOME)
  // Sem view nao ha valor: o hero so renderiza o valor quando a view existe.
  assert.match(src, /\{view && !noIncome && \(/)
  assert.ok(!src.includes('R$ 0'), 'Home escreve R$ 0')
  assert.match(src, /enabled:\s*!isPiggy/)
  // O erro retorna antes de HomeSections e de qualquer numero.
  assert.ok(src.indexOf('if (error)') < src.indexOf('<HomeSections'), 'erro nao corta a pagina antes das secoes')
})

test('Home: BankStatusNotice foi removido e HomeSections existe', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/components/dashboard/BankStatusNotice.tsx')))
  assert.ok(fs.existsSync(path.join(ROOT, 'src/components/dashboard/HomeSections.tsx')))
})

test('Home: sem HTML bruto, emoji, pesos 500 e 600 nem Ele ou Ela fixos', () => {
  const src = code(HOME)
  const rawHtml = 'dangerously' + 'SetInnerHTML'
  assert.ok(!src.includes(rawHtml), 'Home injeta HTML bruto')
  assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, 'Home contem emoji')
  for (const bad of ['font-medium', 'font-semibold', 'font-extrabold', 'text-sm', 'text-lg', 'text-xl', 'text-2xl']) {
    assert.ok(!src.includes(bad), `Home usa ${bad}`)
  }
  assert.doesNotMatch(src, /\bEl[ea]\b/, 'Home escreve Ele ou Ela fixo (use settings.tabNames)')
})
