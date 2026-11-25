import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CLOSING_DAY_STARTS_NEXT_BILL,
  parseBillMonth,
  shiftBillMonth,
  closingPartsOf,
  duePartsOf,
  billMonthOf,
  derivedBillMonth,
  openBillMonth,
  derivationMismatch,
  BILL_STATUSES,
  sumBillTotals,
  cardBillStatus,
  groupBills,
  billDayGroups,
} from './cardBills.js'

// Meio-dia em Sao Paulo (15:00 UTC): nunca cruza a virada do dia em UTC nem em Tokyo.
const at = (day) => new Date(`${day}T15:00:00Z`)

test('parseBillMonth le AAAA-MM e recusa texto invalido', () => {
  assert.deepEqual(parseBillMonth('2026-12'), { year: 2026, month: 12 })
  for (const bad of ['2026-13', '2026-00', 'x', '2026-1', '', null, undefined, 202612, {}]) {
    assert.equal(parseBillMonth(bad), null, String(bad))
  }
})

test('shiftBillMonth anda para frente e para tras atravessando o ano', () => {
  assert.equal(shiftBillMonth('2026-12', 1), '2027-01')
  assert.equal(shiftBillMonth('2026-12', -12), '2025-12')
  assert.equal(shiftBillMonth('2026-01', -1), '2025-12')
  assert.equal(shiftBillMonth('lixo', 1), null)
})

test('closingPartsOf: dia do fechamento, limitado ao tamanho do mes', () => {
  assert.deepEqual(closingPartsOf('2026-12', 7), { year: 2026, month: 12, day: 7 })
  assert.deepEqual(closingPartsOf('2027-02', 31), { year: 2027, month: 2, day: 28 })
  assert.deepEqual(closingPartsOf('2028-02', 31), { year: 2028, month: 2, day: 29 })
  for (const bad of [0, 32, 7.5, '7', null, undefined, NaN]) {
    assert.equal(closingPartsOf('2026-12', bad), null, String(bad))
  }
  assert.equal(closingPartsOf('x', 7), null)
})

test('duePartsOf: primeiro dia de vencimento depois do fechamento', () => {
  assert.deepEqual(duePartsOf('2026-12', 7, 14), { year: 2026, month: 12, day: 14 })
  assert.deepEqual(duePartsOf('2026-12', 25, 5), { year: 2027, month: 1, day: 5 })
  // vencimento igual ao fechamento vai para o mes seguinte
  assert.deepEqual(duePartsOf('2026-12', 7, 7), { year: 2027, month: 1, day: 7 })
  // dia 31 em mes curto vira o ultimo dia
  assert.deepEqual(duePartsOf('2027-01', 20, 31), { year: 2027, month: 1, day: 31 })
  assert.deepEqual(duePartsOf('2027-01', 31, 31), { year: 2027, month: 2, day: 28 })
  assert.equal(duePartsOf('2026-12', 7, 0), null)
  assert.equal(duePartsOf('2026-12', undefined, 14), null)
  assert.equal(duePartsOf('x', 7, 14), null)
})

test('billMonthOf: o mes da Pluggy sempre vence', () => {
  assert.deepEqual(
    billMonthOf({ billMonth: '2026-12', date: at('2026-05-01'), closingDay: 7 }),
    { billMonth: '2026-12', source: 'pluggy' },
  )
  assert.deepEqual(
    billMonthOf({ billMonth: '2026-12' }),
    { billMonth: '2026-12', source: 'pluggy' },
  )
})

test('billMonthOf: sem mes da Pluggy deriva pelo fechamento do dono', () => {
  const r = (date, closingDay) => billMonthOf({ date: at(date), closingDay })
  assert.deepEqual(r('2026-11-08', 7), { billMonth: '2026-12', source: 'derived' })
  assert.deepEqual(r('2026-11-07', 7), { billMonth: '2026-11', source: 'derived' })
  assert.deepEqual(r('2026-12-31', 7), { billMonth: '2027-01', source: 'derived' })
  assert.deepEqual(r('2026-11-08', undefined), { billMonth: null, source: 'unknown' })
  assert.deepEqual(r('2026-11-08', 99), { billMonth: null, source: 'unknown' })
  assert.deepEqual(billMonthOf({ closingDay: 7 }), { billMonth: null, source: 'unknown' })
  assert.deepEqual(billMonthOf({ billMonth: 'lixo', date: 'nao-e-data', closingDay: 7 }), {
    billMonth: null,
    source: 'unknown',
  })
})

