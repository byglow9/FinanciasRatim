import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf } from './cycle.js'
import { billsForCycle } from './budget.js'
import {
  buildDayModels,
  calendarSummary,
  agendaScrollTarget,
  dayAriaLabel,
} from './calendarModel.js'

const at = (iso) => new Date(iso)

// Ciclo de novembro de 2026 (dia do salario 1) e "hoje" 18 nov 12:00 em Sao Paulo.
const NOV = cycleOf(at('2026-11-18T15:00:00Z'), 1)
const NOW = at('2026-11-18T15:00:00Z')

let seq = 0
/** Transacao de teste: valor em reais, como o app guarda. */
function tx(type, amount, iso, extra = {}) {
  seq += 1
  return { id: `t${seq}`, type, amount, date: at(iso), description: 'x', category: 'Outros', ...extra }
}

function build(over = {}) {
  return buildDayModels({ mode: 'financeiro', cycle: NOV, now: NOW, transactions: [], ...over })
}

test('cria um modelo para cada dia do ciclo, mesmo vazio, em ordem', () => {
  const models = build()
  const keys = [...models.keys()]
  assert.equal(keys.length, 30)
  assert.equal(keys[0], '2026-11-01')
  assert.equal(keys[29], '2026-11-30')
  const empty = models.get('2026-11-10')
  assert.deepEqual(empty.parts, { year: 2026, month: 11, day: 10 })
  assert.deepEqual(empty.items, [])
  assert.equal(empty.netCents, 0)
  assert.equal(empty.spentCents, 0)
  assert.equal(empty.heat, 'none')
  assert.deepEqual(empty.dots, [])
  assert.equal(empty.extraDots, 0)
  assert.deepEqual(empty.postIts, [])
})

test('ciclo que cruza dois meses cobre de startParts a endParts', () => {
  const cycle = cycleOf(at('2026-11-25T15:00:00Z'), 20)
  const models = buildDayModels({ mode: 'financeiro', cycle, now: NOW, transactions: [] })
  const keys = [...models.keys()]
  assert.equal(keys.length, cycle.days)
  assert.equal(keys[0], '2026-11-20')
  assert.equal(keys.at(-1), '2026-12-19')
})

test('saldo do dia = entradas menos saidas; gasto = saidas; centavos inteiros', () => {
  const models = build({
    transactions: [
      tx('entrada', 100, '2026-11-18T15:00:00Z'),
      tx('saida', 30.1, '2026-11-18T16:00:00Z'),
      tx('saida', 0.2, '2026-11-18T17:00:00Z'),
    ],
  })
  const day = models.get('2026-11-18')
  assert.equal(day.netCents, 6970)
  assert.equal(day.spentCents, 3030)
  assert.equal(day.items.length, 3)
  assert.ok(day.items.every((i) => i.kind === 'tx'))
})

test('transferencia verdadeira fica na lista mas fora do saldo e do gasto', () => {
  const models = build({
    transactions: [
      tx('saida', 50, '2026-11-12T15:00:00Z', { transfer: true }),
      tx('saida', 10, '2026-11-12T16:00:00Z'),
    ],
  })
  const day = models.get('2026-11-12')
  assert.equal(day.items.length, 2)
  assert.equal(day.netCents, -1000)
  assert.equal(day.spentCents, 1000)
})

test('a chave do dia vem de Sao Paulo: 02:30Z de 18 ainda e dia 17', () => {
  const models = build({ transactions: [tx('saida', 20, '2026-11-18T02:30:00Z')] })
  assert.equal(models.get('2026-11-17').items.length, 1)
  assert.equal(models.get('2026-11-18').items.length, 0)
  assert.equal(models.get('2026-11-17').netCents, -2000)
})

test('lancamento fora do ciclo e ignorado', () => {
  const models = build({
    transactions: [tx('saida', 20, '2026-10-31T20:00:00Z'), tx('saida', 20, '2026-12-01T03:00:00Z')],
  })
  assert.equal(models.size, 30)
  for (const m of models.values()) assert.equal(m.items.length, 0)
})

