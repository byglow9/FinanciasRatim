// Guarda de conteudo do banco inteiro de frases do Vintem da Fase 4 (D-10 a D-12, MASC-04, MASC-07).
// Mede as 20 situacoes nos 3 tons pela regua automatica e confere a lista de bloqueio local do dono.
// Rodar: node --test test/static/phase4-content.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, exists } from './helpers/phase3-1.js'
import { checkBank, WORST_CASE_SLOTS } from '../../shared/core/phraseRules.js'
import { buildSlots, pick, pushRecent, recentKey, recentLimit, textLength } from '../../shared/core/phrasePicker.js'
import {
  PHRASES, REVIEW, SITUATION_META, SITUATIONS, TONES,
} from '../../shared/core/vintemPhrases.js'

// Arquivo do dono, fora do git (excluido em .git/info/exclude): uma frase, nome ou slogan por linha.
const BLOCKLIST = '.planning/sketches/references/mascote/BLOCKLIST.txt'

// Acaso deterministico (LCG) para os sorteios.
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Minusculas, sem acento e com tudo que nao e letra ou numero virando espaco unico. */
const normalize = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** Todas as frases do banco com situacao, tom e id. */
function allPhrases() {
  const out = []
  for (const situation of SITUATIONS) {
    for (const tone of TONES) {
      for (const phrase of (PHRASES[situation] && PHRASES[situation][tone]) || []) {
        out.push({ situation, tone, id: phrase.id, t: phrase.t })
      }
    }
  }
  return out
}

test('checkBank sobre o banco inteiro devolve lista vazia', () => {
  const problems = checkBank(PHRASES, {
    situations: SITUATIONS,
    tones: TONES,
    meta: SITUATION_META,
    reviewed: REVIEW.reviewedAt !== null,
  })
  assert.deepEqual(problems, [], `problemas de conteudo:\n${problems.join('\n')}`)
})

test('as 20 situacoes tem os tres tons e a contagem total e informada', (t) => {
  assert.equal(SITUATIONS.length, 20)
  assert.deepEqual([...TONES], ['suave', 'direto', 'sem-filtro'])
  let total = 0
  for (const situation of SITUATIONS) {
    assert.ok(SITUATION_META[situation], `${situation}: sem metadados`)
    assert.ok(PHRASES[situation], `${situation}: sem frases`)
    for (const tone of TONES) {
      const list = PHRASES[situation][tone]
      assert.ok(Array.isArray(list) && list.length > 0, `${situation}/${tone}: sem frases`)
      total += list.length
    }
  }
  t.diagnostic(`banco: ${total} frases em ${SITUATIONS.length} situacoes e ${TONES.length} tons`)
})

test('varredura de pick: encaixes de pior caso e comuns, 30 sorteios, sem chave e no tamanho', () => {
  const common = [
    buildSlots({
      categoria: 'Lazer', loja: 'iFood', pct: 82, valorCents: 4000, restanteCents: 9000,
      totalCents: 90000, vezes: 4, ordinal: 4, dias: 12,
    }),
    buildSlots({
      categoria: 'Alimentação', loja: 'Uber', pct: 135, valorCents: 123456, restanteCents: 5000,
      totalCents: 200000, vezes: 1, ordinal: 1, dias: 1,
    }),
  ]
  const sets = [{ ...WORST_CASE_SLOTS }, ...common]
  for (const situation of SITUATIONS) {
    const maxLen = SITUATION_META[situation].maxLen
    for (const tone of TONES) {
      const key = recentKey(situation, tone)
      const limit = recentLimit(PHRASES[situation][tone].length)
      sets.forEach((slots, setIndex) => {
        const rand = seeded(17 + setIndex)
        let recent = {}
        for (let i = 0; i < 30; i += 1) {
          const got = pick({ situation, tone, slots, recent, rand, bank: PHRASES, maxLen })
          assert.ok(got, `${situation}/${tone} devolveu nulo no sorteio ${i} (conjunto ${setIndex})`)
          assert.ok(!/[{}]/.test(got.text), `${got.id}: chave sobrando`)
          assert.ok(textLength(got.text) <= maxLen, `${got.id}: ${textLength(got.text)} passa de ${maxLen}`)
          recent = pushRecent(recent, key, got.id, limit)
        }
      })
    }
  }
})

test('nenhum texto do banco aparece duas vezes, ignorando caixa e acento', () => {
  const seen = new Map()
  const dupes = []
  for (const p of allPhrases()) {
    const norm = normalize(p.t)
    if (seen.has(norm)) dupes.push(`${p.id} repete ${seen.get(norm)}`)
    else seen.set(norm, p.id)
  }
  assert.deepEqual(dupes, [])
})

test('a lista de bloqueio fica fora do git', () => {
  const tracked = execFileSync('git', ['ls-files', '--', BLOCKLIST], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(tracked.trim(), '', 'BLOCKLIST.txt esta versionado: tire do indice')
})

test('nenhuma frase do banco contem texto da lista de bloqueio do dono', { skip: !exists(BLOCKLIST) && 'lista de bloqueio não fornecida' }, () => {
  const entries = fs
    .readFileSync(path.join(ROOT, BLOCKLIST), 'utf8')
    .split(/\r?\n/)
    .map(normalize)
    .filter((line) => line !== '')
  const phrases = allPhrases().map((p) => ({ id: p.id, norm: ` ${normalize(p.t)} ` }))
  // So o id da frase que casou aparece na mensagem: o conteudo da lista nunca e impresso.
  const hits = phrases
    .filter((p) => entries.some((entry) => p.norm.includes(` ${entry} `)))
    .map((p) => p.id)
  assert.deepEqual(hits, [], `frases que casam com a lista de bloqueio (ids): ${hits.join(', ')}`)
})
