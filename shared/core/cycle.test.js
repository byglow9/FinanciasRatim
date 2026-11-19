import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monthRangeOf } from './time.js'
import {
  cycleOf,
  shiftCycle,
  cycleDay,
  daysLeftInCycle,
  isCycleOver,
  cycleMonths,
  billOccurrences,
  nextOccurrence,
  daysBetweenParts,
  isInCycle,
  addDaysToParts,
  cycleGrid,
} from './cycle.js'

const at = (iso) => new Date(iso)
const iso = (d) => d.toISOString()

test('salaryDay 1 coincide com o mes-calendario (monthRangeOf)', () => {
  const c = cycleOf(at('2026-11-17T15:00:00Z'), 1)
  const m = monthRangeOf(2026, 11)
  assert.equal(c.key, '2026-11')
  assert.equal(iso(c.start), '2026-11-01T03:00:00.000Z')
  assert.equal(iso(c.end), '2026-12-01T02:59:59.999Z')
  assert.equal(iso(c.start), iso(m.start))
  assert.equal(iso(c.end), iso(m.end))
  assert.equal(c.days, 30)
  assert.equal(c.days, m.daysInMonth)
})

test('salaryDay padrao e 1', () => {
  assert.equal(cycleOf(at('2026-11-17T15:00:00Z')).key, '2026-11')
})

test('salaryDay 5 em 4 nov: ciclo de 5 out a 4 nov', () => {
  const c = cycleOf(at('2026-11-04T12:00:00Z'), 5)
  assert.equal(c.key, '2026-10')
  assert.equal(iso(c.start), '2026-10-05T03:00:00.000Z')
  assert.equal(iso(c.end), '2026-11-05T02:59:59.999Z')
  assert.equal(c.days, 31)
  assert.deepEqual(c.startParts, { year: 2026, month: 10, day: 5 })
  assert.deepEqual(c.endParts, { year: 2026, month: 11, day: 4 })
  assert.equal(c.salaryDay, 5)
})

test('fronteira: 2026-11-05T02:30Z ainda e 23:30 de 4 nov (ciclo 2026-10)', () => {
  assert.equal(cycleOf(at('2026-11-05T02:30:00Z'), 5).key, '2026-10')
})

test('fronteira: 2026-11-05T03:00Z ja e o ciclo de 5 nov a 4 dez', () => {
  const c = cycleOf(at('2026-11-05T03:00:00Z'), 5)
  assert.equal(c.key, '2026-11')
  assert.equal(iso(c.start), '2026-11-05T03:00:00.000Z')
  assert.equal(iso(c.end), '2026-12-05T02:59:59.999Z')
  assert.equal(c.days, 30)
})

test('dia 31 em fevereiro de 2027 comeca dia 28 e termina 30 mar', () => {
  const c = cycleOf(at('2027-02-28T12:00:00Z'), 31)
  assert.equal(c.key, '2027-02')
  assert.equal(iso(c.start), '2027-02-28T03:00:00.000Z')
  assert.equal(iso(c.end), '2027-03-31T02:59:59.999Z')
  assert.equal(c.days, 31)
  assert.deepEqual(c.endParts, { year: 2027, month: 3, day: 30 })
})

test('dia 30 em fevereiro bissexto de 2028 comeca dia 29', () => {
  const c = cycleOf(at('2028-02-29T12:00:00Z'), 30)
  assert.equal(c.key, '2028-02')
  assert.equal(iso(c.start), '2028-02-29T03:00:00.000Z')
  assert.equal(iso(c.end), '2028-03-30T02:59:59.999Z')
  assert.equal(c.days, 30)
})

test('virada dez para jan com salaryDay 15: 15 dez a 14 jan, 31 dias', () => {
  const c = cycleOf(at('2027-01-10T12:00:00Z'), 15)
  assert.equal(c.key, '2026-12')
  assert.deepEqual(c.startParts, { year: 2026, month: 12, day: 15 })
  assert.deepEqual(c.endParts, { year: 2027, month: 1, day: 14 })
  assert.equal(c.days, 31)
})

test('31 de dezembro com salaryDay 1 termina na virada do ano', () => {
  const c = cycleOf(at('2026-12-31T12:00:00Z'), 1)
  assert.equal(c.key, '2026-12')
  assert.equal(iso(c.end), '2027-01-01T02:59:59.999Z')
})

