import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf, shiftCycle } from './cycle.js'
import { DEFAULT_CATEGORY_DEFS } from './categories.js'
import {
  buildBaseline,
  baselineAvgToDay,
  buildInsights,
  isSpendSpike,
  insightId,
  merchantOf,
  toAiPayload,
  INSIGHT_RULES,
  INSIGHT_VERSION,
} from './insights.js'

const tx = (type, amount, iso, extra = {}) => ({ type, amount, date: new Date(iso), ...extra })

// "Agora": quinta 19/11/2026 12:00 em Sao Paulo (15:00Z). Ciclo com salario no dia 5.
const NOW = new Date('2026-11-19T15:00:00Z')
const cycle = cycleOf(NOW, 5)

const food = (id, iso, amount = 30, description = 'IFOOD *RESTAURANTE') =>
  tx('saida', amount, iso, { id, description, categoryId: 'alimentacao' })

const run = (transactions, extra = {}) =>
  buildInsights({ now: NOW, person: 'ele', cycle, transactions, categoryDefs: DEFAULT_CATEGORY_DEFS, ...extra })

/** Percorre o objeto e junta todas as strings (chaves e valores). */
function strings(value, acc = []) {
  if (typeof value === 'string') acc.push(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, acc))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      acc.push(k)
      strings(v, acc)
    }
  }
  return acc
}

test('o contrato esta na versao 1 e os limiares ficam em INSIGHT_RULES congelado', () => {
  assert.equal(INSIGHT_VERSION, 1)
  assert.ok(Object.isFrozen(INSIGHT_RULES))
  assert.equal(INSIGHT_RULES.WINDOW_DAYS, 7)
  assert.equal(INSIGHT_RULES.DELIVERY_WEEK_MIN, 3)
})

test('iFood quatro vezes na semana vira delivery-heavy com contagem, total, ordinal e janela', () => {
  const list = [
    food('t1', '2026-11-13T22:00:00Z', 30),
    food('t2', '2026-11-15T22:00:00Z', 40.5),
    food('t3', '2026-11-17T22:00:00Z', 25),
    food('t4', '2026-11-19T14:00:00Z', 20, 'IFD*PIZZARIA 12'),
  ]
  const r = run(list)
  assert.equal(r.length, 1)
  const [i] = r
  assert.equal(i.type, 'delivery-heavy')
  assert.equal(i.v, 1)
  assert.equal(i.severity, 2)
  assert.equal(i.metrics.count, 4)
  assert.equal(i.metrics.ordinal, 4)
  assert.equal(i.metrics.windowDays, 7)
  assert.equal(i.metrics.totalCents, 11550)
  assert.deepEqual(i.subject, { kind: 'merchant-group', key: 'delivery', label: 'delivery' })
  assert.deepEqual(i.evidence.txIds, ['t1', 't2', 't3', 't4'])
  assert.deepEqual(i.evidence.dayKeys, ['2026-11-13', '2026-11-15', '2026-11-17', '2026-11-19'])
  assert.equal(i.cycleKey, cycle.key)
  assert.equal(i.day, '2026-11-19')
})

test('severidade do delivery: 3 compras = 1, 5 ou mais = 3, 2 compras nao geram insight', () => {
  const base = [
    food('t1', '2026-11-16T15:00:00Z'),
    food('t2', '2026-11-17T15:00:00Z'),
  ]
  assert.equal(run(base).length, 0)
  const three = [...base, food('t3', '2026-11-18T15:00:00Z')]
  assert.equal(run(three)[0].severity, 1)
  const five = [...three, food('t4', '2026-11-18T16:00:00Z'), food('t5', '2026-11-19T13:00:00Z')]
  assert.equal(run(five)[0].severity, 3)
  assert.equal(run(five)[0].metrics.count, 5)
})