test('billMonthOf: usa o dia de Sao Paulo, nao o do fuso do host', () => {
  // 01:30 UTC de 08/11 ainda e 07/11 em Sao Paulo: cai na fatura de novembro.
  const lateNight = new Date('2026-11-08T01:30:00Z')
  assert.equal(billMonthOf({ date: lateNight, closingDay: 7 }).billMonth, '2026-11')
})

test('billMonthOf: dia de fechamento maior que o mes usa o ultimo dia', () => {
  // fechamento 31: em fevereiro fecha no dia 28, entao 28/02 ainda e da fatura de fevereiro
  assert.equal(billMonthOf({ date: at('2027-02-28'), closingDay: 31 }).billMonth, '2027-02')
  assert.equal(billMonthOf({ date: at('2027-03-01'), closingDay: 31 }).billMonth, '2027-03')
})

test('a regra do dia do fechamento mora em uma so constante', () => {
  assert.equal(CLOSING_DAY_STARTS_NEXT_BILL, false)
  const day = { year: 2026, month: 11, day: 7 }
  // com a regra padrao o dia do fechamento fica na fatura que fecha nele
  assert.equal(derivedBillMonth(day, 7), '2026-11')
  assert.equal(derivedBillMonth(day, 7, CLOSING_DAY_STARTS_NEXT_BILL), '2026-11')
  // contrato: invertida a regra, o dia do fechamento cai na fatura seguinte
  assert.equal(derivedBillMonth(day, 7, true), '2026-12')
  // o dia anterior ao fechamento nao muda com a regra
  const before = { year: 2026, month: 11, day: 6 }
  assert.equal(derivedBillMonth(before, 7, true), '2026-11')
})

test('openBillMonth: fatura que ainda aceita compras agora', () => {
  assert.equal(openBillMonth(at('2026-11-24'), 7), '2026-12')
  assert.equal(openBillMonth(at('2026-12-07'), 7), '2026-12')
  assert.equal(openBillMonth(at('2026-12-08'), 7), '2027-01')
  assert.equal(openBillMonth(at('2026-11-24'), undefined), null)
  assert.equal(openBillMonth(at('2026-11-24'), 0), null)
  assert.equal(openBillMonth(new Date('lixo'), 7), null)
})

test('derivationMismatch conta compras em que o mes da Pluggy difere do derivado', () => {
  const six = ['2026-11-08', '2026-11-10', '2026-11-12', '2026-11-15', '2026-11-20', '2026-11-24'].map(
    (d) => ({ cardKind: 'purchase', billMonth: '2026-12', date: at(d) }),
  )
  assert.equal(derivationMismatch(six, 7), 0)
  // compra de 01/10 com fechamento 7 deriva para outubro, mas a Pluggy disse dezembro
  const wrong = [...six, { cardKind: 'purchase', billMonth: '2026-12', date: at('2026-10-01') }]
  assert.equal(derivationMismatch(wrong, 7), 1)
  // sem mes da Pluggy ou sem fechamento nao ha o que comparar
  assert.equal(derivationMismatch([{ cardKind: 'purchase', date: at('2026-11-08') }], 7), 0)
  assert.equal(derivationMismatch(six, undefined), 0)
  assert.equal(derivationMismatch(null, 7), 0)
})

// As seis compras reais do dono (D-08): fatura 2026-12 de 181,41.
const SIX = [
  ['2026-11-08', 30.08],
  ['2026-11-10', 45.9],
  ['2026-11-12', 12.34],
  ['2026-11-15', 50],
  ['2026-11-20', 20],
  ['2026-11-24', 23.09],
].map(([d, amount], i) => ({
  id: `c${i}`,
  cardKind: 'purchase',
  cardStatus: 'pending',
  billMonth: '2026-12',
  amount,
  date: at(d),
  bankImportId: `bank-${i}`,
}))

test('sumBillTotals soma em centavos inteiros por mes da fatura', () => {
  assert.deepEqual(sumBillTotals(SIX), { totals: { '2026-12': 18141 }, unassignedCents: 0 })
  const float = [
    { cardKind: 'purchase', billMonth: '2026-12', amount: 0.1 },
    { cardKind: 'purchase', billMonth: '2026-12', amount: 0.2 },
  ]
  assert.equal(sumBillTotals(float).totals['2026-12'], 30)
})

