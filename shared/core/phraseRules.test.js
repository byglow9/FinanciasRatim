import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MIN_VARIANTS, minFor, AI_TELLS, PROFANITY, PERSONAL_ATTACK, FORBIDDEN_DATA, UNACCENTED,
  WORST_CASE_SLOTS, checkPhrase, checkBank,
} from './phraseRules.js'
import { PHRASES, SITUATIONS, SITUATION_META, TONES } from './vintemPhrases.js'
import { PHRASES_LIMITES } from './vintemPhrasesLimites.js'
import { PHRASES_LANCAMENTO } from './vintemPhrasesLancamento.js'
import { PHRASES_RITMO } from './vintemPhrasesRitmo.js'

const META = SITUATION_META['limite-perto']
const check = (tone, t, id = 'lp-su-01', meta = META) =>
  checkPhrase({ situation: 'limite-perto', tone, phrase: { id, t }, meta })
const has = (problems, part) => (Array.isArray(problems) ? problems.join('\n') : problems).includes(part)

test('as listas de regra existem e sao nao vazias', () => {
  for (const list of [AI_TELLS, PROFANITY, PERSONAL_ATTACK, FORBIDDEN_DATA, UNACCENTED]) {
    assert.ok(list.length > 0)
  }
  assert.equal(WORST_CASE_SLOTS.categoria.length, 24)
  assert.equal(WORST_CASE_SLOTS.loja.length, 24)
  assert.equal(WORST_CASE_SLOTS.pct, '999%')
})

test('1: frase boa passa; marcas de IA falham', () => {
  assert.deepEqual(check('suave', 'Está perto do limite de {categoria}, vale segurar.'), [])
  for (const bad of [
    'Olá, {categoria} está perto do limite.',
    'Notei que {categoria} está perto do limite.',
    'Lembre-se de segurar {categoria}.',
    'Que tal segurar {categoria}?',
    '{categoria} está perto — segura.',
    '{categoria} está perto – segura.',
  ]) {
    assert.ok(has(check('suave', bad), 'marca de IA'), bad)
  }
})

test('2: palavrao falha em suave e direto e passa em sem-filtro', () => {
  const t = '{categoria} bateu {pct}, caralho. Segura.'
  assert.ok(has(check('suave', t), 'palavrao'))
  assert.ok(has(check('direto', t, 'lp-di-01'), 'palavrao'))
  assert.deepEqual(check('sem-filtro', t, 'lp-sf-01'), [])
})

test('3: ataque a pessoa falha em qualquer tom', () => {
  for (const [tone, id] of [['suave', 'lp-su-01'], ['direto', 'lp-di-01'], ['sem-filtro', 'lp-sf-01']]) {
    for (const word of ['burro', 'idiota', 'otário']) {
      assert.ok(has(check(tone, `Você é ${word}, {categoria}.`, id), 'ataque'), `${tone} ${word}`)
    }
  }
})

test('4: dado proibido falha', () => {
  for (const bad of [
    '{categoria} 123456 passou.', 'fale com a@b {categoria}', 'Pix para {categoria}',
    'Pix de {categoria}', 'CPF em {categoria}', 'cnpj em {categoria}', 'agência de {categoria}',
    'número da conta de {categoria}', 'número do cartão de {categoria}',
  ]) {
    assert.ok(has(check('direto', bad, 'lp-di-01'), 'dado proibido'), bad)
  }
  assert.deepEqual(check('direto', 'A conta de {categoria} está perto.', 'lp-di-01'), [])
})

test('5: palavra sem acento obrigatorio falha', () => {
  for (const bad of ['nao passa', 'voce passou', 'tambem passou', 'entao segura', 'ate o fim', 'alem do teto', 'no mes todo']) {
    assert.ok(has(check('direto', `{categoria} ${bad}.`, 'lp-di-01'), 'sem acento'), bad)
  }
  assert.deepEqual(check('direto', '{categoria} não passa, também no mês.', 'lp-di-01'), [])
})

test('6: encaixe fora de meta.slots, comprimento no pior caso e id fora do padrao', () => {
  assert.ok(has(check('direto', '{loja} estourou.', 'lp-di-01'), 'encaixe'))
  assert.ok(has(check('direto', '{foo} estourou.', 'lp-di-01'), 'encaixe'))
  assert.ok(has(check('direto', '{categoria estourou.', 'lp-di-01'), 'chave'))
  const longo = `{categoria} ${'passou '.repeat(16)}`
  assert.ok(has(check('direto', longo, 'lp-di-01'), 'compr'))
  assert.deepEqual(check('direto', '{categoria} passou.', 'lp-di-01'), [])
  assert.ok(has(check('direto', '{categoria} passou.', 'xx-di-01'), 'id'))
  assert.ok(has(check('direto', '{categoria} passou.', 'lp-di-1'), 'id'))
  assert.ok(has(check('direto', '{categoria} passou.', 'lp-su-01'), 'id'))
  const central = { ...META, maxLen: 80 }
  assert.ok(has(check('direto', `{categoria} ${'a'.repeat(60)}`, 'lp-di-01', central), 'compr'))
})