test('so conta a janela de 7 dias do calendario de Sao Paulo, saidas e fora de transferencia', () => {
  const list = [
    food('old', '2026-11-12T20:00:00Z'), // 7 dias atras: fora
    food('t1', '2026-11-13T15:00:00Z'), // 6 dias atras: dentro
    food('t2', '2026-11-16T15:00:00Z'),
    food('t3', '2026-11-18T15:00:00Z'),
    tx('saida', 30, '2026-11-19T10:00:00Z', { id: 'tr', description: 'iFood', transfer: true }),
    tx('entrada', 30, '2026-11-19T11:00:00Z', { id: 'en', description: 'iFood estorno' }),
    food('fut', '2026-11-20T15:00:00Z'), // amanha: fora
  ]
  const [i] = run(list)
  assert.equal(i.metrics.count, 3)
  assert.deepEqual(i.evidence.txIds, ['t1', 't2', 't3'])
})

test('compra a 23:30 de Sao Paulo cai no dia certo mesmo com o fuso do processo em Toquio', () => {
  // 02:30Z do dia 19 e 23:30 do dia 18 em Sao Paulo (UTC-3); em Toquio ja seria dia 19.
  const list = [
    food('t1', '2026-11-19T02:30:00Z'),
    food('t2', '2026-11-19T02:40:00Z'),
    food('t3', '2026-11-19T02:50:00Z'),
  ]
  const [i] = run(list)
  assert.deepEqual(i.evidence.dayKeys, ['2026-11-18'])
  assert.equal(i.day, '2026-11-19')
})

test('merchantOf: Pix para ou de pessoa, transferencia, TED, DOC, e-mail e CPF nunca viram loja', () => {
  const bad = [
    'Pix para Maria Silva',
    'Pix de Joao Souza',
    'PIX ENVIADO MARIA',
    'Transferencia de Carlos',
    'TED 123 banco',
    'doc pagamento',
    'Pagamento 123.456.789-01',
    'Pagamento 12345678901',
    'cartao 4111 1111 1111 1111',
    'maria@exemplo.com',
    'Alimentacao',
  ]
  for (const description of bad) {
    const m = merchantOf({ description, category: 'Alimentacao' }, DEFAULT_CATEGORY_DEFS)
    assert.equal(m.label, null, description)
    assert.equal(m.group, null, description)
    assert.match(m.key, /^h:[a-p]{8}$/, description)
  }
})

test('merchantOf: dicionario, estabelecimento e desconhecido', () => {
  assert.deepEqual(merchantOf({ description: 'IFOOD *LANCHE' }), { key: 'ifood', label: 'iFood', group: 'delivery' })
  assert.deepEqual(merchantOf({ description: 'IFD*Burger' }), { key: 'ifood', label: 'iFood', group: 'delivery' })
  assert.equal(merchantOf({ description: 'Rappi Brasil' }).group, 'delivery')
  assert.equal(merchantOf({ description: '99 Food' }).key, '99food')
  assert.equal(merchantOf({ description: '99 Pop' }).key, '99')
  assert.equal(merchantOf({ description: 'Uber *Trip' }).group, null)
  assert.equal(merchantOf({ description: 'Mercado Livre' }).label, 'Mercado Livre')
  const padaria = merchantOf({ description: 'Padaria Estrela do Sul Ltda' })
  assert.equal(padaria.label, 'Padaria Estrela do Sul L')
  assert.ok(padaria.label.length <= 24)
  const pessoa = merchantOf({ description: 'Joao Pedro da Silva' })
  assert.equal(pessoa.label, null)
  assert.equal(merchantOf({ description: 'Joao Pedro da Silva' }).key, pessoa.key)
  assert.notEqual(merchantOf({ description: 'Ana Souza' }).key, pessoa.key)
})

test('merchantOf: o rotulo nao leva marcacao nem script', () => {
  const m = merchantOf({ description: '<script>alert(1)</script> Padaria' })
  assert.ok(m.label)
  assert.doesNotMatch(m.label, /[<>()]/)
})

test('privacidade: Pix para pessoa, CPF e e-mail nao aparecem em nenhum insight', () => {
  const list = [
    food('t1', '2026-11-16T15:00:00Z'),
    food('t2', '2026-11-17T15:00:00Z'),
    food('t3', '2026-11-18T15:00:00Z'),
    tx('saida', 50, '2026-11-18T16:00:00Z', { id: 'p1', description: 'Pix para Maria Silva' }),
    tx('saida', 50, '2026-11-18T17:00:00Z', { id: 'p2', description: 'Pagamento CPF 123.456.789-01' }),
    tx('saida', 50, '2026-11-18T18:00:00Z', { id: 'p3', description: 'maria@exemplo.com' }),
  ]
  const text = JSON.stringify(run(list))
  assert.doesNotMatch(text, /Maria|maria/)
  assert.doesNotMatch(text, /\d{6,}/)
  assert.doesNotMatch(text, /@/)
  assert.doesNotMatch(text, /Pix|pix/)
})