test('horario de verao de 2018: nov/2018 termina 01:59:59.999Z e tem 30 dias', () => {
  const c = cycleOf(at('2018-11-10T12:00:00Z'), 1)
  assert.equal(c.key, '2018-11')
  assert.equal(c.days, 30)
  assert.equal(iso(c.end), '2018-12-01T01:59:59.999Z')
})

test('independe do fuso do host: tz explicito em Asia/Tokyo', () => {
  const c = cycleOf(at('2026-06-15T12:00:00Z'), 1, 'Asia/Tokyo')
  assert.equal(c.key, '2026-06')
  assert.equal(iso(c.start), '2026-05-31T15:00:00.000Z')
})

test('cycleOf recusa dia do salario invalido', () => {
  const now = at('2026-11-17T15:00:00Z')
  for (const bad of [0, 32, 1.5, NaN, '5', null, -1]) {
    assert.throws(() => cycleOf(now, bad), /Dia do salario invalido/)
  }
})

test('shiftCycle -1 de 2026-11 (salaryDay 5) devolve 2026-10', () => {
  const c = cycleOf(at('2026-11-17T15:00:00Z'), 5)
  assert.equal(shiftCycle(c, -1).key, '2026-10')
  assert.equal(shiftCycle(c, 1).key, '2026-12')
})

test('shiftCycle ida e volta devolve o mesmo ciclo', () => {
  const c = cycleOf(at('2026-11-17T15:00:00Z'), 5)
  const back = shiftCycle(shiftCycle(c, -1), 1)
  assert.equal(iso(back.start), iso(c.start))
  assert.equal(iso(back.end), iso(c.end))
  const far = shiftCycle(shiftCycle(c, 3), -3)
  assert.equal(iso(far.start), iso(c.start))
})

test('shiftCycle 0 e -2 sao coerentes e atravessam a virada de ano', () => {
  const c = cycleOf(at('2027-01-10T12:00:00Z'), 15)
  assert.equal(shiftCycle(c, 0).key, c.key)
  assert.equal(shiftCycle(c, -2).key, '2026-10')
  const dec = cycleOf(at('2026-12-20T12:00:00Z'), 15)
  assert.equal(shiftCycle(dec, 1).key, '2027-01')
  assert.equal(shiftCycle(dec, 1).startParts.year, 2027)
})

test('shiftCycle encadeia dia 31 sem pular ciclo', () => {
  let c = cycleOf(at('2027-01-31T12:00:00Z'), 31)
  const keys = []
  for (let i = 0; i < 4; i += 1) {
    keys.push(c.key)
    c = shiftCycle(c, 1)
  }
  assert.deepEqual(keys, ['2027-01', '2027-02', '2027-03', '2027-04'])
})

const nov5 = () => cycleOf(at('2026-11-17T15:00:00Z'), 5)

test('cycleDay e daysLeftInCycle contam o dia de hoje', () => {
  const c = nov5()
  assert.equal(c.key, '2026-11')
  assert.equal(c.days, 30)
  const rows = [
    ['2026-11-05T03:00:00Z', 1, 30],
    ['2026-11-17T15:00:00Z', 13, 18],
    ['2026-12-04T20:00:00Z', 30, 1],
  ]
  for (const [instant, day, left] of rows) {
    assert.equal(cycleDay(c, at(instant)), day, `cycleDay ${instant}`)
    assert.equal(daysLeftInCycle(c, at(instant)), left, `left ${instant}`)
  }
})

test('ciclo passado: dia satura em days e restam 0', () => {
  const c = nov5()
  assert.equal(cycleDay(c, at('2026-12-05T03:00:00Z')), 30)
  assert.equal(daysLeftInCycle(c, at('2026-12-05T03:00:00Z')), 0)
})

test('ciclo futuro: dia 1 e restam todos os dias', () => {
  const c = nov5()
  assert.equal(cycleDay(c, at('2026-10-20T15:00:00Z')), 1)
  assert.equal(daysLeftInCycle(c, at('2026-10-20T15:00:00Z')), 30)
})

test('isCycleOver: falso no ultimo ms, verdadeiro no instante seguinte', () => {
  const c = nov5()
  assert.equal(isCycleOver(c, at('2026-12-05T02:59:59.999Z')), false)
  assert.equal(isCycleOver(c, at('2026-12-05T03:00:00.000Z')), true)
})

