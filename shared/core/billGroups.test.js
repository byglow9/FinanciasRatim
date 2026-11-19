import { test } from 'node:test'
import assert from 'node:assert/strict'
import { billsForCycle } from './budget.js'
import { cycleOf } from './cycle.js'
import {
  billStatus,
  billSupportText,
  billsSummary,
  groupBillsByCategory,
  validateBillDraft,
} from './billGroups.js'

const at = (iso) => new Date(iso)
const parts = (year, month, day) => ({ year, month, day })

const DEFS = [
  { id: 'moradia', name: 'Moradia' },
  { id: 'servicos', name: 'Servicos' },
  { id: 'saude', name: 'Saude' },
  { id: 'antiga', name: 'Antiga', archived: true },
]

/**
 * Itens de um ciclo, como a tela os recebe: ocorrencias de billsForCycle com a
 * categoria da conta acrescentada pelo chamador.
 */
function itemsFor({ bills, payments = [], cycle }) {
  const byId = new Map(bills.map((b) => [b.id, b]))
  return billsForCycle({ bills, payments, cycle }).items.map((item) => {
    const bill = byId.get(item.billId)
    return { ...item, category: bill.category, categoryId: bill.categoryId }
  })
}

const NOV = cycleOf(at('2026-11-17T15:00:00Z'), 1)

const BILLS = [
  { id: 'luz', name: 'Luz', dueDay: 20, amountCents: 18000, categoryId: 'servicos' },
  { id: 'aluguel', name: 'Aluguel', dueDay: 5, amountCents: 150000, categoryId: 'moradia' },
  { id: 'agua', name: 'Agua', dueDay: 12, amountCents: 9000, categoryId: 'servicos' },
  { id: 'plano', name: 'Plano de saude', dueDay: 8, amountCents: 40000, categoryId: 'saude' },
  { id: 'internet', name: 'Internet', dueDay: 12, amountCents: 11000, categoryId: 'moradia' },
  { id: 'clube', name: 'Clube', dueDay: 1, amountCents: 5000, categoryId: 'antiga' },
  { id: 'jornal', name: 'Jornal', dueDay: 3, amountCents: 3000, category: 'Revistas' },
  { id: 'gibi', name: 'Gibi', dueDay: 4, amountCents: 2000, category: 'Assinaturas' },
]

const keysOf = (groups) => groups.map((g) => g.key)
const idsOf = (groups) => groups.map((g) => g.items.map((i) => i.billId))

test('billStatus: pago vence qualquer data', () => {
  assert.equal(billStatus(parts(2026, 11, 5), true, parts(2026, 11, 30)), 'paid')
  assert.equal(billStatus(parts(2026, 11, 25), true, parts(2026, 11, 1)), 'paid')
})

test('billStatus: vencida, hoje, em breve (1 a 3 dias) e pendente', () => {
  const today = parts(2026, 11, 18)
  assert.equal(billStatus(parts(2026, 11, 17), false, today), 'overdue')
  assert.equal(billStatus(parts(2026, 11, 1), false, today), 'overdue')
  assert.equal(billStatus(parts(2026, 11, 18), false, today), 'today')
  assert.equal(billStatus(parts(2026, 11, 19), false, today), 'soon')
  assert.equal(billStatus(parts(2026, 11, 21), false, today), 'soon')
  assert.equal(billStatus(parts(2026, 11, 22), false, today), 'pending')
  assert.equal(billStatus(parts(2026, 12, 20), false, today), 'pending')
})

test('billStatus compara datas de calendario na virada de mes', () => {
  // hoje 30 nov, ocorrencia 2 dez = 2 dias depois: em breve (o numero 2 < 30 enganaria)
  assert.equal(billStatus(parts(2026, 12, 2), false, parts(2026, 11, 30)), 'soon')
  // hoje 2 dez, ocorrencia 30 nov = vencida
  assert.equal(billStatus(parts(2026, 11, 30), false, parts(2026, 12, 2)), 'overdue')
  // virada de ano
  assert.equal(billStatus(parts(2027, 1, 1), false, parts(2026, 12, 31)), 'soon')
})