// ---- Task 2: demais regras, linha de base e gasto grande ----

const oct = shiftCycle(cycle, -1)
const sep = shiftCycle(cycle, -2)
const aug = shiftCycle(cycle, -3)

const lazer = (id, iso, amount, description = 'Cinema') =>
  tx('saida', amount, iso, { id, description, categoryId: 'lazer' })

const row = (categoryId, spentCents, limitCents, extra = {}) => ({
  categoryId,
  spentCents,
  limitCents,
  state: spentCents > limitCents ? 'over' : spentCents * 100 >= limitCents * 80 ? 'warn' : 'ok',
  pct: Math.floor((spentCents * 100) / limitCents),
  remainingCents: Math.max(limitCents - spentCents, 0),
  excessCents: Math.max(spentCents - limitCents, 0),
  txs: [],
  ...extra,
})

/** Linha de base com 5 amostras de R$ 100 em lazer (ticket medio de R$ 100). */
const ticketBaseline = () =>
  buildBaseline({
    pastCycles: [
      { cycle: oct, transactions: [lazer('a', '2026-10-10T15:00:00Z', 100), lazer('b', '2026-10-12T15:00:00Z', 100)] },
      { cycle: sep, transactions: [lazer('c', '2026-09-10T15:00:00Z', 100), lazer('d', '2026-09-12T15:00:00Z', 100)] },
      { cycle: aug, transactions: [lazer('e', '2026-08-10T15:00:00Z', 100)] },
    ],
    categoryDefs: DEFAULT_CATEGORY_DEFS,
  })

/** Linha de base de 3 ciclos com R$ 200 de lazer no primeiro dia de cada ciclo. */
const avgBaseline = (n = 3) =>
  buildBaseline({
    pastCycles: [oct, sep, aug].slice(0, n).map((c) => ({
      cycle: c,
      transactions: [lazer(`x${c.key}`, c.start.toISOString(), 200)],
    })),
    categoryDefs: DEFAULT_CATEGORY_DEFS,
  })

const typesOf = (list) => list.map((i) => i.type)

test('merchant-repeat: mesma loja rotulada 3 vezes em 7 dias, fora do delivery e nunca com rotulo nulo', () => {
  const padaria = ['2026-11-15T15:00:00Z', '2026-11-17T15:00:00Z', '2026-11-18T15:00:00Z'].map((d, i) =>
    tx('saida', 12, d, { id: `p${i}`, description: 'Padaria Estrela Ltda' })
  )
  const r = run(padaria)
  assert.deepEqual(typesOf(r), ['merchant-repeat'])
  assert.equal(r[0].subject.kind, 'merchant')
  assert.equal(r[0].subject.label, 'Padaria Estrela Ltda')
  assert.equal(r[0].metrics.count, 3)
  assert.equal(r[0].metrics.ordinal, 3)
  assert.equal(r[0].severity, 1)

  const uber = padaria.map((t, i) => ({ ...t, id: `u${i}`, description: 'Uber *Trip' }))
  const ru = run(uber)
  assert.equal(ru[0].subject.key, 'uber')
  assert.equal(ru[0].subject.label, 'Uber')

  const ifood = padaria.map((t, i) => ({ ...t, id: `i${i}`, description: 'iFood' }))
  assert.deepEqual(typesOf(run(ifood)), ['delivery-heavy'])

  const pessoa = padaria.map((t, i) => ({ ...t, id: `m${i}`, description: 'Joao Pedro da Silva' }))
  assert.deepEqual(run(pessoa), [])
  const pix = padaria.map((t, i) => ({ ...t, id: `x${i}`, description: 'Pix para Maria Silva' }))
  assert.deepEqual(run(pix), [])
})

