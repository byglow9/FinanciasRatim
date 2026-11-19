import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cycleOf } from './cycle.js'
import { buildDayModels } from './calendarModel.js'

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