test('em ciclo passado todo item nao pago e vencido', () => {
  const items = itemsFor({ bills: BILLS, cycle: NOV })
  const today = parts(2026, 12, 20)
  for (const item of items) {
    assert.equal(billStatus(item.occurrence, item.paid, today), 'overdue')
  }
})

test('grupos seguem a ordem de categoryDefs: ativas, arquivadas, legado A a Z', () => {
  const items = itemsFor({ bills: BILLS, cycle: NOV })
  const groups = groupBillsByCategory(items, DEFS)
  assert.deepEqual(keysOf(groups), [
    'moradia',
    'servicos',
    'saude',
    'antiga',
    'legacy:assinaturas',
    'legacy:revistas',
  ])
  assert.equal(groups[3].def.archived, true)
  assert.equal(groups[4].def, null)
  assert.equal(groups[4].label, 'Assinaturas')
})

test('dentro do grupo: data da ocorrencia, depois nome, depois billId', () => {
  const items = itemsFor({ bills: BILLS, cycle: NOV })
  const groups = groupBillsByCategory(items, DEFS)
  // moradia: aluguel dia 5, internet dia 12
  assert.deepEqual(idsOf(groups)[0], ['aluguel', 'internet'])
  // servicos: agua dia 12, luz dia 20
  assert.deepEqual(idsOf(groups)[1], ['agua', 'luz'])

  // empate de data e de nome: desempata por billId
  const tied = [
    { billId: 'b2', name: 'Seguro', dueDay: 10, occurrence: parts(2026, 11, 10), plannedCents: 100, paid: false, paidCents: 0, costCents: 100, categoryId: 'saude' },
    { billId: 'b1', name: 'Seguro', dueDay: 10, occurrence: parts(2026, 11, 10), plannedCents: 100, paid: false, paidCents: 0, costCents: 100, categoryId: 'saude' },
    { billId: 'b0', name: 'Academia', dueDay: 10, occurrence: parts(2026, 11, 10), plannedCents: 100, paid: false, paidCents: 0, costCents: 100, categoryId: 'saude' },
  ]
  const [group] = groupBillsByCategory(tied, DEFS)
  assert.deepEqual(group.items.map((i) => i.billId), ['b0', 'b1', 'b2'])
})

test('marcar uma conta como paga NAO reordena grupos nem itens', () => {
  const before = groupBillsByCategory(itemsFor({ bills: BILLS, cycle: NOV }), DEFS)
  const payments = [
    { billId: 'aluguel', month: 11, year: 2026, paidCents: 150000 },
    { billId: 'agua', month: 11, year: 2026, paidCents: 9000 },
  ]
  const after = groupBillsByCategory(itemsFor({ bills: BILLS, payments, cycle: NOV }), DEFS)
  assert.deepEqual(keysOf(after), keysOf(before))
  assert.deepEqual(idsOf(after), idsOf(before))
  // o pagamento so muda os contadores
  assert.equal(before[0].paidCount, 0)
  assert.equal(after[0].paidCount, 1)
  assert.equal(after[0].items[0].paid, true)
})

test('pagar a ultima pendente de um grupo nao move o grupo', () => {
  const payments = [
    { billId: 'plano', month: 11, year: 2026, paidCents: 40000 },
  ]
  const groups = groupBillsByCategory(itemsFor({ bills: BILLS, payments, cycle: NOV }), DEFS)
  assert.deepEqual(keysOf(groups).slice(0, 3), ['moradia', 'servicos', 'saude'])
  const saude = groups[2]
  assert.equal(saude.paidCount, saude.totalCount)
  // o grupo todo pago continua visivel no filtro "all"
  assert.equal(saude.items.length, 1)
})