test('category-over-average: limiares 130, 160 e 200 por cento com diferenca minima de R$ 50', () => {
  const base = avgBaseline() // media de R$ 200 ate qualquer dia do ciclo
  const at = (spentCents) => run([], { baseline: base, rows: [row('lazer', spentCents, 1000000)] })
  assert.deepEqual(at(25999), [])
  const s1 = at(26000)
  assert.equal(s1[0].type, 'category-over-average')
  assert.equal(s1[0].severity, 1)
  assert.deepEqual(s1[0].metrics, { spentCents: 26000, avgCents: 20000, ratioPct: 130 })
  assert.deepEqual(s1[0].subject, { kind: 'category', key: 'lazer', label: 'Lazer' })
  assert.equal(at(32000)[0].severity, 2)
  assert.equal(at(39999)[0].severity, 2)
  assert.equal(at(40000)[0].severity, 3)
  // razao alta mas diferenca abaixo de R$ 50: nao dispara.
  const small = buildBaseline({
    pastCycles: [oct, sep].map((c) => ({ cycle: c, transactions: [lazer(`s${c.key}`, c.start.toISOString(), 100)] })),
    categoryDefs: DEFAULT_CATEGORY_DEFS,
  })
  assert.deepEqual(run([], { baseline: small, rows: [row('lazer', 14000, 1000000)] }), [])
})

test('category-over-average exige 2 ou mais ciclos na linha de base', () => {
  const one = avgBaseline(1)
  assert.equal(one.byCategory.lazer.cycles, 1)
  assert.deepEqual(run([], { baseline: one, rows: [row('lazer', 90000, 1000000)] }), [])
  const two = avgBaseline(2)
  assert.deepEqual(typesOf(run([], { baseline: two, rows: [row('lazer', 90000, 1000000)] })), ['category-over-average'])
})

test('spend-spike por ticket medio: R$ 400 com ticket de R$ 100 dispara e R$ 299 nao', () => {
  const baseline = ticketBaseline()
  assert.equal(baseline.byCategory.lazer.samples, 5)
  assert.equal(baseline.byCategory.lazer.ticketAvgCents, 10000)
  const big = run([lazer('g1', '2026-11-19T14:00:00Z', 400)], { baseline })
  assert.deepEqual(typesOf(big), ['spend-spike'])
  assert.equal(big[0].severity, 2)
  assert.deepEqual(big[0].metrics, { totalCents: 40000, avgCents: 10000, ratioPct: 400 })
  assert.deepEqual(big[0].evidence, { txIds: ['g1'], dayKeys: ['2026-11-19'] })
  assert.deepEqual(run([lazer('g2', '2026-11-19T14:00:00Z', 299)], { baseline }), [])
  assert.equal(run([lazer('g3', '2026-11-19T14:00:00Z', 300)], { baseline })[0].type, 'spend-spike')
  assert.equal(run([lazer('g4', '2026-11-19T14:00:00Z', 500)], { baseline })[0].severity, 3)
})

test('spend-spike sem historico usa 30% do limite e sem os dois nao dispara', () => {
  const rows = [row('lazer', 30000, 100000)]
  const hit = run([lazer('h1', '2026-11-19T14:00:00Z', 300)], { rows })
  assert.equal(hit.filter((i) => i.type === 'spend-spike').length, 1)
  const spike = hit.find((i) => i.type === 'spend-spike')
  assert.deepEqual(spike.metrics, { totalCents: 30000, limitCents: 100000, pct: 30 })
  assert.deepEqual(typesOf(run([lazer('h2', '2026-11-19T14:00:00Z', 299)], { rows: [row('lazer', 29900, 100000)] })), [])
  assert.deepEqual(run([lazer('h3', '2026-11-19T14:00:00Z', 5000)]), [])
  // menos de 5 amostras: a linha de base nao vale, entra a fracao do limite.
  const few = avgBaseline() // 3 amostras
  assert.equal(
    run([lazer('h4', '2026-11-19T14:00:00Z', 300)], { baseline: few, rows }).filter((i) => i.type === 'spend-spike').length,
    1
  )
})

