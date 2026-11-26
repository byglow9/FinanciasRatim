import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CACHE_KEY_VERSION,
  CACHE_TOPICS,
  BUCKET_TOP,
  bucket5,
  labelHash,
  canonicalKey,
} from './aiCacheKey.js'
import { OINC_SCENES } from './oincScenes.js'

const OK = {
  cycleKey: '2026-11',
  tone: 'sem-filtro',
  situation: 'limite',
  topic: 'limites',
  categoryId: 'alimentacao',
  pct: 87,
  rhythm: 'atencao',
}

test('bucket5: agrupa de 5 em 5 e separa nas bordas', () => {
  assert.equal(CACHE_KEY_VERSION, 2)
  assert.equal(bucket5(0), 0)
  assert.equal(bucket5(4), 0)
  assert.equal(bucket5(4.99), 0)
  assert.equal(bucket5(5), 5)
  assert.equal(bucket5(84), 80)
  assert.equal(bucket5(85), 85)
  assert.equal(bucket5(89.9), 85)
  assert.equal(bucket5(90), 90)
  assert.equal(bucket5(100), 100)
  assert.equal(bucket5(299), 295)
  assert.equal(bucket5(300), 300)
  assert.equal(bucket5(304), 300)
})

test('bucket5: negativo vira 0, acima de 300 agrupa na faixa final, nao numero vira nulo', () => {
  assert.equal(bucket5(-1), 0)
  assert.equal(bucket5(-250), 0)
  assert.equal(bucket5(305), BUCKET_TOP)
  assert.equal(bucket5(999), BUCKET_TOP)
  assert.equal(bucket5(100000), BUCKET_TOP)
  for (const v of [NaN, Infinity, -Infinity, '50', null, undefined, {}]) assert.equal(bucket5(v), null)
})

test('labelHash: 8 caracteres hexadecimais, deterministico e sem caixa nem acento', () => {
  assert.match(labelHash('iFood'), /^[0-9a-f]{8}$/)
  assert.equal(labelHash('iFood'), labelHash('IFOOD'))
  assert.equal(labelHash('Padaria São João'), labelHash('padaria sao joao'))
  assert.notEqual(labelHash('Uber'), labelHash('iFood'))
  assert.equal(labelHash('iFood'), '2ab149d8')
})

test('canonicalKey: versao e partes na ordem fixa', () => {
  assert.equal(canonicalKey(OK), 'v2|2026-11|sem-filtro|limite|limites|alimentacao|p85|atencao|x|x')
  assert.equal(
    canonicalKey({ ...OK, topic: 'limite-estourou', fact: 'limite:estourou:alimentacao' }),
    `v2|2026-11|sem-filtro|limite|limite-estourou|alimentacao|p85|atencao|x|f${labelHash('limite:estourou:alimentacao')}`,
  )
})

test('canonicalKey: o assunto aceita as cenas do catalogo alem dos assuntos antigos', () => {
  for (const cena of Object.keys(OINC_SCENES)) {
    assert.ok(CACHE_TOPICS.includes(cena), cena)
    assert.equal(canonicalKey({ ...OK, topic: cena }).split('|')[4], cena)
  }
  for (const topic of ['limites', 'ritmo', 'padroes', 'agenda', 'anotacoes']) assert.ok(CACHE_TOPICS.includes(topic), topic)
  assert.equal(canonicalKey({ ...OK, topic: 'cena-que-nao-existe' }).split('|')[4], 'x')
})

test('canonicalKey: termina com a parte do fato, so hash, e duas anotacoes dao chaves diferentes', () => {
  const nota = { ...OK, situation: 'abertura', topic: 'agenda-notas' }
  const a = canonicalKey({ ...nota, fact: `notas:${labelHash('Parar de pedir comida|ate sexta')}` })
  const b = canonicalKey({ ...nota, fact: `notas:${labelHash('Pagar o dentista|dia 10')}` })
  assert.notEqual(a, b)
  assert.match(a, /\|f[0-9a-f]{8}$/)
  assert.equal(a.split('|').at(-1), `f${labelHash(`notas:${labelHash('Parar de pedir comida|ate sexta')}`)}`)
  assert.ok(!/comida|dentista|sexta/i.test(a), 'a chave nao leva o texto livre')
  assert.equal(canonicalKey({ ...nota, fact: 'Tx:A' }), canonicalKey({ ...nota, fact: 'tx:a' }))
  for (const bad of [undefined, null, '', '   ', 7, {}]) assert.equal(canonicalKey({ ...nota, fact: bad }).split('|').at(-1), 'x')
  // o campo antigo de texto livre nao entra mais na chave
  assert.equal(canonicalKey({ ...nota, content: 'Pagar o dentista' }), canonicalKey(nota))
})

