// Guarda estatica (FUND-02, D-06): todo service do cliente consulta e grava por dono, e o
// dono so entra por src/lib/scope.ts.
//   - toda chamada query( tem ...ownerScope() como primeiro filtro (logo depois de collection(...))
//   - toda chamada addDoc(, setDoc( e transaction.set( grava ownerId: ownerId()
//   - nenhuma chamada updateDoc( menciona ownerId (imutavel)
// Rodar: node --test test/static/owner-queries.test.js
// Com ONLY=transactions,goals verifica so esses services (nome sem o sufixo .service.ts).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SERVICES_DIR = path.join(ROOT, 'src', 'services')

/**
 * Remove comentarios e esvazia o conteudo de strings (mantem as aspas e o tamanho),
 * para que parenteses ou palavras dentro de texto nao enganem o extrator.
 * @param {string} src
 * @returns {string}
 */
export function sanitize(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && n === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      out += c
      i++
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++
        i++
        out += ' '
      }
      out += c
      i++
      continue
    }
    out += c
    i++
  }
  return out
}

/**
 * Argumentos (texto) de cada chamada cujo nome casa com `callee`, por parenteses balanceados.
 * @param {string} text texto ja sanitizado
 * @param {RegExp} callee deve terminar com a abertura de parentese
 * @returns {{ args: string, line: number }[]}
 */
export function extractCalls(text, callee) {
  const calls = []
  const re = new RegExp(callee.source, 'g')
  let m
  while ((m = re.exec(text))) {
    let depth = 1
    let i = m.index + m[0].length
    const start = i
    while (i < text.length && depth > 0) {
      if (text[i] === '(') depth++
      else if (text[i] === ')') depth--
      i++
    }
    calls.push({
      args: text.slice(start, i - 1),
      line: text.slice(0, m.index).split('\n').length,
    })
  }
  return calls
}

/**
 * Divide argumentos no nivel de topo (ignora virgulas dentro de (), [] e {}).
 * @param {string} args
 * @returns {string[]}
 */
export function splitTopLevel(args) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const c of args) {
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) depth--
    if (c === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else cur += c
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

const QUERY = /(?<![\w.])query\(/
const ADD_DOC = /(?<![\w.])addDoc\(/
const SET_DOC = /(?<![\w.])setDoc\(/
const TX_SET = /(?<![\w])transaction\.set\(/
const UPDATE_DOC = /(?<![\w.])updateDoc\(/

/**
 * Problemas encontrados em um service e quantidade de verificacoes executadas.
 * @param {string} source
 * @returns {{ problems: string[], checks: number }}
 */
export function checkService(source) {
  const text = sanitize(source)
  const problems = []
  let checks = 0

  for (const c of extractCalls(text, QUERY)) {
    checks++
    const parts = splitTopLevel(c.args)
    if (!parts[0]?.startsWith('collection(') || parts[1] !== '...ownerScope()') {
      problems.push(`linha ${c.line}: query( sem ...ownerScope() como primeiro filtro`)
    }
  }
  for (const re of [ADD_DOC, SET_DOC, TX_SET]) {
    for (const c of extractCalls(text, re)) {
      checks++
      if (!/\bownerId:\s*ownerId\(\)/.test(c.args)) {
        problems.push(`linha ${c.line}: gravacao sem ownerId: ownerId()`)
      }
    }
  }
  for (const c of extractCalls(text, UPDATE_DOC)) {
    checks++
    if (/\bownerId\b/.test(c.args)) {
      problems.push(`linha ${c.line}: updateDoc( menciona ownerId (imutavel)`)
    }
  }
  // O dono so vem de scope.ts: qualquer "ownerId:" precisa receber ownerId().
  for (const m of text.matchAll(/\bownerId:(?!\s*ownerId\(\))/g)) {
    checks++
    problems.push(`linha ${text.slice(0, m.index).split('\n').length}: ownerId atribuido fora de scope.ts`)
  }
  if (/\.uid\b|getScope\(/.test(text)) {
    problems.push('dono obtido fora de ownerId() (uid ou getScope)')
  }
  return { problems, checks }
}

const all = fs
  .readdirSync(SERVICES_DIR)
  .filter((f) => f.endsWith('.service.ts'))
  .map((f) => f.replace(/\.service\.ts$/, ''))
  .sort()
// Services que so falam com o servidor (fetch com ID token) nao tocam o Firestore: nao ha consulta nem
// gravacao para guardar, e o servidor decide o dono pelo token.
const usesFirestore = (name) =>
  /from 'firebase\/firestore'/.test(fs.readFileSync(path.join(SERVICES_DIR, `${name}.service.ts`), 'utf8'))
const only = process.env.ONLY
  ? process.env.ONLY.split(',').map((s) => s.trim()).filter(Boolean)
  : null
const selected = only ?? all

test('ONLY referencia services que existem e a selecao nao e vazia', () => {
  assert.ok(selected.length > 0, 'nenhum service selecionado')
  for (const name of selected) assert.ok(all.includes(name), `service inexistente: ${name}`)
  if (!only) {
    assert.equal(all.filter(usesFirestore).length, 13, 'esperados 13 services com Firestore')
  }
})

for (const name of selected) {
  test(`${name}.service.ts consulta e grava por dono`, () => {
    const source = fs.readFileSync(path.join(SERVICES_DIR, `${name}.service.ts`), 'utf8')
    const { problems, checks } = checkService(source)
    if (!usesFirestore(name)) {
      assert.equal(checks, 0, `${name}: service sem Firestore nao deve ter consulta ou gravacao`)
      assert.match(source, /Authorization/, `${name}: service sem Firestore deve falar com o servidor pelo ID token`)
      return
    }
    assert.ok(checks > 0, `${name}: 0 verificacoes executadas`)
    assert.deepEqual(problems, [])
    if (/(?<![\w.])(query|addDoc|setDoc)\(|transaction\.set\(/.test(sanitize(source))) {
      assert.match(source, /from '@\/lib\/scope'/, `${name}: deveria importar de @/lib/scope`)
    }
  })
}

test('extrator: reconhece violacoes (autoteste)', () => {
  const bad = `
    const q = query(collection(db, COL), where('person', '==', p))
    await addDoc(collection(db, COL), { ...x })
    await updateDoc(doc(db, COL, id), { ownerId: ownerId() })
  `
  assert.equal(checkService(bad).problems.length, 3)
  const good = `
    // query( dentro de comentario nao conta
    const q = query(collection(db, COL), ...ownerScope(), where('a', '==', ')'))
    await addDoc(collection(db, COL), { ...x, ownerId: ownerId() })
    await updateDoc(doc(db, COL, id), { a: 1 })
  `
  assert.deepEqual(checkService(good).problems, [])
})
