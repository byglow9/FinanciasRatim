// Guarda estatica dos cartoes, atalhos e avisos da Home e da Central (LIM-05, LIM-06, LIM-07,
// LIM-08, LIM-09, CENT-01, CENT-06, IDEN-07): copia, acessibilidade e regras de apresentacao.
// Rodar: node --test test/static/phase3-home-cards.test.js
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

const MONTH = 'src/components/dashboard/MonthInOneCard.tsx'
const FIXED = 'src/components/dashboard/FixedMonthCard.tsx'
const SHORTCUTS = 'src/components/dashboard/ShortcutRow.tsx'
const READONLY = 'src/components/dashboard/ReadOnlyBanner.tsx'
const STALE = 'src/components/dashboard/StaleNotice.tsx'
const ALERT = 'src/components/dashboard/LimitAlertNotice.tsx'
const OLD_NOTICE = 'src/components/dashboard/BankStatusNotice.tsx'

// Componentes de apresentacao deste plano.
const FILES = [MONTH, FIXED, SHORTCUTS, READONLY, STALE, ALERT]

function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem ${text}`)
  }
}

test('MonthInOneCard: titulo, linhas, estimativa e link sem renda', () => {
  assertIncludes(MONTH, [
    'O mês em uma conta',
    'estimativa',
    'sobra.projected',
    'Defina a renda',
    '/configuracoes#ciclo',
    'já entrou',
    'esperado',
    'de ${fixos.totalCount} pagos',
    'tudo que não é fixo',
    'projeção até',
    'resultado do ciclo',
    'text-danger-ink',
    'text-ok-ink',
    'text-[28px]',
    'font-display',
    'min-h-11',
  ])
})

test('FixedMonthCard: ancora fx, titulo focavel, marcar pago e vazio', () => {
  assertIncludes(FIXED, [
    'id="fx"',
    'data-section-title',
    'tabIndex={-1}',
    'Contas fixas do mês',
    'Marcar pago',
    'pago',
    'Gerenciar contas fixas',
    'Ver todas (',
    'Nenhuma conta fixa neste ciclo',
    'Cadastre aluguel, internet e outras contas que se repetem todo mês.',
    'Nova conta fixa',
    'min-w-[120px]',
    'h-11',
    'disabled={readOnly}',
    'onMarkPaid(item)',
  ])
})

test('ShortcutRow: quatro atalhos, somente leitura aria-disabled e alvo de 80', () => {
  assertIncludes(SHORTCUTS, [
    'Novo gasto',
    'Nova receita',
    'Contas fixas',
    'Limites',
    'aria-disabled',
    'min-h-20',
    'h-14 w-14',
    'rounded-full',
    'grid-cols-4',
    'text-danger-ink',
    'text-ok-ink',
  ])
  // Em somente leitura o clique continua chegando ao handler (o toast vem da guarda do lancamento).
  assert.doesNotMatch(code(SHORTCUTS), /(?<!aria-)disabled=\{/, 'atalho usa disabled nativo e nao mostraria o toast')
})

test('ReadOnlyBanner: perfil visto em somente leitura pelo useReadOnly', () => {
  assertIncludes(READONLY, [
    'useReadOnly',
    'somente leitura',
    'Perfil de ',
    'Você vê tudo, mas não lança nem edita.',
  ])
})

test('StaleNotice: textos por gravidade, link para Bancos e regra de supressao do nucleo', () => {
  assertIncludes(STALE, [
    'useBankFreshness',
    'placement',
    'Consentimento do banco vencido',
    'O banco precisa ser reconectado',
    'Dados do banco desatualizados',
    'Sem registro de atualização',
    'O consentimento do banco vence em',
    'Abrir Bancos conectados',
    '/configuracoes#bancos',
    'Banco atualizado',
    'formatDistanceStrict',
    'min-h-11',
  ])
  // Ordem de gravidade: vencido, reconexao, dados velhos, perto de vencer.
  const src = code(STALE)
  const order = ['Consentimento do banco vencido', 'O banco precisa ser reconectado', 'Dados do banco desatualizados', 'O consentimento do banco vence em']
  const idx = order.map((t) => src.indexOf(t))
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'StaleNotice fora da ordem de gravidade')
})

test('LimitAlertNotice: so avisa, dispensa com 44px e abre o sino com varios avisos', () => {
  assertIncludes(ALERT, [
    'useLimitAlerts',
    'topAlert',
    'Dispensar aviso',
    'Ver aviso',
    'limitHref(top.categoryId)',
    'coinki:open-alerts',
    'passou de 100% do limite',
    'chegou a 80% do limite',
    'markRead',
  ])
})

test('BankStatusNotice foi removido pelo Plano 22: a Home usa StaleNotice', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, OLD_NOTICE)), 'BankStatusNotice.tsx deveria ter sido removido')
})

test('Cartoes da Home: escala tipografica, pesos, sem HTML bruto, emoji nem console', () => {
  const rawHtml = 'dangerously' + 'SetInnerHTML'
  for (const f of FILES) {
    const src = code(f)
    for (const bad of ['text-sm', 'text-lg', 'text-xl', 'text-2xl', 'font-medium', 'font-semibold', 'font-extrabold']) {
      assert.ok(!src.includes(bad), `${f} usa ${bad}`)
    }
    assert.ok(!src.includes(rawHtml), `${f} injeta HTML bruto (T-03-91)`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, `${f} contem emoji`)
    assert.doesNotMatch(src, /\bconsole\./, `${f} usa console (T-03-93)`)
    assert.doesNotMatch(src, /text-white/, `${f} usa texto branco`)
  }
})

test('Cartoes da Home: nenhuma formula de orcamento no componente', () => {
  for (const f of FILES) {
    const src = code(f)
    for (const bad of ['incomeCents -', 'safeCents -', 'limitCents * 80', 'safeToSpend', 'perDayCents', 'RHYTHM_CUTS', 'spendByCategory']) {
      assert.ok(!src.includes(bad), `${f} calcula ${bad}`)
    }
  }
})
