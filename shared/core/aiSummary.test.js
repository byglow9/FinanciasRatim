import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAiSummary,
  collectAllowed,
  summaryToPromptText,
  rankTopics,
  reactionLabels,
  TOPICS,
  SUMMARY_LIMITS,
} from './aiSummary.js'
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

// ---------------------------------------------------------------------------------------------
// Task 2: resumo completo da D-16
// ---------------------------------------------------------------------------------------------

const BILLS = [
  { id: 'b1', name: 'Aluguel', dueDay: 5, amountCents: 120_000 },
  { id: 'b2', name: 'Internet', dueDay: 20, amountCents: 10_000 },
  { id: 'b3', name: 'Netflix', dueDay: 15, amountCents: 5_000 },
]
const PAYMENTS = [{ billId: 'b1', month: 11, year: 2026, paidCents: 120_000 }]

const PREV = [
  { ...tx(1, 100, 'Mercado Bom Preco Ltda', { id: 'p0' }), date: zonedTimeToInstant(2026, 10, 5, 12, 0, 0) },
]
const PREV_LATE = { ...tx(1, 300, 'Mercado Bom Preco Ltda', { id: 'p1' }), date: zonedTimeToInstant(2026, 10, 20, 12, 0, 0) }

const INSIGHT = {
  id: 'ele__2026-11__merchant-repeat__ifood__2026-11-12',
  v: 1,
  person: 'ele',
  type: 'merchant-repeat',
  severity: 3,
  cycleKey: '2026-11',
  day: '2026-11-12',
  subjectKind: 'merchant',
  subjectKey: 'ifood',
  metrics: { count: 3, totalCents: 75_000, windowDays: 7, ordinal: 3 },
  evidenceTxIds: ['a1', 'a2'],
  evidenceDays: ['2026-11-10', '2026-11-11'],
}

function full(extra = {}) {
  return sample({
    prevTransactions: [...PREV, PREV_LATE],
    bills: BILLS,
    payments: PAYMENTS,
    goals: [
      { name: 'Reserva', targetCents: 100_000, currentCents: 100_000 },
      { name: 'Viagem', targetCents: 500_000, currentCents: 125_000 },
    ],
    porquinhoCents: 250_000,
    cards: [
      { name: 'Nubank', openBillCents: 123_456, dueDay: 10, closingDay: 3 },
      { name: 'Black', openBillCents: 50_000, dueDay: 15 },
      { name: 'Zerado', openBillCents: 0, dueDay: 1 },
    ],
    insights: [INSIGHT],
    ...extra,
  })
}

test('completo: cada secao da D-16 existe com os valores do nucleo', () => {
  const s = buildAiSummary(full())
  assert.deepEqual(s.renda, { recebida: formatMoney(0), esperada: formatMoney(500_000) })
  assert.deepEqual(s.fixas, {
    total: formatMoney(135_000),
    pagas: 1,
    aPagar: 2,
    proximas: [
      { nome: 'Netflix', dia: 15, valor: formatMoney(5_000) },
      { nome: 'Internet', dia: 20, valor: formatMoney(10_000) },
    ],
  })
  assert.deepEqual(s.semLimite, [{ categoria: 'Lazer', gasto: formatMoney(8_000) }])
  assert.deepEqual(s.metas, [
    { meta: 'Viagem', guardado: formatMoney(125_000), alvo: formatMoney(500_000), progresso: '25%' },
    { meta: 'Reserva', guardado: formatMoney(100_000), alvo: formatMoney(100_000), progresso: '100%' },
  ])
  assert.equal(s.porquinho, formatMoney(250_000))
  assert.deepEqual(s.fatura, [
    { cartao: 'Nubank', aberta: formatMoney(123_456), vence: 10 },
    { cartao: 'Black', aberta: formatMoney(50_000), vence: 15 },
  ])
  assert.deepEqual(s.padroes, [
    { tipo: 'loja repetida', forca: 'forte', assunto: 'iFood', vezes: 3, janelaDias: 7, total: formatMoney(75_000) },
  ])
  assert.deepEqual(s.assuntos, [
    'padroes', 'limites', 'comparacao', 'ritmo', 'semana', 'entradas', 'metas', 'porquinho', 'fixas', 'fatura',
  ])
})

