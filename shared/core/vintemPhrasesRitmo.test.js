import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PHRASES_RITMO } from './vintemPhrasesRitmo.js'
import { SITUATION_META, TONES } from './vintemPhrases.js'
import { checkBank, PROFANITY } from './phraseRules.js'
import { buildSlots, needsOf, pick, pushRecent, recentKey, recentLimit } from './phrasePicker.js'

// Situacoes do grupo ritmo escritas ate aqui (cresce a cada tarefa do plano 04-08).
const GROUP = [
  'sem-lancar', 'ritmo-folgado', 'ritmo-atencao', 'ritmo-estourou',
  'dados-velhos', 'inicio', 'toque',
]

const BANK = /** @type {any} */ (PHRASES_RITMO)

// Acaso deterministico (LCG): o seletor recebe `rand` injetado.
function makeRand(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Casos de encaixes reais de buildSlots por situacao.
const SLOT_CASES = {
  'sem-lancar': [buildSlots({ dias: 5 }), buildSlots({ dias: 1 })],
  'ritmo-folgado': [buildSlots({ dias: 12, restanteCents: 120000 })],
  'ritmo-atencao': [buildSlots({ dias: 12, restanteCents: 120000 })],
  'ritmo-estourou': [buildSlots({ dias: 12 })],
  'dados-velhos': [{}],
  inicio: [buildSlots({ dias: 12, restanteCents: 120000 }), {}],
  toque: [buildSlots({ dias: 12 }), {}],
}

test('o grupo ritmo passa na regua de conteudo (checkBank vazio)', () => {
  const problems = checkBank(BANK, { situations: GROUP, tones: TONES, meta: SITUATION_META, reviewed: false })
  assert.deepEqual(problems, [])
})

test('cada situacao do grupo tem as tres vozes e ids estaveis', () => {
  for (const situation of GROUP) {
    for (const tone of TONES) {
      const list = BANK[situation][tone]
      assert.ok(Array.isArray(list) && list.length > 0, `${situation}/${tone}`)
      assert.ok(list.every((p) => p.id.startsWith(`${SITUATION_META[situation].prefix}-`)))
    }
  }
})

test('varredura de pick: 40 sorteios por tom, sem chaves, no tamanho e sem repetir recentes', () => {
  for (const situation of GROUP) {
    const meta = SITUATION_META[situation]
    for (const tone of TONES) {
      for (const slots of SLOT_CASES[situation]) {
        const ready = BANK[situation][tone].filter((p) => needsOf(p.t).every((n) => slots[n]))
        const limit = recentLimit(ready.length)
        const rand = makeRand(7)
        let recent = {}
        /** @type {string[]} */
        const history = []
        for (let i = 0; i < 40; i += 1) {
          const got = pick({ situation, tone, slots, recent, rand, bank: BANK, maxLen: meta.maxLen })
          assert.ok(got, `${situation}/${tone}: pick devolveu nulo`)
          assert.ok(!/[{}]/.test(got.text), `chaves em: ${got.text}`)
          assert.ok(Array.from(got.text).length <= meta.maxLen, `longo: ${got.text}`)
          assert.ok(!/\b1 dias\b/.test(got.text), `concordancia: ${got.text}`)
          assert.ok(!history.slice(-limit).includes(got.id) || limit === 0, `repetiu ${got.id}`)
          history.push(got.id)
          recent = pushRecent(recent, recentKey(situation, tone), got.id, limit)
        }
      }
    }
  }
})

test('sem-lancar concorda "1 dia" e "5 dias"', () => {
  for (const tone of TONES) {
    const seen = new Set()
    for (let seed = 1; seed <= 60; seed += 1) {
      const one = pick({ situation: 'sem-lancar', tone, slots: buildSlots({ dias: 1 }), recent: [], rand: makeRand(seed), bank: BANK })
      const five = pick({ situation: 'sem-lancar', tone, slots: buildSlots({ dias: 5 }), recent: [], rand: makeRand(seed), bank: BANK })
      assert.ok(one && five)
      assert.ok(!one.text.includes('1 dias'))
      if (one.text.includes('1 dia')) seen.add('um')
      if (five.text.includes('5 dias')) seen.add('cinco')
    }
    assert.ok(seen.has('um') && seen.has('cinco'), `${tone}: nao exercitou o encaixe`)
  }
})

test('ritmo-estourou nunca usa restante nem valor (so dias)', () => {
  for (const tone of TONES) {
    for (const p of BANK['ritmo-estourou'][tone]) {
      assert.ok(needsOf(p.t).every((n) => n === 'dias'), p.id)
    }
  }
})

test('cada situacao tem pelo menos 3 variantes por tom sem encaixe', () => {
  for (const situation of GROUP) {
    for (const tone of TONES) {
      const bare = BANK[situation][tone].filter((p) => needsOf(p.t).length === 0)
      assert.ok(bare.length >= 3, `${situation}/${tone}: ${bare.length} sem encaixe`)
    }
  }
})

// Palavras de veredito que dados-velhos nunca pode usar (D-08, LIM-08).
const VERDICT = [
  /parab[eé]ns/iu, /[óo]timo/iu, /p[ée]ssimo/iu, /estourou/iu, /passou do/iu,
  /folgado/iu, /tranquilo/iu, /gastou demais/iu,
]

test('dados-velhos e neutro nos tres tons: sem veredito, sem palavrao, sem encaixe', () => {
  for (const tone of TONES) {
    const list = BANK['dados-velhos'][tone]
    assert.ok(list.length >= 6, `${tone}: ${list.length} variantes`)
    for (const p of list) {
      for (const re of VERDICT) assert.ok(!re.test(p.t), `${p.id} tem veredito: ${re}`)
      for (const re of PROFANITY) assert.ok(!re.test(p.t), `${p.id} tem palavrao`)
      assert.deepEqual(needsOf(p.t), [], `${p.id} usa encaixe`)
      assert.ok(!/\d|R\$/u.test(p.t), `${p.id} cita numero ou valor`)
    }
  }
})

test('inicio e toque tem no minimo 6 variantes por tom e inicio tem 2 sem encaixe', () => {
  for (const situation of ['inicio', 'toque', 'dados-velhos']) {
    for (const tone of TONES) {
      assert.ok(BANK[situation][tone].length >= 6, `${situation}/${tone}`)
    }
  }
  for (const tone of TONES) {
    const bare = BANK.inicio[tone].filter((p) => needsOf(p.t).length === 0)
    assert.ok(bare.length >= 2, `inicio/${tone}`)
  }
})

test('o grupo ritmo cobre as sete situacoes do plano', () => {
  assert.deepEqual(Object.keys(BANK).sort(), [...GROUP].sort())
})
