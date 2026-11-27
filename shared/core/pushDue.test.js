import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dueStages, dueEvent } from './pushDue.js'
import { collapseHeld } from './pushEvents.js'

// Meio-dia em Sao Paulo (15:00 UTC): nunca cruza a virada do dia em UTC nem em Tokyo.
const at = (day) => new Date(`${day}T15:00:00Z`)

const bill = (extra = {}) => ({ id: 'b1', name: 'Internet', dueDay: 20, amountCents: 12990, ...extra })
const stagesOf = (day, extra = {}) =>
  dueStages({ now: at(day), person: 'ele', bills: [bill()], payments: [], events: [], cards: [], ...extra })

const nubank = (extra = {}) => ({
  id: 'acc1',
  displayName: 'Nubank',
  closingDay: 7,
  dueDay: 14,
  billTotals: { '2026-12': 18141 },
  payments: [],
  paidMonths: [],
  ...extra,
})

const event = (extra = {}) => ({
  title: 'Dentista',
  date: new Date('2026-11-22T15:00:00Z'),
  time: '14:30',
  person: 'ele',
  ...extra,
})

test('conta que vence em 2, 1 e 0 dias gera o estagio; em 3 dias, vencida ou paga nao gera', () => {
  assert.deepEqual(stagesOf('2026-11-18').map((s) => s.daysLeft), [2])
  assert.deepEqual(stagesOf('2026-11-19').map((s) => s.daysLeft), [1])
  assert.deepEqual(stagesOf('2026-11-20').map((s) => s.daysLeft), [0])
  assert.deepEqual(stagesOf('2026-11-17'), [])
  assert.deepEqual(stagesOf('2026-11-21'), [])
  const paid = [{ billId: 'b1', month: 11, year: 2026, paidCents: 12990 }]
  assert.deepEqual(stagesOf('2026-11-19', { payments: paid }), [])
  // pagamento de outro mes ou de outra conta nao conta
  assert.equal(stagesOf('2026-11-19', { payments: [{ billId: 'b1', month: 10, year: 2026, paidCents: 1 }] }).length, 1)
  assert.equal(stagesOf('2026-11-19', { payments: [{ billId: 'b9', month: 11, year: 2026, paidCents: 1 }] }).length, 1)
})

test('o estagio de conta traz o que o texto precisa: tipo, referencia, vencimento, nome e valor', () => {
  const [s] = stagesOf('2026-11-19')
  assert.deepEqual(s, {
    kind: 'conta',
    refId: 'b1',
    dueKey: '2026-11-20',
    daysLeft: 1,
    nome: 'Internet',
    amountCents: 12990,
    hora: null,
  })
})

test('vencimento dia 31 em mes de 30 cai no dia 30, e a virada de mes e de ano funciona', () => {
  const b31 = bill({ dueDay: 31 })
  const s = dueStages({ now: at('2026-11-30'), person: 'ele', bills: [b31] })
  assert.deepEqual(s.map((x) => [x.dueKey, x.daysLeft]), [['2026-11-30', 0]])
  const turn = dueStages({ now: at('2026-12-30'), person: 'ele', bills: [bill({ dueDay: 1 })] })
  assert.deepEqual(turn.map((x) => [x.dueKey, x.daysLeft]), [['2027-01-01', 2]])
  // pagamento e conferido no mes e ano DO VENCIMENTO, nao no de hoje
  const paidNext = [{ billId: 'b1', month: 1, year: 2027, paidCents: 1 }]
  assert.deepEqual(dueStages({ now: at('2026-12-30'), person: 'ele', bills: [bill({ dueDay: 1 })], payments: paidNext }), [])
  const paidOld = [{ billId: 'b1', month: 12, year: 2026, paidCents: 1 }]
  assert.equal(dueStages({ now: at('2026-12-30'), person: 'ele', bills: [bill({ dueDay: 1 })], payments: paidOld }).length, 1)
})

test('conta inativa ou da outra pessoa nao gera; a do casal gera para os dois', () => {
  assert.deepEqual(stagesOf('2026-11-19', { bills: [bill({ isActive: false })] }), [])
  assert.deepEqual(stagesOf('2026-11-19', { bills: [bill({ person: 'ela' })] }), [])
  assert.equal(stagesOf('2026-11-19', { bills: [bill({ person: 'ele' })] }).length, 1)
  for (const person of ['ele', 'ela']) {
    assert.equal(dueStages({ now: at('2026-11-19'), person, bills: [bill({ person: 'conjunto' })] }).length, 1)
  }
  assert.deepEqual(stagesOf('2026-11-19', { bills: [bill({ dueDay: 40 }), bill({ id: '' }), null] }), [])
})