test('completo: lojas com frequencia na semana e no ciclo, Pix para pessoa agrupado', () => {
  const pixA = tx(12, 30, 'Pix para Joao Silva', { id: 'x1' })
  const pixB = tx(3, 20, 'Pix para Maria Oliveira Souza', { id: 'x2' })
  const ifoodB = tx(2, 40, 'IFOOD *PEDIDO', { id: 'x3' })
  const s = buildAiSummary(full({ transactions: [IFOOD, ifoodB, pixA, pixB, MANUAL] }))
  const byLabel = Object.fromEntries(s.lojas.map((l) => [l.loja, l]))
  assert.deepEqual(byLabel.iFood, { loja: 'iFood', tipo: 'loja', naSemana: 1, noCiclo: 2, total: formatMoney(29_000) })
  assert.deepEqual(byLabel['uma pessoa'], {
    loja: 'uma pessoa', tipo: 'pessoa', naSemana: 1, noCiclo: 2, total: formatMoney(5_000),
  })
  assert.equal(byLabel['almoço com uma pessoa'].tipo, 'manual')
  const text = summaryToPromptText(s)
  for (const nome of ['Joao', 'Maria', 'Oliveira', 'Souza', 'Silva', 'Carlos']) assert.ok(!text.includes(nome), nome)
})

test('completo: lancamento do banco sem loja reconhecida usa a categoria', () => {
  const t = tx(9, 33, 'COMPRA CARTAO XPTO COMERCIO', { id: 'y1', category: 'Transporte' })
  const s = buildAiSummary(sample({ transactions: [t], latestTx: t }))
  assert.deepEqual(s.lojas[0], { loja: 'Transporte', tipo: 'categoria', naSemana: 1, noCiclo: 1, total: formatMoney(3_300) })
  assert.equal(s.ultimoLancamento.loja, 'Transporte')
})

test('completo: comparacao com o ciclo anterior ate o mesmo dia do ciclo', () => {
  const s = buildAiSummary(full())
  const row = s.comparacao.find((c) => c.categoria === 'Alimentação')
  // anterior: so os 100 do dia 5 de outubro (o de 20 de outubro passa do dia 12 do ciclo).
  assert.deepEqual(row, {
    categoria: 'Alimentação',
    atual: formatMoney(49_500),
    anterior: formatMoney(10_000),
    variacao: '+395%',
  })
  const lazer = s.comparacao.find((c) => c.categoria === 'Lazer')
  assert.deepEqual(lazer, { categoria: 'Lazer', atual: formatMoney(8_000), variacao: 'nova' })
  const queda = buildAiSummary(
    sample({ prevTransactions: [{ ...tx(1, 1000, 'Padaria Central Ltda'), date: zonedTimeToInstant(2026, 10, 3, 12, 0, 0) }] }),
  )
  assert.equal(queda.comparacao.find((c) => c.categoria === 'Alimentação').variacao, '-50%')
})

test('completo: padroes so de severidade 2 ou 3, da pessoa e do ciclo, sem ids nem dias', () => {
  const base = { ...INSIGHT }
  const insights = [
    { ...base, id: 'ele__a', severity: 1 },
    { ...base, id: 'ele__b', type: 'limit-over' },
    { ...base, id: 'ele__c', type: 'rhythm' },
    { ...base, id: 'ela__d', person: 'ela', subjectKey: 'rappi' },
    { ...base, id: 'ele__e', cycleKey: '2026-10' },
    { ...base, id: 'ele__f', type: 'category-over-average', subjectKind: 'category', subjectKey: 'lazer', severity: 2,
      metrics: { spentCents: 30_000, avgCents: 10_000, ratioPct: 300 } },
    { ...base, id: 'ele__g', type: 'days-without-launch', subjectKind: 'cycle', subjectKey: '2026-11', severity: 2, metrics: { days: 4 } },
    { ...base, id: 'ele__h', type: 'delivery-heavy', subjectKind: 'merchant-group', subjectKey: 'delivery', severity: 3,
      metrics: { count: 4, totalCents: 20_000, windowDays: 7, ordinal: 4 } },
  ]
  const s = buildAiSummary(sample({ insights }))
  assert.deepEqual(s.padroes.map((p) => p.tipo), ['muito delivery', 'categoria acima da média', 'dias sem lançar'])
  assert.deepEqual(s.padroes[0], {
    tipo: 'muito delivery', forca: 'forte', assunto: 'delivery', vezes: 4, janelaDias: 7, total: formatMoney(20_000),
  })
  assert.deepEqual(s.padroes[1], {
    tipo: 'categoria acima da média', forca: 'média', assunto: 'Lazer',
    gasto: formatMoney(30_000), media: formatMoney(10_000), razao: '300%',
  })
  assert.deepEqual(s.padroes[2], { tipo: 'dias sem lançar', forca: 'média', dias: 4 })
  const text = summaryToPromptText(s)
  assert.doesNotMatch(text, /ele__|2026|"a1"|evidence/)
})