test('cycleMonths: um mes, dois meses e virada de ano', () => {
  assert.deepEqual(cycleMonths(cycleOf(at('2026-11-17T15:00:00Z'), 1)), [{ month: 11, year: 2026 }])
  assert.deepEqual(cycleMonths(nov5()), [
    { month: 11, year: 2026 },
    { month: 12, year: 2026 },
  ])
  assert.deepEqual(cycleMonths(cycleOf(at('2027-01-10T12:00:00Z'), 15)), [
    { month: 12, year: 2026 },
    { month: 1, year: 2027 },
  ])
})

const d = (year, month, day) => ({ year, month, day })

test('billOccurrences em ciclo de 5 nov a 4 dez', () => {
  const c = nov5()
  assert.deepEqual(billOccurrences(10, c), [d(2026, 11, 10)])
  assert.deepEqual(billOccurrences(2, c), [d(2026, 12, 2)])
  assert.deepEqual(billOccurrences(5, c), [d(2026, 11, 5)])
  assert.deepEqual(billOccurrences(4, c), [d(2026, 12, 4)])
  assert.deepEqual(billOccurrences(31, c), [d(2026, 11, 30)])
})

test('billOccurrences em fevereiro: dia 31 cai no 28 e no bissexto o 29 e 29', () => {
  const feb27 = cycleOf(at('2027-02-10T12:00:00Z'), 1)
  assert.deepEqual(billOccurrences(31, feb27), [d(2027, 2, 28)])
  const feb28 = cycleOf(at('2028-02-10T12:00:00Z'), 1)
  assert.deepEqual(billOccurrences(29, feb28), [d(2028, 2, 29)])
  assert.deepEqual(billOccurrences(31, feb28), [d(2028, 2, 29)])
})

test('billOccurrences com dia do salario 31: duas ocorrencias, uma ou nenhuma', () => {
  const feb = cycleOf(at('2027-02-28T12:00:00Z'), 31)
  assert.equal(feb.key, '2027-02')
  assert.deepEqual(billOccurrences(30, feb), [d(2027, 2, 28), d(2027, 3, 30)])
  assert.deepEqual(billOccurrences(31, feb), [d(2027, 2, 28)])
  const mar = cycleOf(at('2027-03-31T12:00:00Z'), 31)
  assert.equal(mar.key, '2027-03')
  assert.deepEqual(cycleMonths(mar).length, 2)
  assert.deepEqual(billOccurrences(30, mar), [])
})

test('billOccurrences recusa dia de vencimento invalido', () => {
  for (const bad of [0, 32, 1.5, NaN, '10']) {
    assert.throws(() => billOccurrences(bad, nov5()), /Dia de vencimento invalido/)
  }
})

test('nextOccurrence: mes corrente, o proprio dia e proximo mes', () => {
  const now = at('2026-11-17T15:00:00Z')
  assert.deepEqual(nextOccurrence(10, now), d(2026, 12, 10))
  assert.deepEqual(nextOccurrence(17, now), d(2026, 11, 17))
  assert.deepEqual(nextOccurrence(31, now), d(2026, 11, 30))
  assert.deepEqual(nextOccurrence(30, at('2027-01-31T15:00:00Z')), d(2027, 2, 28))
  assert.deepEqual(nextOccurrence(5, at('2026-12-20T15:00:00Z')), d(2027, 1, 5))
})

test('nextOccurrence usa a data de Sao Paulo (02:30Z de 18 nov ainda e dia 17)', () => {
  assert.deepEqual(nextOccurrence(17, at('2026-11-18T02:30:00Z')), d(2026, 11, 17))
})

test('nextOccurrence recusa dia de vencimento invalido', () => {
  assert.throws(() => nextOccurrence(0, at('2026-11-17T15:00:00Z')), /Dia de vencimento invalido/)
})

test('daysBetweenParts cruza mes e ano sem erro de horario de verao', () => {
  assert.equal(daysBetweenParts(d(2026, 11, 17), d(2026, 12, 10)), 23)
  assert.equal(daysBetweenParts(d(2026, 11, 17), d(2026, 11, 17)), 0)
  assert.equal(daysBetweenParts(d(2026, 12, 20), d(2027, 1, 5)), 16)
  assert.equal(daysBetweenParts(d(2018, 10, 31), d(2018, 11, 10)), 10)
  assert.equal(daysBetweenParts(d(2026, 11, 20), d(2026, 11, 17)), -3)
})

// ---- isInCycle, addDaysToParts, cycleGrid (UX-03, UX-09) ----