test('spend-spike: um insight por categoria e dia, vence o maior', () => {
  const baseline = ticketBaseline()
  const list = [
    lazer('k1', '2026-11-19T13:00:00Z', 350),
    lazer('k2', '2026-11-19T14:00:00Z', 450),
    lazer('k3', '2026-11-18T14:00:00Z', 320),
  ]
  const r = run(list, { baseline })
  assert.equal(r.length, 2)
  assert.deepEqual(r.map((i) => i.evidence.txIds[0]).sort(), ['k2', 'k3'])
  assert.notEqual(r[0].id, r[1].id)
})

test('isSpendSpike usa as mesmas regras para a reacao de lancamento', () => {
  const baseline = ticketBaseline()
  assert.equal(isSpendSpike({ cents: 40000, categoryId: 'lazer', baseline }), true)
  assert.equal(isSpendSpike({ cents: 29900, categoryId: 'lazer', baseline }), false)
  assert.equal(isSpendSpike({ cents: 30000, categoryId: 'lazer', baseline: null, limitCents: 100000 }), true)
  assert.equal(isSpendSpike({ cents: 29900, categoryId: 'lazer', baseline: null, limitCents: 100000 }), false)
  assert.equal(isSpendSpike({ cents: 99999999, categoryId: 'lazer', baseline: null }), false)
  assert.equal(isSpendSpike({ cents: 0, categoryId: 'lazer', baseline, limitCents: 100 }), false)
})

test('days-without-launch: 3, 5 e 7 dias no calendario de Sao Paulo, pulado quando suprimido', () => {
  const last = (iso) => [tx('saida', 5, iso, { id: 'z', description: 'Cafe', categoryId: 'alimentacao' })]
  assert.deepEqual(run(last('2026-11-17T15:00:00Z')), []) // 2 dias
  const d3 = run(last('2026-11-16T15:00:00Z'))
  assert.equal(d3[0].type, 'days-without-launch')
  assert.equal(d3[0].severity, 1)
  assert.deepEqual(d3[0].metrics, { days: 3 })
  assert.deepEqual(d3[0].subject, { kind: 'cycle', key: cycle.key, label: null })
  assert.equal(run(last('2026-11-14T15:00:00Z'))[0].severity, 2)
  assert.equal(run(last('2026-11-12T15:00:00Z'))[0].severity, 3)
  // 23:30 de 15/11 em Sao Paulo (02:30Z do dia 16) conta como 4 dias, nao 3.
  assert.equal(run(last('2026-11-16T02:30:00Z'))[0].metrics.days, 4)
  assert.deepEqual(run(last('2026-11-12T15:00:00Z'), { suppressed: true }), [])
  // lastLaunchAt manda sobre as transacoes.
  const viaLast = run(last('2026-11-19T10:00:00Z'), { lastLaunchAt: new Date('2026-11-14T15:00:00Z') })
  assert.equal(viaLast[0].metrics.days, 5)
  assert.deepEqual(run([]), [])
})

test('limit-near e limit-over saem das linhas do orcamento, com a categoria como sujeito', () => {
  assert.deepEqual(run([], { rows: [row('lazer', 7999, 10000)] }), [])
  const near = run([], { rows: [row('lazer', 8000, 10000)] })
  assert.equal(near[0].type, 'limit-near')
  assert.equal(near[0].severity, 2)
  assert.deepEqual(near[0].metrics, { pct: 80, spentCents: 8000, limitCents: 10000 })
  assert.deepEqual(near[0].subject, { kind: 'category', key: 'lazer', label: 'Lazer' })
  assert.equal(run([], { rows: [row('lazer', 10000, 10000)] })[0].type, 'limit-near')
  const over = run([], { rows: [row('lazer', 10001, 10000)] })
  assert.equal(over[0].type, 'limit-over')
  assert.equal(over[0].severity, 3)
  assert.equal(over.length, 1)
})

test('rhythm so aparece quando o nivel e informado e o resultado vem por severidade', () => {
  assert.deepEqual(run([]), [])
  const r = run([], { rhythmLevel: 3, rows: [row('lazer', 8000, 10000), row('saude', 20000, 10000)] })
  assert.deepEqual(r.map((i) => i.severity), [3, 2, 2])
  assert.deepEqual(typesOf(r), ['limit-over', 'limit-near', 'rhythm'])
  assert.deepEqual(r[2].metrics, { level: 3 })
})