test('completo: toda lista respeita o tamanho maximo (T-07-27)', () => {
  const many = (n, make) => Array.from({ length: n }, (_, i) => make(i))
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const defs = many(20, (i) => ({ id: `cat${letters[i]}`, name: `Categoria ${letters[i]}x` }))
  const limits = Object.fromEntries(defs.map((d) => [d.id, [{ from: '2026-11', cents: 10_000 }]]))
  const txs = many(40, (i) => tx(1 + (i % 12), 20 + i, `Loja ${letters[i % 26]} Ltda`, {
    id: `m${i}`, category: defs[i % 20].name, categoryId: defs[i % 20].id,
  }))
  const prev = many(40, (i) => ({
    ...tx(1, 10 + i, `Loja ${letters[i % 26]} Ltda`, { category: defs[i % 20].name, categoryId: defs[i % 20].id }),
    date: zonedTimeToInstant(2026, 10, 2, 12, 0, 0),
  }))
  const s = buildAiSummary({
    now: NOW,
    person: 'ele',
    config: { expectedIncomeCents: 900_000, limits },
    categoryDefs: defs,
    transactions: txs,
    prevTransactions: prev,
    bills: many(12, (i) => ({ id: `f${i}`, name: `Conta ${letters[i]}x`, dueDay: 13 + i, amountCents: 1_000 })),
    goals: many(9, (i) => ({ name: `Meta ${letters[i]}x`, targetCents: 10_000, currentCents: i * 100 })),
    cards: many(5, (i) => ({ name: `Cartao ${letters[i]}x`, openBillCents: 1_000 + i, dueDay: 10 })),
    insights: many(9, (i) => ({ ...INSIGHT, id: `ele__${i}`, subjectKey: 'ifood', severity: 2 + (i % 2) })),
  })
  assert.equal(s.limites.length, SUMMARY_LIMITS.limites)
  assert.equal(s.lojas.length, SUMMARY_LIMITS.lojas)
  assert.equal(s.comparacao.length, SUMMARY_LIMITS.comparacao)
  assert.equal(s.metas.length, SUMMARY_LIMITS.metas)
  assert.equal(s.fatura.length, SUMMARY_LIMITS.fatura)
  assert.equal(s.padroes.length, SUMMARY_LIMITS.padroes)
  assert.equal(s.fixas.proximas.length, SUMMARY_LIMITS.fixasProximas)
  assert.ok(summaryToPromptText(s).length < 6000, 'resumo grande demais para o orcamento de tokens')
  assert.ok(s.assuntos.every((t) => TOPICS.includes(t)))
  assert.deepEqual(findLeaks(summaryToPromptText(s)), [])
})

test('completo: semLimite lista as 5 categorias com mais gasto e sem limite', () => {
  const defs = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n) => ({ id: `c${n}`, name: `Cat ${n}` }))
  const txs = defs.map((d, i) => tx(2, 10 * (i + 1), 'Padaria Central Ltda', { category: d.name, categoryId: d.id }))
  const s = buildAiSummary({ now: NOW, person: 'ele', categoryDefs: defs, transactions: txs })
  assert.deepEqual(s.semLimite.map((c) => c.categoria), ['Cat G', 'Cat F', 'Cat E', 'Cat D', 'Cat C'])
})

test('completo: numeros nunca passam de 3 algarismos nem viram inteiro cru de 4', () => {
  const txs = Array.from({ length: 1200 }, (_, i) => tx(11, 1, 'iFood', { id: `big${i}` }))
  const s = buildAiSummary({
    now: NOW,
    person: 'ele',
    config: { expectedIncomeCents: 1_000, limits: { alimentacao: [{ from: '2026-11', cents: 100 }] } },
    categoryDefs: DEFS,
    transactions: txs,
    prevTransactions: [{ ...tx(1, 0.01, 'iFood'), date: zonedTimeToInstant(2026, 10, 2, 12, 0, 0) }],
    porquinhoCents: 150_000_000,
    goals: [{ name: 'Gigante', targetCents: 1, currentCents: 9_999_999 }],
    insights: [{ ...INSIGHT, metrics: { count: 5000, totalCents: 99_999_999, windowDays: 7 } }],
  })
  const text = summaryToPromptText(s)
  assert.equal(s.lojas[0].noCiclo, 999)
  assert.equal(s.lojas[0].naSemana, 999)
  assert.equal(s.limites[0].uso, '999%')
  assert.equal(s.comparacao[0].variacao, '+999%')
  assert.equal(s.metas[0].progresso, '999%')
  assert.equal(s.padroes[0].vezes, 999)
  assert.deepEqual(findLeaks(text), [], text)
  const semValores = text.replace(/R\$\s*[\d.]+(?:,\d{1,2})?/g, ' ').replace(/\d+%/g, ' ')
  assert.doesNotMatch(semValores, /\d{4}/)
})

