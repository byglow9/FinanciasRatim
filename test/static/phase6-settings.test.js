// Guarda estatica do cartao de configuracao dos cartoes de credito (CARD-08, CARD-02, D-06, D-09).
// Rodar: node --test test/static/phase6-settings.test.js
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

const ACCOUNTS = 'src/components/settings/AccountsCard.tsx'
const SHEET = 'src/components/settings/CardSettingsSheet.tsx'
const PAGE = 'src/pages/SettingsPage.tsx'
const OLD_SKELETON = 'src/components/settings/AccountsSkeletonCard.tsx'

test('AccountsCard: SettingsCard com id contas, icone de cartao, lista de cartoes e sem em breve', () => {
  const src = code(ACCOUNTS)
  assert.match(src, /<SettingsCard\b[^>]*id="contas"/)
  assert.match(src, /icon=\{CreditCard\}/)
  assert.match(src, /title="Contas e cartões"/)
  assert.match(src, /\buseCards\(/)
  assert.match(src, /<CardSettingsSheet\b/)
  assert.doesNotMatch(src, /em breve/i)
})

test('AccountsCard: resumo de fechamento e vencimento, estados em portugues e dono por tabNames', () => {
  const src = code(ACCOUNTS)
  for (const text of [
    'Fecha dia',
    'Vence dia',
    'Informe fechamento e vencimento',
    'Nenhum cartão conectado ainda',
    '/configuracoes#bancos',
    'Não foi possível carregar os cartões.',
    'Tentar de novo',
    'Carregando cartões',
  ]) {
    assert.ok(src.includes(text), `${ACCOUNTS} sem "${text}"`)
  }
  assert.match(src, /settings\.tabNames\.area1/)
  assert.match(src, /settings\.tabNames\.area2/)
  // Somente leitura: o toque passa pelo aviso padrao antes de abrir a folha.
  assert.match(src, /guard\('editar'\)/)
})

test('CardSettingsSheet: dois DayPicker, saveCardSettings e guard antes de gravar', () => {
  const src = code(SHEET)
  assert.match(src, /import\s*\{\s*DayPicker\s*\}\s*from\s+'@\/components\/settings\/DayPicker'/)
  assert.match(src, /import\s*\{[^}]*\bsaveCardSettings\b[^}]*\}\s*from\s+'@\/services\/cards\.service'/)
  assert.equal((src.match(/<DayPicker\b/g) ?? []).length, 2, 'fechamento e vencimento: um DayPicker para cada')
  assert.ok(src.includes("guard('editar')"), 'folha sem guard(editar)')
  assert.ok(
    src.indexOf("guard('editar')") < src.indexOf('saveCardSettings('),
    'guard(editar) deve vir antes de saveCardSettings'
  )
  for (const text of [
    'Não foi possível salvar. Tente de novo.',
    'Sem o fechamento e o vencimento, a fatura aparece sem status',
    'O MeuPluggy não entrega o fechamento nem o vencimento',
    'Salvo',
  ]) {
    assert.ok(src.includes(text), `${SHEET} sem "${text}"`)
  }
})

test('CardSettingsSheet: apelido limitado a 24 caracteres', () => {
  const src = code(SHEET)
  assert.match(src, /NICKNAME_MAX\s*=\s*24\b/)
  assert.match(src, /maxLength=\{NICKNAME_MAX\}/)
})

test('os dois componentes: sem HTML bruto, emoji, console, tipografia fora da escala nem Ele ou Ela fixos', () => {
  for (const file of [ACCOUNTS, SHEET]) {
    const src = code(file)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML|innerHTML|\.html\(/, `${file} usa HTML bruto`)
    assert.doesNotMatch(src, /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u, `${file} tem emoji`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
    assert.doesNotMatch(src, /\btext-(sm|lg|xl|[2-9]xl)\b/, `${file} usa tamanho fora de 12 e 16`)
    assert.doesNotMatch(src, /\bfont-(medium|semibold|extrabold|light|thin|black)\b/, `${file} usa peso fora de 400 e 700`)
    assert.doesNotMatch(src, /\btext-\[\d+px\]/, `${file} usa tamanho arbitrario`)
    assert.doesNotMatch(src, /\bEl[ea]\b/, `${file} escreve Ele ou Ela fixo (use settings.tabNames)`)
  }
})

test('SettingsPage: AccountsCard depois de CategoriesCard e antes de BankConnections', () => {
  const src = code(PAGE)
  const order = ['<CycleIncomeCard', '<CategoriesCard', '<AccountsCard', '<BankConnections'].map((tag) => {
    const at = src.indexOf(tag)
    assert.ok(at >= 0, `SettingsPage sem ${tag}`)
    return at
  })
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'cartoes fora da ordem')
  assert.doesNotMatch(src, /AccountsSkeletonCard/)
})

test('o esqueleto antigo nao existe mais como arquivo', () => {
  assert.equal(fs.existsSync(path.join(ROOT, OLD_SKELETON)), false)
})
