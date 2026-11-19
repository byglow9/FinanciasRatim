import { test } from 'node:test'
import assert from 'node:assert/strict'
import { billsForCycle } from './budget.js'
import { cycleOf } from './cycle.js'
import { billStatus, groupBillsByCategory } from './billGroups.js'

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