test('calor por quartil dos dias gastadores; saldo positivo e pos; sem movimento e none', () => {
  // 8 dias gastadores de R$ 1 a R$ 8: q1 = 3, q2 = 5, q3 = 7 (como em heat.test.js)
  const spend = [1, 2, 3, 4, 5, 6, 7, 8].map((v, i) => tx('saida', v, `2026-11-${String(2 + i).padStart(2, '0')}T15:00:00Z`))
  const models = build({ transactions: [...spend, tx('entrada', 500, '2026-11-12T15:00:00Z')] })
  const heat = (d) => models.get(`2026-11-${d}`).heat
  assert.deepEqual(['02', '03', '04'].map(heat), ['h1', 'h1', 'h1'])
  assert.deepEqual(['05', '06'].map(heat), ['h2', 'h2'])
  assert.deepEqual(['07', '08'].map(heat), ['h3', 'h3'])
  assert.equal(heat('09'), 'h4')
  assert.equal(heat('12'), 'pos')
  assert.equal(heat('13'), 'none')
})

test('menos de quatro dias gastadores: niveis mais altos nao aparecem', () => {
  const models = build({
    transactions: [
      tx('saida', 1, '2026-11-02T15:00:00Z'),
      tx('saida', 5, '2026-11-03T15:00:00Z'),
      tx('saida', 9, '2026-11-04T15:00:00Z'),
    ],
  })
  assert.equal(models.get('2026-11-02').heat, 'h1')
  assert.equal(models.get('2026-11-03').heat, 'h2')
  assert.equal(models.get('2026-11-04').heat, 'h3')
  const one = build({ transactions: [tx('saida', 80, '2026-11-09T15:00:00Z')] })
  assert.equal(one.get('2026-11-09').heat, 'h1')
})

test('transferencia nao entra na base do calor', () => {
  const models = build({
    transactions: [
      tx('saida', 900, '2026-11-02T15:00:00Z', { transfer: true }),
      tx('saida', 10, '2026-11-03T15:00:00Z'),
    ],
  })
  assert.equal(models.get('2026-11-02').heat, 'none')
  assert.equal(models.get('2026-11-03').heat, 'h1')
})

test('no modo agenda todo dia e none, mesmo com gasto', () => {
  const models = buildDayModels({
    mode: 'agenda',
    cycle: NOV,
    now: NOW,
    transactions: [tx('saida', 80, '2026-11-09T15:00:00Z')],
  })
  for (const m of models.values()) assert.equal(m.heat, 'none')
})

test('pontinhos de transacao: entrada e saida, sem repetir cor', () => {
  const models = build({
    transactions: [
      tx('saida', 5, '2026-11-09T12:00:00Z'),
      tx('saida', 7, '2026-11-09T13:00:00Z'),
      tx('entrada', 50, '2026-11-09T14:00:00Z'),
    ],
  })
  const day = models.get('2026-11-09')
  assert.deepEqual(day.dots, [{ kind: 'in' }, { kind: 'out' }])
  assert.equal(day.extraDots, 0)
})

test('isToday so para a chave de hoje em Sao Paulo', () => {
  const models = build()
  assert.equal(models.get('2026-11-18').isToday, true)
  assert.equal(models.get('2026-11-17').isToday, false)
  assert.equal(models.get('2026-11-19').isToday, false)
  // 02:30Z de 19 nov ainda e 18 nov em Sao Paulo
  const late = buildDayModels({ mode: 'financeiro', cycle: NOV, now: at('2026-11-19T02:30:00Z'), transactions: [] })
  assert.equal(late.get('2026-11-18').isToday, true)
  assert.equal(late.get('2026-11-19').isToday, false)
})

test('hoje fora do ciclo exibido nao marca nenhum dia', () => {
  const dec = cycleOf(at('2026-12-10T15:00:00Z'), 1)
  const models = buildDayModels({ mode: 'financeiro', cycle: dec, now: NOW, transactions: [] })
  assert.ok([...models.values()].every((m) => m.isToday === false))
})

test('dentro do dia, lancamentos seguem a ordem do horario', () => {
  const models = build({
    transactions: [
      tx('saida', 1, '2026-11-09T18:00:00Z', { description: 'tarde' }),
      tx('saida', 1, '2026-11-09T12:00:00Z', { description: 'manha' }),
    ],
  })
  assert.deepEqual(
    models.get('2026-11-09').items.map((i) => i.title),
    ['manha', 'tarde'],
  )
})

// ---------------------------------------------------------------------------
// Task 2: camadas completas, resumo, alvo da agenda e rotulo de acessibilidade
// ---------------------------------------------------------------------------

/** Ocorrencias de billsForCycle, como a tela as recebe. */
function billItemsFor(cycle, bills, payments = []) {
  return billsForCycle({ bills, payments, cycle }).items
}

