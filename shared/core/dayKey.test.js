import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dayKeyOf,
  groupByDay,
  transactionDayGroups,
  dayHeading,
  WEEKDAY_SHORT,
} from './dayKey.js'

const at = (iso) => new Date(iso)

test('dayKeyOf usa o dia de Sao Paulo: 02:30Z ainda e o dia 17, 03:00Z ja e o dia 18', () => {
  assert.equal(dayKeyOf(at('2026-11-18T02:30:00Z')), '2026-11-17')
  assert.equal(dayKeyOf(at('2026-11-18T02:59:59.999Z')), '2026-11-17')
  assert.equal(dayKeyOf(at('2026-11-18T03:00:00Z')), '2026-11-18')
})

test('dayKeyOf completa mes e dia com zero e respeita o fuso pedido', () => {
  assert.equal(dayKeyOf(at('2026-03-05T15:00:00Z')), '2026-03-05')
  assert.equal(dayKeyOf(at('2026-11-18T02:30:00Z'), 'UTC'), '2026-11-18')
})

test('groupByDay ordena do dia mais recente ao mais antigo por padrao e mantem a ordem de entrada no dia', () => {
  const items = [
    { id: 'a', d: at('2026-11-16T15:00:00Z') },
    { id: 'b', d: at('2026-11-18T15:00:00Z') },
    { id: 'c', d: at('2026-11-16T18:00:00Z') },
    { id: 'd', d: at('2026-11-17T15:00:00Z') },
  ]
  const groups = groupByDay(items, (i) => i.d)
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-18', '2026-11-17', '2026-11-16'])
  assert.deepEqual(groups[2].items.map((i) => i.id), ['a', 'c'])
})

test('groupByDay com order asc vai do mais antigo ao mais recente', () => {
  const items = [
    { d: at('2026-11-18T15:00:00Z') },
    { d: at('2026-11-16T15:00:00Z') },
  ]
  const groups = groupByDay(items, (i) => i.d, 'asc')
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-16', '2026-11-18'])
})

test('groupByDay de lista vazia devolve lista vazia', () => {
  assert.deepEqual(groupByDay([], () => new Date(0)), [])
})

test('transactionDayGroups soma o liquido do dia em centavos e ignora transfer verdadeiro', () => {
  const txs = [
    { id: '1', type: 'entrada', amount: 100.1, date: at('2026-11-17T15:00:00Z') },
    { id: '2', type: 'saida', amount: 0.2, date: at('2026-11-17T16:00:00Z') },
    { id: '3', type: 'saida', amount: 50, date: at('2026-11-17T17:00:00Z'), transfer: true },
    { id: '4', type: 'saida', amount: 396, date: at('2026-11-18T15:00:00Z'), transfer: false },
  ]
  const groups = transactionDayGroups(txs)
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-18', '2026-11-17'])
  assert.equal(groups[0].netCents, -39600)
  assert.equal(groups[1].netCents, 9990)
  assert.deepEqual(groups[1].parts, { year: 2026, month: 11, day: 17 })
  // o transfer continua listado, so nao entra no total
  assert.equal(groups[1].items.length, 3)
})

test('transactionDayGroups ordena os itens do dia do mais recente ao mais antigo em desc', () => {
  const txs = [
    { id: 'x', type: 'saida', amount: 1, date: at('2026-11-17T15:00:00Z') },
    { id: 'y', type: 'saida', amount: 1, date: at('2026-11-17T20:00:00Z') },
  ]
  assert.deepEqual(transactionDayGroups(txs)[0].items.map((i) => i.id), ['y', 'x'])
  assert.deepEqual(transactionDayGroups(txs, 'asc')[0].items.map((i) => i.id), ['x', 'y'])
})

test('WEEKDAY_SHORT tem sete dias comecando em domingo', () => {
  assert.equal(WEEKDAY_SHORT.length, 7)
  assert.equal(WEEKDAY_SHORT[0], 'dom')
  assert.equal(WEEKDAY_SHORT[6], 'sáb')
})

test('dayHeading: hoje, ontem e dia comum', () => {
  assert.equal(dayHeading('2026-11-18', '2026-11-18'), 'Hoje · qua, 18 nov')
  assert.equal(dayHeading('2026-11-17', '2026-11-18'), 'Ontem')
  assert.equal(dayHeading('2026-11-16', '2026-11-18'), 'seg, 16 nov')
})

test('dayHeading: ontem atravessa mes e ano', () => {
  assert.equal(dayHeading('2026-12-31', '2027-01-01'), 'Ontem')
  assert.equal(dayHeading('2026-02-28', '2026-03-01'), 'Ontem')
})

// WR-05: o dia gravado e lido em Sao Paulo, qualquer que seja o fuso do aparelho. Cada fuso roda num
// processo proprio porque o fuso do Node so e lido na partida.
import { spawnSync } from 'node:child_process'
import { noonOfDay, dayLabelOf } from './dayKey.js'

test('noonOfDay e dayLabelOf: chave e rotulo voltam iguais em qualquer fuso do aparelho', () => {
  const script = `
    import { noonOfDay, dayKeyOf, dayLabelOf } from ${JSON.stringify(new URL('./dayKey.js', import.meta.url).href)}
    const out = []
    for (const key of ['2026-11-19', '2026-01-01', '2026-12-31', '2026-03-01']) {
      const instant = noonOfDay(key)
      out.push(dayKeyOf(instant) === key, noonOfDay(instant).getTime() === instant.getTime())
    }
    out.push(dayLabelOf(noonOfDay('2026-11-19')) === '19 de novembro')
    // o caminho antigo (meio-dia local) escorregava de dia a leste de UTC+9
    const legacy = dayKeyOf(new Date(2026, 10, 19, 12))
    process.stdout.write(JSON.stringify({ ok: out.every(Boolean), legacy }))
  `
  for (const tz of ['UTC', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'America/Sao_Paulo']) {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, TZ: tz },
      encoding: 'utf8',
    })
    assert.equal(r.status, 0, `${tz}: ${r.stderr}`)
    assert.equal(JSON.parse(r.stdout).ok, true, `${tz}: noonOfDay/dayLabelOf escorregou de dia`)
  }
})

test('noonOfDay aceita instante e normaliza para o meio-dia de Sao Paulo', () => {
  assert.equal(noonOfDay(new Date('2026-11-19T02:00:00Z')).toISOString(), '2026-11-18T15:00:00.000Z')
  assert.equal(noonOfDay('2026-11-19').toISOString(), '2026-11-19T15:00:00.000Z')
  assert.equal(dayLabelOf(new Date('2026-11-19T15:00:00Z')), '19 de novembro')
})
