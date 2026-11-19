import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SLOT_NAMES, needsOf, ordinalMasc, buildSlots, fill, pick, recentKey, pushRecent, recentLimit,
} from './phrasePicker.js'
import { PHRASES, SITUATIONS, SITUATION_META, TONES, REVIEW } from './vintemPhrases.js'

const NBSP = ' '

// Gerador deterministico (mulberry32) escrito aqui para o teste nao depender de outro plano.
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SLOTS = buildSlots({ categoria: 'Lazer', pct: 82, restanteCents: 9000 })

test('SLOT_NAMES lista os nove encaixes', () => {
  assert.deepEqual([...SLOT_NAMES], [
    'loja', 'categoria', 'vezes', 'valor', 'pct', 'dias', 'restante', 'total', 'ordinal',
  ])
})

test('needsOf devolve os encaixes usados, sem repetir, lendo minusculas', () => {
  assert.deepEqual(needsOf('{categoria} em {PCT}, {categoria} de novo'), ['categoria', 'pct'])
  assert.deepEqual(needsOf('sem encaixe'), [])
})

test('ordinalMasc: palavra de 1 a 10 e Nº acima disso', () => {
  assert.equal(ordinalMasc(1), 'primeiro')
  assert.equal(ordinalMasc(4), 'quarto')
  assert.equal(ordinalMasc(7), 'sétimo')
  assert.equal(ordinalMasc(10), 'décimo')
  assert.equal(ordinalMasc(11), '11º')
})

test('fill capitaliza o encaixe que abre frase e devolve nulo com encaixe faltando', () => {
  assert.equal(fill('{ordinal} delivery da semana', { ordinal: 'quarto' }), 'Quarto delivery da semana')
  assert.equal(
    fill('Foi mal. {categoria} estourou', { categoria: 'lazer' }),
    'Foi mal. Lazer estourou',
  )
  assert.equal(fill('de {categoria} para {loja}', { categoria: 'lazer' }), null)
  assert.equal(fill('sem encaixe', {}), 'sem encaixe')
})

test('fill nao reinterpreta o valor inserido', () => {
  assert.equal(fill('a {categoria} b', { categoria: '{loja}' }), 'a {loja} b')
})

test('buildSlots formata valor, vezes, dias, pct e ordinal pelo nucleo', () => {
  const s = buildSlots({
    valorCents: 9000, restanteCents: 12345, totalCents: 100000,
    vezes: 3, dias: 1, pct: 82.4, ordinal: 4, loja: 'iFood', categoria: 'Lazer',
  })
  assert.equal(s.valor, `R$${NBSP}90`)
  assert.equal(s.restante, `R$${NBSP}123,45`)
  assert.equal(s.total, `R$${NBSP}1.000`)
  assert.equal(s.vezes, '3 vezes')
  assert.equal(s.dias, '1 dia')
  assert.equal(buildSlots({ vezes: 1 }).vezes, '1 vez')
  assert.equal(s.pct, '82%')
  assert.equal(s.ordinal, 'quarto')
  assert.equal(s.loja, 'iFood')
  assert.equal(s.categoria, 'Lazer')
})

test('buildSlots: valor com centavos mostra R$ 90,00 quando pedido por 9000 com centavos', () => {
  assert.equal(buildSlots({ valorCents: 9050 }).valor, `R$${NBSP}90,50`)
})

test('buildSlots ignora campo ausente ou nao finito e corta nome em 24 caracteres sem chaves', () => {
  const s = buildSlots({ valorCents: Number.NaN, pct: Infinity, dias: undefined, loja: '   ' })
  assert.deepEqual(s, {})
  const long = buildSlots({ categoria: 'A'.repeat(40), loja: '{x}iFood' })
  assert.equal(Array.from(long.categoria).length, 24)
  assert.equal(long.loja, 'xiFood')
})

test('pick em limite-perto nos tres tons: sem chaves, id do tom, texto preenchido', () => {
  const prefix = { suave: 'lp-su-', direto: 'lp-di-', 'sem-filtro': 'lp-sf-' }
  for (const tone of TONES) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const r = pick({
        situation: 'limite-perto', tone, slots: SLOTS, recent: {}, rand: seeded(seed), bank: PHRASES,
      })
      assert.ok(r, `${tone} sem frase`)
      assert.ok(r.id.startsWith(prefix[tone]), r.id)
      assert.doesNotMatch(r.text, /[{}]/)
    }
  }
})