const bill = (id, dueDay, amountCents, name = id) => ({ id, name, dueDay, amountCents })

test('conta aparece so na data da ocorrencia, nunca em outra celula de mesmo numero de dia', () => {
  // ciclo de 20 nov a 19 dez (salario dia 20)
  const cycle = cycleOf(at('2026-11-25T15:00:00Z'), 20)
  const billItems = billItemsFor(cycle, [bill('luz', 19, 18000), bill('net', 25, 9000), bill('alug', 5, 150000)])
  const models = buildDayModels({ mode: 'financeiro', cycle, now: at('2026-11-25T15:00:00Z'), billItems })
  const where = (id) =>
    [...models.values()].filter((m) => m.items.some((i) => i.kind === 'bill' && i.billId === id)).map((m) => m.key)
  assert.deepEqual(where('luz'), ['2026-12-19'])
  assert.deepEqual(where('net'), ['2026-11-25'])
  assert.deepEqual(where('alug'), ['2026-12-05'])
  // o dia 19 de novembro e de dezembro nao existem as duas vezes no ciclo
  assert.equal(models.has('2026-11-19'), false)
})

test('estado da conta na data da ocorrencia e pontinho pendente ou pago', () => {
  const billItems = billItemsFor(
    NOV,
    [bill('a', 15, 10000), bill('b', 18, 20000), bill('c', 20, 30000), bill('d', 28, 40000), bill('e', 15, 5000)],
    [{ billId: 'e', month: 11, year: 2026, paidCents: 5000 }],
  )
  const models = build({ billItems })
  const bills = (key) => models.get(key).items.filter((i) => i.kind === 'bill')
  const byId = (id) => [...models.values()].flatMap((m) => m.items).find((i) => i.kind === 'bill' && i.billId === id)
  assert.equal(byId('a').status, 'overdue')
  assert.equal(byId('b').status, 'today')
  assert.equal(byId('c').status, 'soon')
  assert.equal(byId('d').status, 'pending')
  assert.equal(byId('e').status, 'paid')
  assert.equal(byId('e').paid, true)
  // dia 15: uma pendente e uma paga, dois pontinhos distintos
  assert.equal(bills('2026-11-15').length, 2)
  assert.deepEqual(models.get('2026-11-15').dots, [{ kind: 'bill-pending' }, { kind: 'bill-paid' }])
  // conta nao mexe no saldo do dia nem no calor
  assert.equal(models.get('2026-11-15').netCents, 0)
  assert.equal(models.get('2026-11-15').heat, 'none')
})

test('conta usa o valor pago quando paga e o planejado quando nao', () => {
  const billItems = billItemsFor(NOV, [bill('a', 10, 10000), bill('b', 11, 20000)], [
    { billId: 'a', month: 11, year: 2026, paidCents: 9500 },
  ])
  const models = build({ billItems })
  assert.equal(models.get('2026-11-10').items[0].amountCents, 9500)
  assert.equal(models.get('2026-11-11').items[0].amountCents, 20000)
  assert.equal(models.get('2026-11-11').items[0].plannedCents, 20000)
})

test('porquinho vira pig e aporte de meta vira goal, no mesmo dia, nessa ordem', () => {
  const models = build({
    savings: [{ id: 's1', type: 'deposito', amount: 150, description: 'Guardei', person: 'ele', date: at('2026-11-12T15:00:00Z') }],
    contributions: [
      { id: 'c1', goalId: 'g1', amount: 300, description: 'Viagem', goalName: 'Viagem', date: at('2026-11-12T16:00:00Z') },
    ],
  })
  const day = models.get('2026-11-12')
  assert.deepEqual(day.dots, [{ kind: 'pig' }, { kind: 'goal' }])
  assert.deepEqual(day.items.map((i) => i.kind), ['savings', 'goal'])
  assert.equal(day.items[0].amountCents, 15000)
  assert.equal(day.items[0].type, 'deposito')
  assert.equal(day.items[1].amountCents, 30000)
  assert.equal(day.items[1].title, 'Viagem')
  // porquinho e meta nao entram no saldo do dia
  assert.equal(day.netCents, 0)
})

test('porquinho e aporte fora do ciclo sao ignorados', () => {
  const models = build({
    savings: [{ id: 's1', type: 'saque', amount: 10, description: '', person: 'ele', date: at('2026-10-20T15:00:00Z') }],
    contributions: [{ id: 'c1', goalId: 'g1', amount: 10, date: at('2026-12-20T15:00:00Z') }],
  })
  for (const m of models.values()) assert.equal(m.items.length, 0)
})