test('compromisso no dia avisa so enquanto a hora nao passou', () => {
  const on = (extra) => dueStages({ now: at('2026-11-22'), person: 'ele', events: [event(extra)] }).map((s) => s.daysLeft)
  assert.deepEqual(on({ time: '23:59' }), [0])
  assert.deepEqual(on({ time: undefined }), [0])
  assert.deepEqual(on({ time: '00:00' }), [])
})

test('compromisso gera em 2, 1 e 0 dias; do parceiro nao gera; conjunto gera para os dois', () => {
  const on = (day, extra) => dueStages({ now: at(day), person: 'ele', events: [event(extra)] })
  assert.deepEqual(on('2026-11-20').map((s) => s.daysLeft), [2])
  assert.deepEqual(on('2026-11-21').map((s) => s.daysLeft), [1])
  assert.deepEqual(on('2026-11-23'), [])
  assert.deepEqual(on('2026-11-19'), [])
  assert.deepEqual(on('2026-11-21', { person: 'ela' }), [])
  for (const person of ['ele', 'ela']) {
    assert.equal(dueStages({ now: at('2026-11-21'), person, events: [event({ person: 'conjunto' })] }).length, 1)
  }
  const [s] = on('2026-11-21')
  assert.equal(s.kind, 'compromisso')
  assert.equal(s.dueKey, '2026-11-22')
  assert.equal(s.nome, 'Dentista')
  assert.equal(s.hora, '14:30')
  assert.equal(s.amountCents, null)
})

test('o dia do compromisso e o de Sao Paulo: 23:30 la ja e o dia seguinte em UTC e continua o mesmo dia', () => {
  // 23:30 de 22/11 em Sao Paulo = 02:30Z de 23/11
  const late = event({ date: new Date('2026-11-23T02:30:00Z') })
  const s = dueStages({ now: at('2026-11-21'), person: 'ele', events: [late] })
  assert.deepEqual(s.map((x) => [x.dueKey, x.daysLeft]), [['2026-11-22', 1]])
  assert.deepEqual(dueStages({ now: at('2026-11-21'), person: 'ele', events: [event({ date: 'x' }), event({ date: new Date('invalid') })] }), [])
})

test('compromisso sem id usa referencia so de letras, que muda com titulo, dia e hora', () => {
  const [a] = dueStages({ now: at('2026-11-21'), person: 'ele', events: [event()] })
  const [b] = dueStages({ now: at('2026-11-21'), person: 'ele', events: [event({ title: 'Medico' })] })
  assert.match(a.refId, /^[a-z]{8}$/)
  assert.notEqual(a.refId, b.refId)
  assert.ok(!a.refId.includes('entista'))
  const [c] = dueStages({ now: at('2026-11-21'), person: 'ele', events: [event({ id: 'ev9' })] })
  assert.equal(c.refId, 'ev9')
})

test('fatura usa o saldo nao pago, em 2, 1 e 0 dias; atrasada, paga ou longe nao gera', () => {
  const on = (day, cards) => dueStages({ now: at(day), person: 'ele', cards })
  assert.deepEqual(on('2026-12-12', [nubank()]).map((s) => [s.daysLeft, s.amountCents, s.dueKey]), [[2, 18141, '2026-12-14']])
  assert.deepEqual(on('2026-12-13', [nubank()]).map((s) => s.daysLeft), [1])
  assert.deepEqual(on('2026-12-14', [nubank()]).map((s) => s.daysLeft), [0])
  assert.deepEqual(on('2026-12-11', [nubank()]), [])
  assert.deepEqual(on('2026-12-15', [nubank()]), [])
  assert.deepEqual(on('2026-12-13', [nubank({ paidMonths: ['2026-12'] })]), [])
  // pagamento parcial: o saldo e o que falta
  const partial = nubank({ payments: [{ billMonth: '2026-12', cents: 8141 }] })
  assert.equal(on('2026-12-13', [partial])[0].amountCents, 10000)
  const [s] = on('2026-12-13', [nubank()])
  assert.equal(s.kind, 'fatura')
  assert.equal(s.refId, 'acc1')
  assert.equal(s.nome, 'Nubank')
  assert.deepEqual(on('2026-12-13', [nubank({ dueDay: null })]), [])
  assert.deepEqual(on('2026-12-13', undefined), [])
})