test('filtro pending e paid devolvem subsequencias da ordem de all', () => {
  const payments = [
    { billId: 'aluguel', month: 11, year: 2026, paidCents: 150000 },
    { billId: 'luz', month: 11, year: 2026, paidCents: 18000 },
    { billId: 'plano', month: 11, year: 2026, paidCents: 40000 },
  ]
  const items = itemsFor({ bills: BILLS, payments, cycle: NOV })
  const all = groupBillsByCategory(items, DEFS, 'all')
  const pending = groupBillsByCategory(items, DEFS, 'pending')
  const paid = groupBillsByCategory(items, DEFS, 'paid')

  const isSubsequence = (small, big) => {
    let i = 0
    for (const x of big) if (x === small[i]) i += 1
    return i === small.length
  }
  assert.ok(isSubsequence(keysOf(pending), keysOf(all)), 'pending subsequencia de all')
  assert.ok(isSubsequence(keysOf(paid), keysOf(all)), 'paid subsequencia de all')

  const flatAll = idsOf(all).flat()
  assert.ok(isSubsequence(idsOf(pending).flat(), flatAll))
  assert.ok(isSubsequence(idsOf(paid).flat(), flatAll))

  assert.ok(pending.every((g) => g.items.every((i) => !i.paid)))
  assert.ok(paid.every((g) => g.items.every((i) => i.paid)))
  assert.deepEqual(keysOf(paid), ['moradia', 'servicos', 'saude'])
  // saude so tem item pago: sai do filtro pending
  assert.ok(!keysOf(pending).includes('saude'))
})

test('filtro descarta grupos vazios e mantem contadores e subtotal de todos os itens', () => {
  const payments = [{ billId: 'aluguel', month: 11, year: 2026, paidCents: 150000 }]
  const items = itemsFor({ bills: BILLS, payments, cycle: NOV })
  const all = groupBillsByCategory(items, DEFS, 'all')
  const pending = groupBillsByCategory(items, DEFS, 'pending')
  const allMoradia = all.find((g) => g.key === 'moradia')
  const penMoradia = pending.find((g) => g.key === 'moradia')

  assert.equal(penMoradia.items.length, 1)
  assert.equal(penMoradia.allItems.length, 2)
  assert.equal(penMoradia.totalCount, 2)
  assert.equal(penMoradia.paidCount, 1)
  assert.equal(penMoradia.subtotalCents, allMoradia.subtotalCents)
  // aluguel pago (150000) + internet planejado (11000)
  assert.equal(penMoradia.subtotalCents, 161000)

  const onlyPaid = groupBillsByCategory(items, DEFS, 'paid')
  assert.deepEqual(keysOf(onlyPaid), ['moradia'])
  assert.equal(onlyPaid[0].totalCount, 2)
})

test('filtro sem nenhum item devolve lista vazia', () => {
  const items = itemsFor({ bills: BILLS, cycle: NOV })
  assert.deepEqual(groupBillsByCategory(items, DEFS, 'paid'), [])
  assert.deepEqual(groupBillsByCategory([], DEFS, 'all'), [])
})

test('ciclo de dois meses: dia 25 em 25 nov e dia 5 em 5 dez, e a ordem segue as datas', () => {
  const cycle = cycleOf(at('2026-11-25T15:00:00Z'), 20)
  const bills = [
    { id: 'a', name: 'Cinco', dueDay: 5, amountCents: 1000, categoryId: 'moradia' },
    { id: 'b', name: 'Vinte e cinco', dueDay: 25, amountCents: 2000, categoryId: 'moradia' },
    { id: 'c', name: 'Vinte', dueDay: 20, amountCents: 3000, categoryId: 'moradia' },
  ]
  const items = itemsFor({ bills, cycle })
  const [group] = groupBillsByCategory(items, DEFS)
  assert.deepEqual(
    group.items.map((i) => [i.billId, i.occurrence.month, i.occurrence.day]),
    [
      ['c', 11, 20],
      ['b', 11, 25],
      ['a', 12, 5],
    ],
  )
})

test('conta com ocorrencia nos dois meses de um ciclo curto aparece uma vez por ocorrencia', () => {
  const cycle = cycleOf(at('2026-11-25T15:00:00Z'), 20)
  const bills = [{ id: 'x', name: 'Mensal', dueDay: 20, amountCents: 100, categoryId: 'moradia' }]
  const items = itemsFor({ bills, cycle })
  const [group] = groupBillsByCategory(items, DEFS)
  assert.equal(group.items.length, items.length)
  assert.equal(group.totalCount, items.length)
})

test('categoryId desconhecido cai em grupo legado pelo texto', () => {
  const items = itemsFor({
    bills: [{ id: 'z', name: 'Zeta', dueDay: 9, amountCents: 700, categoryId: 'sumiu', category: 'Outros gastos' }],
    cycle: NOV,
  })
  const groups = groupBillsByCategory(items, DEFS)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].key, 'legacy:outros gastos')
  assert.equal(groups[0].label, 'Outros gastos')
})