function bankWith(counts, extra = {}) {
  const make = (tone, code, n, profane) =>
    Array.from({ length: n }, (_, i) => ({
      id: `lp-${code}-${String(i + 1).padStart(2, '0')}`,
      t: `${profane && i < profane ? 'Porra, ' : ''}{categoria} variante ${'abcdefghij'[i]}${extra.suffix || ''}.`,
    }))
  return {
    'limite-perto': {
      suave: make('suave', 'su', counts.suave),
      direto: make('direto', 'di', counts.direto),
      'sem-filtro': make('sem-filtro', 'sf', counts.sf, counts.profane),
    },
  }
}
const OPTS = (reviewed) => ({
  situations: ['limite-perto'], tones: TONES, meta: SITUATION_META, reviewed,
})

test('7: minimos por situacao e tom, palavroes em sem-filtro e duplicados', () => {
  assert.equal(minFor({ kind: 'reacao' }, false), 8)
  assert.equal(minFor({ kind: 'contexto' }, false), 6)
  assert.equal(minFor({ kind: 'reacao' }, true), 5)
  assert.equal(minFor({ kind: 'contexto' }, true), 5)
  assert.deepEqual(MIN_VARIANTS.written, { reacao: 8, contexto: 6 })

  const ok = bankWith({ suave: 8, direto: 8, sf: 8, profane: 3 })
  assert.deepEqual(checkBank(ok, OPTS(false)), [])

  const curto = bankWith({ suave: 7, direto: 8, sf: 8, profane: 3 })
  assert.ok(has(checkBank(curto, OPTS(false)), 'minimo'))
  // 5 variantes bastam depois da revisao.
  const revisado = bankWith({ suave: 5, direto: 5, sf: 5, profane: 2 })
  assert.deepEqual(checkBank(revisado, OPTS(true)), [])
  assert.ok(checkBank(revisado, OPTS(false)).length > 0)

  const poucoPalavrao = bankWith({ suave: 8, direto: 8, sf: 8, profane: 2 })
  assert.ok(has(checkBank(poucoPalavrao, OPTS(false)), 'palavrao'))
  assert.deepEqual(checkBank(poucoPalavrao, OPTS(true)), [])

  const dupId = bankWith({ suave: 8, direto: 8, sf: 8, profane: 3 })
  dupId['limite-perto'].suave[1] = { ...dupId['limite-perto'].suave[1], id: 'lp-su-01' }
  assert.ok(has(checkBank(dupId, OPTS(false)), 'id duplicado'))

  const dupText = bankWith({ suave: 8, direto: 8, sf: 8, profane: 3 })
  dupText['limite-perto'].suave[1] = { ...dupText['limite-perto'].suave[1], t: dupText['limite-perto'].suave[0].t }
  assert.ok(has(checkBank(dupText, OPTS(false)), 'texto duplicado'))
})

test('7b: situacao sem meta e acusada e a que nao e edgy dispensa palavrao', () => {
  assert.ok(checkBank({}, { situations: ['nao-existe'], tones: TONES, meta: SITUATION_META, reviewed: false }).length > 0)
  const fake = { ...SITUATION_META, 'limite-perto': { ...META, edgy: false } }
  const bank = bankWith({ suave: 8, direto: 8, sf: 8, profane: 0 })
  assert.deepEqual(checkBank(bank, { situations: ['limite-perto'], tones: TONES, meta: fake, reviewed: false }), [])
})

test('8: limite-perto escrita de verdade passa em checkBank', () => {
  assert.deepEqual(checkBank(PHRASES_LIMITES, OPTS(false)), [])
  assert.deepEqual(checkBank(PHRASES, OPTS(false)), [])
})

test('PHRASES e a mescla dos tres modulos de grupo e a carga acusa colisao', async () => {
  for (const key of Object.keys(PHRASES_LIMITES)) assert.ok(PHRASES[key])
  assert.ok(Object.isFrozen(PHRASES_LANCAMENTO) && Object.isFrozen(PHRASES_RITMO))
  const { mergeGroups } = await import('./vintemPhrases.js')
  assert.throws(
    () => mergeGroups([{ a: {} }, { a: {} }]),
    /situacao/,
  )
  assert.deepEqual(Object.keys(mergeGroups([{ a: {} }, { b: {} }])).sort(), ['a', 'b'])
})

test('o banco inteiro so usa situacoes declaradas', () => {
  for (const s of Object.keys(PHRASES)) assert.ok(SITUATIONS.includes(s), s)
})
