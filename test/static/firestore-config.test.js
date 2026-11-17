// Guardas estaticas da configuracao do Firestore: indices, rollback e regras sem acesso aberto.
// Rodar: node --test test/static/firestore-config.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const readJson = (f) => JSON.parse(read(f))

const ASC = 'ASCENDING'
const DESC = 'DESCENDING'
const f = (fieldPath, order = ASC) => ({ fieldPath, order })

// 11 indices novos, ownerId sempre primeiro (Query & Index Inventory do RESEARCH)
const NEW_INDEXES = [
  ['transactions', [f('ownerId'), f('person'), f('date', DESC)]],
  ['transactions', [f('ownerId'), f('date', DESC)]],
  ['fixedExpenses', [f('ownerId'), f('isActive'), f('dueDay')]],
  ['fixedExpenses', [f('ownerId'), f('person'), f('isActive'), f('dueDay')]],
  ['goals', [f('ownerId'), f('createdAt', DESC)]],
  ['goalContributions', [f('ownerId'), f('date', DESC)]],
  ['goalContributions', [f('ownerId'), f('goalId'), f('date', DESC)]],
  ['events', [f('ownerId'), f('date')]],
  ['eventCategories', [f('ownerId'), f('createdAt')]],
  ['notes', [f('ownerId'), f('person'), f('createdAt', DESC)]],
  ['savings', [f('ownerId'), f('date', DESC)]],
]

// 7 indices antigos, mantidos ate nao haver cliente velho
const OLD_INDEXES = [
  ['transactions', [f('person'), f('date', DESC)]],
  ['transactions', [f('person'), f('category'), f('date', DESC)]],
  ['fixedExpenses', [f('person'), f('dueDay')]],
  ['fixedExpenses', [f('isActive'), f('person'), f('dueDay')]],
  ['fixedExpenses', [f('person'), f('isActive'), f('dueDay')]],
  ['fixedExpenses', [f('isActive'), f('dueDay')]],
  ['notes', [f('person'), f('createdAt', DESC)]],
]

const key = (collectionGroup, fields) => JSON.stringify([collectionGroup, fields.map((x) => [x.fieldPath, x.order])])
const present = (indexes) => new Set(indexes.map((i) => key(i.collectionGroup, i.fields)))

test('firestore.indexes.json: JSON valido com 18 indices (7 antigos e 11 novos)', () => {
  const { indexes } = readJson('firestore.indexes.json')
  assert.equal(indexes.length, 18)
  for (const i of indexes) assert.equal(i.queryScope, 'COLLECTION')
})

test('os 11 indices novos existem com campos na ordem e direcao exigidas', () => {
  const { indexes } = readJson('firestore.indexes.json')
  const have = present(indexes)
  for (const [col, fields] of NEW_INDEXES) {
    assert.ok(have.has(key(col, fields)), `faltando: ${col} ${fields.map((x) => x.fieldPath).join(',')}`)
  }
})

test('os 7 indices antigos continuam', () => {
  const { indexes } = readJson('firestore.indexes.json')
  const have = present(indexes)
  for (const [col, fields] of OLD_INDEXES) {
    assert.ok(have.has(key(col, fields)), `antigo removido: ${col} ${fields.map((x) => x.fieldPath).join(',')}`)
  }
})

test('todo indice com ownerId comeca em ownerId ASCENDING', () => {
  const { indexes } = readJson('firestore.indexes.json')
  const withOwner = indexes.filter((i) => i.fields.some((x) => x.fieldPath === 'ownerId'))
  assert.equal(withOwner.length, 11)
  for (const i of withOwner) {
    assert.deepEqual(i.fields[0], { fieldPath: 'ownerId', order: ASC })
  }
})

test('firebase.rollback.json aponta para firestore.rules.legacy e o legado guarda o acesso aberto original', () => {
  const rollback = readJson('firebase.rollback.json')
  assert.equal(rollback.firestore.rules, 'firestore.rules.legacy')
  assert.equal(rollback.firestore.indexes, 'firestore.indexes.json')
  assert.deepEqual(rollback.emulators, readJson('firebase.json').emulators)
  assert.ok(fs.existsSync(path.join(ROOT, 'firestore.rules.legacy')))
  assert.match(read('firestore.rules.legacy'), /allow read, write: if true;/)
})

test('firestore.rules nao tem regra aberta nem autenticacao nao nula como unica condicao', () => {
  const rules = read('firestore.rules')
  const code = rules
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')
  assert.ok(!/if\s+true\b/.test(code), 'regra aberta (if true) encontrada')
  assert.ok(!/if\s+request\.auth\s*!=\s*null\s*;/.test(code), 'regra so por auth != null encontrada')
  assert.ok(!/if\s+request\.auth\s*!=\s*null\s*&&\s*true/.test(code))
  assert.match(code, /request\.auth\.token\.hid/)
  assert.match(code, /ownsExisting/)
  assert.match(code, /ownsIncoming/)
})
