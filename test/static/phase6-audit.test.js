// Guarda estatica do auditor do cartao (06-20: CENT-03, CARD-02, D-11, D-12): ramo MOCK do servico de cartoes,
// semente sintetica, /cartoes nas rotas e nas telas de tema e o assert da folha de lancamento.
// A execucao em Chrome e `node scripts/ux-audit/audit.mjs` e `node scripts/ux-audit/theme.mjs --audit`.
// Rodar: node --test test/static/phase6-audit.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSeed } from '../../scripts/ux-audit/seed.mjs'
import { openBillMonth, groupBills } from '../../shared/core/cardBills.js'
import { cardChoices, isCardId, isManualCardPurchase } from '../../shared/core/cardManual.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// Sem comentarios e com fim de linha LF: o checkout no Windows vem com CRLF.
const code = (f) =>
  fs
    .readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const SERVICE = 'src/services/cards.service.ts'
const NOW = new Date('2026-11-24T15:00:00Z')
const list = (seed, name) => JSON.parse(seed[`db::${name}`] ?? '[]')

/** Corpo de uma funcao exportada do servico, do cabecalho ate o fechamento na coluna 0. */
function body(name) {
  const src = code(SERVICE)
  const match = new RegExp(`export (?:async )?function ${name}\\b[\\s\\S]*?\\n\\}\\n`).exec(src)
  assert.ok(match, `${name} ausente em ${SERVICE}`)
  return match[0]
}

// ---- servico de cartoes em desenvolvimento simulado ----

test('o ramo simulado usa a constante MOCK do armazenamento simulado, so de desenvolvimento', () => {
  const src = code(SERVICE)
  assert.match(src, /import \{[^}]*\bMOCK\b[^}]*\} from '@\/lib\/mockStorage'/)
  assert.match(code('src/lib/mockStorage.ts'), /MOCK = import\.meta\.env\.DEV && /)
  for (const name of ['subscribeCards', 'subscribeCardSettings', 'saveCardSettings', 'getCardTransactions']) {
    assert.match(body(name), /if \(MOCK\)/, `${name} sem ramo MOCK`)
  }
})

