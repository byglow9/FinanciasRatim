// Guarda estatica: a sonda do cartao so le da Pluggy e nunca escreve em item (o limite mensal
// de consultas ao banco e pequeno) nem despeja a resposta crua (o repositorio e publico).
// Rodar: node --test test/static/probe-readonly.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  fs
    .readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const SCRIPT = 'server/scripts/probe-card.js'
const PURE = 'server/src/card-probe.js'
const ALLOWED = ['fetchItem', 'fetchAccounts', 'fetchCreditCardBills', 'fetchAllTransactions']

test('a sonda chama so metodos de leitura da Pluggy', () => {
  const src = code(SCRIPT)
  const called = new Set([...src.matchAll(/\bpluggy\.([A-Za-z]+)\(/g)].map((m) => m[1]))
  assert.ok(called.size >= 3, `a varredura deveria achar as chamadas de leitura, achou ${[...called]}`)
  const extra = [...called].filter((name) => !ALLOWED.includes(name))
  assert.deepEqual(extra, [], `metodo fora da lista de leitura: ${extra}`)
})

test('a sonda nao tem operacao de escrita nem de token', () => {
  const src = code(SCRIPT)
  for (const word of ['createItem', 'updateItem', 'deleteItem', 'createConnectToken', 'PATCH']) {
    assert.ok(!src.includes(word), `${SCRIPT} contem ${word}`)
  }
})

test('a sonda nao despeja objetos crus (sem console.dir nem util.inspect)', () => {
  const src = code(SCRIPT)
  assert.ok(!src.includes('console.dir'))
  assert.ok(!src.includes('util.inspect'))
  assert.ok(!/from\s+['"](?:node:)?util['"]/.test(src))
})

test('card-probe.js e puro: sem console, env, rede nem relogio implicito', () => {
  const src = code(PURE)
  assert.ok(src.length > 500, 'o arquivo deveria ter conteudo')
  for (const word of ['console.', 'process.env', 'fetch(', 'Date.now(']) {
    assert.ok(!src.includes(word), `${PURE} contem ${word}`)
  }
  assert.ok(!/new Date\(\s*\)/.test(src), `${PURE} usa new Date() sem argumento`)
})