test('nao muta a lista de entrada', () => {
  const items = itemsFor({ bills: BILLS, cycle: NOV })
  const snapshot = JSON.stringify(items)
  groupBillsByCategory(items, DEFS, 'pending')
  assert.equal(JSON.stringify(items), snapshot)
})

// ---- resumo, texto de apoio e validacao ----

test('billsSummary: total, pagas e pendentes saem dos mesmos itens da Home', () => {
  const payments = [
    { billId: 'aluguel', month: 11, year: 2026, paidCents: 148000 },
    { billId: 'luz', month: 11, year: 2026, paidCents: 18000 },
  ]
  const result = billsForCycle({ bills: BILLS, payments, cycle: NOV })
  const items = itemsFor({ bills: BILLS, payments, cycle: NOV })
  const summary = billsSummary(items)
  assert.equal(summary.totalCents, result.totalCents)
  assert.equal(summary.count, result.totalCount)
  assert.equal(summary.paidCount, result.paidCount)
  assert.equal(summary.paidCents, 148000 + 18000)
  assert.equal(summary.totalCents, summary.paidCents + summary.pendingCents)
})

test('billsSummary: lista vazia e tudo pendente', () => {
  assert.deepEqual(billsSummary([]), {
    totalCents: 0,
    paidCents: 0,
    pendingCents: 0,
    paidCount: 0,
    count: 0,
  })
  const summary = billsSummary(itemsFor({ bills: BILLS, cycle: NOV }))
  assert.equal(summary.paidCents, 0)
  assert.equal(summary.paidCount, 0)
  assert.equal(summary.pendingCents, summary.totalCents)
})

test('billSupportText: as cinco frases do contrato de copia', () => {
  const today = parts(2026, 11, 18)
  const text = (occ, paid = false) => billSupportText(occ, billStatus(occ, paid, today), today)
  assert.equal(text(parts(2026, 11, 5)), 'Venceu dia 5 \u00b7 13 dias de atraso')
  assert.equal(text(parts(2026, 11, 15)), 'Venceu dia 15 \u00b7 3 dias de atraso')
  assert.equal(text(parts(2026, 11, 17)), 'Venceu dia 17 \u00b7 1 dia de atraso')
  assert.equal(text(parts(2026, 11, 18)), 'Vence hoje')
  assert.equal(text(parts(2026, 11, 19)), 'Vence amanh\u00e3 \u00b7 dia 19')
  assert.equal(text(parts(2026, 11, 21)), 'Vence dia 21 \u00b7 em 3 dias')
  assert.equal(text(parts(2026, 11, 30)), 'Vence dia 30 \u00b7 em 12 dias')
  assert.equal(text(parts(2026, 11, 5), true), 'Paga')
})

test('billSupportText usa a diferenca de calendario na virada de mes', () => {
  const today = parts(2026, 11, 30)
  const occ = parts(2026, 12, 2)
  assert.equal(billSupportText(occ, billStatus(occ, false, today), today), 'Vence dia 2 \u00b7 em 2 dias')
  const tomorrow = parts(2026, 12, 1)
  assert.equal(
    billSupportText(tomorrow, billStatus(tomorrow, false, today), today),
    'Vence amanh\u00e3 \u00b7 dia 1',
  )
  const late = parts(2026, 11, 29)
  assert.equal(
    billSupportText(late, billStatus(late, false, parts(2026, 12, 1)), parts(2026, 12, 1)),
    'Venceu dia 29 \u00b7 2 dias de atraso',
  )
})

const ALLOWED = ['Moradia', 'Servicos', 'Antiga']
const draft = (patch = {}) => ({
  name: 'Aluguel',
  amount: '1.234,56',
  day: '5',
  category: 'Moradia',
  ...patch,
})

test('validateBillDraft: rascunho valido devolve valor em centavos e dia inteiro', () => {
  const r = validateBillDraft(draft(), ALLOWED)
  assert.equal(r.ok, true)
  assert.deepEqual(r.errors, {})
  assert.equal(r.firstInvalid, null)
  assert.deepEqual(r.value, { name: 'Aluguel', amountCents: 123456, day: 5, category: 'Moradia' })
})

