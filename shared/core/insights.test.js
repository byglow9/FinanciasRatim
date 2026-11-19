import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf } from './cycle.js'
import { DEFAULT_CATEGORY_DEFS } from './categories.js'
import { buildInsights, merchantOf, INSIGHT_RULES, INSIGHT_VERSION } from './insights.js'

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
