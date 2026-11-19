import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkBank, WORST_CASE_SLOTS } from './phraseRules.js'
import { pick, buildSlots, fill, needsOf, recentKey, pushRecent, recentLimit, textLength } from './phrasePicker.js'
import { PHRASES, REVIEW, SITUATION_META, TONES } from './vintemPhrases.js'
import { PHRASES_LIMITES } from './vintemPhrasesLimites.js'

// Situacoes do grupo cobertas por este teste (cada tarefa do plano acrescenta as suas).
const GROUP = ['limite-perto', 'limite-estourou', 'limite-atento', 'central']

// Acaso deterministico (LCG) para os sorteios do teste.
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const REAL_SLOTS = [
  buildSlots({ categoria: 'Lazer', pct: 112, valorCents: 4000, restanteCents: 9000, vezes: 4, ordinal: 4, loja: 'iFood' }),
  buildSlots({ categoria: 'Lazer', pct: 135, valorCents: 4000, restanteCents: 9000, vezes: 1, ordinal: 1, loja: 'Uber' }),
]

test('as situacoes do grupo existem no banco com os tres tons', () => {
  for (const situation of GROUP) {
    for (const tone of TONES) {
      assert.ok(Array.isArray(PHRASES_LIMITES[situation][tone]), `${situation}/${tone}`)
      assert.equal(PHRASES[situation][tone], PHRASES_LIMITES[situation][tone])
    }
  }
})

test('checkBank do grupo devolve lista vazia', () => {
  const problems = checkBank(PHRASES, {
    situations: GROUP,
    tones: TONES,
    meta: SITUATION_META,
    reviewed: REVIEW.reviewedAt !== null,
  })
  assert.deepEqual(problems, [])
})

test('cada situacao do grupo tem 8 variantes por tom e ids no padrao', () => {
  for (const situation of GROUP) {
    const prefix = SITUATION_META[situation].prefix
    for (const [tone, code] of [['suave', 'su'], ['direto', 'di'], ['sem-filtro', 'sf']]) {
      const list = PHRASES[situation][tone]
      assert.ok(list.length >= 8, `${situation}/${tone}: ${list.length}`)
      list.forEach((p, i) => {
        assert.equal(p.id, `${prefix}-${code}-${String(i + 1).padStart(2, '0')}`)
      })
    }
  }
})

test('pelo menos 3 variantes por tom usam so o encaixe {categoria} nas situacoes de limite', () => {
  for (const situation of ['limite-estourou', 'limite-atento', 'central']) {
    for (const tone of TONES) {
      const few = PHRASES[situation][tone].filter((p) => needsOf(p.t).length === 1)
      assert.ok(few.length >= 3, `${situation}/${tone}: ${few.length} variantes de um encaixe`)
    }
  }
})

test('40 sorteios por situacao e tom: sem chave, dentro do tamanho e sem repetir recentes', () => {
  for (const situation of GROUP) {
    const maxLen = SITUATION_META[situation].maxLen
    for (const tone of TONES) {
      for (const slots of REAL_SLOTS) {
        const rand = seeded(7)
        const variants = PHRASES[situation][tone].length
        const limit = recentLimit(variants)
        const key = recentKey(situation, tone)
        let recent = {}
        for (let i = 0; i < 40; i += 1) {
          const got = pick({ situation, tone, slots, recent, rand, bank: PHRASES, maxLen })
          assert.ok(got, `${situation}/${tone} devolveu nulo no sorteio ${i}`)
          assert.ok(!/[{}]/.test(got.text), got.text)
          assert.ok(textLength(got.text) <= maxLen, got.text)
          if (limit > 0) {
            const before = recent[key] || []
            assert.ok(!before.includes(got.id), `${situation}/${tone}: repetiu ${got.id}`)
          }
          recent = pushRecent(recent, key, got.id, limit)
        }
      }
    }
  }
})

test('pick devolve nulo quando todos os encaixes faltam', () => {
  for (const situation of GROUP) {
    const hasBare = Object.values(PHRASES[situation]).some((list) => list.some((p) => needsOf(p.t).length === 0))
    for (const tone of TONES) {
      const got = pick({ situation, tone, slots: {}, rand: seeded(1), bank: PHRASES })
      if (!hasBare) assert.equal(got, null, `${situation}/${tone}`)
    }
  }
})

test('pick ainda acha candidata quando so a categoria esta presente', () => {
  for (const situation of GROUP) {
    for (const tone of TONES) {
      const got = pick({ situation, tone, slots: { categoria: 'Lazer' }, rand: seeded(3), bank: PHRASES })
      assert.ok(got, `${situation}/${tone}`)
      assert.ok(!/[{}]/.test(got.text))
    }
  }
})

test('o pior caso de WORST_CASE_SLOTS continua dentro do tamanho em todas as variantes', () => {
  for (const situation of GROUP) {
    const maxLen = SITUATION_META[situation].maxLen
    for (const tone of TONES) {
      for (const p of PHRASES[situation][tone]) {
        const text = fill(p.t, WORST_CASE_SLOTS)
        assert.ok(text !== null && textLength(text) <= maxLen, `${p.id}: ${text}`)
      }
    }
  }
})

test('o exemplo suave aprovado segue em limite-perto', () => {
  const first = PHRASES['limite-perto'].suave[0]
  assert.equal(first.id, 'lp-su-01')
  assert.equal(fill(first.t, { categoria: 'Lazer' }), 'Está perto do limite de Lazer, vale segurar.')
})

test('central: toda variante mede no maximo 80 pontos de codigo no pior caso', () => {
  for (const tone of TONES) {
    for (const p of PHRASES.central[tone]) {
      const text = fill(p.t, WORST_CASE_SLOTS)
      assert.ok(text !== null, p.id)
      assert.ok(textLength(text) <= 80, `${p.id}: ${textLength(text)} em ${text}`)
    }
  }
})

test('limite-atento e central: suave e direto sem palavrao e sem-filtro com ao menos 3', () => {
  const swear = /caralh|porr[ao]|merd|bost|cacete|\bput[ao]|fod/i
  for (const situation of ['limite-atento', 'central']) {
    for (const tone of ['suave', 'direto']) {
      for (const p of PHRASES[situation][tone]) assert.ok(!swear.test(p.t), p.id)
    }
    const have = PHRASES[situation]['sem-filtro'].filter((p) => swear.test(p.t))
    assert.ok(have.length >= 3, `${situation}: ${have.length} frases com palavrao`)
  }
})

test('nenhuma variante de atento, perto, estourou ou central repete texto de outra situacao', () => {
  const seen = new Map()
  for (const situation of GROUP) {
    for (const tone of TONES) {
      for (const p of PHRASES[situation][tone]) {
        const norm = p.t.toLowerCase()
        assert.ok(!seen.has(norm), `${p.id} igual a ${seen.get(norm)}`)
        seen.set(norm, p.id)
      }
    }
  }
})

test('limite-estourou: suave e direto sem palavrao, sem sobrar em sem-filtro menos de 3', () => {
  const swear = /caralh|porr[ao]|merd|bost|cacete|\bput[ao]|fod/i
  for (const tone of ['suave', 'direto']) {
    for (const p of PHRASES['limite-estourou'][tone]) assert.ok(!swear.test(p.t), p.id)
  }
  const have = PHRASES['limite-estourou']['sem-filtro'].filter((p) => swear.test(p.t))
  assert.ok(have.length >= 3, `${have.length} frases com palavrao`)
})