test('sumBillTotals: estorno subtrai, pagamento e outros tipos nao entram, sem mes vai para unassigned', () => {
  const txs = [
    { cardKind: 'purchase', billMonth: '2026-12', amount: 100 },
    { cardKind: 'refund', billMonth: '2026-12', amount: 30 },
    { cardKind: 'payment', billMonth: '2026-12', amount: 70 },
    { cardKind: 'transfer', billMonth: '2026-12', amount: 9 },
    { cardKind: 'purchase', amount: 12.5 },
  ]
  assert.deepEqual(sumBillTotals(txs), { totals: { '2026-12': 7000 }, unassignedCents: 1250 })
  assert.deepEqual(sumBillTotals(null), { totals: {}, unassignedCents: 0 })
})

test('sumBillTotals deriva o mes da compra lancada a mao pelo fechamento (D-12)', () => {
  const manual = { cardKind: 'purchase', amount: 40, date: at('2026-11-08') }
  assert.deepEqual(sumBillTotals([manual], { closingDay: 7 }), { totals: { '2026-12': 4000 }, unassignedCents: 0 })
  assert.deepEqual(sumBillTotals([manual], {}), { totals: {}, unassignedCents: 4000 })
  assert.deepEqual(sumBillTotals([manual]), { totals: {}, unassignedCents: 4000 })
  // quem ja traz billMonth usa o dele e ignora o fechamento
  const piped = { cardKind: 'purchase', amount: 40, billMonth: '2027-03', date: at('2026-11-08') }
  assert.deepEqual(sumBillTotals([piped], { closingDay: 7 }), { totals: { '2027-03': 4000 }, unassignedCents: 0 })
})

const BASE = { billMonth: '2026-12', totalCents: 18141, paidCents: 0, closingDay: 7, dueDay: 14 }
const status = (day, extra = {}) => cardBillStatus({ ...BASE, now: at(day), ...extra })

test('BILL_STATUSES tem o vocabulario proprio da fatura', () => {
  assert.deepEqual([...BILL_STATUSES], ['aberta', 'fechada', 'paga', 'atrasada', 'futura'])
})

test('cardBillStatus: transicoes nas datas reais do dono', () => {
  assert.deepEqual(status('2026-11-24'), { status: 'aberta', remainingCents: 18141 })
  assert.equal(status('2026-12-07').status, 'aberta')
  assert.equal(status('2026-12-08').status, 'fechada')
  assert.equal(status('2026-12-14').status, 'fechada')
  assert.deepEqual(status('2026-12-15'), { status: 'atrasada', remainingCents: 18141 })
})

test('cardBillStatus: paga quando o pago cobre o total, parcial mantem o saldo', () => {
  assert.deepEqual(status('2026-12-10', { paidCents: 18141 }), { status: 'paga', remainingCents: 0 })
  assert.deepEqual(status('2027-02-01', { paidCents: 20000 }), { status: 'paga', remainingCents: 0 })
  assert.deepEqual(status('2026-12-10', { paidCents: 10000 }), { status: 'fechada', remainingCents: 8141 })
  assert.deepEqual(status('2026-12-20', { paidCents: 10000 }), { status: 'atrasada', remainingCents: 8141 })
  // pagamento antes do fechamento nao marca paga
  assert.equal(status('2026-11-24', { paidCents: 18141 }).status, 'aberta')
})

test('cardBillStatus: override do dono so vale para fatura ja fechada', () => {
  assert.equal(status('2026-12-20', { overridePaid: true }).status, 'paga')
  assert.equal(status('2026-12-10', { overridePaid: true }).status, 'paga')
  assert.equal(status('2026-11-24', { overridePaid: true }).status, 'aberta')
  assert.equal(status('2026-11-24', { overridePaid: true, billMonth: '2027-02' }).status, 'futura')
})

test('cardBillStatus: mes depois da fatura aberta e futura', () => {
  assert.equal(status('2026-11-24', { billMonth: '2027-01' }).status, 'futura')
  assert.equal(status('2026-12-08', { billMonth: '2027-01' }).status, 'aberta')
})

test('cardBillStatus: sem fechamento ou vencimento o status e null', () => {
  assert.equal(status('2026-12-20', { closingDay: undefined }).status, null)
  assert.equal(status('2026-12-20', { dueDay: undefined }).status, null)
  assert.equal(status('2026-12-20', { dueDay: 40 }).status, null)
  assert.equal(status('2026-12-20', { billMonth: 'lixo' }).status, null)
  assert.equal(cardBillStatus({ ...BASE, now: new Date('lixo') }).status, null)
  assert.equal(cardBillStatus(undefined).status, null)
})