test('isInCycle: inclusivo nas duas pontas, falso 1 ms fora', () => {
  const c = cycleOf(at('2026-11-17T15:00:00Z'), 1)
  assert.equal(isInCycle(c.start, c), true)
  assert.equal(isInCycle(c.end, c), true)
  assert.equal(isInCycle(new Date(c.end.getTime() + 1), c), false)
  assert.equal(isInCycle(new Date(c.start.getTime() - 1), c), false)
  assert.equal(isInCycle(at('2026-11-18T02:30:00Z'), c), true)
})

test('addDaysToParts: vira mes e ano, fevereiro e passo de 7 dias', () => {
  assert.deepEqual(addDaysToParts({ year: 2026, month: 12, day: 31 }, 1), { year: 2027, month: 1, day: 1 })
  assert.deepEqual(addDaysToParts({ year: 2026, month: 3, day: 1 }, -1), { year: 2026, month: 2, day: 28 })
  assert.deepEqual(addDaysToParts({ year: 2028, month: 3, day: 1 }, -1), { year: 2028, month: 2, day: 29 })
  assert.deepEqual(addDaysToParts({ year: 2026, month: 12, day: 28 }, 7), { year: 2027, month: 1, day: 4 })
  assert.deepEqual(addDaysToParts({ year: 2026, month: 5, day: 10 }, 0), { year: 2026, month: 5, day: 10 })
})

test('cycleGrid de 2026-11 (dia 1): 5 semanas de domingo a sabado, folga so em dezembro', () => {
  const grid = cycleGrid(cycleOf(at('2026-11-17T15:00:00Z'), 1))
  assert.equal(grid.length, 5)
  for (const week of grid) assert.equal(week.length, 7)
  assert.deepEqual(grid[0][0].parts, { year: 2026, month: 11, day: 1 })
  assert.equal(grid[0][0].inCycle, true)
  const flat = grid.flat()
  const find = (m, d) => flat.find((c) => c.parts.month === m && c.parts.day === d)
  assert.equal(find(11, 29).inCycle, true)
  assert.equal(find(11, 30).inCycle, true)
  for (let d = 1; d <= 5; d += 1) assert.equal(find(12, d).inCycle, false)
  assert.equal(flat.filter((c) => c.inCycle).length, 30)
})

test('cycleGrid de ciclo dia 15 que cruza dezembro e janeiro cobre 15 dez a 14 jan', () => {
  const c = cycleOf(at('2026-12-20T15:00:00Z'), 15)
  assert.deepEqual(c.startParts, { year: 2026, month: 12, day: 15 })
  assert.deepEqual(c.endParts, { year: 2027, month: 1, day: 14 })
  const grid = cycleGrid(c)
  const flat = grid.flat()
  assert.equal(grid.length, 5)
  assert.deepEqual(flat[0].parts, { year: 2026, month: 12, day: 13 })
  assert.equal(flat[0].inCycle, false)
  assert.equal(flat[1].inCycle, false)
  assert.equal(flat[2].inCycle, true)
  assert.deepEqual(flat[2].parts, { year: 2026, month: 12, day: 15 })
  assert.deepEqual(flat.at(-1).parts, { year: 2027, month: 1, day: 16 })
  assert.equal(flat.at(-1).inCycle, false)
  assert.equal(flat.at(-2).inCycle, false)
  assert.deepEqual(flat.at(-3).parts, { year: 2027, month: 1, day: 14 })
  assert.equal(flat.at(-3).inCycle, true)
  assert.equal(flat.filter((x) => x.inCycle).length, c.days)
})

test('cycleGrid de fevereiro (ciclo curto) e ciclo que termina em dia 31', () => {
  const feb = cycleOf(at('2026-02-10T15:00:00Z'), 1)
  const gridFeb = cycleGrid(feb)
  assert.equal(gridFeb.flat().filter((c) => c.inCycle).length, 28)
  assert.equal(gridFeb.flat().length % 7, 0)
  const jan = cycleOf(at('2026-01-31T15:00:00Z'), 1)
  const gridJan = cycleGrid(jan)
  assert.equal(gridJan.flat().filter((c) => c.inCycle).length, 31)
  assert.equal(gridJan.flat().at(-1).parts.day >= 1, true)
})

test('cycleGrid pode ter 6 semanas', () => {
  // ago/2026 comeca num sabado e tem 31 dias: 6 semanas dom-sab
  const grid = cycleGrid(cycleOf(at('2026-08-15T15:00:00Z'), 1))
  assert.equal(grid.length, 6)
})