test('pick nunca repete as ultimas ate esgotar as variantes', () => {
  const tone = 'sem-filtro'
  const key = recentKey('limite-perto', tone)
  const limit = recentLimit(PHRASES['limite-perto'][tone].length)
  assert.equal(limit, 4)
  const rand = seeded(7)
  let recent = {}
  const history = []
  for (let i = 0; i < 40; i += 1) {
    const r = pick({ situation: 'limite-perto', tone, slots: SLOTS, recent, rand, bank: PHRASES })
    assert.ok(r)
    assert.ok(!history.slice(-limit).includes(r.id), `repetiu ${r.id} na rodada ${i}`)
    history.push(r.id)
    recent = pushRecent(recent, key, r.id, limit)
  }
  assert.equal(recent[key].length, limit)
})

test('pick relaxa para "tudo menos a mais recente" quando o historico esgota', () => {
  const ids = PHRASES['limite-perto'].suave.map((p) => p.id)
  const r = pick({
    situation: 'limite-perto', tone: 'suave', slots: SLOTS, rand: seeded(3), bank: PHRASES,
    recent: { [recentKey('limite-perto', 'suave')]: ids },
  })
  assert.ok(r)
  assert.notEqual(r.id, ids[ids.length - 1])
})

test('pick devolve nulo sem o encaixe categoria e sem banco para a situacao', () => {
  const semCategoria = buildSlots({ pct: 82, restanteCents: 9000 })
  for (const tone of TONES) {
    assert.equal(
      pick({ situation: 'limite-perto', tone, slots: semCategoria, rand: seeded(1), bank: PHRASES }),
      null,
    )
  }
  assert.equal(pick({ situation: 'situacao-inexistente', tone: 'suave', slots: SLOTS, rand: seeded(1), bank: PHRASES }), null)
})

test('pick respeita maxLen e devolve nulo quando nenhuma cabe', () => {
  const bank = { x: { suave: [{ id: 'x-su-01', t: '{categoria} passou de todos os limites hoje' }] } }
  const slots = buildSlots({ categoria: 'Lazer' })
  assert.equal(pick({ situation: 'x', tone: 'suave', slots, rand: seeded(1), bank, maxLen: 20 }), null)
  assert.equal(pick({ situation: 'x', tone: 'suave', slots, rand: seeded(1), bank, maxLen: 80 }).id, 'x-su-01')
})

test('pick conta o NBSP como 1 caractere no tamanho', () => {
  const bank = { x: { suave: [{ id: 'x-su-01', t: '{valor}' }] } }
  const slots = buildSlots({ valorCents: 9000 })
  assert.equal(pick({ situation: 'x', tone: 'suave', slots, rand: seeded(1), bank, maxLen: 5 }).text, `R$${NBSP}90`)
  assert.equal(pick({ situation: 'x', tone: 'suave', slots, rand: seeded(1), bank, maxLen: 4 }), null)
})

test('pick e deterministico com a mesma semente e nao muta o historico', () => {
  const recent = Object.freeze({ [recentKey('limite-perto', 'direto')]: Object.freeze(['lp-di-01']) })
  const a = pick({ situation: 'limite-perto', tone: 'direto', slots: SLOTS, recent, rand: seeded(9), bank: PHRASES })
  const b = pick({ situation: 'limite-perto', tone: 'direto', slots: SLOTS, recent, rand: seeded(9), bank: PHRASES })
  assert.deepEqual(a, b)
})

test('pushRecent e imutavel, mantem so os ultimos e move o repetido para o fim', () => {
  const base = Object.freeze({ k: Object.freeze(['a', 'b', 'c']) })
  const next = pushRecent(base, 'k', 'd', 3)
  assert.deepEqual(next.k, ['b', 'c', 'd'])
  assert.deepEqual(base.k, ['a', 'b', 'c'])
  assert.deepEqual(pushRecent(base, 'k', 'a', 3).k, ['b', 'c', 'a'])
  assert.deepEqual(pushRecent({}, 'k', 'a', 0).k, [])
})

test('recentLimit e o menor entre 5 e a metade das variantes', () => {
  assert.equal(recentLimit(8), 4)
  assert.equal(recentLimit(12), 5)
  assert.equal(recentLimit(5), 2)
  assert.equal(recentLimit(1), 0)
})

test('o banco declara 20 situacoes, metadados completos e limite-perto com 8 frases por tom', () => {
  assert.equal(SITUATIONS.length, 20)
  assert.equal(Object.keys(SITUATION_META).length, 20)
  for (const s of SITUATIONS) assert.ok(SITUATION_META[s], `sem meta de ${s}`)
  for (const tone of TONES) assert.equal(PHRASES['limite-perto'][tone].length, 8)
  assert.equal(PHRASES['limite-perto'].suave[0].id, 'lp-su-01')
  assert.equal(PHRASES['limite-perto'].suave[0].t, 'Está perto do limite de {categoria}, vale segurar.')
  assert.equal(REVIEW.reviewedAt, null)
})
