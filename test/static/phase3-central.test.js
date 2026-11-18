// Guarda estatica da Central de Limites e Cartoes (CENT-01, CENT-02, LIM-02, LIM-03, IDEN-07):
// textos, ordem, somente exibicao, hash seguro e rota.
// Rodar: node --test test/static/phase3-central.test.js
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

const PAGE = 'src/pages/LimitsPage.tsx'
const APP = 'src/App.tsx'

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem ${text}`)
  }
}

test('LimitsPage: textos exatos da Central, dos estados e do esqueleto de Cartoes', () => {
  assertIncludes(PAGE, [
    'Central de Limites',
    'Passar do limite só avisa. Nada é bloqueado.',
    'Em dia',
    'Atenção',
    'Passaram',
    'Ajustar em Configurações',
    '/configuracoes#categorias',
    'Cartões',
    'em breve',
    'Fatura, fechamento e parcelas chegam junto com o suporte a cartão de crédito.',
    'Os dois juntos',
    'Somado',
    'Cada um no seu ciclo',
    'Carregando seus números',
    'Não foi possível carregar seus números.',
    'Tentar de novo',
  ])
})

test('LimitsPage: usa a BudgetView, a lista de limites, a rolagem do hash e o layout largo', () => {
  assertIncludes(PAGE, [
    'useCycleBudget',
    'LimitsList',
    'useHashReveal',
    'decodeURIComponent',
    'max-w-[960px]',
    '340px',
    'grid-cols-3',
  ])
  const src = code(PAGE)
  // A Central mostra todas as linhas e nao edita: sem teto de linhas nem link de edicao do cabecalho.
  assert.doesNotMatch(src, /\bmax=\{/, 'a Central nao limita as linhas (sem teto de 6)')
  assert.doesNotMatch(src, /\bshowEditLink\b/, 'a Central nao mostra o link de edicao do cabecalho')
  // O hash e lido so por decodeURIComponent dentro de try, sem estado.
  assert.match(src, /try\s*\{[\s\S]*decodeURIComponent\(hash\.slice\(1\)\)[\s\S]*\}\s*catch/, 'hash fora de try')
  assert.match(src, /useHashReveal\(undefined,\s*view !== null\)/, 'a rolagem tem de esperar a view carregar')
})

test('LimitsPage: ordem totais, limites, ajuste, cartoes e os dois juntos', () => {
  const src = code(PAGE)
  const page = src.slice(src.indexOf('export function LimitsPage'))
  const order = ['<Totals', '<LimitsList', 'Ajustar em Configurações', '<CardsSkeleton', '{together}']
  const idx = order.map((t) => page.indexOf(t))
  idx.forEach((i, n) => assert.ok(i >= 0, `LimitsPage sem ${order[n]}`))
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'secoes da Central fora de ordem')
})

test('LimitsPage: somente exibicao, sem edicao de limite nem formula de orcamento', () => {
  const src = code(PAGE)
  for (const bad of [
    'MoneyKeypad',
    'setCategoryLimit',
    'setLimit',
    'updatePersonConfig',
    'querySelector(',
    'safeCents -',
    'incomeCents -',
    'limitCents * 80',
    'safeToSpend',
    'perDayCents',
    'buildBudgetView',
    '<input',
    '<Input',
  ]) {
    assert.ok(!src.includes(bad), `${PAGE} contem ${bad}`)
  }
  // Sem gravacao: so a leitura da BudgetView e o link para Configuracoes.
  assert.doesNotMatch(src, /@\/services\//, 'a Central nao importa servicos de gravacao')
})

test('App.tsx registra a rota /limites com LimitsPage', () => {
  const src = code(APP)
  assert.match(src, /import\s*\{\s*LimitsPage\s*\}\s*from\s*'@\/pages\/LimitsPage'/)
  assert.match(src, /<Route\s+path="\/limites"\s+element=\{<LimitsPage\s*\/>\}/)
})

test('LimitsPage: sem HTML bruto, console, emoji, pesos 500 e 600, fontes fora da escala nem Ele e Ela fixos', () => {
  const src = code(PAGE)
  const rawHtml = 'dangerously' + 'SetInnerHTML'
  assert.ok(!src.includes(rawHtml), 'LimitsPage injeta HTML bruto (T-03-82)')
  assert.doesNotMatch(src, /\bconsole\./, 'LimitsPage usa console')
  assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, 'LimitsPage contem emoji (D-18)')
  for (const bad of ['font-medium', 'font-semibold', 'font-extrabold', 'text-sm', 'text-lg', 'text-xl', 'text-2xl']) {
    assert.ok(!src.includes(bad), `LimitsPage usa ${bad}`)
  }
  // Os nomes vem de settings.tabNames, nunca escritos no codigo.
  assert.doesNotMatch(src, /\b(Ele|Ela)\b/, 'LimitsPage escreve Ele ou Ela fixos')
  assertIncludes(PAGE, ['settings.tabNames.area1', 'settings.tabNames.area2'])
})
