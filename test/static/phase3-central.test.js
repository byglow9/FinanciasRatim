// Guarda de AUSENCIA da Central de Limites e Cartoes. Decisao do dono (UAT de 2026-11-18, tarefa
// rapida 261118-mkh): a Central sai do app. Isso substitui D-20 (dock com 9 destinos) e D-21 (a
// Central so exibe) e torna CENT-01 e CENT-02 obsoletos. Os limites ficam so na secao "Limites do
// mes" da Home e em Configuracoes > Categorias.
// Rodar: node --test test/static/phase3-central.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const exists = (f) => fs.existsSync(path.join(ROOT, f))
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
const srcFiles = () => walk(path.join(ROOT, 'src')).filter((f) => /\.(ts|tsx)$/.test(f))

test('a pagina e o cartao de resumo da Central nao existem mais', () => {
  assert.ok(!exists('src/pages/LimitsPage.tsx'), 'LimitsPage.tsx deveria ter sido apagada')
  assert.ok(!exists('src/components/dashboard/CentralSummaryCard.tsx'), 'CentralSummaryCard.tsx deveria ter sido apagado')
})

test('nenhum arquivo de src cita a rota /limites, a LimitsPage nem o cartao da Central', () => {
  for (const f of srcFiles()) {
    const src = code(path.relative(ROOT, f))
    const rel = path.relative(ROOT, f)
    assert.doesNotMatch(src, /['"`]\/limites\b/, `${rel} aponta para a rota /limites`)
    assert.doesNotMatch(src, /\bLimitsPage\b/, `${rel} cita LimitsPage`)
    assert.doesNotMatch(src, /\bCentralSummaryCard\b/, `${rel} cita CentralSummaryCard`)
    assert.doesNotMatch(src, /Central de [Ll]imites/, `${rel} cita a Central de Limites`)
  }
})

test('a Home trata o hash #cat- por expandIdFromHash e repassa expandId ao HomeSections', () => {
  const lib = code('src/lib/limitHash.ts')
  assert.match(lib, /export function expandIdFromHash\b/)
  assert.match(lib, /startsWith\('#cat-'\)/)
  assert.match(lib, /try\s*\{[\s\S]*decodeURIComponent\(hash\.slice\(1\)\)[\s\S]*\}\s*catch/, 'hash fora de try')
  // O hash nunca vira seletor.
  assert.doesNotMatch(lib, /querySelector/)
  const home = code('src/pages/DashboardPage.tsx')
  assert.match(home, /expandIdFromHash\(hash\)/)
  assert.match(home, /useHashReveal\(undefined,/)
  assert.match(home, /expandId=\{expandId\}/)
  const sections = code('src/components/dashboard/HomeSections.tsx')
  assert.match(sections, /expandId=\{expandId\}/)
})

test('LimitsList mostra todas as linhas: sem a prop max nem o link "Ver os outros"', () => {
  const src = code('src/components/limits/LimitRow.tsx')
  assert.doesNotMatch(src, /\bmax\??:\s*number/)
  assert.doesNotMatch(src, /Ver os outros|Ver o outro limite/)
  assert.doesNotMatch(code('src/components/dashboard/HomeSections.tsx'), /\bmax=\{/)
})

test('o aviso da Home e o sino levam a Home com a linha do limite expandida', () => {
  assert.match(code('src/lib/limitHash.ts'), /return `\/#cat-\$\{encodeURIComponent\(categoryId\)\}`/)
  assert.match(code('src/components/dashboard/LimitAlertNotice.tsx'), /limitHref\(top\.categoryId\)/)
  assert.match(code('src/components/layout/AlertsBell.tsx'), /navigate\(limitHref\(alert\.categoryId\)\)/)
})

test('na aba Porquinho a Home so mostra o aviso, sem link nem cartao de resumo', () => {
  const src = code('src/pages/DashboardPage.tsx')
  assert.match(src, /Na aba Porquinho não há Pode gastar nem limite\./)
})
