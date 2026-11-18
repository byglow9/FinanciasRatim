import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMoney,
  formatMoneyParts,
  displayTier,
  applyKeypad,
  perDayReais,
  shortDate,
  shortRange,
  cycleLabel,
  dayMonth,
  plural,
  MONTH_SHORT,
  MONTH_LONG,
} from './format.js'

// Para o leitor: compara com espaco comum no lugar de U+00A0.
const sp = (s) => s.replaceAll('\u00A0', ' ')
const money = (c, o) => sp(formatMoney(c, o))
const NBSP = '\u00A0'
const MINUS = '\u2212'

test('formatMoney: centavos sempre, e auto omite zerados e mostra os existentes', () => {
  assert.equal(money(98406, { decimals: 'always' }), 'R$ 984,06')
  assert.equal(money(18000), 'R$ 180')
  assert.equal(money(7950), 'R$ 79,50')
  assert.equal(money(18000, { decimals: 'always' }), 'R$ 180,00')
})

test('formatMoney: zero', () => {
  assert.equal(money(0), 'R$ 0')
  assert.equal(money(0, { decimals: 'always' }), 'R$ 0,00')
})

test('formatMoney: usa U+00A0 entre R$ e o numero', () => {
  assert.equal(formatMoney(18000), `R$${NBSP}180`)
  assert.ok(!formatMoney(18000).includes(' '))
})

test('formatMoney: milhar com ponto e centavos com virgula', () => {
  assert.equal(money(123456789), 'R$ 1.234.567,89')
  assert.equal(money(100000), 'R$ 1.000')
  assert.equal(money(99999999, { decimals: 'always' }), 'R$ 999.999,99')
})

test('formatMoney: negativo com U+2212 colado ao R$ e menos zero nao e negativo', () => {
  assert.equal(formatMoney(-31200), `${MINUS}R$${NBSP}312`)
  assert.equal(money(-31200), `${MINUS}R$ 312`)
  assert.equal(money(-7950), `${MINUS}R$ 79,50`)
  assert.equal(money(-0), 'R$ 0')
  assert.equal(money(-0, { decimals: 'always' }), 'R$ 0,00')
})

test('formatMoney: nao arredonda para exibir (um centavo aparece)', () => {
  assert.equal(money(1), 'R$ 0,01')
  assert.equal(money(99), 'R$ 0,99')
})

test('formatMoneyParts: partes para o hero', () => {
  assert.deepEqual(formatMoneyParts(98406), {
    negative: false,
    currency: 'R$',
    integer: '984',
    decimals: ',06',
  })
  assert.deepEqual(formatMoneyParts(-31200), {
    negative: true,
    currency: 'R$',
    integer: '312',
    decimals: ',00',
  })
  assert.equal(formatMoneyParts(123456789).integer, '1.234.567')
  assert.equal(formatMoneyParts(0).negative, false)
})

test('displayTier: ate 11 caracteres e display, a partir de 12 e heading', () => {
  assert.equal(displayTier(formatMoney(98406, { decimals: 'always' })), 'display')
  assert.equal(displayTier(formatMoney(999999, { decimals: 'always' })), 'display')
  assert.equal(displayTier(formatMoney(1000000, { decimals: 'always' })), 'heading')
  assert.equal(displayTier(formatMoney(99999999, { decimals: 'always' })), 'heading')
})

test('displayTier: o sinal nao conta', () => {
  assert.equal(displayTier(formatMoney(-98406, { decimals: 'always' })), 'display')
  assert.equal(displayTier(formatMoney(-999999, { decimals: 'always' })), 'display')
  assert.equal(displayTier(formatMoney(-1000000, { decimals: 'always' })), 'heading')
  assert.equal(displayTier('-R$ 984,06'), 'display')
})

test('applyKeypad: digitos entram em centavos', () => {
  assert.equal(applyKeypad(0, '1'), 1)
  assert.equal(applyKeypad(1, '5'), 15)
  assert.equal(applyKeypad(15, '0'), 150)
  assert.equal(money(applyKeypad(15, '0'), { decimals: 'always' }), 'R$ 1,50')
  assert.equal(applyKeypad(150, '00'), 15000)
})

test('applyKeypad: backspace', () => {
  assert.equal(applyKeypad(150, 'backspace'), 15)
  assert.equal(applyKeypad(5, 'backspace'), 0)
  assert.equal(applyKeypad(0, 'backspace'), 0)
})

test('applyKeypad: teto de 8 digitos', () => {
  assert.equal(applyKeypad(9999999, '9'), 99999999)
  assert.equal(applyKeypad(99999999, '1'), 99999999)
  assert.equal(applyKeypad(99999999, '0'), 99999999)
  assert.equal(applyKeypad(1000000, '00'), 1000000)
  assert.equal(applyKeypad(999999, '00'), 99999900)
})

test('applyKeypad: tecla invalida devolve o valor anterior', () => {
  for (const key of ['x', '', '000', '10', 'enter', undefined]) {
    assert.equal(applyKeypad(150, key), 150)
  }
})

test('perDayReais arredonda para baixo e nunca promete mais do que existe', () => {
  assert.equal(perDayReais(5799), 57)
  assert.equal(perDayReais(99), 0)
  assert.equal(perDayReais(0), 0)
  assert.equal(perDayReais(-500), 0)
  assert.equal(perDayReais(10000), 100)
})

test('MONTH_SHORT e MONTH_LONG', () => {
  assert.equal(MONTH_SHORT.length, 12)
  assert.ok(MONTH_SHORT.every((m) => m === m.toLowerCase() && !m.includes('.')))
  assert.equal(MONTH_SHORT[10], 'nov')
  assert.equal(MONTH_LONG.length, 12)
  assert.ok(MONTH_LONG.every((m) => m[0] === m[0].toUpperCase()))
  assert.equal(MONTH_LONG[0], 'Janeiro')
  assert.equal(MONTH_LONG[2], 'Março')
  assert.equal(MONTH_LONG[11], 'Dezembro')
})

test('shortDate, shortRange e dayMonth', () => {
  const a = { year: 2026, month: 11, day: 5 }
  const b = { year: 2026, month: 12, day: 4 }
  assert.equal(shortDate(a), '5 nov')
  assert.equal(shortRange(a, b), '5 nov a 4 dez')
  assert.equal(dayMonth(a), '05/11')
  assert.equal(dayMonth({ year: 2026, month: 1, day: 31 }), '31/01')
})

test('cycleLabel: nome do mes quando comeca no dia 1, faixa nos demais casos', () => {
  assert.equal(
    cycleLabel({
      startParts: { year: 2026, month: 11, day: 1 },
      endParts: { year: 2026, month: 11, day: 30 },
    }),
    'Novembro'
  )
  assert.equal(
    cycleLabel({
      startParts: { year: 2026, month: 11, day: 5 },
      endParts: { year: 2026, month: 12, day: 4 },
    }),
    '5 nov a 4 dez'
  )
  assert.equal(
    cycleLabel({
      startParts: { year: 2026, month: 12, day: 1 },
      endParts: { year: 2026, month: 12, day: 31 },
    }),
    'Dezembro'
  )
})

test('plural: singular e plural', () => {
  assert.equal(plural(1, 'dia', 'dias'), '1 dia')
  assert.equal(plural(0, 'dia', 'dias'), '0 dias')
  assert.equal(plural(17, 'dia', 'dias'), '17 dias')
})
