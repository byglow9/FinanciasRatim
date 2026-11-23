// Guarda estatica dos estados vazios e de erro com o Vintem calado (D-16, UI-SPEC S5, P-02), parte 1:
// Home, Limites do mes, Transacoes, Calendario e Contas Fixas. Rodar: node --test test/static/phase4-empty.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const DASH = 'src/pages/DashboardPage.tsx'
const LIMITS = 'src/components/limits/LimitRow.tsx'
const TX = 'src/pages/TransactionsPage.tsx'
const CAL = 'src/pages/CalendarPage.tsx'
const FIXED = 'src/pages/FixedExpensesPage.tsx'
const FIXED_CARD = 'src/components/dashboard/FixedMonthCard.tsx'
const EMPTY = 'src/components/vintem/VintemEmpty.tsx'
const EDITED = [DASH, LIMITS, TX, CAL, FIXED]

const IMPORT = /import \{ VintemEmpty \} from '@\/components\/vintem\/VintemEmpty'/

/** Pose da peca montada imediatamente acima do titulo de vazio `<p className="text-base font-bold">texto`. */
function emptyPose(src, text) {
  const at = src.indexOf(`>${text}</p>`)
  assert.ok(at >= 0, `texto de vazio ausente: ${text}`)
  const before = src.slice(Math.max(0, at - 160), at)
  const m = /<VintemEmpty pose="(\w+)" \/>\s*<p className="text-base font-bold"$/.exec(before)
  return m ? m[1] : null
}

/** Pose da peca montada imediatamente acima do Notice de erro com o titulo `title`. */
function errorPose(src, title) {
  const at = src.indexOf(`title="${title}"`)
  assert.ok(at >= 0, `aviso de erro ausente: ${title}`)
  const before = src.slice(Math.max(0, at - 200), at)
  const m = /<VintemEmpty pose="(\w+)" \/>\s*<Notice\s+tone="danger"\s+(?:icon=\{CircleAlert\}\s+)?$/.exec(before)
  return m ? m[1] : null
}

test('cada arquivo editado importa VintemEmpty', () => {
  for (const f of EDITED) assert.match(code(f), IMPORT, `${f} sem o import de VintemEmpty`)
})

test('os vazios montam a peca neutra acima do texto de origem', () => {
  const cases = [
    [LIMITS, 'Nenhum limite definido'],
    [TX, 'Nenhuma transação neste ciclo'],
    [TX, 'Nada encontrado'],
    [CAL, 'Nada agendado neste ciclo'],
    [FIXED, 'Nenhuma conta fixa neste ciclo'],
  ]
  for (const [file, text] of cases) assert.equal(emptyPose(code(file), text), 'neutro', `${file}: "${text}"`)
})

test('os erros de carga montam a peca surpresa acima do aviso, com o texto e o botao de origem', () => {
  const cases = [
    [DASH, 'Não foi possível carregar suas configurações.'],
    [DASH, 'Não foi possível carregar seus números.'],
    [TX, 'Não foi possível carregar as transações.'],
    [CAL, 'Não foi possível carregar o calendário.'],
    [FIXED, 'Não foi possível carregar as contas fixas.'],
  ]
  for (const [file, title] of cases) {
    const src = code(file)
    assert.equal(errorPose(src, title), 'surpreso', `${file}: "${title}"`)
    assert.ok(src.includes('Tentar de novo'), `${file} sem o botao "Tentar de novo"`)
    assert.ok(src.includes('Confira a conexão e tente de novo.'), `${file} sem o texto do aviso`)
  }
})

test('os textos dos estados continuam presentes', () => {
  const texts = [
    [DASH, ['Falta saber quanto entra', 'Informar renda esperada']],
    [LIMITS, ['Nenhum limite definido', 'Definir limites']],
    [TX, ['Nenhuma transação neste ciclo', 'Nada encontrado', 'Novo lançamento', 'Limpar filtros']],
    [CAL, ['Nada agendado neste ciclo', 'Adicionar evento', 'Adicionar post-it']],
    [FIXED, ['Nenhuma conta fixa neste ciclo', 'Cadastrar a primeira', 'Nenhuma conta pendente', 'Nenhuma conta paga ainda']],
  ]
  for (const [file, list] of texts) {
    const src = code(file)
    for (const t of list) assert.ok(src.includes(t), `${file} sem "${t}"`)
  }
})

test('limite de dois Vintens por tela: hero sem renda, cartao de contas fixas e vazio por filtro ficam sem a peca', () => {
  const dash = code(DASH)
  const start = dash.indexOf('view && noIncome &&')
  const end = dash.indexOf('view && !noIncome &&')
  assert.ok(start >= 0 && end > start, 'bloco "Falta saber quanto entra" nao encontrado')
  const hero = dash.slice(start, end)
  assert.ok(hero.includes('Falta saber quanto entra'))
  assert.doesNotMatch(hero, /VintemEmpty/, 'o hero sem renda nao leva segundo Vintem')

  assert.doesNotMatch(code(FIXED_CARD), /VintemEmpty/, 'o cartao de contas fixas da Home nao leva Vintem')

  const fixed = code(FIXED)
  const filterAt = fixed.indexOf("filter === 'pending' ? 'Nenhuma conta pendente'")
  assert.ok(filterAt >= 0, 'vazio por filtro nao encontrado')
  assert.doesNotMatch(fixed.slice(filterAt - 120, filterAt + 400), /VintemEmpty/, 'o vazio por filtro nao leva Vintem')
})

test('nenhum estado usa a pose triste (erro de rede nao e veredito sobre o dinheiro)', () => {
  for (const f of EDITED) assert.doesNotMatch(code(f), /VintemEmpty[^>]*triste/, `${f} com VintemEmpty triste`)
  for (const f of EDITED) {
    const poses = [...code(f).matchAll(/<VintemEmpty pose="(\w+)"/g)].map((m) => m[1])
    for (const p of poses) assert.ok(['neutro', 'surpreso'].includes(p), `${f}: pose inesperada ${p}`)
  }
})

test('VintemEmpty e calado: sem useVintem, sem botao e sem fala', () => {
  const src = code(EMPTY)
  assert.doesNotMatch(src, /useVintem/, 'VintemEmpty nao pode consultar o provedor')
  assert.doesNotMatch(src, /<button|onTap|onClick|tabIndex|speak\(/, 'VintemEmpty nao recebe toque nem fala')
  assert.match(src, /aria-hidden="true"/, 'VintemEmpty precisa ser decorativo')
})

test('escala tipografica e alvos de toque limpos nos cinco arquivos editados', () => {
  assert.deepEqual(scaleProblems(EDITED), [])
  assert.deepEqual(touchProblems(EDITED), [])
})
