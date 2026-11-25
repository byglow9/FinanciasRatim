import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPushPayload, hashSeed, PUSH_PHRASES, PUSH_SITUATIONS, PUSH_META, PUSH_TITLE } from './vintemPhrasesPush.js'
import { TONES } from './vintemPhrases.js'

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
    assert.equal(out.title, 'Vintém')
    assert.ok(out.body.length > 0)
    assert.doesNotMatch(out.body, /\d/, out.body)
    assert.doesNotMatch(out.body, /R\$/, out.body)
    assert.doesNotMatch(out.body, /[{}]/, out.body)
    assert.match(out.body, /lazer/i, out.body)
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
  assert.equal(out.title, 'Vintém')
})

test('metadados cobrem as situacoes', () => {
  for (const situation of PUSH_SITUATIONS) {
    assert.ok(PUSH_META[situation], situation)
    for (const tone of TONES) assert.ok(PUSH_PHRASES[situation][tone].length > 0)
  }
})