test('canonicalKey: duas situacoes na mesma faixa dao a mesma chave, faixas diferentes dao chaves diferentes', () => {
  assert.equal(canonicalKey({ ...OK, pct: 85 }), canonicalKey({ ...OK, pct: 89.99 }))
  assert.notEqual(canonicalKey({ ...OK, pct: 84.99 }), canonicalKey({ ...OK, pct: 85 }))
  assert.notEqual(canonicalKey({ ...OK, pct: 89 }), canonicalKey({ ...OK, pct: 90 }))
})

test('canonicalKey: cada parte muda a chave', () => {
  const k = canonicalKey(OK)
  for (const change of [
    { cycleKey: '2026-12' }, { tone: 'suave' }, { situation: 'abertura' }, { topic: 'ritmo' },
    { categoryId: 'transporte' }, { rhythm: 'estourou' }, { rhythm: null }, { fact: 'limite:quase:lazer' },
  ]) {
    assert.notEqual(canonicalKey({ ...OK, ...change }), k, JSON.stringify(change))
  }
})

test('canonicalKey: parte invalida vira x e nunca lanca nem leva texto livre', () => {
  const k = canonicalKey({
    cycleKey: 'novembro de 2026', tone: 'gritando', situation: 'Joao Silva', topic: 'cpf 123.456.789-01',
    categoryId: 'Alimentacao do Joao!', pct: 'muito', rhythm: 'zzz', merchant: 'Padaria do Joao',
  })
  assert.equal(k, 'v2|x|x|x|x|x|x|x|x|x')
  assert.equal(canonicalKey(undefined), 'v2|x|x|x|x|x|x|n|x|x')
  assert.equal(canonicalKey(null), 'v2|x|x|x|x|x|x|n|x|x')
  assert.equal(canonicalKey({}), 'v2|x|x|x|x|x|x|n|x|x')
  assert.equal(canonicalKey({ ...OK, categoryId: 'a'.repeat(41) }).split('|')[5], 'x')
  assert.equal(canonicalKey({ ...OK, categoryId: 'a'.repeat(40) }).split('|')[5], 'a'.repeat(40))
  assert.equal(canonicalKey({ ...OK, cycleKey: '2026-13' }).split('|')[1], 'x')
})

test('canonicalKey: a loja so entra em lancamento e sync, sempre como hash', () => {
  const lanc = { ...OK, situation: 'lancamento', merchant: 'iFood' }
  const k = canonicalKey(lanc)
  assert.equal(k.split('|')[8], `m${labelHash('iFood')}`)
  assert.ok(!/ifood/i.test(k), 'a chave nao pode conter o rotulo da loja')
  assert.notEqual(canonicalKey({ ...lanc, merchant: 'Uber' }), k)
  assert.equal(canonicalKey({ ...lanc, merchant: 'IFOOD' }), k)
  assert.equal(canonicalKey({ ...lanc, situation: 'sync' }).split('|')[8], `m${labelHash('iFood')}`)
  assert.equal(canonicalKey({ ...lanc, merchant: undefined }).split('|')[8], 'x')
  assert.equal(canonicalKey({ ...lanc, merchant: '   ' }).split('|')[8], 'x')
  for (const situation of ['limite', 'abertura', 'espiar']) {
    assert.equal(canonicalKey({ ...lanc, situation }).split('|')[8], 'x', situation)
  }
})

test('canonicalKey: nunca carrega valor exato nem texto fora das listas', () => {
  const k = canonicalKey({ ...OK, pct: 87.3, valor: 123456, descricao: 'Pix para Joao', nome: 'Maria' })
  assert.doesNotMatch(k, /87|123456|joao|maria|pix/i)
  assert.match(k, /^v2\|[0-9x-]+\|[a-z-]+\|[a-z]+\|[a-z-]+\|[a-z0-9_-]+\|(?:p\d+|x)\|[a-z-]+\|(?:m[0-9a-f]{8}|x)\|(?:f[0-9a-f]{8}|x)$/)
})
