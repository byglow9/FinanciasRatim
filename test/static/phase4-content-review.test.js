// Guarda final do banco de frases do Vintem da Fase 4 (D-12, MASC-04, MASC-07).
// A fase so fecha depois da revisao do dono: reviewedAt preenchido e minimo de 5 variantes por situacao e tom.
// Rodar: node --test test/static/phase4-content-review.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkBank } from '../../shared/core/phraseRules.js'
import { PHRASES, REVIEW, SITUATION_META, SITUATIONS, TONES } from '../../shared/core/vintemPhrases.js'

test('REVIEW.reviewedAt e uma data AAAA-MM-DD valida e nao nula', () => {
  assert.equal(typeof REVIEW.reviewedAt, 'string', 'a revisao do dono ainda nao foi registrada')
  assert.match(REVIEW.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, 'reviewedAt fora do formato AAAA-MM-DD')
  assert.ok(!Number.isNaN(Date.parse(REVIEW.reviewedAt)), 'reviewedAt nao e uma data valida')
})

test('checkBank com reviewed: true devolve lista vazia (minimo de 5 variantes por situacao e tom)', () => {
  const problems = checkBank(PHRASES, {
    situations: SITUATIONS,
    tones: TONES,
    meta: SITUATION_META,
    reviewed: true,
  })
  assert.deepEqual(problems, [], `problemas de conteudo:\n${problems.join('\n')}`)
})
