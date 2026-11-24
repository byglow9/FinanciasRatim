// Guarda estatica do lancamento manual no cartao (D-12, CARD-03, CARD-06): chip Cartao so na aba
// Gasto, escolha do cartao, gravacao so com cardId e cardKind e nenhuma conta de fatura na folha.
// Rodar: node --test test/static/phase6-launch.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const SHEET = 'src/components/launcher/LaunchSheet.tsx'
const PICKER = 'src/components/launcher/CardPicker.tsx'

/** Trecho do objeto passado a addTransaction na folha (do `addTransaction(` ao `txId`). */
function txPayload(src) {
  const start = src.indexOf('addTransaction(\n')
  assert.ok(start >= 0, 'LaunchSheet.tsx sem a chamada de addTransaction')
  const end = src.indexOf('txId', start)
  assert.ok(end > start, 'LaunchSheet.tsx sem o id idempotente no addTransaction')
  return src.slice(start, end)
}

test('LaunchSheet importa o contrato do cartao manual e o hook useCards', () => {
  const src = code(SHEET)
  assert.match(src, /import \{[^}]*\bmanualCardFields\b[^}]*\} from "@shared\/core\/cardManual\.js"/)
  assert.match(src, /import \{[^}]*\bcardChoices\b[^}]*\} from "@shared\/core\/cardManual\.js"/)
  assert.match(src, /import \{[^}]*\buseCards\b[^}]*\} from "@\/hooks\/useCards"/)
  assert.match(src, /import \{[^}]*\bCardPicker\b[^}]*\} from "@\/components\/launcher\/CardPicker"/)
})

test('o chip Cartao so existe na aba Gasto e so fica desabilitado sem cartao no perfil', () => {
  const src = code(SHEET)
  assert.match(src, /tab === "gasto" \? \(\s*<div[^>]*>\s*<p[^>]*>Categoria<\/p>\s*<div[^>]*>\s*<Chip[\s\S]*?Cartão/, 'chips de pagamento condicionados a aba Gasto')
  assert.match(src, /disabled=\{choices\.length === 0\}/, 'desabilitado somente com choices vazio')
  assert.doesNotMatch(src, /Cartão \(em breve\)|em breve/, 'sem o rotulo provisorio')
  assert.ok(src.includes('Nenhum cartão conectado neste perfil'), 'motivo acessivel do chip desabilitado')
  assert.match(src, /setPayment\("conta"\)/, 'a troca de aba e o cartao que sumiu voltam para Conta')
})

test('o gasto no cartao espalha manualCardFields e nunca grava billMonth, cardStatus nem source', () => {
  const src = code(SHEET)
  const payload = txPayload(src)
  assert.match(payload, /\.\.\.cardFields\b/, 'o objeto de addTransaction espalha os campos do cartao')
  assert.match(src, /manualCardFields\(cardId\)/)
  for (const field of ['billMonth', 'cardStatus', 'source', 'billMonthSource']) {
    assert.doesNotMatch(src, new RegExp(`\\b${field}\\b`), `LaunchSheet.tsx grava ${field}`)
  }
  // O payload de hoje segue intacto.
  assert.match(payload, /\bcategory:\s*category\.name\b/)
  assert.match(payload, /\bcategoryId:\s*category\.id\b/)
  assert.match(payload, /type:\s*tab === "gasto" \? "saida" : "entrada"/)
})

test('a folha nao calcula fatura, limite nem saldo', () => {
  for (const f of [SHEET, PICKER]) {
    const src = code(f)
    assert.doesNotMatch(src, /shared\/core\/cardBills/, `${f} importa cardBills`)
    assert.doesNotMatch(src, /shared\/core\/cards\.js/, `${f} importa cards.js`)
    assert.doesNotMatch(src, /\bbillMonthOf\b|\bbillFor\b|\bgroupBills\b/, `${f} calcula fatura`)
  }
})

test('CardPicker usa Chip, aria-pressed e so renderiza com mais de um cartao', () => {
  const src = code(PICKER)
  assert.match(src, /import \{ Chip \} from "@\/components\/ui\/chip"/)
  assert.match(src, /\bpressed=\{selected\}/, 'a escolha vai para o aria-pressed do Chip')
  assert.match(src, /choices\.length <= 1\) return null/, 'com um so cartao nada e mostrado')
  assert.match(src, /\{choice\.label\}/, 'rotulo como texto React')
})

test('textos do aviso existem e nenhum texto de tempo real aparece', () => {
  const src = code(SHEET)
  assert.ok(src.includes('Conta nos limites pela data da compra'))
  assert.ok(src.includes('Não baixa o saldo da conta; conta no Pode gastar.'))
  assert.ok(src.includes('Gasto lançado no cartão'))
  for (const f of [SHEET, PICKER]) {
    assert.doesNotMatch(code(f), /tempo real|em tempo real|ao vivo/i, `${f} promete tempo real`)
  }
})

test('sem HTML bruto, emoji, escala fora do padrao nem alvo pequeno nos dois arquivos', () => {
  const files = [SHEET, PICKER]
  assert.deepEqual(scaleProblems(files), [])
  assert.deepEqual(touchProblems(files), [])
  for (const f of files) assert.doesNotMatch(code(f), /dangerouslySetInnerHTML/)
})