test('completo: ignora por pessoa tudo o que e da outra pessoa', () => {
  const dela = [
    tx(10, 999, 'Rappi Restaurante Ltda', { id: 'e1', person: 'ela' }),
    tx(10, 500, 'Shopee', { id: 'e2', person: 'ela' }),
  ]
  const dele = [{ ...IFOOD, person: 'ele' }, { ...PADARIA, person: 'ele' }]
  const s = buildAiSummary(
    full({
      transactions: [...dele, ...dela],
      prevTransactions: [{ ...tx(1, 999, 'Rappi', { person: 'ela' }), date: zonedTimeToInstant(2026, 10, 2, 12, 0, 0) }],
      bills: [...BILLS, { id: 'b9', name: 'Conta da outra', dueDay: 25, amountCents: 99_900, person: 'ela' }],
      goals: [{ name: 'Meta dela', targetCents: 100_000, currentCents: 1_000, person: 'ela' }, { name: 'Meta nossa', targetCents: 100_000, currentCents: 1_000 }],
      cards: [{ name: 'Cartao dela', openBillCents: 900_000, dueDay: 9, person: 'ela' }],
      insights: [{ ...INSIGHT, person: 'ela', id: 'ela__x' }],
      latestTx: { ...IFOOD, person: 'ela' },
    }),
  )
  const text = summaryToPromptText(s)
  for (const x of ['Rappi', 'Shopee', 'outra', 'dela', 'Meta nossa'.slice(0, 0) + 'Meta dela']) assert.ok(!text.includes(x), x)
  assert.equal(s.podeGastar.gastoDoCiclo, formatMoney(45_000))
  assert.ok(text.includes('Meta nossa'))
  assert.equal(s.fatura, undefined)
  assert.equal(s.padroes, undefined)
  assert.equal(s.ultimoLancamento, undefined)
  assert.equal(s.fixas.pagas + s.fixas.aPagar, 3)
})

test('propriedade: bateria de entradas sujas nunca vaza nome, digito longo ou identificador', () => {
  const sujas = [
    'Pix para Joao Silva Santos', 'Pix de Maria Oliveira', 'TED para Carlos Eduardo', 'DOC enviado Pedro Lucas',
    'Transferencia de Ana Paula', 'Pix para 123.456.789-01', 'ag 1234 cc 56789-0', 'joao.silva@email.com',
    '(11) 98765-4321', 'https://pix.exemplo.com/abc123', 'Cpf 123.456.789-01', 'CNPJ 12.345.678/0001-95',
    'Joao Silva Santos', 'jantar pra maria souza', 'almoço com Carlos', 'Loja 1234567890123', 'Lucas Ricardo Fernanda',
  ]
  const nomes = ['Joao', 'Silva', 'Santos', 'Maria', 'Oliveira', 'Carlos', 'Eduardo', 'Pedro', 'Lucas', 'Ana', 'Paula', 'Souza', 'Ricardo', 'Fernanda']
  const defs = [
    { id: 'alimentacao', name: 'Alimentação' },
    { id: 'sujo', name: 'Cartão 4455667788 do Joao Silva' },
  ]
  const txs = sujas.flatMap((d, i) => [
    tx(1 + (i % 12), 10 + i, d, { id: `s${i}`, source: 'bank' }),
    tx(1 + (i % 12), 10 + i, d, { id: `t${i}`, source: 'manual' }),
    tx(1 + (i % 12), 10 + i, d, { id: `u${i}`, source: 'bank', category: 'Cartão 4455667788 do Joao Silva', categoryId: 'sujo' }),
  ])
  for (const latestTx of txs) {
    const s = buildAiSummary({
      now: NOW,
      person: 'ele',
      config: CONFIG,
      categoryDefs: defs,
      transactions: txs,
      latestTx,
      bills: [{ id: 'b', name: 'Escola do Joao Silva 12345678', dueDay: 20, amountCents: 5_000 }],
      goals: [{ name: 'Viagem com Maria Silva 1234', targetCents: 100_000, currentCents: 10 }],
      cards: [{ name: 'Nubank Mastercard final 4321', openBillCents: 10_000, dueDay: 4 }],
    })
    const text = summaryToPromptText(s)
    assert.deepEqual(findLeaks(text), [], text)
    for (const n of nomes) assert.ok(!new RegExp(`(^|[^A-Za-z])${n}([^A-Za-z]|$)`).test(text), `${n} vazou: ${text}`)
    assert.doesNotMatch(text, /@|cpf|cnpj/i)
    const semValores = text.replace(/R\$\s*[\d.]+(?:,\d{1,2})?/g, ' ').replace(/\d+%/g, ' ')
    assert.doesNotMatch(semValores, /\d{4}/)
  }
})

