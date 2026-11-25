import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAiSummary, collectAllowed, summaryToPromptText } from './aiSummary.js'
import { findLeaks } from './aiPrivacy.js'
import { validateSpeech, extractNumbers } from './aiValidate.js'
import { formatMoney } from './format.js'
import { zonedTimeToInstant } from './time.js'

const NOW = zonedTimeToInstant(2026, 11, 12, 15, 0, 0)

const DEFS = [
  { id: 'alimentacao', name: 'Alimentação' },
  { id: 'lazer', name: 'Lazer' },
  { id: 'transporte', name: 'Transporte' },
]

const CONFIG = {
  salaryDay: 1,
  expectedIncomeCents: 500_000,
  limits: { alimentacao: [{ from: '2026-11', cents: 40_000 }] },
}

/** Lancamento no formato do nucleo, ao meio-dia de Sao Paulo do dia pedido. */
function tx(day, amount, description, extra = {}) {
  return {
    date: zonedTimeToInstant(2026, 11, day, 12, 0, 0),
    amount,
    type: 'saida',
    category: 'Alimentação',
    description,
    source: 'bank',
    ...extra,
  }
}

const IFOOD = tx(11, 250, 'iFood Restaurante Ltda', { id: 'a1' })
const PADARIA = tx(8, 200, 'Padaria Central Ltda', { id: 'a2' })
const PIX = tx(9, 80, 'Pix para Joao Silva Santos', { id: 'a3', category: 'Lazer' })
const MANUAL = tx(10, 45, 'almoço com Carlos', { id: 'a4', source: 'manual' })

/** Mes de exemplo: delivery acima do limite, Pix para pessoa e manual com nome de gente. */
function sample(extra = {}) {
  return {
    now: NOW,
    person: 'ele',
    config: CONFIG,
    categoryDefs: DEFS,
    transactions: [IFOOD, PADARIA, PIX, MANUAL],
    latestTx: IFOOD,
    ...extra,
  }
}

test('tracer: o ciclo vai pelo nome do mes e pelo dia do ciclo, nunca por data', () => {
  const s = buildAiSummary(sample())
  assert.deepEqual(s.ciclo, { mes: 'novembro', dia: 12, diasNoCiclo: 30, diasRestantes: 19 })
})

test('tracer: Pode gastar e por dia saem de buildBudgetView em reais formatados', () => {
  const s = buildAiSummary(sample())
  // renda 5000 - gasto 575 = 4425; 19 dias restantes => 232 por dia (piso).
  assert.equal(s.podeGastar.valor, formatMoney(442_500))
  assert.equal(s.podeGastar.porDia, formatMoney(23_289))
  assert.equal(s.podeGastar.gastoDoCiclo, formatMoney(57_500))
})

test('tracer: limite estourado vira linha com categoria pelo nome, uso e estado', () => {
  const s = buildAiSummary(sample())
  assert.equal(s.limites.length, 1)
  const row = s.limites[0]
  assert.equal(row.categoria, 'Alimentação')
  assert.equal(row.gasto, formatMoney(49_500))
  assert.equal(row.limite, formatMoney(40_000))
  assert.equal(row.uso, '123%')
  assert.equal(row.estado, 'estourou')
  assert.equal(row.passou, formatMoney(9_500))
})

test('tracer: ultimo lancamento leva so rotulo seguro, categoria e valor', () => {
  const s = buildAiSummary(sample())
  assert.deepEqual(s.ultimoLancamento, {
    loja: 'iFood',
    categoria: 'Alimentação',
    valor: formatMoney(25_000),
    movimento: 'gasto',
  })
  const pix = buildAiSummary(sample({ latestTx: PIX }))
  assert.equal(pix.ultimoLancamento.loja, 'uma pessoa')
})

test('tracer: o texto serializado nao vaza nome, ano, chave de ciclo nem digito longo', () => {
  for (const latestTx of [IFOOD, PIX, MANUAL]) {
    const text = summaryToPromptText(buildAiSummary(sample({ latestTx })))
    for (const nome of ['Joao', 'Silva', 'Santos', 'Carlos']) assert.ok(!text.includes(nome), `${nome} vazou: ${text}`)
    assert.deepEqual(findLeaks(text), [], text)
    assert.doesNotMatch(text, /20\d\d/, 'ano no resumo')
    assert.doesNotMatch(text, /\d{4}-\d{2}/, 'chave AAAA-MM no resumo')
    assert.doesNotMatch(text, /\d{1,2}\/\d{1,2}\/\d{2,4}/, 'data completa no resumo')
    const semValores = text.replace(/R\$\s*[\d.]+(?:,\d{1,2})?/g, ' ').replace(/\d+%/g, ' ')
    assert.doesNotMatch(semValores, /\d{4}/, `4 algarismos seguidos fora de valor: ${text}`)
  }
})

test('tracer: os numeros do resumo sao exatamente os permitidos para a fala', () => {
  const s = buildAiSummary(sample())
  const text = summaryToPromptText(s)
  const found = extractNumbers(text)
  const allowed = collectAllowed(s)
  assert.deepEqual([...allowed.moneyCents].sort((a, b) => a - b), [...new Set(found.moneyCents)].sort((a, b) => a - b))
  assert.deepEqual([...allowed.pcts], [...new Set(found.pcts)])
  assert.deepEqual([...allowed.ints].sort((a, b) => a - b), [...new Set(found.ints)].sort((a, b) => a - b))
  assert.ok(allowed.moneyCents.has(49_500) && allowed.moneyCents.has(40_000))
  assert.ok(allowed.pcts.has(123))
  assert.ok(allowed.ints.has(12) && allowed.ints.has(30) && allowed.ints.has(19))
})

test('tracer: o validador aceita a fala que cita numeros do resumo e reprova numero inventado', () => {
  const allowed = collectAllowed(buildAiSummary(sample()))
  const ok = validateSpeech('Alimentação em 123%, passou R$ 95 do limite. Segura essa mão, porra.', { allowed })
  assert.equal(ok.ok, true, JSON.stringify(ok))
  const bad = validateSpeech('Alimentação em 187%, passou R$ 95 do limite.', { allowed })
  assert.deepEqual(bad, { ok: false, reason: 'numero-inventado' })
})

test('tracer: summaryToPromptText e JSON compacto e deterministico', () => {
  const a = summaryToPromptText(buildAiSummary(sample()))
  const b = summaryToPromptText(buildAiSummary(sample()))
  assert.equal(a, b)
  assert.doesNotMatch(a, /\n|": |, "/)
  assert.deepEqual(JSON.parse(a), JSON.parse(b))
})

test('tracer: entrada vazia ou com campos nulos nunca lanca', () => {
  const s = buildAiSummary({ now: NOW })
  assert.equal(s.ciclo.mes, 'novembro')
  assert.equal(s.limites, undefined)
  assert.equal(s.ultimoLancamento, undefined)
  const t = buildAiSummary({
    now: NOW,
    transactions: null,
    categoryDefs: null,
    config: null,
    latestTx: null,
    bills: [null],
  })
  assert.equal(t.podeGastar.gastoDoCiclo, formatMoney(0))
  assert.throws(() => buildAiSummary({}), TypeError)
})