test('a lista sai ordenada: menos dias primeiro, depois tipo e referencia', () => {
  const stages = dueStages({
    now: at('2026-11-19'),
    person: 'ele',
    bills: [bill({ id: 'b2', dueDay: 21 }), bill({ id: 'b1', dueDay: 20 }), bill({ id: 'b3', dueDay: 20 })],
    events: [event({ date: new Date('2026-11-20T15:00:00Z') })],
  })
  assert.deepEqual(stages.map((s) => `${s.daysLeft}:${s.kind}:${s.refId.length > 4 ? 'h' : s.refId}`), [
    '1:compromisso:h',
    '1:conta:b1',
    '1:conta:b3',
    '2:conta:b2',
  ])
})

test('agora invalido nao lanca e nao gera estagio', () => {
  assert.deepEqual(dueStages({ now: new Date('x'), person: 'ele', bills: [bill()] }), [])
  assert.deepEqual(dueStages({ now: /** @type {any} */ (null), person: 'ele', bills: [bill()] }), [])
})

test('dueEvent: id e tag estaveis, sem barra, e sem nome, titulo, valor nem hora', () => {
  const [s] = stagesOf('2026-11-19')
  const e = dueEvent({ hid: 'h1', person: 'ele', stage: s })
  assert.deepEqual(e, {
    kind: 'conta',
    id: 'h1__ele__conta__b1__2026-11-20__d1',
    tag: 'conta-b1-2026-11-20',
    url: '/contas-fixas',
    refId: 'b1',
    dueKey: '2026-11-20',
    daysLeft: 1,
    person: 'ele',
  })
  assert.deepEqual(e, dueEvent({ hid: 'h1', person: 'ele', stage: s }))
  for (const key of ['nome', 'name', 'title', 'amountCents', 'amount', 'hora', 'text', 'body']) {
    assert.ok(!(key in e), `o evento carrega ${key}`)
  }
  const json = JSON.stringify(e)
  assert.ok(!json.includes('Internet') && !json.includes('12990'))
})

test('dueEvent: urls por tipo e tag segura mesmo com refId hostil ou enorme', () => {
  const base = { kind: 'fatura', refId: 'acc1', dueKey: '2026-12-14', daysLeft: 2, nome: 'x', amountCents: 1, hora: null }
  assert.equal(dueEvent({ hid: 'h1', person: 'ela', stage: base }).url, '/cartoes')
  assert.equal(dueEvent({ hid: 'h1', person: 'ela', stage: { ...base, kind: 'compromisso' } }).url, '/calendario')
  const hostile = dueEvent({ hid: 'h/1', person: 'ele', stage: { ...base, kind: 'conta', refId: 'a/b c?d' + 'z'.repeat(200) } })
  assert.ok(!hostile.id.includes('/'), hostile.id)
  assert.match(hostile.tag, /^[A-Za-z0-9:_-]+$/)
  assert.ok(hostile.tag.length <= 64, `tag com ${hostile.tag.length}`)
  assert.ok(hostile.tag.endsWith('-2026-12-14'), 'a tag perdeu o vencimento')
})

test('estagios do mesmo vencimento dividem a tag e diferem no id; vencimentos diferentes tem tags diferentes', () => {
  const ev = (day) => dueEvent({ hid: 'h1', person: 'ele', stage: stagesOf(day)[0] })
  const d2 = ev('2026-11-18')
  const d1 = ev('2026-11-19')
  const d0 = ev('2026-11-20')
  assert.equal(new Set([d2.tag, d1.tag, d0.tag]).size, 1)
  assert.equal(new Set([d2.id, d1.id, d0.id]).size, 3)
  const nextMonth = dueEvent({ hid: 'h1', person: 'ele', stage: dueStages({ now: at('2026-12-18'), person: 'ele', bills: [bill()] })[0] })
  assert.notEqual(nextMonth.tag, d1.tag)
})

test('retidos da mesma coisa: fica o de menos dias, nao o de maior id', () => {
  const ev = (day) => dueEvent({ hid: 'h1', person: 'ele', stage: stagesOf(day)[0] })
  const d2 = ev('2026-11-18')
  const d1 = ev('2026-11-19')
  const d0 = ev('2026-11-20')
  // por id, d2 seria o "maior"; por prazo, o d0 vence
  assert.ok(d2.id > d0.id)
  for (const order of [[d2, d1, d0], [d0, d1, d2], [d1, d2, d0]]) {
    const { keep, drop } = collapseHeld(order)
    assert.deepEqual(keep, [d0])
    assert.equal(drop.length, 2)
  }
  // coisas diferentes nao colapsam
  const other = dueEvent({ hid: 'h1', person: 'ele', stage: dueStages({ now: at('2026-11-19'), person: 'ele', bills: [bill({ id: 'b2' })] })[0] })
  assert.deepEqual(collapseHeld([d1, other]).keep, [d1, other])
})
