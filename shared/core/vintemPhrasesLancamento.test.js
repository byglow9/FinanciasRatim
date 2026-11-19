import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkBank, PROFANITY } from './phraseRules.js'
import { buildSlots, pick, pushRecent, recentKey, recentLimit, needsOf } from './phrasePicker.js'
import { SITUATION_META, TONES } from './vintemPhrases.js'
import { PHRASES_LANCAMENTO } from './vintemPhrasesLancamento.js'

// Situacoes do grupo (as seis), com os encaixes reais usados na varredura de pick.
const GROUP = {
  'gasto-grande': buildSlots({ categoria: 'Mercado', valorCents: 35000 }),
  'lancamento-ok': buildSlots({ categoria: 'Lazer', valorCents: 4590 }),
  receita: buildSlots({ categoria: 'Lazer', valorCents: 4590 }),
  'porquinho-guardou': buildSlots({ valorCents: 15000 }),
  'porquinho-retirou': buildSlots({ valorCents: 15000 }),
  'meta-batida': buildSlots({ valorCents: 15000 }),
}

const profane = (t) => PROFANITY.some((re) => re.test(t))

test('checkBank do grupo lancamento devolve vazio', () => {
  const problems = checkBank(PHRASES_LANCAMENTO, {
    situations: Object.keys(GROUP), tones: TONES, meta: SITUATION_META, reviewed: false,
  })
  assert.deepEqual(problems, [])
})

test('cada situacao do grupo tem 8 variantes por tom e ids no padrao', () => {
  for (const situation of Object.keys(GROUP)) {
    const { prefix } = SITUATION_META[situation]
    for (const [tone, code] of [['suave', 'su'], ['direto', 'di'], ['sem-filtro', 'sf']]) {
      const list = PHRASES_LANCAMENTO[situation][tone]
      assert.ok(list.length >= 8, `${situation}/${tone}`)
      list.forEach((p, i) => {
        assert.equal(p.id, `${prefix}-${code}-${String(i + 1).padStart(2, '0')}`)
      })
    }
  }
})

test('pelo menos 3 variantes por tom usam no maximo um encaixe', () => {
  for (const situation of Object.keys(GROUP)) {
    for (const tone of TONES) {
      const light = PHRASES_LANCAMENTO[situation][tone].filter((p) => needsOf(p.t).length <= 1)
      assert.ok(light.length >= 3, `${situation}/${tone}: ${light.length}`)
    }
  }
})

test('palavrao so no sem-filtro, e ao menos 3 la', () => {
  for (const situation of Object.keys(GROUP)) {
    for (const tone of ['suave', 'direto']) {
      for (const p of PHRASES_LANCAMENTO[situation][tone]) assert.equal(profane(p.t), false, p.id)
    }
    const sf = PHRASES_LANCAMENTO[situation]['sem-filtro'].filter((p) => profane(p.t))
    assert.ok(sf.length >= 3, `${situation}: ${sf.length}`)
  }
})

test('receita nao afirma se a entrada era esperada ou nao', () => {
  for (const tone of TONES) {
    for (const p of PHRASES_LANCAMENTO.receita[tone]) {
      assert.doesNotMatch(p.t, /esperad|previst/i, p.id)
    }
  }
})

test('o grupo cobre as seis situacoes e nada alem delas', () => {
  const six = ['lancamento-ok', 'gasto-grande', 'receita', 'porquinho-guardou', 'porquinho-retirou', 'meta-batida']
  assert.deepEqual(Object.keys(GROUP).sort(), six.slice().sort())
  assert.deepEqual(Object.keys(PHRASES_LANCAMENTO).sort(), six.slice().sort())
})

// Acaso deterministico (LCG) para a varredura ser reprodutivel.
function makeRand(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

test('pick: 40 sorteios por situacao e tom, sem chaves, no tamanho e sem repetir os ultimos', () => {
  for (const [situation, slots] of Object.entries(GROUP)) {
    const meta = SITUATION_META[situation]
    for (const tone of TONES) {
      const rand = makeRand(7 + situation.length + tone.length)
      const total = PHRASES_LANCAMENTO[situation][tone].length
      const limit = recentLimit(total)
      let recent = {}
      for (let i = 0; i < 40; i += 1) {
        const before = (recent[recentKey(situation, tone)] || []).slice()
        const got = pick({ situation, tone, slots, recent, rand, bank: PHRASES_LANCAMENTO, maxLen: meta.maxLen })
        assert.ok(got, `${situation}/${tone} sorteio ${i}`)
        assert.doesNotMatch(got.text, /[{}]/)
        assert.ok(Array.from(got.text).length <= meta.maxLen)
        assert.equal(before.includes(got.id), false, `${got.id} repetiu os ultimos`)
        recent = pushRecent(recent, recentKey(situation, tone), got.id, limit)
      }
    }
  }
})
