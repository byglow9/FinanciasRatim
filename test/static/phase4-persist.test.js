// Guarda estatica da gravacao dos insights do Vintem da Fase 4 (plano 04-18, D-15): a colecao nova nas
// regras, nenhum indice novo, servico so com igualdades e gravacao so por toStoredInsight.
// Rodar: node --test test/static/phase4-persist.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, read } from './helpers/phase3-1.js'

const SERVICE = 'src/services/vintemInsights.service.ts'
const HOOK = 'src/hooks/useVintemInsights.ts'
const RULES = 'firestore.rules'
const MATRIX = 'test/rules/matrix.test.js'
const SEED = 'scripts/ux-audit/seed.mjs'

test('firestore.rules lista vintemInsights em clientCollections() e fora da excecao de documento inexistente', () => {
  const rules = code(RULES)
  const collections = rules.match(/function clientCollections\(\)\s*\{[\s\S]*?\}/)
  assert.ok(collections, 'clientCollections() ausente em firestore.rules')
  assert.match(collections[0], /'vintemInsights'/, 'vintemInsights fora de clientCollections()')
  // A excecao de get de inexistente fica so com settings e limitAlerts: o servico nao le antes de gravar.
  const exception = rules.match(/allow get:[^;]*resource == null/)
  assert.ok(exception, 'excecao de documento inexistente ausente')
  assert.match(exception[0], /'settings'/)
  assert.match(exception[0], /'limitAlerts'/)
  assert.doesNotMatch(exception[0], /vintemInsights/, 'vintemInsights nao pode entrar na excecao de resource == null')
})

test('firestore.indexes.json continua com exatamente 19 indices e nenhum de vintemInsights', () => {
  const { indexes } = JSON.parse(read('firestore.indexes.json'))
  assert.equal(indexes.length, 19, 'a leitura e so por igualdades: nenhum indice novo')
  assert.deepEqual(
    indexes.filter((i) => i.collectionGroup === 'vintemInsights'),
    [],
    'vintemInsights nao deve ter indice composto'
  )
})

test('o servico so consulta por igualdade, sem orderBy, limit nem updateDoc, e escopa pelo dono', () => {
  const src = code(SERVICE)
  assert.doesNotMatch(src, /\borderBy\b/, 'orderBy exigiria indice')
  assert.doesNotMatch(src, /\blimit\(/, 'limit( exigiria indice ou ordenacao')
  assert.doesNotMatch(src, /\bupdateDoc\b/, 'a gravacao e setDoc por id deterministico')
  const wheres = [...src.matchAll(/\bwhere\(([^)]*)\)/g)].map((m) => m[1])
  assert.ok(wheres.length >= 2, 'a consulta deve filtrar por pessoa e ciclo')
  for (const args of wheres) assert.match(args, /'=='/, `where( sem igualdade: ${args}`)
  assert.match(src, /query\(\s*collection\(db, COL\),\s*\.\.\.ownerScope\(\)/, 'query( sem ...ownerScope() como primeiro filtro')
  assert.match(src, /setDoc\(doc\(db, COL, s\.id\),[^)]*ownerId: ownerId\(\)/, 'setDoc sem ownerId: ownerId()')
})

test('o documento so e montado a partir de toStoredInsight( e a gravacao e melhor esforco', () => {
  const src = code(SERVICE)
  assert.match(src, /toStoredInsight\(/, 'o servico nao usa toStoredInsight')
  assert.match(src, /from '@shared\/core\/insights\.js'/)
  // Nada de campo montado a mao com texto livre: o setDoc espalha so o objeto projetado.
  const call = src.match(/setDoc\(doc\(db, COL, s\.id\),\s*\{([^}]*)\}/)
  assert.ok(call, 'setDoc do servico nao encontrado')
  assert.match(call[1], /^\s*\.\.\.s,\s*ownerId: ownerId\(\),\s*updatedAt: Timestamp\.now\(\)\s*$/, 'o documento deve ser so a projecao, o dono e a hora')
  // No maximo 8 gravacoes por chamada e cada id uma vez por aparelho e ciclo.
  assert.match(src, /MAX_WRITES_PER_CALL = 8/)
  assert.match(src, /vintem:written:v1:/)
  assert.match(src, /WRITTEN_MAX = 100/)
  // Melhor esforco: o save inteiro fica em try e catch e nunca registra valor nem nome.
  const save = src.slice(src.indexOf('export async function saveVintemInsights'))
  assert.match(save, /try \{[\s\S]*\} catch \{/, 'saveVintemInsights deve engolir qualquer erro')
  assert.doesNotMatch(save, /console\./, 'a gravacao nunca registra nada')
})

test('useVintemInsights chama saveVintemInsights dentro de um efeito, nao na renderizacao', () => {
  const src = code(HOOK)
  assert.match(src, /from '@\/services\/vintemInsights\.service'/)
  const at = src.indexOf('saveVintemInsights(')
  assert.ok(at >= 0, 'o hook nao grava os insights')
  const before = src.slice(0, at)
  const effect = before.lastIndexOf('useEffect(')
  assert.ok(effect >= 0, 'saveVintemInsights fora de useEffect')
  // O ultimo useEffect antes da chamada nao pode ter sido fechado antes dela.
  const between = src.slice(effect, at)
  assert.doesNotMatch(between, /\n  \}, \[/, 'a chamada ficou fora do corpo do efeito')
  assert.match(src, /void saveVintemInsights\(/, 'a gravacao nao deve ser esperada (melhor esforco)')
  assert.match(src, /severity >= 2/, 'so insight de severidade 2 ou 3 e gravado')
})

test('a colecao entra na semente do executor e na matriz de regras', () => {
  const seed = read(SEED).match(/const COLLECTIONS = \[[\s\S]*?\]/)
  assert.ok(seed, 'COLLECTIONS ausente em seed.mjs')
  assert.match(seed[0], /'vintemInsights'/)
  const matrix = read(MATRIX).match(/const CLIENT_COLS = \[[\s\S]*?\]/)
  assert.ok(matrix, 'CLIENT_COLS ausente em matrix.test.js')
  assert.match(matrix[0], /'vintemInsights'/)
})
