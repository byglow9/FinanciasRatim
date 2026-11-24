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
