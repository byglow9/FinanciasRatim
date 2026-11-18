// Guarda estatica da interface do banco (REV-07, D-01, D-05, D-08).
// Rodar: node --test test/static/bank-ui-copy.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

test('BankConnections nao tem o texto de revisao nem o identificador review (D-05)', () => {
  const src = code('src/components/settings/BankConnections.tsx')
  assert.doesNotMatch(src, /para revisar/i)
  assert.doesNotMatch(src, /\breview\b/)
})

test('BankConnections usa o nucleo compartilhado para o frescor (REV-07)', () => {
  const src = code('src/components/settings/BankConnections.tsx')
  assert.match(src, /describeBankFreshness/)
  assert.match(src, /@shared\/core\/bankStatus\.js/)
})

test('bank.service le bankUpdatedAt e consentExpiresAt do Firestore', () => {
  const src = code('src/services/bank.service.ts')
  assert.match(src, /data\.bankUpdatedAt\?\.toDate\?\.\(\)/)
  assert.match(src, /data\.consentExpiresAt\?\.toDate\?\.\(\)/)
})

test('Home importa e renderiza BankStatusNotice, que liga a /configuracoes (D-08)', () => {
  const page = code('src/pages/DashboardPage.tsx')
  assert.match(page, /import \{ BankStatusNotice \} from/)
  assert.match(page, /<BankStatusNotice\s*\/>/)
  const notice = code('src/components/dashboard/BankStatusNotice.tsx')
  assert.match(notice, /describeBankFreshness/)
  assert.match(notice, /\/configuracoes/)
})

test('nenhuma tela, arquivo ou rota de revisao de importacoes existe (D-01)', () => {
  const files = walk(path.join(ROOT, 'src')).filter((f) => /\.(ts|tsx)$/.test(f))
  assert.ok(files.length > 10, 'a varredura deveria encontrar os arquivos de src')
  const hits = files.map((f) => path.basename(f)).filter((n) => /review|revis/i.test(n))
  assert.deepEqual(hits, [])
  assert.doesNotMatch(code('src/App.tsx'), /revis/i)
})