test('cardBillStatus: fatura vazia nao vira paga por pago zero', () => {
  assert.deepEqual(status('2026-12-10', { totalCents: 0, paidCents: 0 }), { status: 'fechada', remainingCents: 0 })
  assert.equal(status('2026-12-20', { totalCents: 0, paidCents: 0 }).status, 'fechada')
})

const GROUP = { closingDay: 7, dueDay: 14, now: at('2026-11-24') }

test('groupBills: as seis compras reais viram a fatura 2026-12 de 181,41', () => {
  const { bills, unassignedCents } = groupBills({ txs: SIX, ...GROUP })
  assert.equal(unassignedCents, 0)
  assert.equal(bills.length, 1)
  const [b] = bills
  assert.equal(b.billMonth, '2026-12')
  assert.deepEqual(b.closeParts, { year: 2026, month: 12, day: 7 })
  assert.deepEqual(b.dueParts, { year: 2026, month: 12, day: 14 })
  assert.equal(b.totalCents, 18141)
  assert.equal(b.paidCents, 0)
  assert.equal(b.remainingCents, 18141)
  assert.equal(b.count, 6)
  assert.equal(b.pendingCount, 6)
  assert.equal(b.status, 'aberta')
  assert.equal(b.isCurrent, true)
  assert.equal(b.isNext, false)
  assert.equal(b.items.length, 6)
  assert.ok(b.items.every((i) => i.origin === 'bank'))
  // itens em ordem decrescente de data
  assert.equal(b.items[0].id, 'c5')
  assert.equal(b.items[5].id, 'c0')
})

test('groupBills: dois meses em ordem crescente e pagamento ligado a fatura', () => {
  const nov = { id: 'n1', cardKind: 'purchase', cardStatus: 'posted', billMonth: '2026-11', amount: 250, date: at('2026-10-20'), bankImportId: 'b' }
  const input = { txs: [...SIX, nov], payments: [{ billMonth: '2026-11', cents: 25000 }, { billMonth: '2026-09', cents: 99999 }], ...GROUP }
  const { bills } = groupBills(input)
  assert.deepEqual(bills.map((b) => b.billMonth), ['2026-11', '2026-12'])
  const [n, d] = bills
  assert.equal(n.status, 'paga')
  assert.equal(n.paidCents, 25000)
  assert.equal(n.remainingCents, 0)
  assert.equal(n.pendingCount, 0)
  assert.equal(d.status, 'aberta')
  // sem pagamento, a de novembro (fechada em 07/11 e vencida em 14/11) fica atrasada
  const unpaid = groupBills({ txs: [...SIX, nov], ...GROUP }).bills[0]
  assert.equal(unpaid.status, 'atrasada')
  assert.equal(unpaid.remainingCents, 25000)
  // marcada como paga pelo dono
  const marked = groupBills({ txs: [...SIX, nov], paidMonths: ['2026-11'], ...GROUP }).bills[0]
  assert.equal(marked.status, 'paga')
})

test('groupBills: sem fechamento agrupa so pelo mes da Pluggy e deixa datas e status null', () => {
  const { bills } = groupBills({ txs: SIX, now: at('2026-11-24') })
  assert.equal(bills.length, 1)
  assert.equal(bills[0].billMonth, '2026-12')
  assert.equal(bills[0].totalCents, 18141)
  assert.equal(bills[0].closeParts, null)
  assert.equal(bills[0].dueParts, null)
  assert.equal(bills[0].status, null)
  assert.equal(bills[0].isCurrent, false)
  // so fechamento, sem vencimento: fechamento aparece, status segue null
  const half = groupBills({ txs: SIX, closingDay: 7, now: at('2026-11-24') }).bills[0]
  assert.deepEqual(half.closeParts, { year: 2026, month: 12, day: 7 })
  assert.equal(half.dueParts, null)
  assert.equal(half.status, null)
})

test('groupBills: marca a fatura aberta e a seguinte, e faturas futuras entram como futura', () => {
  const jan = { id: 'j1', cardKind: 'purchase', cardStatus: 'pending', billMonth: '2027-01', amount: 80, date: at('2026-12-20'), bankImportId: 'b' }
  const mar = { id: 'm1', cardKind: 'purchase', cardStatus: 'pending', billMonth: '2027-03', amount: 10, date: at('2027-02-20'), bankImportId: 'b' }
  const { bills } = groupBills({ txs: [...SIX, jan, mar], ...GROUP })
  assert.deepEqual(bills.map((b) => [b.billMonth, b.status, b.isCurrent, b.isNext]), [
    ['2026-12', 'aberta', true, false],
    ['2027-01', 'futura', false, true],
    ['2027-03', 'futura', false, false],
  ])
})