test('nota nunca vira pontinho; entra em postIts com a cor, no maximo 2 (as mais recentes)', () => {
  const note = (id, color, created, extra = {}) => ({
    id,
    title: id,
    content: '',
    color,
    date: at('2026-11-18T15:00:00Z'),
    createdAt: at(created),
    ...extra,
  })
  const models = build({
    notes: [
      note('n1', 'yellow', '2026-11-01T10:00:00Z'),
      note('n2', 'pink', '2026-11-03T10:00:00Z'),
      note('n3', 'green', '2026-11-02T10:00:00Z'),
    ],
  })
  const day = models.get('2026-11-18')
  assert.deepEqual(day.postIts, ['pink', 'green'])
  assert.deepEqual(day.dots, [])
  assert.equal(day.extraDots, 0)
  assert.deepEqual(day.items.map((i) => i.id), ['n2', 'n3', 'n1'])
  assert.ok(day.items.every((i) => i.kind === 'note'))
  // nota nao mexe no calor nem no saldo
  assert.equal(day.heat, 'none')
  assert.equal(day.netCents, 0)
})

test('nota sem data nao entra no calendario, como o app faz hoje', () => {
  const models = build({
    notes: [{ id: 'n1', title: 'x', content: '', color: 'blue', createdAt: at('2026-11-18T15:00:00Z') }],
  })
  for (const m of models.values()) assert.equal(m.items.length, 0)
})

test('mais de 3 tipos de ponto: ordem in, out, conta pendente, conta paga, pig, goal, com +n', () => {
  const billItems = billItemsFor(NOV, [bill('a', 12, 1000), bill('b', 12, 2000)], [
    { billId: 'b', month: 11, year: 2026, paidCents: 2000 },
  ])
  const models = build({
    transactions: [tx('saida', 5, '2026-11-12T12:00:00Z'), tx('entrada', 9, '2026-11-12T13:00:00Z')],
    billItems,
    savings: [{ id: 's1', type: 'deposito', amount: 1, description: '', person: 'ele', date: at('2026-11-12T14:00:00Z') }],
    contributions: [{ id: 'c1', goalId: 'g', amount: 1, date: at('2026-11-12T15:00:00Z') }],
  })
  const day = models.get('2026-11-12')
  assert.deepEqual(day.dots, [{ kind: 'in' }, { kind: 'out' }, { kind: 'bill-pending' }])
  assert.equal(day.extraDots, 3)
  // ordem dos itens: contas, lancamentos, porquinho, meta
  assert.deepEqual(day.items.map((i) => i.kind), ['bill', 'bill', 'tx', 'tx', 'savings', 'goal'])
})

test('modo agenda: eventos por hora (sem hora primeiro), depois notas; sem camada financeira', () => {
  const cats = [
    { id: 'c1', name: 'Saude', color: '#3b82f6' },
    { id: 'c2', name: 'Lazer', color: '#F97316' },
  ]
  const ev = (id, categoryId, time, title = id) => ({
    id,
    person: 'ele',
    title,
    date: at('2026-11-18T15:00:00Z'),
    time,
    categoryId,
    createdAt: at('2026-11-01T10:00:00Z'),
  })
  const models = buildDayModels({
    mode: 'agenda',
    cycle: NOV,
    now: NOW,
    eventCategories: cats,
    events: [ev('e1', 'c1', '15:30'), ev('e2', 'c2', undefined), ev('e3', 'c1', '09:00'), ev('e4', 'zzz', '10:00')],
    notes: [{ id: 'n1', title: 'n', content: '', color: 'blue', date: at('2026-11-18T15:00:00Z'), createdAt: at('2026-11-02T10:00:00Z') }],
    transactions: [tx('saida', 80, '2026-11-18T15:00:00Z')],
    billItems: billItemsFor(NOV, [bill('luz', 18, 100)]),
  })
  const day = models.get('2026-11-18')
  assert.deepEqual(day.items.map((i) => i.id), ['e2', 'e3', 'e4', 'e1', 'n1'])
  assert.deepEqual(
    day.items.filter((i) => i.kind === 'event').map((i) => i.color),
    ['#f97316', '#3b82f6', '#6b7280', '#3b82f6'],
  )
  // um ponto por cor de categoria (hex), na ordem dos itens
  assert.deepEqual(day.dots, [
    { kind: 'event', hex: '#f97316' },
    { kind: 'event', hex: '#3b82f6' },
    { kind: 'event', hex: '#6b7280' },
  ])
  assert.equal(day.extraDots, 0)
  assert.deepEqual(day.postIts, ['blue'])
  assert.equal(day.netCents, 0)
  assert.equal(day.heat, 'none')
})

