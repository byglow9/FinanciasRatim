// Guarda estatica da folha de detalhe da fatura (06-12: CARD-04, CARD-05, CENT-03, D-08, D-10, D-14).
// Rodar: node --test test/static/phase6-bill-detail.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// Sem comentarios e com fim de linha LF: o checkout no Windows vem com CRLF.
const code = (f) =>
  fs
    .readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const SHEET = 'src/components/cards/BillDetailSheet.tsx'
const ROW = 'src/components/cards/BillPurchaseRow.tsx'
const PAGE = 'src/pages/CardsPage.tsx'
const HISTORY = 'src/components/cards/BillHistoryList.tsx'

// Emoji e pictogramas (inclui seletor de variacao e juntador de emoji).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u

test('a folha usa Sheet e mostra compras por dia pelo nucleo e os pagamentos da fatura', () => {
  const src = code(SHEET)
  assert.match(src, /import \{ Sheet \} from '@\/components\/ui\/sheet'/)
  assert.match(src, /<Sheet\b/)
  assert.match(src, /billDayGroups\(bill\.items\)/)
  assert.match(src, /<BillPurchaseRow\b/)
  assert.ok(src.includes('Pagamento da fatura'))
  assert.ok(src.includes('visto no cartão') && src.includes('visto na conta'))
  assert.match(src, /p\.billMonth === bill\.billMonth/, 'so os pagamentos ligados a esta fatura')
})

test('marcar e desmarcar como paga passa por guard antes de gravar paidMonths', () => {
  const src = code(SHEET)
  assert.ok(src.includes("'Marcar como paga'"))
  assert.ok(src.includes("'Desmarcar'"))
  assert.match(src, /settings\?\.paidMonths/, 'a folha precisa ler paidMonths')
  assert.equal((src.match(/saveCardSettings\(/g) ?? []).length, 1, 'gravacao num unico lugar')
  const guard = src.indexOf("if (guard('editar')) return")
  const save = src.indexOf('saveCardSettings(card.id, { paidMonths:')
  assert.ok(guard !== -1, "sem if (guard('editar')) return")
  assert.ok(save !== -1, 'a gravacao deve levar so paidMonths')
  assert.ok(guard < save, 'guard precisa vir antes da gravacao')
  assert.ok(src.includes('Não foi possível salvar. Tente de novo.'))
  assert.ok(src.includes('Isso só muda o status.'))
})

test('a marca manual so e oferecida para fatura que ja fechou', () => {
  const src = code(SHEET)
  assert.match(
    src,
    /const closed = bill\.status === 'fechada' \|\| bill\.status === 'atrasada' \|\| bill\.status === 'paga'\n/
  )
  assert.match(src, /if \(!closed \|\| \(bill\.status === 'paga' && !marked\)\) return null/)
  assert.doesNotMatch(src, /'aberta'|'futura'/)
})

test('a folha e a linha nao calculam fatura, parcela nem status', () => {
  for (const f of [SHEET, ROW]) {
    assert.doesNotMatch(
      code(f),
      /\b(?:groupBills|sumBillTotals|cardBillStatus|futureInstallments|parseInstallment)\b|\.reduce\(/,
      `${f} calcula em vez de exibir`
    )
  }
})

test('a linha tem as marcas Pendente, Lancada por voce, N/M e estimada', () => {
  const src = code(ROW)
  assert.match(src, /cardStatus === 'pending'/)
  assert.ok(src.includes('>Pendente</Chip>'))
  assert.match(src, /origin === 'manual'/)
  assert.ok(src.includes('Lançada por você'))
  assert.match(src, /\{installment\.n\}\/\{installment\.total\}/)
  assert.match(src, /source === 'inferred' \? <Chip[^>]*>estimada<\/Chip>/, 'estimada so na parcela lida do texto')
  assert.equal((src.match(/estimada/g) ?? []).length, 1, 'a marca estimada deve aparecer num unico lugar')
})

test('o codigo da moeda e validado antes de Intl.NumberFormat', () => {
  const src = code(ROW)
  assert.ok(src.includes('const CURRENCY_CODE = /^[A-Z]{3}$/'), 'tres letras maiusculas')
  const check = src.indexOf('!CURRENCY_CODE.test(code)) return null')
  const format = src.indexOf('new Intl.NumberFormat(')
  assert.ok(check !== -1, 'o codigo precisa ser testado, com saida sem formatar')
  assert.ok(format !== -1)
  assert.ok(check < format, 'a validacao vem antes da formatacao')
  assert.equal((src.match(/Intl\.NumberFormat/g) ?? []).length, 1)
})

test('sem emoji, sem HTML bruto, sem tipografia fora da escala', () => {
  for (const f of [SHEET, ROW]) {
    const src = code(f)
    assert.doesNotMatch(src, EMOJI, `${f} tem emoji`)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML|innerHTML/, `${f} injeta HTML bruto (T-06-40)`)
    assert.doesNotMatch(src, /\bfont-(?:medium|semibold|extrabold)\b/, `${f} usa peso fora de 400 e 700`)
    assert.doesNotMatch(src, /\btext-(?:sm|lg|xl|2xl|3xl|4xl)\b/, `${f} usa tamanho fora da escala`)
    for (const m of src.matchAll(/text-\[(\d+)px\]/g)) {
      assert.equal(m[1], '28', `${f} usa text-[${m[1]}px] fora da escala (so o 28 de destaque)`)
    }
  }
})

test('CardsPage monta a folha e a abre pelo historico e pela fatura atual', () => {
  const page = code(PAGE)
  assert.match(page, /<BillDetailSheet\b/)
  assert.match(page, /<BillHistoryList\b[^>]*onOpen=\{setOpenMonth\}/)
  assert.ok(page.includes('Ver compras da fatura'))
  assert.match(page, /className="min-h-11 w-full"/, 'botao da fatura atual com alvo de 44px')
  assert.match(page, /<CardSection key=\{card\.id\}/, 'a key por cartao fecha a folha ao trocar de cartao ou perfil')
  assert.match(code(HISTORY), /aria-current=/, 'a linha ativa e marcada')
})
