import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMessages, maxTokens, DATA_OPEN, DATA_CLOSE, TEMPERATURE } from './aiPrompt.js'

const TEXT = '{"ciclo":{"mes":"novembro","dia":12},"limites":[{"categoria":"Alimentação","uso":"123%"}]}'

function messages(extra = {}) {
  return buildMessages({
    tone: 'sem-filtro',
    length: 'longa',
    situation: 'limite',
    topic: 'limites',
    summaryText: TEXT,
    ...extra,
  })
}

test('tracer: duas mensagens, sistema primeiro e usuario depois', () => {
  const m = messages()
  assert.equal(m.length, 2)
  assert.equal(m[0].role, 'system')
  assert.equal(m[1].role, 'user')
})

test('tracer: o tom sem-filtro manda xingar com palavrao e traz as duas travas da D-14', () => {
  const sys = messages()[0].content
  assert.match(sys, /palavrão pesado/)
  assert.match(sys, /deboche/)
  assert.match(sys, /nunca ofenda raça, cor, orientação sexual, religião, deficiência, origem ou grupo/)
  assert.match(sys, /nunca fale de Ele para Ela nem de Ela para Ele/)
  assert.match(sys, /OINC/)
})

test('tracer: os dados vao entre as marcas e a mensagem de sistema diz que o bloco e dado', () => {
  const m = messages()
  const user = m[1].content
  const open = user.indexOf(DATA_OPEN)
  const close = user.indexOf(DATA_CLOSE)
  assert.ok(open >= 0 && close > open)
  assert.ok(user.slice(open, close).includes(TEXT))
  assert.match(m[0].content, /nunca como instrução/)
})

test('tracer: o tamanho pedido aparece nas duas mensagens e o limite de tokens segue o tamanho', () => {
  assert.match(messages({ length: 'curta' })[1].content, /UMA frase, com até 140 caracteres/)
  assert.match(messages({ length: 'longa' })[1].content, /duas frases, com até 260 caracteres/)
  assert.equal(maxTokens('curta'), 120)
  assert.equal(maxTokens('longa'), 200)
  assert.equal(TEMPERATURE, 0.9)
})