test('o resumo completo nunca leva ano, chave de ciclo, data completa, id nem e-mail', () => {
  const text = summaryToPromptText(buildAiSummary(full()))
  assert.doesNotMatch(text, /20\d\d/)
  assert.doesNotMatch(text, /\d{4}-\d{2}/)
  assert.doesNotMatch(text, /\d{1,2}\/\d{1,2}/)
  assert.doesNotMatch(text, /uid|hid|@|"id"|bankImportId|itemId|accountId|ele__|ela__|aba/i)
  assert.deepEqual(findLeaks(text), [])
})

test('completo: os numeros do resumo completo sao todos permitidos para a fala', () => {
  const s = buildAiSummary(full())
  const text = summaryToPromptText(s)
  const found = extractNumbers(text)
  const allowed = collectAllowed(s)
  for (const n of found.moneyCents) assert.ok(allowed.moneyCents.has(n), `dinheiro ${n}`)
  for (const n of found.pcts) assert.ok(allowed.pcts.has(n), `pct ${n}`)
  for (const n of found.ints) assert.ok(allowed.ints.has(n), `inteiro ${n}`)
  assert.ok(allowed.pcts.has(395) && allowed.pcts.has(25) && allowed.pcts.has(123))
  assert.ok(allowed.ints.has(15) && allowed.ints.has(10))
  // uma fala com numero fora do resumo reprova
  assert.equal(validateSpeech('Foram 77 vezes no iFood, porra.', { allowed }).ok, false)
  assert.equal(validateSpeech('Foram 3 vezes no iFood, porra.', { allowed }).ok, true)
})

test('rankTopics: padrao forte e limite estourado vem antes de tudo', () => {
  const s = {
    padroes: [{ forca: 'forte' }],
    limites: [{ estado: 'estourou' }, { estado: 'perto' }],
    comparacao: [{ variacao: '+50%' }],
    podeGastar: { ritmo: 'atenção' },
    renda: {},
    porquinho: 'R$ 10',
  }
  assert.deepEqual(rankTopics(s), ['padroes', 'limites', 'comparacao', 'ritmo', 'entradas', 'porquinho'])
})

test('rankTopics: sem padrao forte, limite perto e comparacao alta ganham do ritmo', () => {
  const s = {
    padroes: [{ forca: 'média' }],
    limites: [{ estado: 'perto' }],
    comparacao: [{ variacao: '-45%' }],
    podeGastar: { ritmo: 'folgado' },
    lojas: [{ naSemana: 2 }],
    metas: [{}],
  }
  assert.deepEqual(rankTopics(s), ['limites', 'comparacao', 'ritmo', 'padroes', 'semana', 'metas'])
})

test('rankTopics: sem sinal forte segue a ordem fixa, e vazio devolve lista vazia', () => {
  const s = { renda: {}, porquinho: 'R$ 10', fixas: {}, fatura: [{}], comparacao: [{ variacao: '+5%' }] }
  assert.deepEqual(rankTopics(s), ['comparacao', 'entradas', 'porquinho', 'fixas', 'fatura'])
  assert.deepEqual(rankTopics(s), rankTopics(s))
  assert.deepEqual(rankTopics({}), [])
  assert.deepEqual(rankTopics(null), [])
})