test('modo agenda: mais de 3 cores de categoria viram +n', () => {
  const cats = ['#111111', '#222222', '#333333', '#444444', '#555555'].map((color, i) => ({ id: `c${i}`, name: `c${i}`, color }))
  const events = cats.map((c, i) => ({
    id: `e${i}`,
    person: 'ele',
    title: `e${i}`,
    date: at('2026-11-05T15:00:00Z'),
    categoryId: c.id,
    time: `0${i}:00`,
    createdAt: at('2026-11-01T10:00:00Z'),
  }))
  const day = buildDayModels({ mode: 'agenda', cycle: NOV, now: NOW, eventCategories: cats, events }).get('2026-11-05')
  assert.equal(day.dots.length, 3)
  assert.equal(day.extraDots, 2)
})

test('calendarSummary: saidas do ciclo sem transferencia e planejado das contas nao pagas', () => {
  const billItems = billItemsFor(
    NOV,
    [bill('a', 10, 10000), bill('b', 11, 20000), bill('c', 12, 30000)],
    [{ billId: 'a', month: 11, year: 2026, paidCents: 9000 }],
  )
  const summary = calendarSummary({
    transactions: [
      tx('saida', 10.5, '2026-11-03T12:00:00Z'),
      tx('saida', 99, '2026-11-04T12:00:00Z', { transfer: true }),
      tx('entrada', 500, '2026-11-05T12:00:00Z'),
      tx('saida', 20, '2026-11-06T12:00:00Z'),
    ],
    billItems,
  })
  assert.deepEqual(summary, { spentCents: 3050, toPayCents: 50000 })
  assert.deepEqual(calendarSummary({ transactions: [], billItems: [] }), { spentCents: 0, toPayCents: 0 })
})

test('agendaScrollTarget: primeiro dia com item >= desejado, senao o ultimo, senao null', () => {
  const days = ['2026-11-05', '2026-11-18', '2026-11-25']
  assert.equal(agendaScrollTarget(days, '2026-11-18'), '2026-11-18')
  assert.equal(agendaScrollTarget(days, '2026-11-20'), '2026-11-25')
  assert.equal(agendaScrollTarget(days, '2026-11-01'), '2026-11-05')
  assert.equal(agendaScrollTarget(days, '2026-11-30'), '2026-11-25')
  assert.equal(agendaScrollTarget([], '2026-11-18'), null)
  // nao depende da ordem da entrada nem a muda
  const shuffled = ['2026-11-25', '2026-11-05', '2026-11-18']
  assert.equal(agendaScrollTarget(shuffled, '2026-11-06'), '2026-11-18')
  assert.deepEqual(shuffled, ['2026-11-25', '2026-11-05', '2026-11-18'])
})

test('dayAriaLabel: dia, hoje, itens e saldo, omitindo o que nao se aplica', () => {
  const models = build({
    transactions: [
      tx('saida', 200, '2026-11-18T12:00:00Z'),
      tx('saida', 100, '2026-11-18T13:00:00Z'),
      tx('saida', 96, '2026-11-18T14:00:00Z'),
      tx('entrada', 1200, '2026-11-19T12:00:00Z'),
    ],
  })
  assert.equal(dayAriaLabel(models.get('2026-11-18'), 'financeiro'), '18 de novembro, hoje, 3 itens, saldo \u2212396')
  assert.equal(dayAriaLabel(models.get('2026-11-19'), 'financeiro'), '19 de novembro, 1 item, saldo +1,2k')
  assert.equal(dayAriaLabel(models.get('2026-11-05'), 'financeiro'), '5 de novembro')
  // no modo agenda nao ha saldo
  assert.equal(dayAriaLabel(models.get('2026-11-18'), 'agenda'), '18 de novembro, hoje, 3 itens')
  // mes por extenso com acento
  const mar = buildDayModels({ mode: 'financeiro', cycle: cycleOf(at('2026-03-10T15:00:00Z'), 1), now: NOW })
  assert.equal(dayAriaLabel(mar.get('2026-03-01'), 'financeiro'), '1 de mar\u00e7o')
})