test('validateBillDraft: nome vazio ou so espacos', () => {
  for (const name of ['', '   ', '\t']) {
    const r = validateBillDraft(draft({ name }), ALLOWED)
    assert.equal(r.ok, false)
    assert.equal(r.errors.name, 'Informe o nome da conta')
    assert.equal(r.firstInvalid, 'name')
    assert.equal(r.value, null)
  }
  assert.equal(validateBillDraft(draft({ name: '  Luz  ' }), ALLOWED).value.name, 'Luz')
})

test('validateBillDraft: valor nulo, zero ou ilegivel', () => {
  for (const amount of ['', '0', '0,00', 'abc', '12,345', '-5', '1e3', '1.23', undefined]) {
    const r = validateBillDraft(draft({ amount }), ALLOWED)
    assert.equal(r.ok, false, `valor ${amount}`)
    assert.equal(r.errors.amount, 'Informe um valor maior que zero', `valor ${amount}`)
    assert.equal(r.firstInvalid, 'amount')
  }
  assert.equal(validateBillDraft(draft({ amount: '99,9' }), ALLOWED).value.amountCents, 9990)
  assert.equal(validateBillDraft(draft({ amount: '1.200' }), ALLOWED).value.amountCents, 120000)
})

test('validateBillDraft: dia de 1 a 31, so digitos', () => {
  for (const day of ['0', '32', '5a', '', ' ', '-1', '1.5', '100', undefined]) {
    const r = validateBillDraft(draft({ day }), ALLOWED)
    assert.equal(r.ok, false, `dia ${day}`)
    assert.equal(r.errors.day, 'Informe um dia de 1 a 31', `dia ${day}`)
    assert.equal(r.firstInvalid, 'day')
  }
  for (const day of ['1', '15', '31', ' 7 ', 7]) {
    assert.equal(validateBillDraft(draft({ day }), ALLOWED).ok, true, `dia ${day}`)
  }
  assert.equal(validateBillDraft(draft({ day: ' 07 ' }), ALLOWED).value.day, 7)
})

test('validateBillDraft: categoria vazia ou fora das permitidas', () => {
  for (const category of ['', '   ', 'Inexistente', undefined]) {
    const r = validateBillDraft(draft({ category }), ALLOWED)
    assert.equal(r.ok, false, `categoria ${category}`)
    assert.equal(r.errors.category, 'Escolha uma categoria', `categoria ${category}`)
    assert.equal(r.firstInvalid, 'category')
  }
})

test('validateBillDraft: a categoria atual da conta vale mesmo arquivada, se permitida', () => {
  // o chamador inclui a categoria arquivada da propria conta na lista permitida
  const r = validateBillDraft(draft({ category: 'Antiga' }), ALLOWED)
  assert.equal(r.ok, true)
  assert.equal(r.value.category, 'Antiga')
  assert.equal(validateBillDraft(draft({ category: 'Antiga' }), ['Moradia']).ok, false)
})

test('validateBillDraft: erros por campo e firstInvalid na ordem nome, valor, dia, categoria', () => {
  const all = validateBillDraft({ name: '', amount: '', day: '', category: '' }, ALLOWED)
  assert.deepEqual(Object.keys(all.errors), ['name', 'amount', 'day', 'category'])
  assert.equal(all.firstInvalid, 'name')

  const noName = validateBillDraft({ name: 'x', amount: '', day: '', category: '' }, ALLOWED)
  assert.equal(noName.firstInvalid, 'amount')
  assert.deepEqual(Object.keys(noName.errors), ['amount', 'day', 'category'])

  const noDay = validateBillDraft({ name: 'x', amount: '10', day: '40', category: '' }, ALLOWED)
  assert.equal(noDay.firstInvalid, 'day')

  const onlyCat = validateBillDraft({ name: 'x', amount: '10', day: '4', category: '' }, ALLOWED)
  assert.equal(onlyCat.firstInvalid, 'category')
})

test('validateBillDraft: rascunho ausente nao quebra', () => {
  const r = validateBillDraft(/** @type {any} */ (null), ALLOWED)
  assert.equal(r.ok, false)
  assert.equal(r.firstInvalid, 'name')
})