test('reactionLabels: separa a loja do lancamento atual das demais lojas reconhecidas', () => {
  const s = buildAiSummary(full())
  assert.deepEqual(reactionLabels(s), { focusLabel: 'iFood', otherLabels: ['Padaria Central Ltda'] })
  // lancamento de Pix: o foco e o rotulo generico, e as lojas reconhecidas ficam todas como "outras"
  const pix = buildAiSummary(full({ latestTx: PIX }))
  assert.deepEqual(reactionLabels(pix), { focusLabel: 'uma pessoa', otherLabels: ['iFood', 'Padaria Central Ltda'] })
  // nunca o generico nem nome de categoria entre as outras
  const none = reactionLabels({ lojas: [{ loja: 'uma pessoa', tipo: 'pessoa' }, { loja: 'Lazer', tipo: 'categoria' }, { loja: 'iFood', tipo: 'loja' }, { loja: 'ifood', tipo: 'loja' }] })
  assert.deepEqual(none, { focusLabel: null, otherLabels: ['iFood'] })
  assert.deepEqual(reactionLabels(null), { focusLabel: null, otherLabels: [] })
})

test('reactionLabels com o validador: a fala que cita a loja errada reprova', () => {
  const s = buildAiSummary(full())
  const ctx = { ...reactionLabels(s), allowed: collectAllowed(s) }
  assert.equal(validateSpeech('Mais um iFood, porra, e a carteira chorando.', ctx).ok, true)
  assert.deepEqual(validateSpeech('Padaria Central Ltda de novo, porra.', ctx), { ok: false, reason: 'loja-errada' })
})

test('completo: o resumo e deterministico e nao depende da ordem da entrada', () => {
  const a = summaryToPromptText(buildAiSummary(full()))
  const b = summaryToPromptText(
    buildAiSummary(full({ transactions: [MANUAL, PIX, PADARIA, IFOOD], bills: [...BILLS].reverse() })),
  )
  assert.equal(a, b)
})

test('camada extra: descricao manual so com maiusculas e sem loja conhecida nao vira rotulo', () => {
  const rotulo = (description) => {
    const t = tx(9, 10, description, { source: 'manual' })
    const s = buildAiSummary({ now: NOW, person: 'ele', categoryDefs: DEFS, transactions: [t], latestTx: t })
    return s.ultimoLancamento.loja
  }
  assert.equal(rotulo('Joao Silva Santos'), 'Alimentação')
  assert.equal(rotulo('Lucas Ricardo Fernanda'), 'Alimentação')
  assert.equal(rotulo('Padaria Central Ltda'), 'Padaria Central Ltda')
  assert.equal(rotulo('Mercado Livre'), 'Mercado Livre')
  assert.equal(rotulo('Netflix'), 'Netflix')
  assert.equal(rotulo('almoço com Carlos'), 'almoço com uma pessoa')
})

test('D-24: agenda, anotacoes e ultimos dias entram sem nome de pessoa nem segredo', () => {
  const at = (day) => zonedTimeToInstant(2026, 11, day, 12, 0, 0)
  const s = buildAiSummary({
    now: at(12),
    person: 'ele',
    events: [
      { title: 'Jantar com Maria', date: at(13), time: '20:00', person: 'conjunto', notes: 'ligar para joana antes' },
      { title: 'Consulta Mariana Souza', date: at(10), person: 'ele' },
      { title: 'Evento da outra aba', date: at(14), person: 'ela' },
    ],
    notes: [
      { title: 'Lembrete', content: 'comprar presente do Pedro', person: 'ele' },
      { title: 'Wifi', content: 'senha abc123', person: 'ele' },
      { title: 'Banco', content: 'meu cpf 123.456.789-00', person: 'ele' },
    ],
    transactions: [{ id: 't', date: at(11), amount: 30, type: 'saida', category: 'Lazer', description: 'Cinema', source: 'manual' }],
  })
  const text = summaryToPromptText(s)
  assert.doesNotMatch(text, /Maria|joana|Souza|Pedro|senha|abc123|123\.456|outra aba/i)
  assert.deepEqual(findLeaks(text), [])
  assert.equal(s.agenda.length, 2)
  assert.deepEqual([s.agenda[0].quando, s.agenda[0].hora, s.agenda[1].quando], ['amanhã', '20:00', 'há 2 dias'])
  assert.ok(s.anotacoes.length >= 1 && s.anotacoes.length <= 2)
  assert.equal(s.ultimosDias[0].quando, 'ontem')
  assert.equal(s.assuntos[0], 'agenda')
})
