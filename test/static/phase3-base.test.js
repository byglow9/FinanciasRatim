// Guarda estatica da base visual da Fase 3 (D-17, D-18, D-22, IDEN-07).
// Rodar: node --test test/static/phase3-base.test.js
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

const srcFiles = (exts) =>
  walk(path.join(ROOT, 'src')).filter((f) => exts.some((e) => f.endsWith(e)))

test('package.json declara as fontes em dependencies com versao exata (D-22)', () => {
  const deps = JSON.parse(read('package.json')).dependencies
  for (const name of ['@fontsource-variable/sora', '@fontsource-variable/bricolage-grotesque']) {
    assert.ok(deps[name], `${name} ausente em dependencies`)
    assert.match(deps[name], /^\d+\.\d+\.\d+$/, `${name} deve ter versao exata, sem ^ nem ~`)
  }
})

test('main.tsx importa as duas fontes antes do index.css (D-22)', () => {
  const src = code('src/main.tsx')
  const sora = src.indexOf("'@fontsource-variable/sora")
  const bric = src.indexOf("'@fontsource-variable/bricolage-grotesque")
  const css = src.indexOf("'./index.css'")
  assert.ok(sora >= 0, 'import da Sora ausente')
  assert.ok(bric >= 0, 'import da Bricolage ausente')
  assert.ok(css >= 0, 'import do index.css ausente')
  assert.ok(sora < css && bric < css, 'fontes devem vir antes do index.css')
})

test('index.html declara lang pt-BR', () => {
  assert.match(read('index.html'), /<html[^>]*\blang="pt-BR"/)
})

test('nenhum arquivo referencia dominio de fontes do Google (D-22, T-03-03)', () => {
  const files = [path.join(ROOT, 'index.html'), ...srcFiles(['.ts', '.tsx', '.css'])]
  const re = /fonts\.googleapis\.com|fonts\.gstatic\.com/
  const hits = files.filter((f) => re.test(fs.readFileSync(f, 'utf8')))
  assert.deepEqual(hits, [])
})

test('index.html nao aplica tema escuro antes do React (PR-18, P-01)', () => {
  const html = read('index.html')
  assert.doesNotMatch(html, /financias_theme/)
  assert.doesNotMatch(html, /classList\.add\(\s*['"]dark['"]/)
})

test('nenhum emoji em src/**/*.ts e *.tsx (D-18)', () => {
  const files = srcFiles(['.ts', '.tsx'])
  assert.ok(files.length > 10, `varredura achou so ${files.length} arquivos`)
  const re = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|️/u
  const hits = files
    .filter((f) => re.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f))
  assert.deepEqual(hits, [])
})

const css = () => read('src/index.css')

test('index.css liga as familias de fonte do pacote (D-22)', () => {
  assert.match(css(), /--font-sans:\s*'Sora Variable'/)
  assert.match(css(), /--font-display:\s*'Bricolage Grotesque Variable'/)
})

test('index.css traz a paleta definitiva (D-17, PR-17, .planning/PALETA.md)', () => {
  const c = css()
  assert.match(c, /--muted-foreground:\s*70\.9 12\.9% 33\.3%/)
  assert.match(c, /--primary:\s*134\.1 40\.5% 31%/)
  for (const t of ['surface-2', 'track', 'brand', 'warn', 'danger', 'ok-ink', 'warn-ink', 'danger-ink']) {
    assert.match(c, new RegExp(`--color-${t}:`), `token --color-${t} ausente`)
  }
  for (let n = 0; n <= 4; n++) {
    for (const k of ['bg', 'fg']) {
      assert.match(c, new RegExp(`--color-rhythm-${n}-${k}:`), `token rhythm-${n}-${k} ausente`)
    }
  }
  assert.match(c, /--shadow-float:/)
  for (const r of ['card', 'btn', 'chip']) assert.match(c, new RegExp(`--radius-${r}:`))
})

test('index.css e o dono das classes de animacao e do movimento reduzido', () => {
  const c = css()
  assert.match(c, /prefers-reduced-motion:\s*reduce/)
  for (const cls of ['num-display', 'no-scrollbar', 'anim-sheet-in', 'anim-toast-in', 'anim-section-highlight']) {
    assert.match(c, new RegExp(`\\.${cls}\\b`), `classe .${cls} ausente`)
  }
})

test('o bloco .dark segue intacto (IDEN-05 e da Fase 5)', () => {
  assert.match(css(), /\.dark\s*\{[^}]*--background:\s*222\.2 24% 5%/)
})
