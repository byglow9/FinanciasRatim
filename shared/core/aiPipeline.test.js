import { test } from 'node:test'
import assert from 'node:assert/strict'
import { merchantLabel, findLeaks, PERSON_LABEL } from './aiPrivacy.js'
import { validateSpeech, extractNumbers } from './aiValidate.js'
import { canonicalKey, bucket5 } from './aiCacheKey.js'
import { formatMoney } from './format.js'

const DEFS = [
  { id: 'alimentacao', name: 'Alimentacao' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'lazer', name: 'Lazer' },
]

// Lancamentos sujos do mes: o que o banco e o usuario realmente produzem.
const TXS = [
  { description: 'iFood', source: 'bank', category: 'Alimentacao', cents: 2590 },
  { description: 'Uber do Brasil Tecnol', source: 'bank', category: 'Transporte', cents: 1890 },
  { description: 'Pix para Joao Silva Santos', source: 'bank', category: 'Lazer', cents: 5000 },
  { description: 'Pix de Maria Oliveira', source: 'bank', category: 'Lazer', cents: 3000 },
  { description: 'TED para 123.456.789-01', source: 'bank', category: 'Lazer', cents: 1000 },
  { description: 'ag 1234 cc 56789-0', source: 'bank', category: 'Alimentacao', cents: 700 },
  { description: 'Padaria Central Ltda', source: 'bank', category: 'Alimentacao', cents: 1200 },
  { description: 'almoço com Carlos', source: 'manual', category: 'Alimentacao', cents: 4500 },
  { description: 'jantar pra maria souza', source: 'manual', category: 'Alimentacao', cents: 6000 },
  { description: 'joao@email.com (11) 98765-4321', source: 'manual', category: 'Lazer', cents: 800 },
]

/** Bloco de resumo montado a mao, como o 07-07 fara: so rotulos seguros e totais. */
function buildBlock(txs) {
  const lines = ['Ciclo em andamento, 7 dias restantes.', 'Alimentacao: 87% do limite, restam R$ 150,00.']
  for (const tx of txs) {
    const m = merchantLabel(tx, DEFS)
    lines.push(`- ${m.label} (${m.kind}): ${formatMoney(tx.cents)}`)
  }
  return lines.join('\n')
}

test('pipeline: descricoes sujas viram um bloco de resumo sem nenhum vazamento', () => {
  const block = buildBlock(TXS)
  assert.deepEqual(findLeaks(block), [], block)
  const lower = block.toLowerCase()
  for (const n of ['joao', 'silva', 'santos', 'maria', 'oliveira', 'carlos', 'souza', '@', 'cpf']) {
    assert.ok(!lower.includes(n), `${n} vazou no bloco:\n${block}`)
  }
  assert.match(block, /iFood/)
  assert.match(block, /Uber/)
  assert.ok(block.includes(PERSON_LABEL))
})

test('pipeline: ano, chave AAAA-MM ou data completa no resumo sao acusados por findLeaks', () => {
  const block = buildBlock(TXS)
  assert.ok(findLeaks(`${block}\nCiclo 2026-11`).includes('digitos'))
  assert.ok(findLeaks(`${block}\nem 2026`).includes('digitos'))
  assert.ok(findLeaks(`${block}\nvence 25/11/2026`).includes('digitos'))
  assert.deepEqual(findLeaks(`${block}\nvence dia 25/11`), [])
})

test('pipeline: saidas hostis reprovam com o motivo certo', () => {
  const allowed = { moneyCents: [2590], pcts: [87], ints: [7] }
  const ctx = { length: 'curta', tone: 'sem-filtro', allowed, partnerLabels: ['Nirigua'] }
  const casos = [
    ['A Nirigua gastou menos que você hoje', 'parceiro'],
    ['Foram R$ 99,90 no iFood hoje, absurdo', 'numero-inventado'],
    ['Você gastou **muito** no iFood hoje', 'marcacao'],
    ['Você é um crioulo gastador mesmo', 'discriminacao'],
    ['Desculpe, não posso ajudar com isso', 'recusa'],
    ['Você gastou muito \u{1F437} hoje', 'emoji'],
  ]
  for (const [text, reason] of casos) {
    assert.deepEqual(validateSpeech(text, ctx), { ok: false, reason }, text)
  }
})

test('pipeline: saida sem-filtro boa passa, com palavrao e apelido', () => {
  const allowed = { moneyCents: [2590], pcts: [87], ints: [7] }
  const ctx = { length: 'curta', tone: 'sem-filtro', allowed, edgy: true, requireProfanity: true }
  const text = 'Porra, baleia, R$ 25,90 no iFood de novo e já está em 87% do limite.'
  assert.deepEqual(validateSpeech(text, ctx), { ok: true, text })
})

test('pipeline: os numeros permitidos saem da MESMA leitura do validador (extractNumbers)', () => {
  const block = buildBlock(TXS)
  const allowed = extractNumbers(block)
  assert.ok(allowed.moneyCents.includes(15000) && allowed.moneyCents.includes(2590))
  const ctx = { length: 'curta', tone: 'direto', allowed }
  assert.equal(validateSpeech(`Sobram ${formatMoney(15000)} e já gastou ${formatMoney(2590)} no iFood.`, ctx).ok, true)
  assert.equal(validateSpeech('Gastou R$ 26,00 no iFood hoje, de novo.', ctx).ok, false)
})

test('pipeline: a fala de reacao so cita a loja do lancamento comentado', () => {
  const labels = TXS.map((tx) => merchantLabel(tx, DEFS).label)
  const ctx = { length: 'curta', tone: 'direto', allowed: { moneyCents: [2590] }, focusLabel: 'iFood', otherLabels: labels }
  assert.deepEqual(validateSpeech('O Uber de novo, hein', ctx), { ok: false, reason: 'loja-errada' })
  assert.deepEqual(validateSpeech('O iFood de novo, hein', ctx), { ok: true, text: 'O iFood de novo, hein' })
})

test('pipeline: chave igual na mesma faixa, diferente em faixas diferentes, e nunca leva o rotulo da loja', () => {
  const base = { cycleKey: '2026-11', tone: 'direto', situation: 'limite', topic: 'limites', categoryId: 'alimentacao', rhythm: 'atencao' }
  assert.equal(canonicalKey({ ...base, pct: 86 }), canonicalKey({ ...base, pct: 88.5 }))
  assert.notEqual(canonicalKey({ ...base, pct: 86 }), canonicalKey({ ...base, pct: 91 }))
  assert.equal(bucket5(86), bucket5(88.5))

  const lanc = { ...base, situation: 'lancamento', pct: 86 }
  const a = merchantLabel(TXS[0], DEFS).label
  const b = merchantLabel(TXS[1], DEFS).label
  const ka = canonicalKey({ ...lanc, merchant: a })
  const kb = canonicalKey({ ...lanc, merchant: b })
  assert.notEqual(ka, kb)
  for (const label of [a, b]) {
    assert.ok(!ka.toLowerCase().includes(label.toLowerCase()) && !kb.toLowerCase().includes(label.toLowerCase()))
  }
  for (const k of [ka, kb]) assert.deepEqual(findLeaks(k.replace(/\d{4}-\d{2}/, 'mes')).filter((c) => c !== 'digitos'), [])
})