test('groupBills: pagamento nunca entra no total, na contagem nem nos itens', () => {
  const pay = { id: 'p1', cardKind: 'payment', billMonth: '2026-12', amount: 500, date: at('2026-11-20') }
  const refund = { id: 'r1', cardKind: 'refund', cardStatus: 'posted', billMonth: '2026-12', amount: 11.41, date: at('2026-11-21'), bankImportId: 'b' }
  const { bills } = groupBills({ txs: [...SIX, pay, refund], ...GROUP })
  const [b] = bills
  assert.equal(b.totalCents, 18141 - 1141)
  assert.equal(b.count, 6)
  assert.deepEqual(b.items.map((i) => i.cardKind).filter((k) => k === 'payment'), [])
  assert.equal(b.items.length, 7)
  assert.equal(b.items.find((i) => i.id === 'r1').amountCents, -1141)
})

test('groupBills: compra lancada a mao entra pelo mes derivado e e marcada como manual (D-12)', () => {
  const manual = { id: 'man1', cardKind: 'purchase', amount: 40, date: at('2026-11-08'), description: 'Padaria' }
  const { bills, unassignedCents } = groupBills({ txs: [...SIX, manual], ...GROUP })
  assert.equal(unassignedCents, 0)
  const [b] = bills
  assert.equal(b.totalCents, 18141 + 4000)
  assert.equal(b.count, 7)
  assert.equal(b.pendingCount, 6)
  const item = b.items.find((i) => i.id === 'man1')
  assert.equal(item.origin, 'manual')
  assert.equal(item.billSource, 'derived')
  assert.equal(b.items.find((i) => i.id === 'c0').origin, 'bank')
  // sem fechamento informado ela vai para unassignedCents e fica fora da lista
  const semFechamento = groupBills({ txs: [manual], now: at('2026-11-24') })
  assert.deepEqual(semFechamento.bills, [])
  assert.equal(semFechamento.unassignedCents, 4000)
})

test('groupBills: entrada fora do tipo devolve resultado vazio sem lancar', () => {
  assert.deepEqual(groupBills(undefined), { bills: [], unassignedCents: 0 })
  assert.deepEqual(groupBills({ txs: null }), { bills: [], unassignedCents: 0 })
  assert.deepEqual(groupBills({ txs: [null, 1, {}], payments: 'x', paidMonths: 3, ...GROUP }), { bills: [], unassignedCents: 0 })
})

test('billDayGroups: dia de Sao Paulo, mais recente primeiro, estorno subtrai do dia', () => {
  const item = (id, date, amountCents) => ({ id, date, amountCents })
  const groups = billDayGroups([
    // 02:00 UTC ainda e o dia 20 em Sao Paulo
    item('c', new Date('2026-11-21T02:00:00Z'), 1000),
    item('a', at('2026-11-22'), 500),
    item('b', at('2026-11-20'), -300),
  ])
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-22', '2026-11-20'])
  assert.deepEqual(groups.map((g) => g.totalCents), [500, 700])
  assert.deepEqual(groups[1].items.map((i) => i.id), ['c', 'b'])
})

test('billDayGroups: item sem data fica por ultimo e a soma dos dias bate com a fatura', () => {
  const txs = [
    { id: '1', cardKind: 'purchase', amount: 40, billMonth: '2026-12', date: at('2026-11-22') },
    { id: '2', cardKind: 'purchase', amount: 10.5, billMonth: '2026-12' },
    { id: '3', cardKind: 'refund', amount: 5, billMonth: '2026-12', date: at('2026-11-22') },
  ]
  const [bill] = groupBills({ txs }).bills
  const groups = billDayGroups(bill.items)
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-22', null])
  assert.equal(groups.reduce((sum, g) => sum + g.totalCents, 0), bill.totalCents)
})

test('billDayGroups: entrada fora do tipo devolve lista vazia sem lancar', () => {
  for (const bad of [undefined, null, 'x', 3, {}, []]) assert.deepEqual(billDayGroups(bad), [], String(bad))
  assert.deepEqual(billDayGroups([null, 1]), [])
})
