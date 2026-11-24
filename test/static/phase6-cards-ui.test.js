// Guarda estatica da interface do cartao (06-10: CARD-02, CENT-03, CARD-05, CARD-08, D-05, D-10).
// Rodar: node --test test/static/phase6-cards-ui.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Sem comentarios: texto explicativo nao pode dar falso positivo nem falso negativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const CARD_DIR = 'src/components/cards'
const CARD_COMPONENTS = fs
  .readdirSync(path.join(ROOT, CARD_DIR))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => `${CARD_DIR}/${f}`)
const PAGE = 'src/pages/CardsPage.tsx'
const HOME = 'src/components/dashboard/HomeCardSummary.tsx'
const SECTIONS = 'src/components/dashboard/HomeSections.tsx'
const LABELS = 'src/lib/cardLabels.ts'
const UI_FILES = [PAGE, HOME, LABELS, ...CARD_COMPONENTS]

// Emoji e pictogramas (inclui seletor de variacao e juntador de emoji).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u

test('os cinco blocos de cartao existem e a pagina os monta', () => {
  for (const f of ['BillStatusChip', 'BillSummary', 'BillHistoryList', 'UpcomingBills', 'CardLimitCard']) {
    assert.ok(CARD_COMPONENTS.includes(`${CARD_DIR}/${f}.tsx`), `${f}.tsx ausente`)
  }
  const page = code(PAGE)
  for (const tag of ['<CardLimitCard', '<BillSummary', '<BillHistoryList', '<UpcomingBills']) {
    assert.ok(page.includes(tag), `CardsPage sem ${tag}`)
  }
})

test('sem emoji, sem HTML bruto e sem tipografia fora da escala', () => {
  for (const f of UI_FILES) {
    const src = code(f)
    assert.doesNotMatch(src, EMOJI, `${f} tem emoji`)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML|innerHTML/, `${f} injeta HTML bruto (T-06-35)`)
    assert.doesNotMatch(src, /\bfont-medium\b|\bfont-semibold\b|\bfont-extrabold\b/, `${f} usa peso fora de 400 e 700`)
    assert.doesNotMatch(src, /\btext-(?:sm|lg|xl|2xl|3xl|4xl)\b/, `${f} usa tamanho fora da escala`)
    for (const m of src.matchAll(/text-\[(\d+)px\]/g)) {
      assert.equal(m[1], '28', `${f} usa text-[${m[1]}px] fora da escala (so o 28 de destaque)`)
    }
  }
})

test('icones vem de lucide-react', () => {
  for (const f of [PAGE, HOME, ...CARD_COMPONENTS]) {
    const src = code(f)
    const usesIcon = /<(?:CreditCard|CircleAlert|ChevronRight|CalendarClock|TriangleAlert)\b|icon=\{/.test(src)
    if (usesIcon) assert.match(src, /from 'lucide-react'/, `${f} usa icone sem lucide-react`)
    assert.doesNotMatch(src, /from '(?:react-icons|@heroicons|@fortawesome)/, `${f} usa outra biblioteca de icones`)
  }
})

test('a legenda diz cerca de 1 vez por dia e nenhuma tela promete tempo real', () => {
  assert.match(code('src/components/cards/CardLimitCard.tsx'), /cerca de 1 vez por dia/)
  for (const f of UI_FILES) {
    const src = code(f)
    assert.doesNotMatch(src, /tempo real|em tempo-real|instant[aâ]ne|ao vivo/i, `${f} promete tempo real (D-05)`)
  }
})

test('CardsPage usa useCardView, nao importa firebase e nao calcula fatura', () => {
  const src = code(PAGE)
  assert.match(src, /useCardView\(/)
  for (const f of UI_FILES) {
    assert.doesNotMatch(code(f), /from '(?:firebase|@\/lib\/firebase)|firebase\//, `${f} importa firebase`)
  }
  // A interface so exibe: nada de groupBills, sumBillTotals ou futureInstallments nas telas de cartao.
  for (const f of [PAGE, ...CARD_COMPONENTS]) {
    assert.doesNotMatch(code(f), /\b(?:groupBills|sumBillTotals|futureInstallments)\b/, `${f} calcula fatura ou parcela`)
  }
})

test('botoes e links tem alvo minimo de 44px', () => {
  for (const f of [PAGE, HOME, ...CARD_COMPONENTS]) {
    const src = code(f)
    for (const m of src.matchAll(/<(Link|button)\b(?:=>|[^>])*>/g)) {
      assert.match(m[0], /\b(?:min-h-11|h-11)\b/, `${f}: ${m[1]} sem min-h-11 ou h-11: ${m[0].slice(0, 80)}`)
    }
  }
})

test('BillSummary leva a Configuracoes sem as datas e UpcomingBills nao promete parcela', () => {
  assert.match(code('src/components/cards/BillSummary.tsx'), /to="\/configuracoes#contas"/)
  assert.ok(code('src/components/cards/UpcomingBills.tsx').includes('Nenhuma compra parcelada detectada'))
  assert.ok(code('src/components/cards/BillHistoryList.tsx').includes('Ainda não há faturas para mostrar'))
})

test('so a parcela lida do texto leva a marca estimada', () => {
  const src = code('src/components/cards/UpcomingBills.tsx')
  assert.match(src, /source === 'inferred'[^\n]*estimada/)
  assert.equal((src.match(/estimada/g) ?? []).length, 1, 'a marca estimada deve aparecer num unico lugar')
})

test('o status da fatura nunca depende so de cor', () => {
  const labels = code(LABELS)
  for (const text of ['Aberta', 'Fechada', 'Paga', 'Atrasada', 'Futura']) {
    assert.ok(labels.includes(`'${text}'`), `rotulo ${text} ausente`)
  }
  const chip = code('src/components/cards/BillStatusChip.tsx')
  assert.match(chip, /\{label\}/, 'o chip precisa exibir o texto do status')
  assert.match(chip, /bg-warn-bg[^']*text-warn-ink/)
  assert.match(chip, /bg-danger-bg[^']*text-danger-ink/)
})

test('valor desconhecido vira traco e carregando nao mostra numero', () => {
  assert.match(code(LABELS), /DASH = '—'/)
  const page = code(PAGE)
  assert.match(page, /view\.loading/)
  assert.match(page, /aria-hidden="true"/)
  assert.match(page, /anim-pulse/)
  assert.ok(page.includes('Tentar de novo') && page.includes('Nenhum cartão conectado neste perfil'))
  assert.match(page, /to="\/configuracoes#bancos"/)
})

test('Home: resumo do cartao leva a /cartoes, so le useCards e fica depois das contas fixas', () => {
  const src = code(HOME)
  assert.match(src, /to="\/cartoes"/)
  assert.match(src, /useCards\(/)
  assert.doesNotMatch(src, /useCardView|getCardTransactions|cards\.service/, 'a Home nao pode ler compras do cartao (T-06-37)')
  assert.match(src, /loading \|\| error \|\| mine\.length === 0\) return null/, 'escondido sem cartao')
  assert.ok(src.includes('Informe o fechamento e o vencimento'))
  const sections = code(SECTIONS)
  assert.ok(sections.includes('<HomeCardSummary'), 'HomeSections sem HomeCardSummary')
  assert.ok(sections.indexOf('<FixedMonthCard') < sections.indexOf('<HomeCardSummary'), 'resumo antes das contas fixas')
})
