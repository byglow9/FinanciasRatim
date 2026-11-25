import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPushPayload, hashSeed, PUSH_PHRASES, PUSH_SITUATIONS, PUSH_META, PUSH_TITLE } from './vintemPhrasesPush.js'
import { TONES, SITUATIONS, SITUATION_META } from './vintemPhrases.js'
import { checkBank, PROFANITY, WORST_CASE_SLOTS } from './phraseRules.js'
import { needsOf, fill, textLength } from './phrasePicker.js'

const SEEDS = Array.from({ length: 40 }, (_, i) => `evento-${i}`)

test('hashSeed e puro, inteiro sem sinal e estavel', () => {
  assert.equal(hashSeed('abc'), hashSeed('abc'))
  assert.notEqual(hashSeed('abc'), hashSeed('abd'))
  const h = hashSeed('qualquer coisa')
  assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff)
  assert.equal(hashSeed(''), 0x811c9dc5)
})

test('tracer: limite estourado no sem-filtro vira corpo sem dado financeiro', () => {
  for (const seed of SEEDS) {
    const out = buildPushPayload({
      situation: 'push-limite-100', tone: 'sem-filtro', categoryName: 'Lazer', seed,
    })
    assert.equal(out.title, PUSH_TITLE)
    assert.equal(out.title, 'OINC')
    assert.ok(out.body.length > 0)
    assert.doesNotMatch(out.body, /\d/, out.body)
    assert.doesNotMatch(out.body, /R\$/, out.body)
    assert.doesNotMatch(out.body, /[{}]/, out.body)
    const row = PUSH_PHRASES['push-limite-100']['sem-filtro'].find((x) => x.id === out.phraseId)
    if (row.t.includes('{categoria}')) assert.match(out.body, /lazer/i, out.body)
    assert.match(out.phraseId, /^p1-sf-\d{2}$/)
  }
})

test('o mesmo seed devolve o mesmo corpo e seeds diferentes variam', () => {
  const args = { situation: 'push-limite-100', tone: 'sem-filtro', categoryName: 'Lazer' }
  const bodies = new Set()
  for (const seed of SEEDS) {
    const a = buildPushPayload({ ...args, seed })
    const b = buildPushPayload({ ...args, seed })
    assert.deepEqual(a, b)
    bodies.add(a.body)
  }
  assert.ok(bodies.size > 1, 'seeds diferentes deveriam variar o corpo')
})

test('toda situacao e tom devolve corpo nao vazio, mesmo sem categoria', () => {
  for (const situation of PUSH_SITUATIONS) {
    for (const tone of TONES) {
      for (const categoryName of [undefined, '', 'Mercado']) {
        const out = buildPushPayload({ situation, tone, categoryName, seed: 'x' })
        assert.ok(out.body.trim().length > 0, `${situation}/${tone}`)
        assert.doesNotMatch(out.body, /[{}\d]/, out.body)
      }
    }
  }
})

test('situacao e tom desconhecidos caem em valores seguros', () => {
  const out = buildPushPayload({ situation: 'nada', tone: 'nada', seed: 's' })
  assert.ok(out.body.length > 0)
  assert.equal(out.title, 'OINC')
})

test('metadados cobrem as situacoes', () => {
  for (const situation of PUSH_SITUATIONS) {
    assert.ok(PUSH_META[situation], situation)
    for (const tone of TONES) assert.ok(PUSH_PHRASES[situation][tone].length > 0)
  }
})

const ALL = []
for (const situation of PUSH_SITUATIONS) {
  for (const tone of TONES) {
    for (const phrase of PUSH_PHRASES[situation][tone]) ALL.push({ situation, tone, phrase })
  }
}
const LIMITES = ['push-limite-80', 'push-limite-100']

test('o banco passa na regua do banco da Fase 4 (checkBank)', () => {
  const problems = checkBank(PUSH_PHRASES, {
    situations: PUSH_SITUATIONS, tones: TONES, meta: PUSH_META, reviewed: false,
  })
  assert.deepEqual(problems, [])
})

test('guarda propria: sem digito, moeda, chave estranha e dentro do tamanho', () => {
  assert.ok(ALL.length >= 4 * 3 * 6)
  for (const { situation, phrase } of ALL) {
    const t = phrase.t
    assert.doesNotMatch(t, /\d/, t)
    assert.doesNotMatch(t, /R\$|\$/, t)
    assert.doesNotMatch(t, /\bpix\b/i, t)
    for (const name of needsOf(t)) {
      assert.equal(name, 'categoria', `${phrase.id} usa {${name}}`)
      assert.ok(LIMITES.includes(situation), `${phrase.id} usa {categoria} fora de limite`)
    }
    const worst = fill(t, WORST_CASE_SLOTS)
    const len = textLength(worst === null ? t : worst)
    assert.ok(len <= 110, `${phrase.id} tem ${len} caracteres no pior caso`)
  }
})

test('as duas situacoes de limite tem variantes com e sem encaixe em todo tom', () => {
  for (const situation of LIMITES) {
    for (const tone of TONES) {
      const rows = PUSH_PHRASES[situation][tone]
      assert.ok(rows.some((p) => needsOf(p.t).length > 0), `${situation}/${tone} sem encaixe`)
      assert.ok(rows.some((p) => needsOf(p.t).length === 0), `${situation}/${tone} sem variante sem encaixe`)
    }
  }
  for (const situation of ['push-fatura', 'push-espontanea']) {
    for (const tone of TONES) {
      for (const p of PUSH_PHRASES[situation][tone]) assert.equal(needsOf(p.t).length, 0, p.id)
    }
  }
})

test('palavrao so aparece no sem-filtro e la tem ao menos 3 por situacao', () => {
  for (const { tone, phrase } of ALL) {
    const hit = PROFANITY.some((re) => re.test(phrase.t))
    if (tone !== 'sem-filtro') assert.equal(hit, false, phrase.id)
  }
  for (const situation of PUSH_SITUATIONS) {
    const n = PUSH_PHRASES[situation]['sem-filtro'].filter((p) => PROFANITY.some((re) => re.test(p.t))).length
    assert.ok(n >= 3, `${situation}: ${n}`)
  }
})

test('o banco de push nao entra nas 20 situacoes da Fase 4', () => {
  assert.equal(SITUATIONS.length, 20)
  for (const situation of PUSH_SITUATIONS) {
    assert.ok(!SITUATIONS.includes(situation), situation)
    assert.ok(!(situation in SITUATION_META), situation)
  }
})

test('o corpo de qualquer escolha nao tem digito, moeda nem chave, com categoria longa', () => {
  const name = 'Alimentação e restaurantes da cidade grande'
  for (const situation of PUSH_SITUATIONS) {
    for (const tone of TONES) {
      for (const seed of SEEDS) {
        const out = buildPushPayload({ situation, tone, categoryName: name, seed })
        assert.doesNotMatch(out.body, /[\d{}]|R\$/, out.body)
        assert.ok(textLength(out.body) <= 110, out.body)
      }
    }
  }
})