test('buildBaseline guarda so ids e numeros, e baselineAvgToDay devolve a media acumulada ate o dia', () => {
  const txs = (c) => ({ cycle: c })
  const baseline = buildBaseline({
    pastCycles: [
      {
        ...txs(oct),
        transactions: [
          lazer('o1', '2026-10-05T15:00:00Z', 100, 'Padaria Segredo Ltda'),
          lazer('o2', '2026-10-15T15:00:00Z', 50, 'Pix para Maria Silva'),
          tx('saida', 999, '2026-10-06T15:00:00Z', { id: 'tr', description: 'Transf', categoryId: 'lazer', transfer: true }),
          tx('entrada', 999, '2026-10-06T15:00:00Z', { id: 'en', description: 'Salario', categoryId: 'salario' }),
        ],
      },
      { ...txs(sep), transactions: [lazer('s1', '2026-09-07T15:00:00Z', 200, 'Cinema Secreto')] },
    ],
    categoryDefs: DEFAULT_CATEGORY_DEFS,
  })
  const text = JSON.stringify(baseline)
  assert.doesNotMatch(text, /Padaria|Segredo|Maria|Cinema|Secreto|Pix/)
  assert.deepEqual(Object.keys(baseline), ['v', 'byCategory'])
  assert.deepEqual(Object.keys(baseline.byCategory), ['lazer'])
  const e = baseline.byCategory.lazer
  assert.equal(baseline.v, 1)
  assert.equal(e.cycles, 2)
  assert.equal(e.samples, 3)
  assert.equal(e.ticketAvgCents, 11666)
  assert.equal(e.cumulative.length, 2)
  assert.ok(e.cumulative.every((c) => c.every((n) => Number.isInteger(n))))
  assert.equal(baselineAvgToDay(e, 1), 5000)
  assert.equal(baselineAvgToDay(e, 3), 15000)
  assert.equal(baselineAvgToDay(e, 15), 17500)
  assert.equal(baselineAvgToDay(e, 999), 17500)
  assert.equal(baselineAvgToDay(undefined, 3), null)
  assert.equal(baselineAvgToDay({ cycles: 0, samples: 0, ticketAvgCents: 0, cumulative: [] }, 3), null)
})

test('buildBaseline usa so os BASELINE_CYCLES ciclos mais recentes e resolve categoria pelo nome', () => {
  const old = shiftCycle(cycle, -4)
  const mk = (c, amount) => ({ cycle: c, transactions: [tx('saida', amount, c.start.toISOString(), { id: 'i', category: 'Lazer' })] })
  const b = buildBaseline({
    pastCycles: [mk(old, 1), mk(sep, 3), mk(oct, 2), mk(aug, 4)],
    categoryDefs: DEFAULT_CATEGORY_DEFS,
  })
  assert.equal(INSIGHT_RULES.BASELINE_CYCLES, 3)
  assert.equal(b.byCategory.lazer.cycles, 3)
  assert.equal(b.byCategory.lazer.samples, 3)
  assert.equal(b.byCategory.lazer.ticketAvgCents, 300)
})

// ---- Task 3: id deterministico, projecao para a IA e varredura de privacidade ----

/** Congela o objeto em profundidade (Date fica de fora: nao tem propriedades proprias). */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !(value instanceof Date) && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