test('as assinaturas simuladas emitem uma vez e devolvem um cancelar vazio', () => {
  for (const name of ['subscribeCards', 'subscribeCardSettings']) {
    assert.match(body(name), /if \(MOCK\) \{\s*onData\([^\n]*\)\s*return \(\) => \{\}\s*\}/, name)
  }
  const src = code(SERVICE)
  assert.match(src, /mList<[^>]*>\('cards'\)/)
  assert.match(src, /mList<[^>]*>\('cardSettings'\)/)
  assert.match(src, /syncedAt: toDateOrNull\(/)
})

test('a gravacao simulada acontece depois da mesma validacao e so em db::cardSettings', () => {
  const save = body('saveCardSettings')
  const validation = save.indexOf('validateCardSettingsPatch(patch)')
  const mock = save.indexOf('if (MOCK)')
  assert.ok(validation > -1 && mock > validation, 'MOCK antes da validacao')
  assert.match(save, /mSave\('cardSettings'/)
})

test('as compras simuladas filtram por cartao e data, do mais novo para o mais antigo', () => {
  const get = body('getCardTransactions')
  const mock = get.slice(get.indexOf('if (MOCK)'), get.indexOf('if (!db)'))
  assert.match(mock, /mList<[^>]*>\('transactions'\)/)
  assert.match(mock, /cardId === cardId/)
  assert.match(mock, />= from/)
  assert.match(mock, /\.sort\(\(a, b\) => b\.date\.getTime\(\) - a\.date\.getTime\(\)\)/)
})

test('o caminho do Firestore do servico de cartoes continua como estava', () => {
  const src = code(SERVICE)
  assert.match(body('subscribeCards'), /onSnapshot\(\s*query\(collection\(db, 'cards'\), \.\.\.ownerScope\(\)\)/)
  assert.match(body('subscribeCardSettings'), /onSnapshot\(\s*query\(collection\(db, 'cardSettings'\), \.\.\.ownerScope\(\)\)/)
  assert.match(body('saveCardSettings'), /setDoc\(\s*doc\(db, 'cardSettings', accountId\),\s*\{ \.\.\.clean, accountId, ownerId: ownerId\(\), updatedAt: serverTimestamp\(\) \},\s*\{ merge: true \}/)
  assert.match(body('getCardTransactions'), /\.\.\.ownerScope\(\),\s*where\('cardId', '==', cardId\),\s*where\('date', '>=', Timestamp\.fromDate\(from\)\),\s*orderBy\('date', 'desc'\)/)
  assert.equal((src.match(/\bif \(!db\)/g) ?? []).length, 4, 'as quatro guardas sem Firestore continuam')
})

// ---- semente do auditor ----

test('as sementes full e empty nao ganham nada do cartao', () => {
  for (const kind of ['full', 'empty']) {
    const seed = buildSeed(kind, NOW)
    assert.equal(seed['db::cards'], undefined, `${kind} com db::cards`)
    assert.equal(seed['db::cardSettings'], undefined, `${kind} com db::cardSettings`)
    assert.ok(list(seed, 'transactions').every((t) => t.cardId === undefined && t.cardKind === undefined), kind)
  }
  assert.throws(() => buildSeed('outra', NOW), /seed invalido/)
})

test('a semente do cartao e a full mais cartoes, configuracao e compras', () => {
  const full = buildSeed('full', NOW)
  const cards = buildSeed('cards', NOW)
  for (const key of Object.keys(full)) {
    if (key !== 'db::transactions') assert.equal(cards[key], full[key], `${key} mudou`)
  }
  assert.deepEqual(Object.keys(cards).filter((k) => !(k in full)).sort(), ['db::cardSettings', 'db::cards'])
  const base = list(full, 'transactions')
  assert.deepEqual(list(cards, 'transactions').slice(0, base.length), base)
  assert.match(code('scripts/ux-audit/seed.mjs'), /const COLLECTIONS = \[[\s\S]*?'cards',\s*'cardSettings',[\s\S]*?\]/)
})

test('dois cartoes do mesmo perfil, com apelido e dias fixos', () => {
  const seed = buildSeed('cards', NOW)
  const cards = list(seed, 'cards')
  const settings = list(seed, 'cardSettings')
  assert.equal(cards.length, 2)
  assert.ok(cards.every((c) => c.person === 'ele' && isCardId(c.id)))
  for (const card of cards) {
    const s = settings.find((x) => x.accountId === card.id)
    assert.ok(s && s.nickname.length > 0 && s.nickname.length <= 24, card.id)
    assert.ok(Number.isInteger(s.closingDay) && Number.isInteger(s.dueDay), card.id)
    assert.ok(Number.isInteger(card.creditLimitCents) && Number.isInteger(card.balanceCents), card.id)
  }
  const named = cards.map((c) => ({ ...c, displayName: settings.find((x) => x.accountId === c.id).nickname }))
  assert.equal(cardChoices(named, 'ele').length, 2)
})

test('as compras exercitam todas as marcas do cartao', () => {
  const seed = buildSeed('cards', NOW)
  const txs = list(seed, 'transactions').filter((t) => t.cardId)
  assert.ok(txs.some((t) => t.cardKind === 'purchase' && t.cardStatus === 'pending'), 'pendente')
  assert.ok(txs.some((t) => t.currency?.code === 'USD' && t.currency.originalCents > 0), 'dolar')
  assert.ok(txs.some((t) => t.installment?.source === 'inferred'), 'parcela estimada')
  assert.ok(txs.some((t) => t.installment?.source === 'pluggy'), 'parcela do banco')
  assert.ok(txs.some((t) => isManualCardPurchase(t) && !t.billMonth), 'lancada a mao')
  assert.ok(txs.some((t) => t.cardKind === 'payment' && t.transfer === true), 'pagamento')
  assert.ok(txs.some((t) => t.cardKind === 'refund' && t.type === 'entrada' && t.transfer === true), 'estorno')
  const ids = list(seed, 'transactions').map((t) => t.id)
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos')
})

test('o primeiro cartao tem fatura aberta e a anterior paga, em qualquer dia do mes', () => {
  for (const iso of ['2026-01-01T15:00:00Z', '2026-02-28T15:00:00Z', '2026-11-24T15:00:00Z', '2026-12-31T15:00:00Z']) {
    const now = new Date(iso)
    const seed = buildSeed('cards', now)
    const [card] = list(seed, 'cards')
    const settings = list(seed, 'cardSettings').find((s) => s.accountId === card.id)
    const txs = list(seed, 'transactions')
      .filter((t) => t.cardId === card.id)
      .map((t) => ({ ...t, date: new Date(t.date) }))
    const { bills, unassignedCents } = groupBills({ txs, payments: card.payments, ...settings, now })
    const open = openBillMonth(now, settings.closingDay)
    assert.ok(bills.some((b) => b.billMonth === open && b.isCurrent && b.count > 0), `${iso}: sem fatura aberta`)
    assert.ok(bills.some((b) => b.billMonth < open && b.status === 'paga' && b.totalCents === 150000), `${iso}: sem anterior paga`)
    assert.equal(unassignedCents, 0, iso)
    assert.ok(txs.every((t) => t.date.getTime() <= now.getTime() + 86400000), `${iso}: compra no futuro`)
  }
})

test('a semente do cartao nao traz numero de conferencia, nome de banco nem identificador real', () => {
  const seed = buildSeed('cards', NOW)
  const txs = list(seed, 'transactions').filter((t) => t.cardId)
  const cards = list(seed, 'cards')
  // Numeros da conferencia do dono (06-CONTEXT D-08), em centavos.
  const owner = new Set([20000, 1859, 18141, 3008])
  const cents = [
    ...txs.flatMap((t) => [Math.round(t.amount * 100), t.currency?.originalCents]),
    ...cards.flatMap((c) => [
      c.creditLimitCents,
      c.availableLimitCents,
      c.balanceCents,
      ...Object.values(c.billTotals ?? {}),
      ...(c.payments ?? []).map((p) => p.cents),
    ]),
  ].filter((v) => typeof v === 'number')
  assert.ok(cents.every((v) => !owner.has(v)), 'numero do dono na semente')
  const text = JSON.stringify([cards, list(seed, 'cardSettings'), txs]).toLowerCase()
  for (const word of ['nubank', 'meupluggy', 'pluggy connect', 'ultravioleta']) {
    assert.ok(!text.includes(word), `semente cita ${word}`)
  }
  assert.ok(cards.every((c) => c.id.startsWith('seed-') && c.itemId.startsWith('seed-')))
  assert.ok(txs.every((t) => t.id.startsWith('seed-')))
})
