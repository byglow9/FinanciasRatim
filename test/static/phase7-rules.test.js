// Guarda da Fase 7: as colecoes do servidor (push e IA) continuam negadas ao cliente por padrao,
// e as regras e os indices do Firestore nao foram afrouxados nem ampliados pela fase.
// Rodar: node --test test/static/phase7-rules.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

// Regras sem comentarios, para a guarda nao casar com texto de explicacao.
const rulesCode = () =>
  read('firestore.rules')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')

const SERVER_COLS = ['pushRegistrations', 'pushPrefs', 'pushEvents', 'aiUsage', 'aiCache', 'oincState']

const CLIENT_COLLECTIONS = [
  'transactions',
  'fixedExpenses',
  'fixedExpensePayments',
  'savings',
  'goals',
  'goalContributions',
  'events',
  'eventCategories',
  'notes',
  'settings',
  'limitAlerts',
  'vintemInsights',
  'cardSettings',
]

test('firestore.rules nao menciona nenhuma das seis colecoes do servidor (negadas por padrao)', () => {
  const code = rulesCode()
  for (const col of SERVER_COLS) {
    assert.ok(!code.includes(col), `${col} apareceu em firestore.rules`)
  }
})

test('clientCollections mantem exatamente as 13 colecoes do cliente, na mesma ordem', () => {
  const code = rulesCode()
  const fn = /function clientCollections\(\)\s*\{([\s\S]*?)\n\s*\}/.exec(code)
  assert.ok(fn, 'funcao clientCollections nao encontrada')
  const cols = [...fn[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
  assert.deepEqual(cols, CLIENT_COLLECTIONS)
  assert.equal(cols.length, 13)
})

test('a lista de somente leitura continua bankConnections, bankImports e cards', () => {
  const code = rulesCode()
  const m = /allow read: if isMember\(\) && col in \[([^\]]*)\] && ownsExisting\(\);/.exec(code)
  assert.ok(m, 'regra de somente leitura nao encontrada')
  assert.deepEqual([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]), ['bankConnections', 'bankImports', 'cards'])
  assert.ok(!/allow (create|update|write)[^;]*bankConnections/.test(code))
})

test('nenhuma regra e aberta: sem if true e sem auth != null como unica condicao', () => {
  const code = rulesCode()
  assert.ok(!/if\s+true\b/.test(code), 'regra aberta (if true) encontrada')
  assert.ok(!/if\s+request\.auth\s*!=\s*null\s*;/.test(code), 'regra so por auth != null encontrada')
})

test('firestore.indexes.json: a Fase 7 nao exige indice novo (as consultas do servidor so usam igualdades)', () => {
  const { indexes } = JSON.parse(read('firestore.indexes.json'))
  assert.equal(indexes.length, 20, 'a contagem de indices da Fase 6 nao mudou')
  const has = (col, fields) =>
    indexes.some(
      (i) => i.collectionGroup === col && JSON.stringify(i.fields.map((x) => [x.fieldPath, x.order])) === JSON.stringify(fields)
    )
  assert.ok(has('transactions', [['ownerId', 'ASCENDING'], ['person', 'ASCENDING'], ['date', 'DESCENDING']]))
  assert.ok(has('transactions', [['ownerId', 'ASCENDING'], ['cardId', 'ASCENDING'], ['date', 'DESCENDING']]))
  for (const col of SERVER_COLS) {
    assert.ok(!indexes.some((i) => i.collectionGroup === col), `indice novo para ${col}`)
  }
})