test('insightId e deterministico, sem barra e so com partes estruturadas', () => {
  assert.equal(insightId('ele', '2026-11', 'delivery-heavy', 'delivery', '2026-11-19'), 'ele__2026-11__delivery-heavy__delivery__2026-11-19')
  assert.equal(
    insightId('ela', '2026-11', 'spend-spike', 'a/b', '2026-11-19'),
    insightId('ela', '2026-11', 'spend-spike', 'a/b', '2026-11-19')
  )
  assert.doesNotMatch(insightId('ele', '2026-11', 'x', 'a/b/c', 'd/e'), /\//)

  const list = [
    food('t1', '2026-11-16T15:00:00Z'),
    food('t2', '2026-11-17T15:00:00Z'),
    food('t3', '2026-11-18T15:00:00Z', 30, 'iFood Pizzaria do Fulano'),
  ]
  const a = run(list)
  const b = run([...list].reverse())
  assert.deepEqual(a.map((i) => i.id), b.map((i) => i.id))
  assert.equal(a[0].id, 'ele__' + cycle.key + '__delivery-heavy__delivery__2026-11-19')
  for (const i of a) {
    assert.doesNotMatch(i.id, /\//)
    assert.doesNotMatch(i.id, /Fulano|fulano|pizzaria/i)
  }
})

test('id de loja desconhecida usa a chave por hash, sem texto da descricao', () => {
  const list = ['2026-11-15T15:00:00Z', '2026-11-17T15:00:00Z', '2026-11-18T15:00:00Z'].map((d, i) =>
    tx('saida', 12, d, { id: `p${i}`, description: 'Padaria Estrela Ltda' })
  )
  const [i] = run(list)
  assert.match(i.id, /__merchant-repeat__h:[a-p]{8}__2026-11-19$/)
  assert.doesNotMatch(i.id, /padaria|estrela/i)
})

test('toAiPayload remove evidence e devolve so tipo, sujeito, metricas e severidade', () => {
  const list = [
    food('t1', '2026-11-16T15:00:00Z'),
    food('t2', '2026-11-17T15:00:00Z'),
    food('t3', '2026-11-18T15:00:00Z'),
  ]
  const [i] = run(list)
  const p = toAiPayload(i)
  assert.deepEqual(Object.keys(p).sort(), ['metrics', 'severity', 'subject', 'type'])
  assert.equal('evidence' in p, false)
  assert.deepEqual(p.subject, { kind: 'merchant-group', key: 'delivery', label: 'delivery' })
  assert.equal(p.type, 'delivery-heavy')
  assert.equal(p.severity, 1)
  assert.deepEqual(p.metrics, i.metrics)
  assert.notEqual(p.metrics, i.metrics)
  assert.doesNotMatch(JSON.stringify(p), /t1|t2|2026-11/)
  // rotulo suspeito nao passa, mesmo que viesse de fora do detector.
  const dirty = { ...i, subject: { kind: 'merchant', key: 'h:aaaaaaaa', label: 'maria@exemplo.com' } }
  assert.equal(toAiPayload(dirty).subject.label, null)
  assert.equal(toAiPayload({ ...i, subject: { ...i.subject, label: 'Loja 123.456.789-01' } }).subject.label, null)
})

test('varredura de privacidade: nenhum insight, id, payload ou baseline tem dado pessoal', () => {
  const secrets = ['Maria Silva', 'Joao Souza', '123.456.789-01', '12345678901', 'maria@exemplo.com', 'Carlos Pereira']
  const messy = (id, iso, description, extra = {}) =>
    tx('saida', 80, iso, { id, description, categoryId: 'lazer', ...extra })
  const dates = ['2026-11-14T15:00:00Z', '2026-11-15T15:00:00Z', '2026-11-16T15:00:00Z', '2026-11-17T15:00:00Z', '2026-11-18T15:00:00Z']
  const descriptions = [
    'Pix para Maria Silva',
    'Pix de Joao Souza',
    'Pagamento CPF 123.456.789-01',
    'Fatura 12345678901',
    'maria@exemplo.com',
    'Transferencia de Carlos Pereira',
  ]
  const list = []
  for (const d of descriptions) dates.slice(0, 4).forEach((iso, i) => list.push(messy(`id${list.length}${i}`, iso, d)))
  list.push(messy('cat1', '2026-11-18T16:00:00Z', 'Lazer'), messy('cat2', '2026-11-18T17:00:00Z', 'Lazer'), messy('cat3', '2026-11-18T18:00:00Z', 'Lazer'))
  const rows = [row('lazer', 90000, 100000)]
  const baseline = buildBaseline({
    pastCycles: [oct, sep, aug].map((c) => ({
      cycle: c,
      transactions: descriptions.map((d, i) =>
        messy(`b${c.key}${i}`, new Date(c.start.getTime() + (i + 1) * 3600_000).toISOString(), d)
      ),
    })),
    categoryDefs: DEFAULT_CATEGORY_DEFS,
  })
  const insights = run(list, { rows, baseline, rhythmLevel: 2 })
  assert.ok(insights.length > 0)
  const everything = [insights, insights.map(toAiPayload), baseline, insights.map((i) => i.id)]
  for (const piece of everything) {
    const text = strings(piece).join('\n')
    for (const secret of secrets) assert.ok(!text.includes(secret), `vazou: ${secret}`)
    assert.doesNotMatch(text, /Maria|Joao|Souza|Carlos|Pereira|Silva/)
    assert.doesNotMatch(text, /\d{6,}/)
    assert.doesNotMatch(text, /@/)
    assert.doesNotMatch(text, /pix|transfer/i)
  }
  // nenhum rotulo de sujeito vem de uma descricao bloqueada.
  for (const i of insights) {
    if (i.subject.kind === 'merchant') assert.ok(i.subject.label !== null)
  }
})

test('o resultado e o mesmo em UTC e Toquio quando os lancamentos cruzam a meia-noite de Sao Paulo', () => {
  // 23:30 de SP (02:30Z do dia seguinte) e 00:10 de SP: dias diferentes no calendario do Brasil.
  const list = [
    food('n1', '2026-11-17T02:30:00Z'), // 16/11 23:30 em SP
    food('n2', '2026-11-17T03:10:00Z'), // 17/11 00:10 em SP
    food('n3', '2026-11-18T02:59:59Z'), // 17/11 23:59:59 em SP
    food('n4', '2026-11-18T03:00:00Z'), // 18/11 00:00 em SP
  ]
  const r = run(list)
  assert.equal(r.length, 1)
  assert.deepEqual(r[0].evidence.dayKeys, ['2026-11-16', '2026-11-17', '2026-11-18'])
  assert.equal(r[0].metrics.count, 4)
  assert.equal(r[0].day, '2026-11-19')
  // dia sem lancar usa o calendario de SP: 16/11 02:30Z e 15/11 23:30 em SP.
  const quiet = run([tx('saida', 5, '2026-11-16T02:30:00Z', { id: 'q', description: 'Cafe' })])
  assert.equal(quiet[0].metrics.days, 4)
  // "agora" logo depois da meia-noite de SP muda o dia do insight.
  const after = buildInsights({
    now: new Date('2026-11-20T03:05:00Z'),
    person: 'ele',
    cycle,
    transactions: [food('m1', '2026-11-19T15:00:00Z'), food('m2', '2026-11-19T16:00:00Z'), food('m3', '2026-11-19T17:00:00Z')],
    categoryDefs: DEFAULT_CATEGORY_DEFS,
  })
  assert.equal(after[0].day, '2026-11-20')
})

test('buildInsights nao muta as entradas', () => {
  const baseline = ticketBaseline()
  const list = [
    food('t1', '2026-11-16T15:00:00Z'),
    food('t2', '2026-11-17T15:00:00Z'),
    food('t3', '2026-11-18T15:00:00Z'),
    lazer('g1', '2026-11-19T14:00:00Z', 400),
  ]
  const input = {
    now: NOW,
    person: 'ele',
    cycle,
    transactions: list,
    categoryDefs: DEFAULT_CATEGORY_DEFS,
    rows: [row('lazer', 40000, 100000)],
    baseline,
    lastLaunchAt: new Date('2026-11-19T14:00:00Z'),
    rhythmLevel: 1,
  }
  const before = JSON.stringify(input)
  deepFreeze(input)
  const r = buildInsights(input)
  assert.ok(r.length > 0)
  assert.equal(JSON.stringify(input), before)
  // o resultado e novo: mexer nele nao altera a entrada.
  r[0].metrics.count = 999
  assert.equal(JSON.stringify(input), before)
  // buildBaseline tambem nao muta.
  const past = deepFreeze([{ cycle: oct, transactions: [lazer('a', '2026-10-10T15:00:00Z', 100)] }])
  assert.doesNotThrow(() => buildBaseline({ pastCycles: past, categoryDefs: DEFAULT_CATEGORY_DEFS }))
})
