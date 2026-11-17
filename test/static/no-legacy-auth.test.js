// Guarda estatica: o login Firebase (e-mail e senha, claims hid/person) e o unico caminho.
// Rodar: node --test test/static/no-legacy-auth.test.js
// Com DIST_SCAN=1 tambem varre o bundle em dist/ (rodar depois de npm run build).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

// Inclui a chave compartilhada do servidor (variavel do site e cabecalho antigo, Plano 08).
const FORBIDDEN = [
  'signUp',
  'createUserWithEmailAndPassword',
  'VITE_APP_USERNAME',
  'VITE_APP_PASSWORD',
  'financias_legacy_user',
  'financias_auth',
  'VITE_BANK_API_KEY',
  'x-api-key',
]

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full)
  }
  return out
}

function findForbidden(files, words = FORBIDDEN) {
  const hits = []
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const word of words) {
      if (text.includes(word)) hits.push(`${path.relative(ROOT, file)}: ${word}`)
    }
  }
  return hits
}

test('codigo e documentacao sem login legado, cadastro aberto nem chaves antigas', () => {
  const allowed = path.join(ROOT, 'src', 'lib', 'legacyAuthCleanup.ts')
  const files = walk(path.join(ROOT, 'src'), ['.ts', '.tsx'])
    .filter((f) => f !== allowed)
    .concat([path.join(ROOT, 'CLAUDE.md'), path.join(ROOT, 'README.md')])
  assert.ok(files.length > 10, 'a varredura deveria encontrar os arquivos de src')
  assert.deepEqual(findForbidden(files), [])
})

test('legacyAuthCleanup so remove chaves (removeItem, sem getItem nem setItem)', () => {
  const text = read('src/lib/legacyAuthCleanup.ts')
  assert.ok(text.includes('removeItem'))
  assert.ok(!text.includes('getItem'))
  assert.ok(!text.includes('setItem'))
})

test('MOCK so vale em desenvolvimento e firebase.ts importa MOCK de mockStorage', () => {
  const mock = read('src/lib/mockStorage.ts')
  assert.match(mock, /export const MOCK\s*=\s*import\.meta\.env\.DEV\s*&&/)
  const fb = read('src/lib/firebase.ts')
  assert.match(fb, /import\s*\{\s*MOCK\s*\}\s*from\s*'@\/lib\/mockStorage'/)
  assert.ok(!fb.includes('VITE_USE_EMULATOR'), 'firebase.ts nao deve recalcular o mock')
})

test('AuthContext le claims e chama setScope antes de setUser com dados do usuario', () => {
  const text = read('src/contexts/AuthContext.tsx')
  assert.ok(text.includes('getIdTokenResult'))
  assert.ok(text.includes('getIdTokenResult(true)'), 'uma retentativa com refresh forcado')
  assert.ok(text.includes('setScope'))
  const scopeAt = text.indexOf('setScope({')
  const userAt = text.indexOf('setUser({')
  assert.ok(scopeAt >= 0 && userAt >= 0, 'setScope({ e setUser({ devem existir')
  assert.ok(scopeAt < userAt, 'setScope deve vir antes de setUser')
  // o mesmo vale dentro do listener do Firebase Auth
  const listener = text.slice(text.indexOf('onAuthStateChanged(auth'))
  assert.ok(listener.indexOf('setScope({') < listener.indexOf('setUser({'), 'ordem dentro do listener')
  assert.ok(!/signUp/.test(text))
})

test('bundle de producao sem credenciais legadas', { skip: !process.env.DIST_SCAN }, () => {
  const dist = path.join(ROOT, 'dist')
  assert.ok(fs.existsSync(dist), 'DIST_SCAN definida mas dist/ nao existe: rode npm run build antes')
  const files = walk(dist, ['.js'])
  assert.ok(files.length > 0, 'dist/ sem arquivos .js')
  // No bundle: 'signUp' existe no SDK do Firebase (endpoint REST accounts:signUp) e as duas chaves
  // antigas existem em purgeLegacyAuthKeys (so removeItem). Por isso essas tres entradas saem da lista
  // e as chaves antigas sao checadas pelo uso: nunca gravadas nem lidas, so removidas.
  const bundleWords = FORBIDDEN.filter(
    (w) => !['signUp', 'financias_legacy_user', 'financias_auth'].includes(w),
  )
  assert.deepEqual(findForbidden(files, [...bundleWords, 'ratimbum123']), [])
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    assert.ok(
      !/(?:getItem|setItem)\(\s*["'`]financias_(?:legacy_user|auth)/.test(text),
      `${path.relative(ROOT, file)}: chave antiga lida ou gravada`,
    )
  }
})
